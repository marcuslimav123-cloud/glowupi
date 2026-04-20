import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useApiList, useApiCreate, useApiUpdate, useApiDelete } from "@/hooks/useCrudApi";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, Ticket, Percent, DollarSign } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";

export default function Cupons() {
  const { barbeariaId } = useAuth();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [tipoCupom, setTipoCupom] = useState<"percentual" | "fixo">("percentual");

  const path = `/barbearias/${barbeariaId}/cupons`;
  const { data: cupons = [], isLoading } = useApiList("cupons", path, !!barbeariaId);
  const createCupom = useApiCreate("cupons", path);
  const updateCupom = useApiUpdate("cupons", path);
  const deleteCupom = useApiDelete("cupons", path);

  function openNew() {
    setEditing(null);
    setTipoCupom("percentual");
    setDialogOpen(true);
  }

  function openEdit(item: any) {
    setEditing(item);
    setTipoCupom(item.tipo || "percentual");
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = {
      codigo: (fd.get("codigo") as string).toUpperCase(),
      tipo: tipoCupom,
      valor: parseFloat(fd.get("valor") as string),
      validadeInicio: fd.get("validadeInicio") || null,
      validadeFim: fd.get("validadeFim") || null,
      usoMaximo: fd.get("usoMaximo") ? parseInt(fd.get("usoMaximo") as string) : null,
    };
    try {
      if (editing) {
        await updateCupom.mutateAsync({ id: editing.id, ...data });
        toast({ title: "Cupom atualizado" });
      } else {
        await createCupom.mutateAsync(data);
        toast({ title: "Cupom criado" });
      }
      setDialogOpen(false);
      setEditing(null);
    } catch { toast({ title: "Erro", variant: "destructive" }); }
  }

  async function handleToggle(item: any) {
    try {
      await updateCupom.mutateAsync({ id: item.id, ativo: !item.ativo });
    } catch { toast({ title: "Erro", variant: "destructive" }); }
  }

  async function handleDelete(id: number) {
    try {
      await deleteCupom.mutateAsync(id);
      toast({ title: "Cupom removido" });
    } catch { toast({ title: "Erro", variant: "destructive" }); }
  }

  const list = cupons as any[];

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Cupons de Desconto</h1>
          <p className="text-muted-foreground mt-1">Crie e gerencie cupons promocionais</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Novo Cupom</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card><CardContent className="p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center"><Ticket className="h-5 w-5 text-primary" /></div>
            <span className="text-sm text-muted-foreground">Total</span>
          </div>
          <p className="text-3xl font-bold text-primary">{list.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-9 w-9 rounded-lg bg-green-500/10 flex items-center justify-center"><Ticket className="h-5 w-5 text-green-500" /></div>
            <span className="text-sm text-muted-foreground">Ativos</span>
          </div>
          <p className="text-3xl font-bold text-green-500">{list.filter(c => c.ativo).length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-9 w-9 rounded-lg bg-orange-500/10 flex items-center justify-center"><Ticket className="h-5 w-5 text-orange-500" /></div>
            <span className="text-sm text-muted-foreground">Total de usos</span>
          </div>
          <p className="text-3xl font-bold text-orange-500">{list.reduce((s, c) => s + (c.usoAtual || 0), 0)}</p>
        </CardContent></Card>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}</div>
      ) : list.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">Nenhum cupom criado ainda.</p>
      ) : (
        <div className="space-y-2">
          {list.map((item: any) => (
            <div key={item.id} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Ticket className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-mono font-bold text-sm">{item.codigo}</p>
                  <Badge variant={item.ativo ? "default" : "secondary"}>{item.ativo ? "Ativo" : "Inativo"}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {item.tipo === "percentual" ? `${item.valor}% de desconto` : `R$ ${Number(item.valor).toFixed(2)} de desconto`}
                  {item.usoMaximo ? ` · ${item.usoAtual || 0}/${item.usoMaximo} usos` : ` · ${item.usoAtual || 0} usos`}
                  {item.validadeFim && ` · Até ${new Date(item.validadeFim).toLocaleDateString("pt-BR")}`}
                </p>
              </div>
              <Switch checked={item.ativo} onCheckedChange={() => handleToggle(item)} />
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(item)}>
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
          <DialogHeader><DialogTitle>{editing ? "Editar Cupom" : "Novo Cupom"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><Label>Código</Label><Input name="codigo" required placeholder="EX: PROMO20" defaultValue={editing?.codigo || ""} /></div>
            <div className="flex gap-2">
              <Button type="button" variant={tipoCupom === "percentual" ? "default" : "outline"} onClick={() => setTipoCupom("percentual")} className="flex-1">
                <Percent className="h-4 w-4 mr-1" /> Percentual
              </Button>
              <Button type="button" variant={tipoCupom === "fixo" ? "default" : "outline"} onClick={() => setTipoCupom("fixo")} className="flex-1">
                <DollarSign className="h-4 w-4 mr-1" /> Valor Fixo
              </Button>
            </div>
            <div><Label>Valor {tipoCupom === "percentual" ? "(%)" : "(R$)"}</Label><Input name="valor" type="number" step="0.01" required defaultValue={editing?.valor || ""} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Início Validade</Label><Input name="validadeInicio" type="date" defaultValue={editing?.validadeInicio?.split("T")[0] || ""} /></div>
              <div><Label>Fim Validade</Label><Input name="validadeFim" type="date" defaultValue={editing?.validadeFim?.split("T")[0] || ""} /></div>
            </div>
            <div><Label>Uso Máximo (opcional)</Label><Input name="usoMaximo" type="number" placeholder="Sem limite" defaultValue={editing?.usoMaximo || ""} /></div>
            <Button type="submit" className="w-full" disabled={createCupom.isPending || updateCupom.isPending}>
              {editing ? "Salvar" : "Criar Cupom"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
