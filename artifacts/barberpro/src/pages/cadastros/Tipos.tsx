import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useApiList, useApiCreate, useApiUpdate, useApiDelete } from "@/hooks/useCrudApi";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, Tag, Settings, Wrench } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";

type TabKey = "categoria_servico" | "categoria_profissional" | "categoria_produto" | "forma_pagamento" | "tipo_despesa" | "tipo_receita" | "subconta" | "equipamento" | "fornecedor" | "anamnese" | "bandeira" | "remuneracao" | "deducao";

const TABS: { key: TabKey; label: string; queryParam: string }[] = [
  { key: "categoria_servico", label: "Categorias de Serviço", queryParam: "" },
  { key: "categoria_profissional", label: "Categorias de Profissional", queryParam: "profissional" },
  { key: "categoria_produto", label: "Categorias de Produto", queryParam: "produto" },
  { key: "forma_pagamento", label: "Formas de Pagamento", queryParam: "pagamento" },
  { key: "tipo_despesa", label: "Tipos de Despesa", queryParam: "despesa" },
  { key: "tipo_receita", label: "Tipos de Receita", queryParam: "receita" },
  { key: "subconta", label: "Subcontas", queryParam: "subconta" },
  { key: "equipamento", label: "Equipamentos", queryParam: "equipamento" },
  { key: "fornecedor", label: "Fornecedores", queryParam: "fornecedor" },
  { key: "anamnese", label: "Tipo Anamnese", queryParam: "anamnese" },
  { key: "bandeira", label: "Bandeiras", queryParam: "bandeira" },
  { key: "remuneracao", label: "Remunerações", queryParam: "remuneracao" },
  { key: "deducao", label: "Deduções", queryParam: "deducao" },
];

function getInitialTab(): TabKey {
  const params = new URLSearchParams(window.location.search);
  const cat = params.get("cat");
  if (cat) {
    const found = TABS.find(t => t.queryParam === cat);
    if (found) return found.key;
  }
  return "categoria_servico";
}

