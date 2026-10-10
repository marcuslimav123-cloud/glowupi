import { useState, useEffect, useRef, useCallback } from "react";
import { apiUrl } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface Notificacao {
  id: number;
  titulo: string;
  corpo: string;
  tipo: string;
  dados: any;
  lida: boolean;
  createdAt: string;
}

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

export function playNotificationSound() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") ctx.resume();

    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.4, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    osc1.start(now);
    osc1.stop(now + 0.15);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1100, now + 0.18);
    gain2.gain.setValueAtTime(0.4, now + 0.18);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.33);
    osc2.start(now + 0.18);
    osc2.stop(now + 0.33);

    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.type = "sine";
    osc3.frequency.setValueAtTime(1320, now + 0.36);
    gain3.gain.setValueAtTime(0.5, now + 0.36);
    gain3.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
    osc3.start(now + 0.36);
    osc3.stop(now + 0.6);
  } catch {}
}

export function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) return Promise.resolve("denied" as NotificationPermission);
  if (Notification.permission === "granted") return Promise.resolve("granted");
  return Notification.requestPermission();
}

// Pede a permissão (deve ser chamado a partir de um clique do usuário — o
// Chrome bloqueia sites que pedem sozinhos ao carregar a página) e, se
// concedida, registra o push desta barbearia.
export async function enablePushNotifications(barbeariaId?: number | null): Promise<NotificationPermission> {
  const perm = await requestNotificationPermission();
  if (perm === "granted" && barbeariaId) {
    await subscribeToPush(barbeariaId);
  }
  return perm;
}

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

function uint8ArrayToBase64Url(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return window.btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function fetchCurrentVapidKey(): Promise<string | null> {
  try {
    const resp = await fetch(apiUrl(`/push/vapid-public-key`), { credentials: "include" });
    if (!resp.ok) return null;
    const { publicKey } = await resp.json();
    return publicKey || null;
  } catch {
    return null;
  }
}

function subscriptionMatchesKey(sub: PushSubscription, currentPublicKey: string): boolean {
  try {
    const buf = sub.options.applicationServerKey;
    if (!buf) return false;
    const subKey = uint8ArrayToBase64Url(new Uint8Array(buf));
    const normalized = currentPublicKey.replace(/=+$/, "");
    return subKey === normalized;
  } catch {
    return false;
  }
}

async function createFreshSubscription(
  registration: ServiceWorkerRegistration,
  publicKey: string
): Promise<PushSubscription | null> {
  try {
    return await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  } catch (err) {
    console.error("[Push] subscribe() failed:", err);
    return null;
  }
}

async function subscribeToPush(barbeariaId: number): Promise<boolean> {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.warn("[Push] serviceWorker or PushManager not available");
      return false;
    }
    if (Notification.permission !== "granted") {
      console.warn("[Push] Notification permission not granted:", Notification.permission);
      return false;
    }

    const registration = await navigator.serviceWorker.ready;
    console.log("[Push] SW ready, fetching current VAPID key...");

    const publicKey = await fetchCurrentVapidKey();
    if (!publicKey) {
      console.error("[Push] No VAPID public key available from server");
      return false;
    }

    let subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      const subJson = subscription.toJSON();
      const expired = subJson.expirationTime && subJson.expirationTime < Date.now();
      const keyMismatch = !subscriptionMatchesKey(subscription, publicKey);
      if (expired || keyMismatch) {
        console.warn(`[Push] Existing subscription invalid (expired=${!!expired}, keyMismatch=${keyMismatch}). Unsubscribing...`);
        try { await subscription.unsubscribe(); } catch {}
        subscription = null;
      }
    }

    if (!subscription) {
      console.log("[Push] Creating new push subscription...");
      subscription = await createFreshSubscription(registration, publicKey);
      if (!subscription) return false;
    }

    let registered = await registerTokenOnServer(barbeariaId, JSON.stringify(subscription.toJSON()), "web");

    if (!registered) {
      console.warn("[Push] Server rejected subscription — recreating once...");
      try { await subscription.unsubscribe(); } catch {}
      subscription = await createFreshSubscription(registration, publicKey);
      if (!subscription) return false;
      registered = await registerTokenOnServer(barbeariaId, JSON.stringify(subscription.toJSON()), "web");
    }

    if (registered) {
      console.log("[Push] Web push subscription registered successfully");
    }
    return registered;
  } catch (err) {
    console.error("[Push] Failed to subscribe to web push:", err);
    return false;
  }
}

