import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiUrl } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Search, RotateCcw, Settings2, HelpCircle, AlertTriangle, MessageCircle } from "lucide-react";
import { renderWhatsappTemplate } from "@/lib/waTemplates";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type Parametro = {
  id: number;
  chave: string;
  valor: string;
  tipo: string;
  label: string;
  categoria: string;
  opcoes: string[];
  valorPadrao: string;
};

const CLIENT_NOTIF_CHAVES = [
  "notif_cliente_lembrete_1dia",
  "notif_cliente_lembrete_2h",
  "notif_cliente_lembrete_30min",
  "notif_cliente_mensagem",
];

export default function Parametros() {
  const { barbeariaId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filtro, setFiltro] = useState("");
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});

  const { data: parametros = [], isLoading } = useQuery<Parametro[]>({
    queryKey: ["parametros", barbeariaId],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/parametros`), { credentials: "include" });
      if (!res.ok) throw new Error("Erro ao carregar parâmetros");
      return res.json();
    },
    enabled: !!barbeariaId,
  });

  const saveMutation = useMutation({
    mutationFn: async ({ chave, valor }: { chave: string; valor: string }) => {
      const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/parametros/${chave}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ valor }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw Object.assign(new Error(data.error || "Erro ao salvar"), { code: data.code });
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["parametros"] });
      queryClient.invalidateQueries({ queryKey: ["parametros-layout"] });
      setEditedValues(prev => {
        const next = { ...prev };
        delete next[variables.chave];
        return next;
      });
      toast({ title: "Parâmetro salvo com sucesso" });
    },
    onError: (err: any) => {
      if (err.code === "google_client_id_required") {
        toast({
          title: "Login com Google não configurado",
          description: err.message,
          variant: "destructive",
        });
      } else {
        toast({ title: "Erro ao salvar parâmetro", variant: "destructive" });
      }
    },
  });

  const resetMutation = useMutation({
    mutationFn: async (chave: string) => {
      const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/parametros/${chave}`), {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erro ao restaurar");
      return res.json();
    },
    onSuccess: (_data, chave) => {
      queryClient.invalidateQueries({ queryKey: ["parametros"] });
      queryClient.invalidateQueries({ queryKey: ["parametros-layout"] });
      setEditedValues(prev => {
        const next = { ...prev };
        delete next[chave];
        return next;
      });
      toast({ title: "Restaurado ao valor padrão" });
    },
    onError: () => {
      toast({ title: "Erro ao restaurar parâmetro", variant: "destructive" });
    },
  });

  const HIDDEN_CHAVES = new Set(["agenda_horario_inicio", "agenda_horario_fim"]);
  const filtered = parametros.filter(p =>
    !HIDDEN_CHAVES.has(p.chave) && (
      p.label.toLowerCase().includes(filtro.toLowerCase()) ||
      p.categoria.toLowerCase().includes(filtro.toLowerCase())
    )
  );

  const groupedFiltered = filtered.reduce<Record<string, Parametro[]>>((acc, p) => {
    if (!acc[p.categoria]) acc[p.categoria] = [];
    acc[p.categoria].push(p);
    return acc;
  }, {});

  const getDisplayValue = (p: Parametro) => {
    return editedValues[p.chave] !== undefined ? editedValues[p.chave] : p.valor;
  };

  const handleValueChange = (chave: string, valor: string) => {
    setEditedValues(prev => ({ ...prev, [chave]: valor }));
  };

  const isModified = (p: Parametro) => {
    return editedValues[p.chave] !== undefined && editedValues[p.chave] !== p.valor;
  };

  const { data: googleData } = useQuery<{ clientId: string }>({
    queryKey: ["google-client-id"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/lgpd/google-client-id"), { credentials: "include" });
      if (!res.ok) return { clientId: "" };
      return res.json();
    },
  });
  const googleConfigured = !!(googleData?.clientId?.trim());

  const hasActiveClientNotif = CLIENT_NOTIF_CHAVES.some(k => {
    const p = parametros.find(x => x.chave === k);
    return p?.valor === "Sim";
  });

  return (
    <AppLayout>
      <div className="mb-6 flex items-center gap-2">
        <h1 className="text-[24px] font-bold text-foreground">Configuração de Parâmetros</h1>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <HelpCircle className="h-5 w-5 text-foreground/30" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>Personalize as regras de negócio do seu estabelecimento. Cada parâmetro pode ser salvo individualmente ou restaurado ao padrão.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {!googleConfigured && hasActiveClientNotif && (
        <div className="mb-4 flex items-start gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-[13px] font-semibold text-amber-700 dark:text-amber-300">Atenção: Google Client ID não configurado</p>
            <p className="text-[12px] text-amber-600 dark:text-amber-400 mt-0.5">As notificações para clientes estão ativadas, mas o login com Google não está configurado. As notificações push para clientes serão interrompidas.</p>
          </div>
        </div>
      )}

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/30" />
        <Input
          placeholder="Filtrar..."
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          className="pl-10 h-10 rounded-xl border-border bg-card text-[14px]"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Settings2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-foreground/40 text-[14px]">Nenhum parâmetro encontrado.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedFiltered).map(([categoria, params]) => (
            <div key={categoria}>
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-[13px] font-semibold text-foreground/60 uppercase tracking-wide">{categoria}</h2>
                {categoria === "Notificações para Clientes" && !googleConfigured && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Esta função requer que o login com Google esteja ativo. Configure o Google Client ID nos parâmetros antes de ativar.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              {categoria === "Templates WhatsApp" ? (
                <WhatsappTemplatesSection
                  params={params}
                  getDisplayValue={getDisplayValue}
                  handleValueChange={handleValueChange}
                  isModified={isModified}
                  onSave={(chave, valor) => saveMutation.mutate({ chave, valor })}
                  onReset={(chave) => resetMutation.mutate(chave)}
                  saving={saveMutation.isPending}
                />
              ) : (
              <div className="bg-card rounded-2xl border border-border overflow-hidden">
                {params.map((p, idx) => {
                  const currentVal = getDisplayValue(p);
                  const modified = isModified(p);
                  const isEven = idx % 2 === 0;
                  const isClientNotif = CLIENT_NOTIF_CHAVES.includes(p.chave);
                  return (
                    <div
                      key={p.chave}
                      className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-4 py-2.5 border-b border-border last:border-b-0 ${isEven ? "bg-card" : "bg-muted/30"}`}
                    >
                      <div className="flex-1 min-w-0">
                        <span className="text-[13px] text-foreground leading-tight">
                          <span className="text-primary font-medium mr-2">{idx + 1} -</span>
                          {p.label}
                        </span>
                        {isClientNotif && !googleConfigured && currentVal === "Sim" && (
                          <p className="text-[11px] text-amber-500 mt-0.5">⚠ Requer login com Google configurado</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {p.tipo === "select" && p.opcoes.length > 0 ? (
                          <select
                            value={currentVal}
                            onChange={(e) => { handleValueChange(p.chave, e.target.value); saveMutation.mutate({ chave: p.chave, valor: e.target.value }); }}
                            className="h-8 rounded-lg border border-border bg-card px-2 text-[12px] text-foreground min-w-[160px]"
                          >
                            {p.opcoes.map(o => (
                              <option key={o} value={o}>{o}</option>
                            ))}
                          </select>
                        ) : (
                          <Input
                            value={currentVal}
                            onChange={(e) => handleValueChange(p.chave, e.target.value)}
                            onBlur={() => { if (isModified(p)) saveMutation.mutate({ chave: p.chave, valor: currentVal }); }}
                            onKeyDown={(e) => { if (e.key === "Enter" && isModified(p)) saveMutation.mutate({ chave: p.chave, valor: currentVal }); }}
                            className="h-8 rounded-lg border-border text-[12px] w-[160px]"
                          />
                        )}
                        {p.tipo !== "select" && (
                          <Button
                            size="sm"
                            onClick={() => saveMutation.mutate({ chave: p.chave, valor: currentVal })}
                            disabled={!modified || saveMutation.isPending}
                            className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] disabled:opacity-40"
                          >
                            Salvar
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => resetMutation.mutate(p.chave)}
                          disabled={p.valor === p.valorPadrao && !modified}
                          className="h-8 w-8 p-0 rounded-lg border-red-200 dark:border-red-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-600 disabled:opacity-40"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
              )}
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}

const WA_VARIABLES: Array<{ key: string; label: string; sample: string }> = [
  { key: "cliente", label: "Nome do cliente", sample: "Maria Silva" },
  { key: "servico", label: "Nome do serviço", sample: "Corte + Escova" },
  { key: "data", label: "Data do agendamento", sample: "25/04/2026" },
  { key: "hora", label: "Hora do agendamento", sample: "14:30" },
  { key: "profissional", label: "Nome do profissional", sample: "Ana" },
  { key: "estabelecimento", label: "Nome do estabelecimento", sample: "Glow Upi Salão" },
  { key: "valor", label: "Valor (R$)", sample: "R$ 80,00" },
];

const SAMPLE_VARS: Record<string, string> = WA_VARIABLES.reduce((acc, v) => {
  acc[v.key] = v.sample;
  return acc;
}, {} as Record<string, string>);

type WhatsappTemplatesSectionProps = {
  params: Parametro[];
  getDisplayValue: (p: Parametro) => string;
  handleValueChange: (chave: string, valor: string) => void;
  isModified: (p: Parametro) => boolean;
  onSave: (chave: string, valor: string) => void;
  onReset: (chave: string) => void;
  saving: boolean;
};

function WhatsappTemplatesSection({
  params, getDisplayValue, handleValueChange, isModified, onSave, onReset, saving,
}: WhatsappTemplatesSectionProps) {
  const textareaRefs = React.useRef<Record<string, HTMLTextAreaElement | null>>({});

  const insertVariable = (chave: string, currentVal: string, varKey: string) => {
    const token = `{{${varKey}}}`;
    const ta = textareaRefs.current[chave];
    if (ta && document.activeElement !== ta) {
      ta.focus();
    }
    if (ta && typeof ta.selectionStart === "number" && typeof ta.selectionEnd === "number") {
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const next = currentVal.slice(0, start) + token + currentVal.slice(end);
      handleValueChange(chave, next);
      requestAnimationFrame(() => {
        const el = textareaRefs.current[chave];
        if (el) {
          const pos = start + token.length;
          el.focus();
          el.setSelectionRange(pos, pos);
        }
      });
    } else {
      handleValueChange(chave, `${currentVal}${token}`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-xl p-3">
        <div className="flex items-start gap-2">
          <MessageCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
          <div className="text-[12px] text-emerald-900 dark:text-emerald-100 leading-relaxed">
            <p className="font-semibold mb-1">Variáveis disponíveis</p>
            <p className="text-[11px] text-emerald-800/90 dark:text-emerald-200/80 mb-2">
              Use as chaves abaixo entre <code className="bg-emerald-100 dark:bg-emerald-900/60 px-1 rounded">{"{{"}{"}}"}</code> dentro do texto. Elas serão substituídas pelos dados reais quando o WhatsApp abrir.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {WA_VARIABLES.map(v => (
                <span
                  key={v.key}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-[10.5px] font-mono"
                  title={v.label}
                >
                  {`{{${v.key}}}`}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {params.map((p) => {
          const currentVal = getDisplayValue(p);
          const modified = isModified(p);
          const preview = renderWhatsappTemplate(currentVal, SAMPLE_VARS);
          return (
            <div
              key={p.chave}
              className="bg-card rounded-2xl border border-border p-4 space-y-3"
              data-testid={`wa-template-${p.chave}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-foreground leading-tight">{p.label}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    onClick={() => onSave(p.chave, currentVal)}
                    disabled={!modified || saving}
                    className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] disabled:opacity-40"
                    data-testid={`btn-save-${p.chave}`}
                  >
                    Salvar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onReset(p.chave)}
                    disabled={p.valor === p.valorPadrao && !modified}
                    className="h-8 w-8 p-0 rounded-lg border-red-200 dark:border-red-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-600 disabled:opacity-40"
                    title="Restaurar padrão"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <Textarea
                ref={(el) => { textareaRefs.current[p.chave] = el; }}
                value={currentVal}
                onChange={(e) => handleValueChange(p.chave, e.target.value)}
                rows={3}
                className="text-[12.5px] font-mono leading-relaxed"
                placeholder="Digite a mensagem do WhatsApp..."
                data-testid={`textarea-${p.chave}`}
              />

              <div className="flex flex-wrap gap-1.5">
                <span className="text-[10.5px] text-foreground/50 mr-1 self-center">Inserir variável:</span>
                {WA_VARIABLES.map(v => (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => insertVariable(p.chave, currentVal, v.key)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted hover:bg-muted/70 text-foreground/70 text-[10.5px] font-mono transition-colors"
                    title={`Inserir ${v.label}`}
                  >
                    + {`{{${v.key}}}`}
                  </button>
                ))}
              </div>

              <div className="rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/60 dark:bg-emerald-950/20 p-3">
                <p className="text-[10.5px] uppercase tracking-wide text-emerald-700 dark:text-emerald-300 font-semibold mb-1">
                  Pré-visualização (com dados de exemplo)
                </p>
                <p
                  className="text-[12.5px] text-foreground/90 whitespace-pre-wrap leading-relaxed"
                  data-testid={`preview-${p.chave}`}
                >
                  {preview || <span className="text-foreground/40 italic">Mensagem vazia</span>}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
