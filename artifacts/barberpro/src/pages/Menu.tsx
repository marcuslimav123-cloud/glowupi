import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "wouter";
import { getRoleLabel, apiUrl } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { applyTheme, THEMES } from "@/components/layout/HeaderBar";
import { enablePushNotifications, disablePushNotifications, getPushStatus, type PushStatus } from "@/hooks/useNotifications";
import {
  Building2,
  LogOut,
  ChevronRight,
  Palette,
  Sun,
  Moon,
  Monitor,
  Check,
  GraduationCap,
  Bell,
  BellOff,
  Loader2,
  Send,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import { NAV_ITEMS, filterNav, type NavItem } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { InstallAppButton } from "@/components/InstallAppButton";
import { SafeLogoImage } from "@/components/SafeLogoImage";

// Rotas já presentes na barra inferior do celular: não repetir no menu.
const BOTTOM_BAR = new Set(["/dashboard", "/agenda", "/gestao/clientes", "/financeiro/caixa"]);

export default function MenuPage() {
  const { user, logout, role, barbeariaNome, logoUrl, isDono, isGerente, barbeariaId, perfilPermissoes } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [themeOpen, setThemeOpen] = useState(false);
  const [notifStatus, setNotifStatus] = useState<"loading" | PushStatus>("loading");
  const [notifHint, setNotifHint] = useState<string | null>(null);
  const [notifLoading, setNotifLoading] = useState(false);
  const [testingNotif, setTestingNotif] = useState(false);
  const [batteryHelpOpen, setBatteryHelpOpen] = useState(false);

  useEffect(() => {
    getPushStatus().then(setNotifStatus);
  }, []);

  const CAMINHO_CADEADO = "toque no cadeado ao lado do endereço → Permissões → Notificações → Permitir, e tente de novo.";

  const handleToggleNotifications = async () => {
    if (notifLoading) return;
    setNotifLoading(true);
    setNotifHint(null);
    try {
      if (notifStatus === "ativo") {
        await disablePushNotifications(barbeariaId);
        setNotifStatus(await getPushStatus());
        toast({ title: "Avisos desativados neste aparelho" });
        return;
      }
      if (notifStatus === "indisponivel") {
        setNotifHint("Este navegador não suporta avisos. No celular, use o Chrome.");
        return;
      }
      if (notifStatus === "bloqueado") {
        setNotifHint(`O navegador está bloqueando este site: ${CAMINHO_CADEADO}`);
        return;
      }
      const perm = await enablePushNotifications(barbeariaId);
      const status = await getPushStatus();
      setNotifStatus(status);
      if (status === "ativo") {
        toast({ title: "Avisos ativados!", description: "Você vai receber os novos agendamentos neste aparelho." });
      } else if (perm === "denied") {
        setNotifHint(`O navegador bloqueou os avisos: ${CAMINHO_CADEADO}`);
      } else if (perm === "granted") {
        setNotifHint("A permissão foi dada, mas não consegui registrar este aparelho no servidor. Tente de novo em alguns segundos.");
      } else {
        setNotifHint(`O navegador mostrou um aviso pequeno (normalmente na parte de baixo da tela) e ele sumiu antes de você responder. Toque em "Ativar avisos" de novo e, quando o aviso aparecer, toque nele e escolha Permitir. Se sumir de novo, ${CAMINHO_CADEADO}`);
      }
    } catch (err) {
      console.error("Notification error:", err);
      toast({ title: "Erro ao ativar avisos", variant: "destructive" });
    } finally {
      setNotifLoading(false);
    }
  };

  const handleTestNotification = async () => {
    if (notifStatus !== "ativo") {
      toast({ title: "Ative as notificações primeiro", variant: "destructive" });
      return;
    }
    setTestingNotif(true);
    try {
      const resp = await fetch(apiUrl("/push/test"), {
        method: "POST",
        credentials: "include",
      });
      const data = await resp.json().catch(() => ({}));
      if (resp.ok) {
        toast({
          title: "Notificação de teste enviada",
          description: data.message || "Verifique sua tela em alguns segundos. Pode demorar até 10s no Android com economia de bateria ativa.",
        });
      } else {
        toast({
          title: "Falha no teste",
          description: data.error || "Não foi possível enviar a notificação de teste.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Test notification error:", err);
      toast({ title: "Erro ao testar", variant: "destructive" });
    } finally {
      setTestingNotif(false);
    }
  };

  const { data: layoutParams } = useQuery({
    queryKey: ["parametros-layout", barbeariaId],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/parametros`), { credentials: "include" });
      const rows: { chave: string; valor: string }[] = await res.json();
      const map: Record<string, string> = {};
      for (const r of rows) map[r.chave] = r.valor;
      return map;
    },
    enabled: !!barbeariaId,
    staleTime: 5 * 60 * 1000,
  });

  const currentTema = user?.tema || "blue";
  const temaLayout = layoutParams?.["tema_layout"] || "Claro";

  const handleTheme = async (tema: string) => {
    try {
      const res = await fetch(apiUrl("/auth/tema"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ tema }),
      });
      if (!res.ok) throw new Error("Falha ao salvar tema");
      qc.invalidateQueries({ queryKey: ["getCurrentUser"] });
      setThemeOpen(false);
      toast({ title: "Tema atualizado!" });
      applyTheme(tema);
    } catch {
      toast({ title: "Erro ao salvar tema", variant: "destructive" });
    }
  };

  const handleDarkMode = async (mode: string) => {
    try {
      const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/parametros/tema_layout`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ valor: mode }),
      });
      if (!res.ok) throw new Error("Falha ao salvar modo");
      qc.invalidateQueries({ queryKey: ["parametros-layout"] });
      const html = document.documentElement;
      html.classList.remove("dark");
      if (mode === "Escuro") html.classList.add("dark");
      else if (mode === "Automático") {
        if (window.matchMedia("(prefers-color-scheme: dark)").matches) html.classList.add("dark");
      }
      toast({ title: "Modo de exibição atualizado!" });
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  };

  if (!user) return null;

  const nav = filterNav(NAV_ITEMS, role, perfilPermissoes);
  const grupos: { label: string; items: NavItem[] }[] = [];
  const soltos: NavItem[] = [];
  for (const item of nav) {
    if (item.children) grupos.push({ label: item.name, items: item.children });
    else if (item.href && !BOTTOM_BAR.has(item.href)) soltos.push(item);
  }
  const [aberto, setAberto] = useState<string | null>(null);

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto pb-20">
        <div className="bg-card border border-border rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-bold text-xl border border-primary/15">
              {user.nome.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-foreground truncate">{user.nome}</h2>
              <p className="text-sm text-muted-foreground capitalize">{getRoleLabel(role)}</p>
              {barbeariaNome && (
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {barbeariaNome}
                </p>
              )}
            </div>
            {logoUrl && (
              <SafeLogoImage src={logoUrl} alt="Logo" className="h-10 w-10 rounded-lg object-cover border border-border" />
            )}
          </div>
        </div>

        <div className="mb-5 md:hidden">
          <InstallAppButton
            nome={barbeariaNome || undefined}
            logoUrl={logoUrl}
            className="w-full h-12 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
            variant="default"
          />
        </div>

        {grupos.map((g) => {
          const open = aberto === g.label;
          return (
            <div key={g.label} className="mb-3">
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <button onClick={() => setAberto(open ? null : g.label)} className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-muted/30 transition-colors">
                  <span className="text-sm font-semibold text-foreground">{g.label}</span>
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    {g.items.length} {g.items.length === 1 ? "item" : "itens"}
                    <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
                  </span>
                </button>
                {open && g.items.map((item) => (
                  <Link key={item.href} href={item.href!} className="flex items-center gap-3 px-4 py-3 border-t border-border hover:bg-muted/30 transition-colors">
                    <div className="h-9 w-9 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
                      <item.icon className="h-4.5 w-4.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{item.name}</p>
                      {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          );
        })}

        {soltos.length > 0 && (
          <div className="mb-5 mt-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">Conta</h3>
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              {soltos.map((item, i) => (
                <Link key={item.href} href={item.href!} className={`flex items-center gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors ${i !== 0 ? "border-t border-border" : ""}`}>
                  <div className="h-9 w-9 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
                    <item.icon className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{item.name}</p>
                    {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="mb-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
            Notificações
          </h3>
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <button
              onClick={handleToggleNotifications}
              disabled={notifLoading}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors"
            >
              <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                notifStatus === "ativo" ? "bg-green-500/10" : "bg-primary/8"
              }`}>
                {notifLoading
                  ? <Loader2 className="h-4.5 w-4.5 text-primary animate-spin" />
                  : notifStatus === "ativo"
                    ? <Bell className="h-4.5 w-4.5 text-green-600" />
                    : <BellOff className="h-4.5 w-4.5 text-muted-foreground" />
                }
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-foreground">
                  {notifStatus === "ativo" ? "Avisos ativos neste aparelho" : "Ativar avisos"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {notifStatus === "ativo"
                    ? "Novos agendamentos chegam aqui. Toque para desativar."
                    : notifStatus === "bloqueado"
                      ? "Bloqueados pelo navegador — toque para ver como liberar"
                      : "Receba alertas de novos agendamentos"}
                </p>
              </div>
              <div className={`h-7 w-12 rounded-full p-0.5 transition-colors ${
                notifStatus === "ativo" ? "bg-green-500" : "bg-muted-foreground/20"
              }`}>
                <div className={`h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${
                  notifStatus === "ativo" ? "translate-x-5" : "translate-x-0"
                }`} />
              </div>
            </button>
            {notifHint && (
              <div className="px-4 pb-3 -mt-1">
                <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">{notifHint}</p>
              </div>
            )}

            {notifStatus === "ativo" && (
              <button
                onClick={handleTestNotification}
                disabled={testingNotif}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors border-t border-border disabled:opacity-60"
              >
                <div className="h-9 w-9 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
                  {testingNotif
                    ? <Loader2 className="h-4.5 w-4.5 text-primary animate-spin" />
                    : <Send className="h-4.5 w-4.5 text-primary" />}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium text-foreground">Testar notificação</p>
                  <p className="text-xs text-muted-foreground">
                    Envia uma notificação real agora pra confirmar que está funcionando
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            )}

            <button
              onClick={() => setBatteryHelpOpen(!batteryHelpOpen)}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors border-t border-border"
            >
              <div className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                <AlertCircle className="h-4.5 w-4.5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-foreground">Notificações atrasando?</p>
                <p className="text-xs text-muted-foreground">
                  Ajuste a economia de bateria do celular
                </p>
              </div>
              <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${batteryHelpOpen ? "rotate-180" : ""}`} />
            </button>

            {batteryHelpOpen && (
              <div className="px-4 pb-4 pt-1 border-t border-border space-y-3 text-xs leading-relaxed">
                <p className="text-muted-foreground">
                  No Android, a economia de bateria pode atrasar ou bloquear notificações em segundo plano. Libere o Chrome (que entrega as notificações do app):
                </p>
                <div className="bg-muted/40 rounded-lg p-3 space-y-2">
                  <p className="font-semibold text-foreground">Samsung Galaxy</p>
                  <p className="text-muted-foreground">
                    Configurações → Aplicativos → <strong>Chrome</strong> → Bateria → marcar <strong>"Sem restrições"</strong>
                  </p>
                </div>
                <div className="bg-muted/40 rounded-lg p-3 space-y-2">
                  <p className="font-semibold text-foreground">Xiaomi / Redmi / POCO</p>
                  <p className="text-muted-foreground">
                    Configurações → Aplicativos → Gerenciar apps → <strong>Chrome</strong> → Economia de bateria → <strong>"Sem restrições"</strong>. Ative também "Início automático" e "Mostrar em tela inicial".
                  </p>
                </div>
                <div className="bg-muted/40 rounded-lg p-3 space-y-2">
                  <p className="font-semibold text-foreground">Outros Android</p>
                  <p className="text-muted-foreground">
                    Configurações → Aplicativos → <strong>Chrome</strong> → Bateria → <strong>"Não otimizar"</strong> ou <strong>"Permitir em segundo plano"</strong>.
                  </p>
                </div>
                <div className="bg-muted/40 rounded-lg p-3 space-y-2">
                  <p className="font-semibold text-foreground">Confira também</p>
                  <p className="text-muted-foreground">
                    Configurações → Notificações → <strong>Chrome</strong> → todas as categorias <strong>ativadas</strong> e som permitido.
                  </p>
                </div>
                <p className="text-muted-foreground italic">
                  Depois de ajustar, aperte "Testar notificação" pra confirmar.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mb-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
            Aparência
          </h3>
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <button
              onClick={() => setThemeOpen(!themeOpen)}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors"
            >
              <div className="h-9 w-9 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
                <Palette className="h-4.5 w-4.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-foreground">Cor do Tema</p>
                <p className="text-xs text-muted-foreground">Personalize as cores do app</p>
              </div>
              <div
                className="h-5 w-5 rounded-full border-2 border-white shadow-sm shrink-0"
                style={{ backgroundColor: THEMES.find((t) => t.id === currentTema)?.color || "#3b82f6" }}
              />
            </button>

            {themeOpen && (
              <div className="px-4 pb-4 pt-1 border-t border-border">
                <div className="grid grid-cols-6 gap-2 mt-2">
                  {THEMES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleTheme(t.id)}
                      className="relative flex items-center justify-center h-10 w-full rounded-lg border-2 transition-all"
                      style={{
                        backgroundColor: t.color,
                        borderColor: currentTema === t.id ? "white" : "transparent",
                      }}
                      title={t.label}
                    >
                      {currentTema === t.id && <Check className="h-4 w-4 text-white drop-shadow-md" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-border">
              <div className="px-4 py-3.5">
                <p className="text-sm font-medium text-foreground mb-2">Modo de Exibição</p>
                <div className="flex gap-2">
                  {[
                    { id: "Claro", icon: Sun, label: "Claro" },
                    { id: "Escuro", icon: Moon, label: "Escuro" },
                    { id: "Automático", icon: Monitor, label: "Auto" },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => handleDarkMode(mode.id)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                        temaLayout === mode.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <mode.icon className="h-3.5 w-3.5" />
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {isDono && (
          <div className="mb-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
              Ajuda
            </h3>
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <button
                onClick={() => window.dispatchEvent(new Event("open-tutorial"))}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors"
              >
                <div className="h-9 w-9 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
                  <GraduationCap className="h-4.5 w-4.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium text-foreground">Tutorial do Sistema</p>
                  <p className="text-xs text-muted-foreground">Reveja o guia passo-a-passo</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            </div>
          </div>
        )}

        <div className="mb-8">
          <Button
            variant="outline"
            className="w-full h-12 rounded-2xl text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200 dark:border-red-900/30"
            onClick={logout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sair da Conta
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
