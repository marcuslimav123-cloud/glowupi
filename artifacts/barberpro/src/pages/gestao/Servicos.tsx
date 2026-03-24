import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import {
  useListServicos, useCreateServico,
  useUpdateServico, useDeleteServico
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Clock, DollarSign, Settings2, Edit2, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type Servico = {
  id: number;
  nome: string;
  descricao: string | null;
  preco: number;
  duracaoMinutos: number;
  ativo: boolean;
};

function ServicoForm({
  initial, onSave, onCancel, isPending
}: {
  initial?: Partial<Servico>;
  onSave: (d: any) => void;
  onCancel: () => void;
  isPending?: boolean;
}) {
  const [nome, setNome] = useState(initial?.nome ?? "");
  const [preco, setPreco] = useState(String(initial?.preco ?? ""));
  const [duracao, setDuracao] = useState(String(initial?.duracaoMinutos ?? "30"));
  const [desc, setDesc] = useState(initial?.descricao ?? "");

  return (
    <form onSubmit={e => { e.preventDefault(); onSave({ nome, preco: parseFloat(preco), duracaoMinutos: parseInt(duracao), descricao: desc || null }); }} className="space-y-4 mt-2">
      <div className="space-y-2">
        <Label>Nome do Serviço *</Label>
        <Input value={nome} onChange={e => setNome(e.target.value)} required placeholder="Ex: Unha em Gel, Limpeza de Pele" className="bg-background" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Preço (R$) *</Label>
          <Input type="number" step="0.01" min="0" value={preco} onChange={e => setPreco(e.target.value)} required placeholder="35.00" className="bg-background" />
        </div>
        <div className="space-y-2">
          <Label>Duração (min) *</Label>
          <Input type="number" min="5" step="5" value={duracao} onChange={e => setDuracao(e.target.value)} required placeholder="30" className="bg-background" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Descrição <span className="text-muted-foreground text-xs">(opcional)</span></Label>
        <Textarea value={desc} onChange={e => setDesc(e.target.value)} className="bg-background resize-none" rows={2} placeholder="Descreva o serviço..." />
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="submit" className="flex-1" disabled={isPending}>
          {isPending ? "Salvando..." : "Salvar Serviço"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
      </div>
    </form>
  );
}

export default function Servicos() {
  const { barbeariaId } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: servicos = [], isLoading } = useListServicos(barbeariaId!, { query: { enabled: !!barbeariaId } });
  const createMutation = useCreateServico();
  const updateMutation = useUpdateServico();
  const deleteMutation = useDeleteServico();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Servico | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Servico | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["/api/barbearias", barbeariaId, "servicos"] });

  const handleSave = async (data: any) => {
    try {
      if (editing) {
        await updateMutation.mutateAsync({ barbeariaId: barbeariaId!, servicoId: editing.id, data });
        toast({ title: "Serviço atualizado!" });
      } else {
        await createMutation.mutateAsync({ barbeariaId: barbeariaId!, data });
        toast({ title: "Serviço criado!" });
      }
      invalidate();
      setModalOpen(false);
      setEditing(null);
    } catch {
      toast({ title: "Erro ao salvar serviço", variant: "destructive" });
    }
  };

  const handleToggle = async (s: Servico) => {
    await updateMutation.mutateAsync({ barbeariaId: barbeariaId!, servicoId: s.id, data: { ativo: !s.ativo } });
    invalidate();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync({ barbeariaId: barbeariaId!, servicoId: deleteTarget.id });
      invalidate();
      toast({ title: "Serviço removido" });
      setDeleteTarget(null);
    } catch {
      toast({ title: "Erro ao remover", variant: "destructive" });
    }
  };

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Serviços</h1>
          <p className="text-muted-foreground mt-1">Catálogo de serviços oferecidos</p>
        </div>
        <Button className="shadow-lg shadow-primary/25" onClick={() => { setEditing(null); setModalOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Novo Serviço
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1,2,3].map(i => <div key={i} className="h-48 bg-card rounded-2xl" />)}
        </div>
      ) : (servicos as Servico[]).length === 0 ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-border">
          <Settings2 className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium">Nenhum serviço cadastrado</h3>
          <p className="text-muted-foreground text-sm mt-1">Cadastre seus procedimentos e serviços.</p>
          <Button className="mt-4" onClick={() => setModalOpen(true)}>Criar primeiro serviço</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {(servicos as Servico[]).map(s => (
            <div key={s.id} className={`group bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/30 hover:shadow-lg transition-all relative ${!s.ativo ? "opacity-50" : ""}`}>
              <div className="absolute top-0 left-0 w-1 h-full bg-primary opacity-40 group-hover:opacity-100 transition-opacity" />
              <div className="p-5">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-display font-bold text-lg text-foreground">{s.nome}</h3>
                  <Badge variant={s.ativo ? "secondary" : "outline"} className="text-xs shrink-0">{s.ativo ? "Ativo" : "Inativo"}</Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">{s.descricao || "Sem descrição."}</p>
                <div className="flex items-center gap-5 mt-4">
                  <div className="flex items-center gap-1.5 text-primary font-bold">
                    <DollarSign className="h-4 w-4" />
                    {formatCurrency(s.preco)}
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                    <Clock className="h-4 w-4" />
                    {s.duracaoMinutos} min
                  </div>
                </div>
              </div>
              <div className="border-t border-border px-5 py-3 flex items-center justify-end gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title={s.ativo ? "Desativar" : "Ativar"} onClick={() => handleToggle(s)}>
                  {s.ativo ? <ToggleRight className="h-5 w-5 text-green-400" /> : <ToggleLeft className="h-5 w-5" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => { setEditing(s); setModalOpen(true); }}>
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(s)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={v => { setModalOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="bg-card border-border sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-display">{editing ? "Editar Serviço" : "Novo Serviço"}</DialogTitle>
          </DialogHeader>
          <ServicoForm
            initial={editing ?? {}}
            onSave={handleSave}
            onCancel={() => { setModalOpen(false); setEditing(null); }}
            isPending={createMutation.isPending || updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={v => { if (!v) setDeleteTarget(null); }}>
        <DialogContent className="bg-card border-border sm:max-w-[380px]">
          <DialogHeader><DialogTitle className="text-destructive">Remover Serviço</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground mt-2">
            Tem certeza que deseja remover <strong className="text-foreground">{deleteTarget?.nome}</strong>?
          </p>
          <div className="flex gap-3 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" className="flex-1" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Removendo..." : "Sim, remover"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
