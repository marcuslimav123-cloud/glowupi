import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useApiList, useApiCreate, useApiUpdate, useApiDelete } from "@/hooks/useCrudApi";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, Tag } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";

type TabKey = "categoria_servico" | "forma_pagamento" | "tipo_despesa" | "tipo_receita" | "subconta" | "equipamento" | "fornecedor" | "anamnese" | "bandeira" | "remuneracao" | "deducao";

const TABS: { key: TabKey; label: string; queryParam: string }[] = [
  { key: "categoria_servico", label: "Categorias de Serviço", queryParam: "" },
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
    }
  }, [window.location.search]);

  const path = `/barbearias/${barbeariaId}/tipos`;
  const { data: tipos = [], isLoading } = useApiList("tipos", path, !!barbeariaId);
  const createTipo = useApiCreate("tipos", path);
  const updateTipo = useApiUpdate("tipos", path);
  const deleteTipo = useApiDelete("tipos", path);

  const filtered = (tipos as any[]).filter(t => t.categoria === tab);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = { categoria: tab, nome: fd.get("nome") as string, descricao: fd.get("descricao") as string };
    try {
      if (editing) {
        await updateTipo.mutateAsync({ id: editing.id, ...data });
        toast({ title: "Tipo atualizado" });
      } else {
        await createTipo.mutateAsync(data);
        toast({ title: "Tipo criado" });
      }
      setDialogOpen(false);
      setEditing(null);
    } catch { toast({ title: "Erro", variant: "destructive" }); }
  }

  async function handleToggle(item: any) {
    try {
      await updateTipo.mutateAsync({ id: item.id, ativo: !item.ativo });
    } catch { toast({ title: "Erro", variant: "destructive" }); }
  }

  async function handleDelete(id: number) {
    try {
      await deleteTipo.mutateAsync(id);
      toast({ title: "Tipo removido" });
    } catch { toast({ title: "Erro", variant: "destructive" }); }
  }

  const currentTabLabel = TABS.find(t => t.key === tab)?.label || "Tipo";

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Tipos / Categorias</h1>
          <p className="text-muted-foreground mt-1">Gerencie categorias e tipos do sistema</p>
        </div>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Novo Tipo
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
        <p className="text-center text-muted-foreground py-12">Nenhum tipo cadastrado nesta categoria.</p>
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
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar" : "Novo"} {currentTabLabel}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><Label>Nome</Label><Input name="nome" required defaultValue={editing?.nome || ""} key={editing?.id || "new"} /></div>
            <div><Label>Descrição</Label><Input name="descricao" defaultValue={editing?.descricao || ""} key={(editing?.id || "new") + "_desc"} /></div>
            <Button type="submit" className="w-full" disabled={createTipo.isPending || updateTipo.isPending}>
              {editing ? "Salvar" : "Criar"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
