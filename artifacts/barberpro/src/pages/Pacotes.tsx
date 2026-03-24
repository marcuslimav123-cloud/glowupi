import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useListPacotes, useCreatePacote, useUpdatePacote, useListPacotesCliente, useVendaPacoteCliente, useUsarSessaoPacote } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { Plus, Boxes, ShoppingCart, Play, Pause } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getListPacotesQueryKey, getListPacotesClienteQueryKey } from "@workspace/api-client-react";

type TabKey = "pacotes" | "vendidos";

export default function Pacotes() {
  const { barbeariaId } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabKey>("pacotes");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [vendaOpen, setVendaOpen] = useState(false);
  const [selectedPacote, setSelectedPacote] = useState<any>(null);

  const { data: pacotes = [], isLoading } = useListPacotes(barbeariaId!, { query: { enabled: !!barbeariaId } });
  const { data: vendidos = [] } = useListPacotesCliente(barbeariaId!, { query: { enabled: !!barbeariaId } });
  const createPacote = useCreatePacote();
  const vendaPacote = useVendaPacoteCliente();
  const usarSessao = useUsarSessaoPacote();

  function invalidateAll() {
    qc.invalidateQueries({ queryKey: getListPacotesQueryKey(barbeariaId!) });
    qc.invalidateQueries({ queryKey: getListPacotesClienteQueryKey(barbeariaId!) });
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await createPacote.mutateAsync({
        barbeariaId: barbeariaId!,
        data: {
          nome: fd.get("nome") as string,
          descricao: fd.get("descricao") as string,
          preco: parseFloat(fd.get("preco") as string),
          sessoesTotal: parseInt(fd.get("sessoesTotal") as string),
          validadeDias: parseInt(fd.get("validadeDias") as string) || undefined,
        }
      });
      invalidateAll();
      setDialogOpen(false);
      toast({ title: "Pacote criado" });
    } catch { toast({ title: "Erro ao criar", variant: "destructive" }); }
  }

  async function handleVenda(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await vendaPacote.mutateAsync({
        barbeariaId: barbeariaId!,
        data: {
          pacoteId: selectedPacote.id,
          clienteNome: fd.get("clienteNome") as string,
        }
      });
      invalidateAll();
      setVendaOpen(false);
      toast({ title: "Pacote vendido" });
    } catch { toast({ title: "Erro na venda", variant: "destructive" }); }
  }

  async function handleUsarSessao(pcId: number) {
    try {
      await usarSessao.mutateAsync({ barbeariaId: barbeariaId!, pacoteClienteId: pcId });
      invalidateAll();
      toast({ title: "Sessão registrada" });
    } catch (err: any) { toast({ title: err?.response?.data?.error || "Erro", variant: "destructive" }); }
  }

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Pacotes de Serviços</h1>
          <p className="text-muted-foreground mt-1">Crie e gerencie pacotes para seus clientes</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Novo Pacote</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Pacote</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div><Label>Nome</Label><Input name="nome" required placeholder="Ex: Pacote Mensal Unhas" /></div>
              <div><Label>Descrição</Label><Input name="descricao" placeholder="Descrição opcional" /></div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label>Preço (R$)</Label><Input name="preco" type="number" step="0.01" required /></div>
                <div><Label>Sessões</Label><Input name="sessoesTotal" type="number" required placeholder="10" /></div>
                <div><Label>Validade (dias)</Label><Input name="validadeDias" type="number" placeholder="30" /></div>
              </div>
              <Button type="submit" className="w-full" disabled={createPacote.isPending}>Criar Pacote</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2 mb-6">
        <Button variant={tab === "pacotes" ? "default" : "outline"} size="sm" onClick={() => setTab("pacotes")}>Pacotes ({(pacotes as any[]).length})</Button>
        <Button variant={tab === "vendidos" ? "default" : "outline"} size="sm" onClick={() => setTab("vendidos")}>Vendidos ({(vendidos as any[]).length})</Button>
      </div>

      {tab === "pacotes" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? [1,2,3].map(i => <div key={i} className="h-48 bg-muted rounded-xl animate-pulse" />) :
           (pacotes as any[]).length === 0 ? <p className="col-span-3 text-center text-muted-foreground py-12">Nenhum pacote criado ainda.</p> :
           (pacotes as any[]).map((p: any) => (
            <Card key={p.id}>
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><Boxes className="h-5 w-5 text-primary" /></div>
                  <div className="flex-1">
                    <p className="font-semibold">{p.nome}</p>
                    <p className="text-xs text-muted-foreground">{p.sessoesTotal} sessões</p>
                  </div>
                  <Badge variant={p.ativo !== false ? "default" : "secondary"}>{p.ativo !== false ? "Ativo" : "Inativo"}</Badge>
                </div>
                {p.descricao && <p className="text-sm text-muted-foreground mb-3">{p.descricao}</p>}
                <div className="flex items-center justify-between">
                  <p className="text-2xl font-bold text-primary">{formatCurrency(p.preco)}</p>
                  <Button size="sm" variant="outline" onClick={() => { setSelectedPacote(p); setVendaOpen(true); }}>
                    <ShoppingCart className="h-4 w-4 mr-1" /> Vender
                  </Button>
                </div>
                {p.validadeDias && <p className="text-xs text-muted-foreground mt-2">Validade: {p.validadeDias} dias</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {tab === "vendidos" && (
        <div className="space-y-3">
          {(vendidos as any[]).length === 0 ? <p className="text-center text-muted-foreground py-12">Nenhum pacote vendido ainda.</p> :
           (vendidos as any[]).map((pc: any) => (
            <div key={pc.id} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><Boxes className="h-5 w-5 text-primary" /></div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{pc.clienteNome}</p>
                <p className="text-xs text-muted-foreground">{pc.pacoteNome || `Pacote #${pc.pacoteId}`}</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-primary">{pc.sessoesUsadas}/{pc.sessoesTotal}</p>
                <p className="text-xs text-muted-foreground">sessões</p>
              </div>
              <Badge variant={pc.status === "ativo" ? "default" : pc.status === "concluido" ? "secondary" : "destructive"}>
                {pc.status === "ativo" ? "Ativo" : pc.status === "concluido" ? "Concluído" : pc.status}
              </Badge>
              {pc.status === "ativo" && (
                <Button size="sm" variant="outline" onClick={() => handleUsarSessao(pc.id)}>
                  <Play className="h-4 w-4 mr-1" /> Usar Sessão
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={vendaOpen} onOpenChange={setVendaOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Vender Pacote: {selectedPacote?.nome}</DialogTitle></DialogHeader>
          <form onSubmit={handleVenda} className="space-y-4">
            <div><Label>Nome do Cliente</Label><Input name="clienteNome" required /></div>
            <p className="text-sm text-muted-foreground">Pacote: {selectedPacote?.sessoesTotal} sessões — {selectedPacote ? formatCurrency(selectedPacote.preco) : ""}</p>
            <Button type="submit" className="w-full" disabled={vendaPacote.isPending}>Confirmar Venda</Button>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