async function registerTokenOnServer(barbeariaId: number, token: string, platform: string): Promise<boolean> {
  try {
    const resp = await fetch(apiUrl(`/barbearias/${barbeariaId}/push-tokens/register`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ token, platform }),
    });
    if (!resp.ok) {
      console.error("[Push] Token registration failed:", resp.status);
      return false;
    }
    console.log("[Push] Token registered on server");
    return true;
  } catch (err) {
    console.error("[Push] Token registration error:", err);
    return false;
  }
}

export function useNotifications() {
  const { barbeariaId, isAuthenticated } = useAuth();
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const prevUnreadRef = useRef<number>(-1);
  const pushSubscribingRef = useRef(false);

  useEffect(() => {
    if (!barbeariaId || !isAuthenticated) return;
    if (pushSubscribingRef.current) return;
    // Sem pedir permissão aqui: só mantém a assinatura de quem já permitiu.
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    pushSubscribingRef.current = true;

    subscribeToPush(barbeariaId).then((success) => {
      if (!success) {
        pushSubscribingRef.current = false;
      }
    });
  }, [barbeariaId, isAuthenticated]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "PUSH_SUBSCRIPTION_CHANGED" && barbeariaId) {
        console.log("[Push] Received subscription change from SW, re-registering...");
        const subJson = event.data.subscription;
        if (subJson) {
          registerTokenOnServer(barbeariaId, JSON.stringify(subJson), "web");
        }
      }
    };

    navigator.serviceWorker.addEventListener("message", handleMessage);
    return () => {
      navigator.serviceWorker.removeEventListener("message", handleMessage);
    };
  }, [barbeariaId]);

  const fetchUnreadCount = useCallback(async () => {
    if (!barbeariaId || !isAuthenticated) return;
    try {
      const resp = await fetch(apiUrl(`/barbearias/${barbeariaId}/notificacoes-internas/nao-lidas`), {
        credentials: "include",
      });
      if (resp.ok) {
        const data = await resp.json();
        const newCount = data.count || 0;
        if (newCount > prevUnreadRef.current && prevUnreadRef.current >= 0) {
          playNotificationSound();
        }
        prevUnreadRef.current = newCount;
        setUnreadCount(newCount);
      }
    } catch {}
  }, [barbeariaId, isAuthenticated]);

  const fetchNotificacoes = useCallback(async () => {
    if (!barbeariaId || !isAuthenticated) return;
    setLoading(true);
    try {
      const resp = await fetch(apiUrl(`/barbearias/${barbeariaId}/notificacoes-internas`), {
        credentials: "include",
      });
      if (resp.ok) {
        const data = await resp.json();
        setNotificacoes(data);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [barbeariaId, isAuthenticated]);

  const markAsRead = useCallback(async (id: number) => {
    if (!barbeariaId || !isAuthenticated) return;
    try {
      await fetch(apiUrl(`/barbearias/${barbeariaId}/notificacoes-internas/${id}/lida`), {
        method: "POST",
        credentials: "include",
      });
      setNotificacoes(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  }, [barbeariaId, isAuthenticated]);

  const markAllAsRead = useCallback(async () => {
    if (!barbeariaId || !isAuthenticated) return;
    try {
      await fetch(apiUrl(`/barbearias/${barbeariaId}/notificacoes-internas/ler-todas`), {
        method: "POST",
        credentials: "include",
      });
      setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })));
      setUnreadCount(0);
    } catch {}
  }, [barbeariaId, isAuthenticated]);

  useEffect(() => {
    if (!barbeariaId || !isAuthenticated) return;
    prevUnreadRef.current = -1;
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 10000);
    return () => clearInterval(interval);
  }, [barbeariaId, isAuthenticated, fetchUnreadCount]);

  return {
    notificacoes,
    unreadCount,
    loading,
    fetchNotificacoes,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
  };
}