export default function Tipos() {
  const { barbeariaId } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<TabKey>(getInitialTab);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cat = params.get("cat");
    if (cat) {
      const found = TABS.find(t => t.queryParam === cat);
      if (found) setTab(found.key);
    } else {
      setTab("categoria_servico");
    }
  }, [window.location.search]);

  const isEquipamento = tab === "equipamento";
  const tiposPath = `/barbearias/${barbeariaId}/tipos`;
  const equipPath = `/barbearias/${barbeariaId}/equipamentos`;

  const { data: tipos = [], isLoading: tiposLoading } = useApiList("tipos", tiposPath, !!barbeariaId && !isEquipamento);
  const { data: equipamentos = [], isLoading: equipLoading } = useApiList("equipamentos", equipPath, !!barbeariaId && isEquipamento);
  const createTipo = useApiCreate("tipos", tiposPath);
  const updateTipo = useApiUpdate("tipos", tiposPath);
  const deleteTipo = useApiDelete("tipos", tiposPath);
  const createEquip = useApiCreate("equipamentos", equipPath);
  const updateEquip = useApiUpdate("equipamentos", equipPath);
  const deleteEquip = useApiDelete("equipamentos", equipPath);

  const filtered = isEquipamento
    ? (equipamentos as any[])
    : (tipos as any[]).filter(t => t.categoria === tab);
  const isLoading = isEquipamento ? equipLoading : tiposLoading;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      if (isEquipamento) {
        await handleEquipSubmit(fd);
      } else {
        const data = { categoria: tab, nome: fd.get("nome") as string, descricao: fd.get("descricao") as string };
        if (editing) {
          await updateTipo.mutateAsync({ id: editing.id, ...data });
          toast({ title: "Tipo atualizado" });
        } else {
          await createTipo.mutateAsync(data);
          toast({ title: "Tipo criado" });
        }
      }
      setDialogOpen(false);
      setEditing(null);
    } catch { toast({ title: "Erro", variant: "destructive" }); }
  }

  async function handleEquipSubmit(fd: FormData) {
    const data = {
      nome: fd.get("nome") as string,
      descricao: fd.get("descricao") as string,
      quantidadeMaxima: parseInt(fd.get("quantidadeMaxima") as string) || 1,
      servicosIds: equipSelectedServices,
    };
    if (editing) {
      await updateEquip.mutateAsync({ id: editing.id, ...data });
      toast({ title: "Equipamento atualizado" });
    } else {
      await createEquip.mutateAsync(data);
      toast({ title: "Equipamento criado" });
    }
  }

  async function handleToggle(item: any) {
    try {
      if (isEquipamento) {
        await updateEquip.mutateAsync({ id: item.id, ativo: !item.ativo });
      } else {
        await updateTipo.mutateAsync({ id: item.id, ativo: !item.ativo });
      }
    } catch { toast({ title: "Erro", variant: "destructive" }); }
  }

  async function handleDelete(id: number) {
    try {
      if (isEquipamento) {
        await deleteEquip.mutateAsync(id);
        toast({ title: "Equipamento removido" });
      } else {
        await deleteTipo.mutateAsync(id);
        toast({ title: "Tipo removido" });
      }
    } catch { toast({ title: "Erro", variant: "destructive" }); }
  }

  const currentTabLabel = TABS.find(t => t.key === tab)?.label || "Tipo";

  const [servicos, setServicos] = useState<any[]>([]);
  const [equipSelectedServices, setEquipSelectedServices] = useState<number[]>([]);
  const BASE = import.meta.env.BASE_URL;

  useEffect(() => {
    if (barbeariaId && isEquipamento) {
      fetch(`${BASE}api/barbearias/${barbeariaId}/servicos`, { credentials: "include" })
        .then(r => r.ok ? r.json() : [])
        .then(setServicos)
        .catch(() => {});
    }
  }, [barbeariaId, isEquipamento]);

  function openEquipEdit(item: any) {
    setEditing(item);
    setEquipSelectedServices((item.servicosIds as number[]) || []);
    setDialogOpen(true);
  }

  function openNew() {
    setEditing(null);
    setEquipSelectedServices([]);
    setDialogOpen(true);
  }

  function toggleService(id: number) {
    setEquipSelectedServices(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  }

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Tipos / Categorias</h1>
          <p className="text-muted-foreground mt-1">Gerencie categorias e tipos do sistema</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" /> {isEquipamento ? "Novo Equipamento" : "Novo Tipo"}
        </Button>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map(t => (
          <Button key={t.key} variant={tab === t.key ? "default" : "outline"} size="sm" onClick={() => setTab(t.key)}>
            {t.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">
          {isEquipamento ? "Nenhum equipamento cadastrado." : "Nenhum tipo cadastrado nesta categoria."}
        </p>
      ) : isEquipamento ? (
        <div className="space-y-2">
          {filtered.map((item: any) => (
            <div key={item.id} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Wrench className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{item.nome}</p>
                {item.descricao && <p className="text-xs text-muted-foreground">{item.descricao}</p>}
                <div className="flex items-center gap-3 mt-1">
                  <Badge variant="outline" className="text-xs">Qtd máx: {item.quantidadeMaxima}</Badge>
                  {item.servicosNomes?.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      Serviços: {item.servicosNomes.join(", ")}
                    </span>
                  )}
                </div>
              </div>
              <Switch checked={item.ativo} onCheckedChange={() => handleToggle(item)} />
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEquipEdit(item)}>
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400" onClick={() => handleDelete(item.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item: any) => (
            <div key={item.id} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Tag className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{item.nome}</p>
                {item.descricao && <p className="text-xs text-muted-foreground">{item.descricao}</p>}
              </div>
              <Switch checked={item.ativo} onCheckedChange={() => handleToggle(item)} />
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditing(item); setDialogOpen(true); }}>
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400" onClick={() => handleDelete(item.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className={isEquipamento ? "max-w-lg" : ""}>
          <DialogHeader><DialogTitle>{editing ? "Editar" : "Novo"} {isEquipamento ? "Equipamento" : currentTabLabel}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><Label>Nome</Label><Input name="nome" required defaultValue={editing?.nome || ""} key={editing?.id || "new"} /></div>
            <div><Label>Descrição</Label><Input name="descricao" defaultValue={editing?.descricao || ""} key={(editing?.id || "new") + "_desc"} /></div>
            {isEquipamento && (
              <>
                <div>
                  <Label>Quantidade Máxima (uso simultâneo)</Label>
                  <Input name="quantidadeMaxima" type="number" min="1" defaultValue={editing?.quantidadeMaxima || 1} key={(editing?.id || "new") + "_qty"} className="mt-1" />
                  <p className="text-xs text-muted-foreground mt-1">Quantos deste equipamento estão disponíveis para uso simultâneo</p>
                </div>
                <div>
                  <Label className="mb-2 block">Serviços Associados</Label>
                  <p className="text-xs text-muted-foreground mb-2">Selecione os serviços que utilizam este equipamento</p>
                  <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-1">
                    {servicos.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-2">Nenhum serviço cadastrado</p>
                    ) : servicos.map((s: any) => (
                      <label key={s.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 cursor-pointer text-sm">
                        <Checkbox
                          checked={equipSelectedServices.includes(s.id)}
                          onCheckedChange={() => toggleService(s.id)}
                        />
                        {s.nome}
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}
            <Button type="submit" className="w-full" disabled={createTipo.isPending || updateTipo.isPending || createEquip.isPending || updateEquip.isPending}>
              {editing ? "Salvar" : "Criar"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
