import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

const json = (response, status, body) => response.status(status).json(body);

export default async function handler(request, response) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.authorization !== `Bearer ${cronSecret}`) {
    return json(response, 401, { error: "Unauthorized" });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || process.env.VITE_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT;

  if (!supabaseUrl || !serviceRoleKey || !vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    return json(response, 500, { error: "Missing push-notification configuration" });
  }

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const now = new Date().toISOString();

  const [{ data: subscriptions, error: subscriptionsError }, { data: todos, error: todosError }, { data: shopping, error: shoppingError }] = await Promise.all([
    supabase.from("push_subscriptions").select("id, endpoint, p256dh, auth"),
    supabase.from("todo_items").select("id, text, list_type").eq("done", false).is("notified_at", null).not("deadline", "is", null).lte("deadline", now),
    supabase.from("shopping_items").select("id, text").eq("done", false).is("notified_at", null).not("reminder", "is", null).lte("reminder", now),
  ]);

  if (subscriptionsError || todosError || shoppingError) {
    console.error({ subscriptionsError, todosError, shoppingError });
    return json(response, 500, { error: "Could not fetch notification data" });
  }

  if (!subscriptions?.length) {
    return json(response, 200, { ok: true, sent: 0, pending: (todos?.length ?? 0) + (shopping?.length ?? 0) });
  }

  let sent = 0;
  const send = async (message) => {
    const payload = JSON.stringify({ ...message, url: "/" });
    const attempts = await Promise.allSettled(
      subscriptions.map((subscription) => webpush.sendNotification(subscription, payload, { TTL: 3600 })),
    );
    for (let index = 0; index < attempts.length; index += 1) {
      const attempt = attempts[index];
      if (attempt.status === "fulfilled") {
        sent += 1;
        continue;
      }
      const statusCode = attempt.reason?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await supabase.from("push_subscriptions").delete().eq("id", subscriptions[index].id);
      }
      console.error("Push delivery failed", attempt.reason);
    }
  };

  for (const todo of todos ?? []) {
    await send({ title: "Dags nu: att göra", body: `${todo.text} (${todo.list_type})`, tag: `todo-${todo.id}` });
    await supabase.from("todo_items").update({ notified_at: now }).eq("id", todo.id);
  }
  for (const item of shopping ?? []) {
    await send({ title: "Påminnelse: handla", body: item.text, tag: `shopping-${item.id}` });
    await supabase.from("shopping_items").update({ notified_at: now }).eq("id", item.id);
  }

  return json(response, 200, { ok: true, sent });
}
