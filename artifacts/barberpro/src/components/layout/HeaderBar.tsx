import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiUrl } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { ComporMensagemDialog } from "@/components/mensagens/ComporMensagemDialog";
import { useNotifications, enablePushNotifications } from "@/hooks/useNotifications";
import {
  CalendarDays, DollarSign, FileText, Cake, Mail, UserPlus,
  User, LogOut, Palette, Shield, Settings, X, Check, Bell, CheckCheck, Loader2,
} from "lucide-react";

export const THEMES = [
  { id: "blue", label: "Blue", color: "#3b82f6" },
  { id: "black", label: "Black", color: "#18181b" },
  { id: "purple", label: "Purple", color: "#8b5cf6" },
  { id: "green", label: "Green", color: "#22c55e" },
  { id: "red", label: "Red", color: "#ef4444" },
  { id: "yellow", label: "Yellow", color: "#eab308" },
  { id: "teal", label: "Teal", color: "#14b8a6" },
  { id: "bluegray", label: "Blue Gray", color: "#64748b" },
  { id: "brown", label: "Brown", color: "#92400e" },
  { id: "light-blue", label: "Light Blue", color: "#93c5fd" },
  { id: "light-purple", label: "Light Purple", color: "#c4b5fd" },
  { id: "light-green", label: "Light Green", color: "#86efac" },
  { id: "light-red", label: "Light Red", color: "#fca5a5" },
  { id: "light-yellow", label: "Light Yellow", color: "#fde68a" },
  { id: "light-teal", label: "Light Teal", color: "#99f6e4" },
  { id: "light-bluegray", label: "Light Gray", color: "#cbd5e1" },
  { id: "light-brown", label: "Light Brown", color: "#d97706" },
];

function Popup({ open, onClose, children, className = "", anchorRef }: { open: boolean; onClose: () => void; children: React.ReactNode; className?: string; anchorRef?: React.RefObject<HTMLElement | null> }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);

  useEffect(() => {
    if (!open || !anchorRef?.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
  }, [open, anchorRef]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, onClose]);

  if (!open) return null;

  const isMobile = window.innerWidth < 768;

  const content = (
    <>
      <div className="fixed inset-0 bg-black/60 md:bg-black/30 z-[9998]" onClick={onClose} />
      <div
        ref={ref}
        className={`fixed z-[9999] overflow-y-auto bg-card rounded-xl shadow-xl border border-border ${className}`}
        style={
          isMobile
            ? { left: 8, right: 8, top: 56, maxHeight: "calc(100vh - 72px)" }
            : pos
            ? { top: pos.top, right: pos.right, minWidth: 280, maxHeight: "70vh" }
            : { right: 16, top: 56, minWidth: 280, maxHeight: "70vh" }
        }
      >
        {children}
      </div>
    </>
  );

  return createPortal(content, document.body);
}

