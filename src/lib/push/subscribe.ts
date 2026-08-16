"use client";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const array = new Uint8Array(new ArrayBuffer(rawData.length));
  for (let i = 0; i < rawData.length; i++) array[i] = rawData.charCodeAt(i);
  return array;
}

export async function subscribeToPush(
  saveSubscription: (sub: { endpoint: string; p256dh: string; auth: string }) => Promise<void>
): Promise<{ success: true } | { success: false; error: string }> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { success: false, error: "Push notifications are not supported on this browser." };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { success: false, error: "Notification permission was not granted." };
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ),
      });
    }

    const raw = subscription.toJSON();
    await saveSubscription({
      endpoint: raw.endpoint!,
      p256dh: raw.keys!.p256dh!,
      auth: raw.keys!.auth!,
    });

    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}