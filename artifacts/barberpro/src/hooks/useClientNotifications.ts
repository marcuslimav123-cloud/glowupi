import { useEffect, useRef } from "react";

const BASE_URL = `${import.meta.env.BASE_URL}api`.replace(/\/+/g, "/");

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function registerClientPushToken(token: string): Promise<boolean> {
  try {
    const resp = await fetch(`${BASE_URL}/client-push-tokens/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ token, platform: "web" }),
    });
    return resp.ok;
  } catch {
    return false;
  }
}

async function subscribeClientToPush(): Promise<boolean> {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
    if (Notification.permission !== "granted") return false;

    const registration = await navigator.serviceWorker.ready;

    const existingSub = await registration.pushManager.getSubscription();
    if (existingSub) {
      const subJson = existingSub.toJSON();
      const expirationTime = subJson.expirationTime;
      if (expirationTime && expirationTime < Date.now()) {
        console.log("[ClientPush] Subscription expired, renewing...");
        await existingSub.unsubscribe();
      } else {
        return await registerClientPushToken(JSON.stringify(subJson));
      }
    }

    const vapidResp = await fetch(`${BASE_URL}/push/vapid-public-key`, {
      credentials: "include",
    });
    if (!vapidResp.ok) return false;
    const { publicKey } = await vapidResp.json();
    if (!publicKey) return false;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    return await registerClientPushToken(JSON.stringify(subscription.toJSON()));
  } catch (err) {
    console.error("[ClientPush] Failed to subscribe:", err);
    return false;
  }
}

export function useClientNotifications(isAuthenticated: boolean) {
  const subscribingRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (subscribingRef.current) return;
    subscribingRef.current = true;

    if (!("Notification" in window)) {
      subscribingRef.current = false;
      return;
    }

    const doSubscribe = () => {
      subscribeClientToPush().then((success) => {
        if (!success) subscribingRef.current = false;
      });
    };

    if (Notification.permission === "granted") {
      doSubscribe();
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then((perm) => {
        if (perm === "granted") {
          doSubscribe();
        } else {
          subscribingRef.current = false;
        }
      });
    } else {
      subscribingRef.current = false;
    }
  }, [isAuthenticated]);
}
