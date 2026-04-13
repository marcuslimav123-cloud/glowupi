import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiUrl } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Search, RotateCcw, Settings2, HelpCircle, AlertTriangle } from "lucide-react";
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

  const filtered = parametros.filter(p =>
    p.label.toLowerCase().includes(filtro.toLowerCase()) ||
    p.categoria.toLowerCase().includes(filtro.toLowerCase())
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
                            onChange={(e) => handleValueChange(p.chave, e.target.value)}
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
                            className="h-8 rounded-lg border-border text-[12px] w-[160px]"
                          />
                        )}
                        <Button
                          size="sm"
                          onClick={() => saveMutation.mutate({ chave: p.chave, valor: currentVal })}
                          disabled={!modified || saveMutation.isPending}
                          className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] disabled:opacity-40"
                        >
                          Salvar
                        </Button>
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
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
