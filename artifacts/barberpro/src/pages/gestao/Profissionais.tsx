import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import {
  useListProfissionais, useCreateProfissional,
  useUpdateProfissional, useDeleteProfissional
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, Users, Award, ToggleLeft, ToggleRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type Prof = {
  id: number;
  nomeExibicao: string;
  especialidade: string | null;
  comissaoTipo: string;
  comissaoValor: number;
  ativo: boolean;
};

function ProfForm({
  initial, onSave, onCancel, isPending
}: {
  initial?: Partial<Prof>;
  onSave: (d: any) => void;
  onCancel: () => void;
  isPending?: boolean;
}) {
  const [nome, setNome] = useState(initial?.nomeExibicao ?? "");
  const [esp, setEsp] = useState(initial?.especialidade ?? "");
  const [tipo, setTipo] = useState<string>(initial?.comissaoTipo ?? "percentual");
  const [valor, setValor] = useState(String(initial?.comissaoValor ?? ""));

  return (
    <form onSubmit={e => { e.preventDefault(); onSave({ nomeExibicao: nome, especialidade: esp || null, comissaoTipo: tipo, comissaoValor: parseFloat(valor) }); }} className="space-y-4 mt-2">
      <div className="space-y-2">
        <Label>Nome de Exibição *</Label>
        <Input value={nome} onChange={e => setNome(e.target.value)} required placeholder="Ex: João Barbeiro" className="bg-background" />
      </div>
      <div className="space-y-2">
        <Label>Especialidade</Label>
        <Input value={esp} onChange={e => setEsp(e.target.value)} placeholder="Ex: Especialista em Degradê" className="bg-background" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tipo de Comissão</Label>
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="percentual">Percentual (%)</SelectItem>
              <SelectItem value="valor_fixo">Valor Fixo (R$)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{tipo === "percentual" ? "Porcentagem (%)" : "Valor (R$)"}</Label>
          <Input
            type="number" step="0.01" min="0"
            value={valor} onChange={e => setValor(e.target.value)}
            required placeholder={tipo === "percentual" ? "40" : "30.00"}
            className="bg-background"
          />
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="submit" className="flex-1" disabled={isPending}>
          {isPending ? "Salvando..." : "Salvar"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
      </div>
    </form>
  );
}

export default function Profissionais() {
  const { barbeariaId } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: profissionais = [], isLoading } = useListProfissionais(barbeariaId!, { query: { enabled: !!barbeariaId } });
  const createMutation = useCreateProfissional();
  const updateMutation = useUpdateProfissional();
  const deleteMutation = useDeleteProfissional();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Prof | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Prof | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["/api/barbearias", barbeariaId, "profissionais"] });

  const handleSave = async (data: any) => {
    try {
      if (editing) {
        await updateMutation.mutateAsync({ barbeariaId: barbeariaId!, profissionalId: editing.id, data });
        toast({ title: "Profissional atualizado!" });
      } else {
        await createMutation.mutateAsync({ barbeariaId: barbeariaId!, data });
        toast({ title: "Profissional adicionado!" });
      }
      invalidate();
      setModalOpen(false);
      setEditing(null);
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  };

  const handleToggleAtivo = async (p: Prof) => {
    try {
      await updateMutation.mutateAsync({ barbeariaId: barbeariaId!, profissionalId: p.id, data: { ativo: !p.ativo } });
      invalidate();
      toast({ title: p.ativo ? "Profissional desativado" : "Profissional reativado" });
    } catch {
      toast({ title: "Erro", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync({ barbeariaId: barbeariaId!, profissionalId: deleteTarget.id });
      invalidate();
      toast({ title: "Profissional removido" });
      setDeleteTarget(null);
    } catch {
      toast({ title: "Erro ao remover", variant: "destructive" });
    }
  };

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Profissionais</h1>
          <p className="text-muted-foreground mt-1">Gerencie a equipe da barbearia</p>
        </div>
        <Button className="shadow-lg shadow-primary/25" onClick={() => { setEditing(null); setModalOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Adicionar Membro
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-card rounded-2xl animate-pulse" />)}</div>
      ) : (profissionais as Prof[]).length === 0 ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-border">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium">Nenhum profissional cadastrado</h3>
          <p className="text-muted-foreground text-sm mt-1">Adicione barbeiros e profissionais à sua equipe.</p>
          <Button className="mt-4" onClick={() => setModalOpen(true)}>Adicionar primeiro profissional</Button>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl">
          {(profissionais as Prof[]).map((p, i) => (
            <div key={p.id} className={`flex items-center gap-4 p-5 hover:bg-muted/20 transition-colors ${i !== 0 ? "border-t border-border" : ""} ${!p.ativo ? "opacity-50" : ""}`}>
              <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg border border-primary/20 shrink-0">
                {p.nomeExibicao.charAt(0).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-foreground">{p.nomeExibicao}</p>
                  <Badge variant={p.ativo ? "default" : "secondary"} className={p.ativo ? "bg-green-500/15 text-green-400 border-green-500/25 text-xs" : "text-xs"}>
                    {p.ativo ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{p.especialidade || "Sem especialidade definida"}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="text-right hidden sm:block">
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    <Award className="h-4 w-4 text-primary" />
                    <span className="text-primary">
                      {p.comissaoTipo === "percentual" ? `${p.comissaoValor}%` : formatCurrency(p.comissaoValor)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{p.comissaoTipo === "percentual" ? "comissão" : "valor fixo"}</p>
                </div>

                <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-primary" title={p.ativo ? "Desativar" : "Ativar"} onClick={() => handleToggleAtivo(p)}>
                  {p.ativo ? <ToggleRight className="h-5 w-5 text-green-400" /> : <ToggleLeft className="h-5 w-5" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-primary" onClick={() => { setEditing(p); setModalOpen(true); }}>
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(p)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={modalOpen} onOpenChange={v => { setModalOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="bg-card border-border sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-display">{editing ? "Editar Profissional" : "Novo Profissional"}</DialogTitle>
          </DialogHeader>
          <ProfForm
            initial={editing ?? {}}
            onSave={handleSave}
            onCancel={() => { setModalOpen(false); setEditing(null); }}
            isPending={createMutation.isPending || updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={v => { if (!v) setDeleteTarget(null); }}>
        <DialogContent className="bg-card border-border sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle className="text-destructive">Remover Profissional</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mt-2">
            Tem certeza que deseja remover <strong className="text-foreground">{deleteTarget?.nomeExibicao}</strong>? Esta ação não pode ser desfeita.
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
