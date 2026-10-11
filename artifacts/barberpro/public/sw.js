const CACHE_NAME = "glowupi-pwa-v9";
const SW_VERSION = "7.0.0";

self.addEventListener("install", () => {
  console.log("[SW] Installing v" + SW_VERSION);
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("[SW] Activating v" + SW_VERSION);
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
      await self.clients.claim();
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      clients.forEach((client) => {
        try {
          client.postMessage({ type: "SW_ACTIVATED", version: SW_VERSION });
        } catch (_) {}
      });
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + c;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

self.addEventListener("push", (event) => {
  console.log("[SW] Push event received");

  const showNotif = (async () => {
    let data = { title: "Glow Upi", body: "Nova notificação" };
    try {
      if (event.data) {
        const parsed = event.data.json();
        if (parsed) data = parsed;
      }
    } catch (e) {
      try {
        if (event.data) {
          data.body = event.data.text();
        }
      } catch (_) {}
    }

    const notifType = data.data?.type || "";
    const isAgendamento =
      notifType.includes("agendamento") ||
      notifType === "reminder" ||
      notifType === "novo_agendamento";

    const actions =
      isAgendamento && data.data?.agendamentoId
        ? [{ action: "ver_agendamento", title: "Ver agendamento" }]
        : [];

    const tagBase = data.tag || "glow-upi-" + (notifType || "push");
    const tagId = data.data?.agendamentoId || data.data?.notificationId || "";
    const stableHash = tagId || simpleHash(data.title + data.body);
    const tag = tagBase + "-" + stableHash;

    const options = {
      body: data.body || "Nova notificação",
      icon: data.icon || "/logo-icon.png",
      badge: data.badge || "/logo-icon.png",
      image: data.image,
      tag: tag,
      data: data.data || {},
      vibrate: [300, 100, 300, 100, 300],
      requireInteraction: true,
      renotify: true,
      actions,
      timestamp: Date.now(),
      silent: false,
    };

    console.log("[SW] Showing notification:", data.title, options.tag);
    await self.registration.showNotification(data.title || "Glow Upi", options);

    // Avisa as abas abertas para recarregarem os dados (agenda, comandas, sino).
    try {
      const openClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const c of openClients) c.postMessage({ type: "PUSH_RECEIVED", data: data.data || {} });
    } catch (_) {}
  })();

  event.waitUntil(
    showNotif.catch((err) => {
      console.error("[SW] Push handler error, showing fallback:", err);
      return self.registration.showNotification("Glow Upi", {
        body: "Você tem uma nova notificação",
        icon: "/logo-icon.png",
        badge: "/logo-icon.png",
        tag: "glow-upi-fallback-" + Date.now(),
        vibrate: [300, 100, 300],
        requireInteraction: true,
        silent: false,
      });
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const notifData = event.notification.data || {};
  const action = event.action;
  const agendamentoId = notifData.agendamentoId;

  let urlToOpen = notifData.url || "/agenda";

  if (action === "ver_agendamento" && agendamentoId) {
    urlToOpen = "/agenda";
  }

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        return self.clients.openWindow(urlToOpen);
      })
  );
});

self.addEventListener("pushsubscriptionchange", (event) => {
  console.log("[SW] Push subscription changed, re-subscribing...");

  const resubscribe = async () => {
    let subscribeOptions = event.oldSubscription?.options;

    if (!subscribeOptions || !subscribeOptions.applicationServerKey) {
      try {
        const scope = self.registration.scope;
        const vapidUrl = new URL("api/push/vapid-public-key", scope).href;
        const resp = await fetch(vapidUrl);
        if (resp.ok) {
          const { publicKey } = await resp.json();
          if (publicKey) {
            const padding = "=".repeat((4 - (publicKey.length % 4)) % 4);
            const base64 = (publicKey + padding).replace(/-/g, "+").replace(/_/g, "/");
            const rawData = atob(base64);
            const keyArray = new Uint8Array(rawData.length);
            for (let i = 0; i < rawData.length; i++) {
              keyArray[i] = rawData.charCodeAt(i);
            }
            subscribeOptions = {
              userVisibleOnly: true,
              applicationServerKey: keyArray,
            };
          }
        }
      } catch (e) {
        console.error("[SW] Failed to fetch VAPID key for re-subscribe:", e);
      }
    }

    if (!subscribeOptions) {
      subscribeOptions = { userVisibleOnly: true };
    }

    const newSub = await self.registration.pushManager.subscribe(subscribeOptions);
    console.log("[SW] Re-subscribed after pushsubscriptionchange");

    const clients = await self.clients.matchAll({ type: "window" });
    clients.forEach((client) => {
      client.postMessage({
        type: "PUSH_SUBSCRIPTION_CHANGED",
        subscription: newSub.toJSON(),
      });
    });
  };

  event.waitUntil(
    resubscribe().catch((err) => {
      console.error("[SW] Failed to re-subscribe after change:", err);
    })
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (event.request.mode === "navigate") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.includes("/api/") || url.pathname.includes("/api")) return;

  const isHashedAsset =
    url.pathname.includes("/assets/") &&
    /\.(js|css|woff2?|ttf|eot)$/.test(url.pathname);

  if (isHashedAsset) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(event.request).then(
          (cached) =>
            cached ||
            fetch(event.request).then((response) => {
              if (response.ok) {
                cache.put(event.request, response.clone());
              }
              return response;
            }).catch(() => cache.match(event.request))
        )
      )
    );
    return;
  }

  const isStaticImage =
    /\.(png|jpg|jpeg|webp|svg|ico)$/.test(url.pathname);

  if (isStaticImage) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(event.request).then(
          (cached) =>
            cached ||
            fetch(event.request).then((response) => {
              if (response.ok) {
                cache.put(event.request, response.clone());
              }
              return response;
            })
        )
      )
    );
    return;
  }
});
