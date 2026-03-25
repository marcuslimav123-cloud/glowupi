import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useListPacotes, useListPacotesCliente, useVendaPacoteCliente, useUsarSessaoPacote } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { ShoppingCart, Play, Boxes, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getListPacotesQueryKey, getListPacotesClienteQueryKey } from "@workspace/api-client-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function VendaPacotes() {
  const { barbeariaId } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [vendaOpen, setVendaOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedPacoteId, setSelectedPacoteId] = useState("");

  const { data: pacotes = [] } = useListPacotes(barbeariaId!, { query: { enabled: !!barbeariaId } });
  const { data: vendidos = [], isLoading } = useListPacotesCliente(barbeariaId!, { query: { enabled: !!barbeariaId } });
  const vendaPacote = useVendaPacoteCliente();
  const usarSessao = useUsarSessaoPacote();

  function invalidateAll() {
    qc.invalidateQueries({ queryKey: getListPacotesQueryKey(barbeariaId!) });
    qc.invalidateQueries({ queryKey: getListPacotesClienteQueryKey(barbeariaId!) });
  }

  async function handleVenda(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (!selectedPacoteId) { toast({ title: "Selecione um pacote", variant: "destructive" }); return; }
    try {
      await vendaPacote.mutateAsync({
        barbeariaId: barbeariaId!,
        data: {
          pacoteId: parseInt(selectedPacoteId),
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

  const vendidosArr = vendidos as any[];
  const pacotesArr = pacotes as any[];
  const filtered = search
    ? vendidosArr.filter(v => v.clienteNome?.toLowerCase().includes(search.toLowerCase()) || v.pacoteNome?.toLowerCase().includes(search.toLowerCase()))
    : vendidosArr;

  const ativos = vendidosArr.filter(v => v.status === "ativo").length;
  const concluidos = vendidosArr.filter(v => v.status === "concluido").length;

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Venda de Pacotes</h1>
          <p className="text-muted-foreground mt-1">Gerencie vendas de pacotes aos clientes</p>
        </div>
        <Button onClick={() => setVendaOpen(true)} disabled={pacotesArr.length === 0}>
          <ShoppingCart className="h-4 w-4 mr-2" /> Nova Venda
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card><CardContent className="p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center"><Boxes className="h-5 w-5 text-primary" /></div>
            <span className="text-sm text-muted-foreground">Total Vendidos</span>
          </div>
          <p className="text-3xl font-bold text-primary">{vendidosArr.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-9 w-9 rounded-lg bg-green-500/10 flex items-center justify-center"><Boxes className="h-5 w-5 text-green-500" /></div>
            <span className="text-sm text-muted-foreground">Ativos</span>
          </div>
          <p className="text-3xl font-bold text-green-500">{ativos}</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center"><Boxes className="h-5 w-5 text-blue-500" /></div>
            <span className="text-sm text-muted-foreground">Concluídos</span>
          </div>
          <p className="text-3xl font-bold text-blue-500">{concluidos}</p>
        </CardContent></Card>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-10" placeholder="Buscar por cliente ou pacote..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">{search ? "Nenhum resultado encontrado." : "Nenhum pacote vendido ainda."}</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((pc: any) => (
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
          <DialogHeader><DialogTitle>Nova Venda de Pacote</DialogTitle></DialogHeader>
          <form onSubmit={handleVenda} className="space-y-4">
            <div><Label>Nome do Cliente</Label><Input name="clienteNome" required /></div>
            <div>
              <Label>Pacote</Label>
              <Select value={selectedPacoteId} onValueChange={setSelectedPacoteId} required>
                <SelectTrigger><SelectValue placeholder="Selecione um pacote" /></SelectTrigger>
                <SelectContent>
                  {pacotesArr.filter((p: any) => p.ativo !== false).map((p: any) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.nome} — {p.sessoesTotal} sessões — {formatCurrency(p.preco)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={vendaPacote.isPending}>Confirmar Venda</Button>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
