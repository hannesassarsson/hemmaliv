import webpush from "web-push";

import { adminClient } from "./_auth.js";

const json = (response, status, body) => response.status(status).json(body);

const LIST_OWNER = { hannes: "Hannes", elvira: "Elvira" };

const clock = (iso) =>
  new Date(iso).toLocaleString("sv-SE", {
    timeZone: "Europe/Stockholm",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

export default async function handler(request, response) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.authorization !== `Bearer ${cronSecret}`) {
    return json(response, 401, { error: "Unauthorized" });
  }

  const supabase = adminClient();
  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || process.env.VITE_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT;

  if (!supabase || !vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    return json(response, 500, { error: "Missing push-notification configuration" });
  }

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  const now = new Date().toISOString();

  // En uppgift är aktuell när påminnelsetiden har passerat, eller deadline om ingen påminnelse är satt.
  const [{ data: subscriptions, error: subscriptionsError }, { data: todos, error: todosError }, { data: shopping, error: shoppingError }] = await Promise.all([
    supabase.from("push_subscriptions").select("id, endpoint, p256dh, auth, person"),
    supabase
      .from("todo_items")
      .select("id, text, list_type, deadline, reminder")
      .eq("done", false)
      .is("notified_at", null)
      .or(`reminder.lte.${now},and(reminder.is.null,deadline.lte.${now})`),
    supabase.from("shopping_items").select("id, text").eq("done", false).is("notified_at", null).not("reminder", "is", null).lte("reminder", now),
  ]);

  if (subscriptionsError || todosError || shoppingError) {
    console.error({ subscriptionsError, todosError, shoppingError });
    return json(response, 500, { error: "Could not fetch notification data" });
  }

  if (!subscriptions?.length) {
    return json(response, 200, { ok: true, sent: 0, pending: (todos?.length ?? 0) + (shopping?.length ?? 0) });
  }

  // Personliga listor går bara till ägarens enheter. Enheter utan person (äldre prenumerationer) får allt.
  const recipientsFor = (owner) =>
    owner ? subscriptions.filter((s) => !s.person || s.person === owner) : subscriptions;

  let sent = 0;
  // Returnerar antal lyckade leveranser så att posten bara markeras som notifierad när något gick fram.
  const send = async (targets, message) => {
    const payload = JSON.stringify({ ...message, url: "/" });
    const attempts = await Promise.allSettled(
      targets.map((subscription) =>
        webpush.sendNotification(
          { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
          payload,
          { TTL: 3600 },
        ),
      ),
    );
    let delivered = 0;
    for (let index = 0; index < attempts.length; index += 1) {
      const attempt = attempts[index];
      if (attempt.status === "fulfilled") {
        sent += 1;
        delivered += 1;
        continue;
      }
      const statusCode = attempt.reason?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await supabase.from("push_subscriptions").delete().eq("id", targets[index].id);
      }
      console.error("Push delivery failed", attempt.reason);
    }
    return delivered;
  };

  for (const todo of todos ?? []) {
    const owner = LIST_OWNER[todo.list_type] ?? null;
    const targets = recipientsFor(owner);
    if (!targets.length) continue;
    const early = todo.deadline && todo.deadline > now;
    const delivered = await send(targets, {
      title: early ? "Påminnelse: att göra" : "Dags nu: att göra",
      body: early ? `${todo.text} – deadline ${clock(todo.deadline)}` : `${todo.text} (${todo.list_type})`,
      tag: `todo-${todo.id}`,
    });
    if (delivered) await supabase.from("todo_items").update({ notified_at: now }).eq("id", todo.id);
  }
  for (const item of shopping ?? []) {
    const delivered = await send(subscriptions, { title: "Påminnelse: handla", body: item.text, tag: `shopping-${item.id}` });
    if (delivered) await supabase.from("shopping_items").update({ notified_at: now }).eq("id", item.id);
  }

  return json(response, 200, { ok: true, sent });
}
