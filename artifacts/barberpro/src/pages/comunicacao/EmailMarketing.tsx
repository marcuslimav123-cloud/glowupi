import React from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { apiUrl } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Mail, Plus, Send, Eye, AlertCircle, CheckCircle2, Clock, FileText, Sparkles, Users, X as XIcon } from "lucide-react";

type Campaign = {
  id: number;
  assunto: string;
  status: string;
  totalDestinatarios: number;
  totalEnviados: number;
  totalEntregues: number;
  totalAbertos: number;
  totalFalhas: number;
  criadaEm: string;
  enviadaEm: string | null;
  finalizadaEm: string | null;
};

type Config = {
  ativado: boolean;
  quota: {
    data: string;
    massa: { usado: number; limite: number; restante: number };
    manual: { usado: number; limite: number; restante: number };
  };
};

const STATUS_LABEL: Record<string, { label: string; cls: string; icon: any }> = {
  rascunho: { label: "Rascunho", cls: "bg-muted text-foreground/60", icon: FileText },
  enviando: { label: "Enviando", cls: "bg-amber-500/15 text-amber-700", icon: Clock },
  concluida: { label: "Concluída", cls: "bg-emerald-500/15 text-emerald-700", icon: CheckCircle2 },
  cancelada: { label: "Cancelada", cls: "bg-rose-500/15 text-rose-700", icon: AlertCircle },
};

function formatDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

type Recipient = {
  id: number;
  email: string;
  nome: string | null;
  status: string;
  erro: string | null;
  enviadoEm: string | null;
  entregueEm: string | null;
  abertoEm: string | null;
};

