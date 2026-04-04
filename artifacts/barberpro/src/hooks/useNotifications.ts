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
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.setValueAtTime(1100, now + 0.1);
    osc.frequency.setValueAtTime(880, now + 0.2);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    osc.start(now);
    osc.stop(now + 0.35);
  } catch {}
}

export function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) return Promise.resolve("denied" as NotificationPermission);
  if (Notification.permission === "granted") return Promise.resolve("granted");
  if (Notification.permission === "denied") return Promise.resolve("denied");
  return Notification.requestPermission();
}

export function showBrowserNotification(title: string, body: string) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  try {
    new Notification(title, {
      body,
      icon: "/favicon.ico",
      tag: "glow-upi-notification",
    });
  } catch {}
}

export function useNotifications() {
  const { barbeariaId, isAuthenticated } = useAuth();
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const prevUnreadRef = useRef<number>(-1);

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
          showBrowserNotification("Nova Notificação", "Você tem novas notificações");
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
    const interval = setInterval(fetchUnreadCount, 20000);
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
