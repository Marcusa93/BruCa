/**
 * Helpers cliente para Web Push.
 * Sólo se ejecuta en el browser.
 */

export type Platform =
  | "ios-safari"
  | "ios-chrome"
  | "android-chrome"
  | "android-firefox"
  | "desktop-chrome"
  | "desktop-firefox"
  | "desktop-safari"
  | "desktop-edge"
  | "other";

export interface PlatformInfo {
  platform: Platform;
  isStandalone: boolean;
  isSupported: boolean;
}

export function detectPlatform(): PlatformInfo {
  if (typeof window === "undefined") {
    return { platform: "other", isStandalone: false, isSupported: false };
  }
  const ua = navigator.userAgent || "";
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  const isStandalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS specific
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

  let platform: Platform = "other";
  if (isIOS) {
    platform = /CriOS/i.test(ua) ? "ios-chrome" : "ios-safari";
  } else if (isAndroid) {
    platform = /Firefox/i.test(ua) ? "android-firefox" : "android-chrome";
  } else if (/Edg\//.test(ua)) platform = "desktop-edge";
  else if (/Chrome/.test(ua)) platform = "desktop-chrome";
  else if (/Firefox/.test(ua)) platform = "desktop-firefox";
  else if (/Safari/.test(ua)) platform = "desktop-safari";

  const isSupported =
    "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

  return { platform, isStandalone, isSupported };
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const buf = new ArrayBuffer(raw.length);
  const out = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  // Esperamos a que esté lista
  await navigator.serviceWorker.ready;
  return reg;
}

export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator)) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return null;
  return reg.pushManager.getSubscription();
}

export async function subscribeUser(vapidPublicKey: string): Promise<PushSubscription> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new Error("Push notifications no soportadas en este dispositivo.");
  }
  if (Notification.permission === "denied") {
    throw new Error(
      "Bloqueaste las notificaciones. Cambialo en la configuración del navegador.",
    );
  }
  const reg = await registerServiceWorker();
  if (Notification.permission === "default") {
    const result = await Notification.requestPermission();
    if (result !== "granted") {
      throw new Error("No diste permiso para mostrar notificaciones.");
    }
  }
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  });

  // Persistir en backend
  const { platform } = detectPlatform();
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subscription: sub.toJSON(),
      platform,
      user_agent: navigator.userAgent,
    }),
  });
  if (!res.ok) {
    // Rollback
    try {
      await sub.unsubscribe();
    } catch {
      /* noop */
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "No se pudo guardar la suscripción.");
  }
  return sub;
}

export async function unsubscribeUser(): Promise<void> {
  const sub = await getCurrentSubscription();
  if (!sub) return;
  const endpoint = sub.endpoint;
  // Borrar local
  try {
    await sub.unsubscribe();
  } catch {
    /* noop */
  }
  // Borrar backend
  await fetch("/api/push/unsubscribe", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint }),
  }).catch(() => undefined);
}
