/* BruCa Service Worker — Web Push + PWA basics */
/* eslint-disable no-restricted-globals */

const SW_VERSION = "bruca-sw-v1";

self.addEventListener("install", (event) => {
  // Activar el SW nuevo inmediatamente sin esperar al cierre de pestañas
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Tomar control de todas las pestañas abiertas
  event.waitUntil(self.clients.claim());
});

// Manejo de notificaciones push
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "BruCa", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "BruCa Inversiones + IA";
  const options = {
    body: data.body || "",
    icon: data.icon || "/icons/icon-192.png",
    badge: data.badge || "/icons/badge-72.png",
    tag: data.tag || "bruca-notif",
    renotify: Boolean(data.renotify),
    requireInteraction: Boolean(data.requireInteraction),
    data: {
      url: data.url || "/dashboard",
      ...(data.meta || {}),
    },
    actions: data.actions || [],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Click en una notificación → abrir / focalizar la pestaña con la URL
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/dashboard";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Si hay una ventana abierta de la app, navegar y focalizar
        for (const client of clientList) {
          try {
            const u = new URL(client.url);
            if (u.origin === self.location.origin) {
              client.focus();
              if ("navigate" in client) return client.navigate(url);
              return client;
            }
          } catch (_) {
            /* noop */
          }
        }
        // Si no, abrir una nueva
        if (self.clients.openWindow) return self.clients.openWindow(url);
      }),
  );
});

// Si una suscripción cambia (rotación de keys, etc.), avisamos al backend
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    self.registration.pushManager
      .subscribe({
        userVisibleOnly: true,
        applicationServerKey: event.oldSubscription
          ? event.oldSubscription.options.applicationServerKey
          : undefined,
      })
      .then((newSubscription) =>
        fetch("/api/push/subscribe", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subscription: newSubscription.toJSON(),
            replaces_endpoint: event.oldSubscription
              ? event.oldSubscription.endpoint
              : null,
          }),
        }),
      )
      .catch(() => {
        /* swallow */
      }),
  );
});