export function HeaderBar() {
  const { user, logout, barbeariaId, role, isDono, isGerente } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [activePopup, setActivePopup] = useState<string | null>(null);
  const [themeOpen, setThemeOpen] = useState(false);
  const [solTab, setSolTab] = useState("todos");
  const { notificacoes, unreadCount, loading: notifLoading, fetchNotificacoes, markAsRead, markAllAsRead } = useNotifications();

  const [composeFor, setComposeFor] = useState<{ id: number; nome: string; telefone: string | null } | null>(null);

  const anivBtnRef = useRef<HTMLButtonElement>(null);
  const msgBtnRef = useRef<HTMLButtonElement>(null);
  const solBtnRef = useRef<HTMLButtonElement>(null);
  const notifBtnRef = useRef<HTMLButtonElement>(null);
  const perfilBtnRef = useRef<HTMLButtonElement>(null);

  const toggle = (key: string) => setActivePopup(prev => prev === key ? null : key);

  const { data: aniversariantes } = useQuery({
    queryKey: ["notificacoes", "aniversariantes", barbeariaId],
    queryFn: async () => {
      const r = await fetch(apiUrl(`/barbearias/${barbeariaId}/notificacoes/aniversariantes`), { credentials: "include" });
      return r.json();
    },
    enabled: !!barbeariaId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: mensagens } = useQuery({
    queryKey: ["notificacoes", "mensagens", barbeariaId],
    queryFn: async () => {
      const r = await fetch(apiUrl(`/barbearias/${barbeariaId}/notificacoes/mensagens`), { credentials: "include" });
      return r.json();
    },
    enabled: !!barbeariaId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: solicitacoes } = useQuery({
    queryKey: ["notificacoes", "solicitacoes", barbeariaId, solTab],
    queryFn: async () => {
      const url = solTab === "todos"
        ? apiUrl(`/barbearias/${barbeariaId}/notificacoes/solicitacoes`)
        : apiUrl(`/barbearias/${barbeariaId}/notificacoes/solicitacoes?status=${solTab}`);
      const r = await fetch(url, { credentials: "include" });
      return r.json();
    },
    enabled: !!barbeariaId && (isDono || isGerente),
    staleTime: 30 * 1000,
  });

  const handleSolicitacao = async (id: number, status: string) => {
    await fetch(apiUrl(`/barbearias/${barbeariaId}/notificacoes/solicitacoes/${id}`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status }),
    });
    qc.invalidateQueries({ queryKey: ["notificacoes", "solicitacoes"] });
    toast({ title: status === "aprovado" ? "Solicitação aprovada" : "Solicitação reprovada" });
  };

  const handleTheme = async (tema: string) => {
    try {
      await fetch(apiUrl("/auth/tema"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ tema }),
      });
      qc.invalidateQueries({ queryKey: ["getCurrentUser"] });
      setThemeOpen(false);
      setActivePopup(null);
      toast({ title: "Tema atualizado!" });
      applyTheme(tema);
    } catch {
      toast({ title: "Erro ao salvar tema", variant: "destructive" });
    }
  };

  if (!user) return null;

  const currentTema = user?.tema || "blue";

  const iconBtn = "relative flex items-center justify-center h-8 w-8 md:h-9 md:w-9 rounded-lg hover:bg-muted transition-colors cursor-pointer";
  const iconCls = "h-[16px] w-[16px] md:h-[18px] md:w-[18px] text-foreground/50";

  return (
    <div className="flex items-center gap-0.5 md:gap-1">
      <div className="hidden md:flex items-center gap-1">
        <Link href="/agenda" className={iconBtn} title="Agenda">
          <CalendarDays className={iconCls} />
        </Link>

        <Link href="/financeiro" className={iconBtn} title="Financeiro">
          <DollarSign className={iconCls} />
        </Link>

        <Link href="/caixa" className={iconBtn} title="Comandas">
          <FileText className={iconCls} />
        </Link>
      </div>

      <div className="relative hidden md:block">
        <button ref={anivBtnRef} onClick={() => toggle("aniversarios")} className={iconBtn} title="Aniversários">
          <Cake className={iconCls} />
        </button>
        <Popup open={activePopup === "aniversarios"} onClose={() => setActivePopup(null)} className="w-72" anchorRef={anivBtnRef}>
          <div className="p-4">
            <h3 className="font-semibold text-[14px] text-foreground mb-3">Aniversariantes</h3>
            {aniversariantes?.hoje?.length > 0 ? (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-foreground/40 uppercase">Hoje</p>
                {aniversariantes.hoje.map((c: any) => (
                  <div key={c.id} className="flex items-center gap-2 py-1.5">
                    <div className="h-7 w-7 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center text-pink-600 dark:text-pink-400 text-[11px] font-bold">
                      {c.nome.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-foreground truncate">{c.nome}</p>
                      <p className="text-[11px] text-foreground/40 truncate">{c.telefone}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setComposeFor({ id: c.id, nome: c.nome, telefone: c.telefone ?? null }); setActivePopup(null); }}
                      className="text-[11px] px-2 py-1 rounded-md border border-border hover:bg-muted text-foreground/80"
                      data-testid={`button-aniversario-mensagem-${c.id}`}
                    >
                      Mensagem
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-foreground/40">Nenhum Aniversário.</p>
            )}
            {aniversariantes?.semana?.length > 0 && (
              <div className="mt-3 space-y-2 border-t border-border pt-3">
                <p className="text-[11px] font-semibold text-foreground/40 uppercase">Próximos 7 dias</p>
                {aniversariantes.semana.slice(0, 5).map((c: any) => (
                  <div key={c.id} className="flex items-center gap-2 py-1">
                    <div className="h-6 w-6 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 text-[10px] font-bold">
                      {c.nome.charAt(0)}
                    </div>
                    <p className="text-[12px] text-foreground/60">{c.nome}</p>
                    <p className="text-[10px] text-foreground/30 ml-auto">{c.aniversario?.slice(5)}</p>
                  </div>
                ))}
              </div>
            )}
            <Link href="/relatorios/aniversariantes" className="block mt-3 text-[12px] text-primary font-medium hover:underline" onClick={() => setActivePopup(null)}>
              Ver Histórico →
            </Link>
          </div>
        </Popup>
      </div>

      <div className="relative hidden md:block">
        <button ref={msgBtnRef} onClick={() => toggle("mensagens")} className={iconBtn} title="Mensagens">
          <Mail className={iconCls} />
        </button>
        <Popup open={activePopup === "mensagens"} onClose={() => setActivePopup(null)} className="w-72" anchorRef={msgBtnRef}>
          <div className="p-4">
            <h3 className="font-semibold text-[14px] text-foreground mb-3">Mensagens</h3>
            {Array.isArray(mensagens) && mensagens.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {mensagens.map((m: any) => (
                  <div key={m.id} className="flex items-start gap-2 py-1.5 border-b border-border last:border-0">
                    <Mail className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[13px] font-medium text-foreground">{m.titulo}</p>
                      <p className="text-[11px] text-foreground/40">{m.tipo} · {m.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-foreground/40">Nenhuma Mensagem</p>
            )}
            <Link href="/mensagens" className="block mt-3 text-[12px] text-primary font-medium hover:underline" onClick={() => setActivePopup(null)}>
              Ver Histórico →
            </Link>
          </div>
        </Popup>
      </div>

      {(isDono || isGerente) && (
        <div className="relative hidden md:block">
          <button ref={solBtnRef} onClick={() => toggle("solicitacoes")} className={iconBtn} title="Solicitações de Cadastro">
            <UserPlus className={iconCls} />
          </button>
          <Popup open={activePopup === "solicitacoes"} onClose={() => setActivePopup(null)} className="w-80" anchorRef={solBtnRef}>
            <div className="p-4">
              <h3 className="font-semibold text-[14px] text-foreground mb-3">Solicitações de Cadastro</h3>
              <div className="flex gap-1 mb-3">
                {["todos", "pendente", "aprovado", "reprovado"].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setSolTab(tab)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                      solTab === tab ? "bg-primary/10 text-primary" : "text-foreground/40 hover:bg-muted"
                    }`}
                  >
                    {tab === "todos" ? "Todos" : tab === "pendente" ? "Pendentes" : tab === "aprovado" ? "Aprovados" : "Reprovados"}
                  </button>
                ))}
              </div>
              {Array.isArray(solicitacoes) && solicitacoes.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {solicitacoes.map((s: any) => (
                    <div key={s.id} className="flex items-center gap-2 py-1.5 border-b border-border last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-foreground truncate">{s.nome}</p>
                        <p className="text-[11px] text-foreground/40">{s.telefone}</p>
                      </div>
                      {s.status === "pendente" ? (
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => handleSolicitacao(s.id, "aprovado")} className="h-7 w-7 rounded-md bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50 flex items-center justify-center transition-colors">
                            <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                          </button>
                          <button onClick={() => handleSolicitacao(s.id, "reprovado")} className="h-7 w-7 rounded-md bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 flex items-center justify-center transition-colors">
                            <X className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                          </button>
                        </div>
                      ) : (
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                          s.status === "aprovado" ? "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400" : "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                        }`}>{s.status}</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[13px] text-foreground/40">Nenhuma solicitação pendente.</p>
              )}
              <Link href="/gestao/clientes" className="block mt-3 text-[12px] text-primary font-medium hover:underline" onClick={() => setActivePopup(null)}>
                Ver Histórico →
              </Link>
            </div>
          </Popup>
        </div>
      )}

      <div className="relative">
        <button
          ref={notifBtnRef}
          onClick={() => {
            if (activePopup === "notificacoes") {
              setActivePopup(null);
            } else {
              enablePushNotifications(barbeariaId);
              fetchNotificacoes();
              toggle("notificacoes");
            }
          }}
          className={iconBtn}
          title="Notificações"
          data-tutorial="notificacoes"
        >
          <Bell className={iconCls} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
        <Popup open={activePopup === "notificacoes"} onClose={() => setActivePopup(null)} className="w-80" anchorRef={notifBtnRef}>
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-[14px] text-foreground">Notificações</h3>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead()}
                  className="flex items-center gap-1 text-[11px] text-primary hover:underline"
                >
                  <CheckCheck className="h-3 w-3" /> Marcar todas como lidas
                </button>
              )}
            </div>
            {notifLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-foreground/30" />
              </div>
            ) : notificacoes.length === 0 ? (
              <p className="text-[13px] text-foreground/40 py-4 text-center">Nenhuma notificação</p>
            ) : (
              <div className="space-y-1 max-h-72 overflow-y-auto -mx-1 px-1">
                {notificacoes.slice(0, 20).map((n) => (
                  <div
                    key={n.id}
                    onClick={() => { if (!n.lida) markAsRead(n.id); }}
                    className={`p-2.5 rounded-lg cursor-pointer transition-colors ${
                      n.lida ? "opacity-60 hover:bg-muted/50" : "bg-primary/5 hover:bg-primary/10"
                    }`}
                  >
                    <p className="text-[13px] font-medium text-foreground leading-tight">{n.titulo}</p>
                    <p className="text-[11px] text-foreground/50 mt-0.5 leading-snug">{n.corpo}</p>
                    <p className="text-[10px] text-foreground/30 mt-1">
                      {new Date(n.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Popup>
      </div>

      <div className="hidden md:block w-px h-5 bg-border mx-1" />

      <div className="relative">
        <button ref={perfilBtnRef} onClick={() => toggle("perfil")} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted transition-colors cursor-pointer">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-semibold text-[12px]">
            {user.nome.charAt(0).toUpperCase()}
          </div>
        </button>
        <Popup open={activePopup === "perfil"} onClose={() => setActivePopup(null)} className="w-56" anchorRef={perfilBtnRef}>
          <div className="bg-primary/10 rounded-t-xl px-4 py-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-[14px]">
              {user.nome.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-foreground truncate">{user.nome}</p>
              <p className="text-[11px] text-foreground/50 capitalize">{role}</p>
            </div>
          </div>
          <div className="p-2 space-y-0.5">
            <Link href="/empresa" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium text-foreground/60 hover:text-foreground hover:bg-muted transition-colors" onClick={() => setActivePopup(null)}>
              <Settings className="h-4 w-4" /> Conta
            </Link>
            {isDono && (
              <Link href="/equipe" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium text-foreground/60 hover:text-foreground hover:bg-muted transition-colors" onClick={() => setActivePopup(null)}>
                <Shield className="h-4 w-4" /> Acessos
              </Link>
            )}
            <button onClick={() => { setThemeOpen(true); }} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium text-foreground/60 hover:text-foreground hover:bg-muted transition-colors text-left">
              <Palette className="h-4 w-4" /> Temas
            </button>
            <div className="border-t border-border mt-1 pt-1">
              <button onClick={() => { setActivePopup(null); logout(); }} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium text-red-500 hover:bg-destructive/10 transition-colors text-left">
                <LogOut className="h-4 w-4" /> Sair
              </button>
            </div>
          </div>
        </Popup>
      </div>

      {composeFor && (
        <ComporMensagemDialog
          open={!!composeFor}
          onOpenChange={(v) => { if (!v) setComposeFor(null); }}
          clienteId={composeFor.id}
          clienteNome={composeFor.nome}
          clienteTelefone={composeFor.telefone}
          categoriaSugerida="aniversario"
          title={`Mensagem de aniversário — ${composeFor.nome}`}
        />
      )}

      {themeOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[200] flex items-center justify-center" onClick={() => setThemeOpen(false)}>
          <div className="bg-card rounded-2xl shadow-2xl w-[380px] max-w-[90vw] border border-border" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="font-semibold text-[16px] text-foreground">Selecionar Tema</h3>
              <button onClick={() => setThemeOpen(false)} className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center">
                <X className="h-4 w-4 text-foreground/40" />
              </button>
            </div>
            <div className="p-5 grid grid-cols-4 gap-3">
              {THEMES.map(t => (
                <button
                  key={t.id}
                  onClick={() => handleTheme(t.id)}
                  className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl transition-all ${
                    currentTema === t.id ? "bg-muted ring-2 ring-primary" : "hover:bg-muted/50"
                  }`}
                >
                  <div className="h-10 w-10 rounded-full border-2 border-card shadow-md" style={{ background: t.color }} />
                  <span className="text-[10px] font-medium text-foreground/60 leading-tight text-center">{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const THEME_COLORS: Record<string, string> = {
  "blue": "210 100% 50%",
  "black": "240 6% 10%",
  "purple": "263 70% 58%",
  "green": "142 71% 45%",
  "red": "0 84% 60%",
  "yellow": "48 96% 53%",
  "teal": "168 80% 40%",
  "bluegray": "215 16% 47%",
  "brown": "27 69% 31%",
  "light-blue": "213 93% 78%",
  "light-purple": "255 82% 82%",
  "light-green": "149 80% 73%",
  "light-red": "0 94% 82%",
  "light-yellow": "45 96% 76%",
  "light-teal": "170 91% 76%",
  "light-bluegray": "213 27% 84%",
  "light-brown": "38 92% 50%",
};

export function applyTheme(tema: string) {
  const hsl = THEME_COLORS[tema] || THEME_COLORS["blue"];
  document.documentElement.style.setProperty("--primary", hsl);
}
