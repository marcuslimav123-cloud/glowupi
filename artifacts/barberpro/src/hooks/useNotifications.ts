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

async function subscribeToPush(barbeariaId: number): Promise<boolean> {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
    if (Notification.permission !== "granted") return false;

    const registration = await navigator.serviceWorker.ready;
    const existingSub = await registration.pushManager.getSubscription();
    if (existingSub) {
      return await registerTokenOnServer(barbeariaId, JSON.stringify(existingSub.toJSON()), "web");
    }

    const vapidResp = await fetch(apiUrl(`/push/vapid-public-key`), {
      credentials: "include",
    });
    if (!vapidResp.ok) return false;
    const { publicKey } = await vapidResp.json();
    if (!publicKey) return false;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    const registered = await registerTokenOnServer(barbeariaId, JSON.stringify(subscription.toJSON()), "web");
    if (registered) {
      console.log("[Push] Web push subscription registered");
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
  const pushSubscribedRef = useRef(false);

  useEffect(() => {
    if (!barbeariaId || !isAuthenticated || pushSubscribedRef.current) return;

    requestNotificationPermission().then((perm) => {
      if (perm === "granted") {
        subscribeToPush(barbeariaId).then((success) => {
          if (success) pushSubscribedRef.current = true;
        });
      }
    });
  }, [barbeariaId, isAuthenticated]);

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
