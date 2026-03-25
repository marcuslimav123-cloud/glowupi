import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiUrl } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Search, Save, RotateCcw, Settings2 } from "lucide-react";

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
      if (!res.ok) throw new Error("Erro ao salvar");
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["parametros"] });
      setEditedValues(prev => {
        const next = { ...prev };
        delete next[variables.chave];
        return next;
      });
      toast({ title: "Parâmetro salvo com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao salvar parâmetro", variant: "destructive" });
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

  const categorias = [...new Set(filtered.map(p => p.categoria))];

  const getDisplayValue = (p: Parametro) => {
    return editedValues[p.chave] !== undefined ? editedValues[p.chave] : p.valor;
  };

  const handleValueChange = (chave: string, valor: string) => {
    setEditedValues(prev => ({ ...prev, [chave]: valor }));
  };

  const isModified = (p: Parametro) => {
    return editedValues[p.chave] !== undefined && editedValues[p.chave] !== p.valor;
  };

  let globalIndex = 0;

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-[24px] font-bold text-foreground">Configuração de Parâmetros</h1>
        <p className="text-foreground/40 text-[14px] mt-0.5">Personalize as regras de negócio do seu estabelecimento</p>
      </div>

      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/30" />
        <Input
          placeholder="Filtrar parâmetros..."
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          className="pl-10 h-10 rounded-xl border-black/[0.08] bg-white text-[14px]"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
        </div>
      ) : categorias.length === 0 ? (
        <div className="text-center py-20">
          <Settings2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-foreground/40 text-[14px]">Nenhum parâmetro encontrado.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {categorias.map(cat => {
            const items = filtered.filter(p => p.categoria === cat);
            return (
              <div key={cat}>
                <h2 className="text-[16px] font-semibold text-foreground mb-3 flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  {cat}
                </h2>
                <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden divide-y divide-black/[0.04]">
                  {items.map(p => {
                    globalIndex++;
                    const currentVal = getDisplayValue(p);
                    const modified = isModified(p);
                    return (
                      <div key={p.chave} className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3">
                        <div className="flex-1 min-w-0">
                          <span className="text-[13px] text-foreground">
                            <span className="text-foreground/30 font-mono mr-2">{String(globalIndex).padStart(2, "0")}.</span>
                            {p.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {p.tipo === "select" && p.opcoes.length > 0 ? (
                            <select
                              value={currentVal}
                              onChange={(e) => handleValueChange(p.chave, e.target.value)}
                              className="h-9 rounded-lg border border-black/[0.08] bg-white px-3 text-[13px] text-foreground min-w-[160px]"
                            >
                              {p.opcoes.map(o => (
                                <option key={o} value={o}>{o}</option>
                              ))}
                            </select>
                          ) : (
                            <Input
                              value={currentVal}
                              onChange={(e) => handleValueChange(p.chave, e.target.value)}
                              className="h-9 rounded-lg border-black/[0.08] text-[13px] w-[160px]"
                            />
                          )}
                          <Button
                            size="sm"
                            onClick={() => saveMutation.mutate({ chave: p.chave, valor: currentVal })}
                            disabled={!modified || saveMutation.isPending}
                            className="h-9 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] disabled:opacity-40"
                          >
                            <Save className="h-3.5 w-3.5 mr-1" />
                            Salvar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => resetMutation.mutate(p.chave)}
                            disabled={p.valor === p.valorPadrao && !modified}
                            className="h-9 px-3 rounded-lg border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 text-[12px] disabled:opacity-40"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}
