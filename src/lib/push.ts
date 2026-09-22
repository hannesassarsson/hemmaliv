import { supabase } from "@/integrations/supabase";

import { PUSH_PUBLIC_KEY, type Person } from "./hemma";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

function bufferToBase64Url(buffer: ArrayBuffer | null) {
  if (!buffer) return "";
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return window
    .btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function pushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function notificationPermission(): NotificationPermission | "unsupported" {
  if (!pushSupported()) return "unsupported";
  return Notification.permission;
}

export async function enablePush(person: Person | null) {
  if (!pushSupported()) throw new Error("Den här webbläsaren stöder inte notiser.");
  if (!PUSH_PUBLIC_KEY) throw new Error("Notiser är inte konfigurerade ännu.");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notiser blev inte tillåtna.");

  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(PUSH_PUBLIC_KEY),
    }));

  const json = subscription.toJSON() as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };

  const p256dh = json.keys?.p256dh ?? bufferToBase64Url(subscription.getKey("p256dh"));
  const auth = json.keys?.auth ?? bufferToBase64Url(subscription.getKey("auth"));

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      endpoint: json.endpoint ?? subscription.endpoint,
      p256dh,
      auth,
      person,
    },
    { onConflict: "endpoint" },
  );
  if (error) throw error;
}

export async function disablePush() {
  if (!pushSupported()) return;
  const registration = await navigator.serviceWorker.getRegistration("/sw.js");
  const subscription = await registration?.pushManager.getSubscription();
  if (subscription) {
    await supabase.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint);
    await subscription.unsubscribe();
  }
}