const RECIPIENT_STATUS: Record<string, { label: string; cls: string }> = {
  pendente: { label: "Pendente", cls: "bg-muted text-foreground/60" },
  enviado: { label: "Enviado", cls: "bg-blue-500/15 text-blue-700 dark:text-blue-300" },
  entregue: { label: "Entregue", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  aberto: { label: "Aberto", cls: "bg-violet-500/15 text-violet-700 dark:text-violet-300" },
  falha: { label: "Falha", cls: "bg-rose-500/15 text-rose-700 dark:text-rose-300" },
};

export default function EmailMarketing() {
  const { barbeariaId, role } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const isDono = role === "dono";
  const [detailsCampaignId, setDetailsCampaignId] = React.useState<number | null>(null);

  const { data: config, isLoading: loadingCfg } = useQuery<Config>({
    queryKey: ["email-marketing-config", barbeariaId],
    queryFn: async () => {
      const r = await fetch(apiUrl(`/barbearias/${barbeariaId}/email-marketing/config`), { credentials: "include" });
      if (!r.ok) throw new Error("Erro ao carregar configuração");
      return r.json();
    },
    enabled: !!barbeariaId,
  });

  const { data: campanhas = [], isLoading: loadingList } = useQuery<Campaign[]>({
    queryKey: ["email-marketing-campanhas", barbeariaId],
    queryFn: async () => {
      const r = await fetch(apiUrl(`/barbearias/${barbeariaId}/email-marketing/campanhas`), { credentials: "include" });
      if (!r.ok) throw new Error("Erro ao carregar campanhas");
      return r.json();
    },
    enabled: !!barbeariaId,
    refetchInterval: (q) => {
      const data = q.state.data as Campaign[] | undefined;
      return data?.some(c => c.status === "enviando") ? 5000 : false;
    },
  });

  const { data: details, isLoading: loadingDetails } = useQuery<{ recipients: Recipient[] }>({
    queryKey: ["email-marketing-campanha-details", barbeariaId, detailsCampaignId],
    queryFn: async () => {
      const r = await fetch(apiUrl(`/barbearias/${barbeariaId}/email-marketing/campanhas/${detailsCampaignId}`), { credentials: "include" });
      if (!r.ok) throw new Error("Erro ao carregar detalhes");
      return r.json();
    },
    enabled: !!barbeariaId && !!detailsCampaignId,
  });

  const toggleAtivado = useMutation({
    mutationFn: async (ativado: boolean) => {
      const r = await fetch(apiUrl(`/barbearias/${barbeariaId}/email-marketing/config`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ativado }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.error || "Erro ao atualizar");
      }
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email-marketing-config", barbeariaId] });
      toast({ title: "Configuração atualizada" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Mail className="h-6 w-6 text-primary" /> E-mail marketing
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Envie campanhas de e-mail para sua base de clientes.</p>
          </div>
          <Link href="/comunicacao/email-marketing/nova">
            <Button disabled={!config?.ativado} className="gap-2">
              <Plus className="h-4 w-4" /> Nova campanha
            </Button>
          </Link>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> Status do E-mail Marketing
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {config?.ativado
                  ? "Ativo — você pode criar e enviar campanhas."
                  : "Inativo — ative para começar a enviar campanhas para seus clientes."}
              </div>
            </div>
            {loadingCfg ? null : (
              <Switch
                checked={!!config?.ativado}
                onCheckedChange={(v) => toggleAtivado.mutate(v)}
                disabled={!isDono || toggleAtivado.isPending}
              />
            )}
          </div>
          {!isDono && (
            <div className="text-[11px] text-muted-foreground mt-2">Apenas o dono pode ativar/desativar.</div>
          )}
          {config && (
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="rounded-xl bg-muted/40 p-3">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Campanhas hoje</div>
                <div className="text-lg font-bold mt-0.5">{config.quota.massa.usado} / {config.quota.massa.limite}</div>
                <div className="text-[11px] text-muted-foreground">restante: {config.quota.massa.restante}</div>
              </div>
              <div className="rounded-xl bg-muted/40 p-3">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Manuais hoje</div>
                <div className="text-lg font-bold mt-0.5">{config.quota.manual.usado} / {config.quota.manual.limite}</div>
                <div className="text-[11px] text-muted-foreground">restante: {config.quota.manual.restante}</div>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-amber-300/40 bg-amber-50/60 dark:bg-amber-950/20 p-4 text-xs text-amber-900 dark:text-amber-200 flex gap-3">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <strong>LGPD:</strong> envie apenas para clientes que aceitaram receber comunicações. Todo e-mail leva um link para descadastro automático. Mensagens transacionais (lembretes, confirmações) não contam na cota.
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div className="font-semibold">Campanhas</div>
            <div className="text-xs text-muted-foreground">{campanhas.length} {campanhas.length === 1 ? "registro" : "registros"}</div>
          </div>
          {loadingList ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Carregando...</div>
          ) : campanhas.length === 0 ? (
            <div className="p-10 text-center">
              <Mail className="h-10 w-10 mx-auto text-muted-foreground/40" />
              <div className="text-sm mt-3 text-muted-foreground">Nenhuma campanha ainda. Crie a primeira para começar.</div>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {campanhas.map(c => {
                const meta = STATUS_LABEL[c.status] || STATUS_LABEL.rascunho;
                const Icon = meta.icon;
                return (
                  <div key={c.id} className="p-4 sm:p-5 flex items-start gap-4 flex-wrap">
                    <div className="flex-1 min-w-[200px]">
                      <div className="font-semibold text-sm">{c.assunto}</div>
                      <div className="text-[11px] text-muted-foreground mt-1">
                        Criada: {formatDate(c.criadaEm)}
                        {c.enviadaEm && <> • Enviada: {formatDate(c.enviadaEm)}</>}
                      </div>
                      {c.status !== "rascunho" && (
                        <div className="text-[11px] text-muted-foreground mt-1">
                          Destinatários: <strong>{c.totalDestinatarios}</strong> • Enviados: <strong>{c.totalEnviados}</strong> • Entregues: <strong>{c.totalEntregues}</strong> • Abertos: <strong>{c.totalAbertos}</strong> • Falhas: <strong>{c.totalFalhas}</strong>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {c.status !== "rascunho" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs gap-1"
                          onClick={() => setDetailsCampaignId(c.id)}
                          data-testid={`btn-ver-destinatarios-${c.id}`}
                        >
                          <Users className="h-3.5 w-3.5" /> Destinatários
                        </Button>
                      )}
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full ${meta.cls}`}>
                        <Icon className="h-3 w-3" /> {meta.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!detailsCampaignId} onOpenChange={(o) => !o && setDetailsCampaignId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" /> Status por destinatário
            </DialogTitle>
          </DialogHeader>
          {loadingDetails ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Carregando destinatários...</div>
          ) : !details?.recipients?.length ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Nenhum destinatário registrado.</div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto -mx-6 px-6">
              <div className="space-y-1.5">
                {details.recipients.map(rc => {
                  const sm = RECIPIENT_STATUS[rc.status] || RECIPIENT_STATUS.pendente;
                  return (
                    <div
                      key={rc.id}
                      className="flex items-start justify-between gap-3 px-3 py-2.5 rounded-lg border border-border bg-card hover:bg-muted/30"
                      data-testid={`recipient-row-${rc.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{rc.nome || rc.email}</div>
                        {rc.nome && <div className="text-[11px] text-muted-foreground truncate">{rc.email}</div>}
                        {rc.status === "falha" && rc.erro && (
                          <div className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 flex items-start gap-1">
                            <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                            <span className="break-words">{rc.erro}</span>
                          </div>
                        )}
                        {rc.status !== "falha" && (rc.entregueEm || rc.enviadoEm) && (
                          <div className="text-[10.5px] text-muted-foreground mt-0.5">
                            {rc.entregueEm ? `Entregue: ${formatDate(rc.entregueEm)}` : `Enviado: ${formatDate(rc.enviadoEm)}`}
                          </div>
                        )}
                      </div>
                      <span className={`inline-flex items-center gap-1 text-[10.5px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${sm.cls}`}>
                        {sm.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
