import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useListClientes, useListRecompensas, useCreateRecompensa, useListResgates, useCreateResgate } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trophy, Star, Crown, Gift, TrendingUp, Plus, Award } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getListRecompensasQueryKey, getListResgatesQueryKey, getListClientesQueryKey } from "@workspace/api-client-react";

type TabKey = "ranking" | "recompensas" | "resgates";

export default function Clube() {
  const { barbeariaId } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabKey>("ranking");
  const [recompensaOpen, setRecompensaOpen] = useState(false);
  const [resgateOpen, setResgateOpen] = useState(false);
  const [selectedRecompensa, setSelectedRecompensa] = useState<any>(null);

  const { data: clientes = [], isLoading } = useListClientes(barbeariaId!, {}, { query: { enabled: !!barbeariaId } });
  const { data: recompensas = [] } = useListRecompensas(barbeariaId!, { query: { enabled: !!barbeariaId } });
  const { data: resgates = [] } = useListResgates(barbeariaId!, { query: { enabled: !!barbeariaId } });
  const createRecompensa = useCreateRecompensa();
  const createResgate = useCreateResgate();

  const sorted = [...(clientes as any[])].sort((a, b) => b.pontosFidelidade - a.pontosFidelidade);
  const top = sorted.slice(0, 10);
  const vips = (clientes as any[]).filter(c => c.vip);
  const totalPontos = (clientes as any[]).reduce((s, c) => s + c.pontosFidelidade, 0);

  function invalidateAll() {
    qc.invalidateQueries({ queryKey: getListRecompensasQueryKey(barbeariaId!) });
    qc.invalidateQueries({ queryKey: getListResgatesQueryKey(barbeariaId!) });
    qc.invalidateQueries({ queryKey: getListClientesQueryKey(barbeariaId!, {}) });
  }

  async function handleCreateRecompensa(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await createRecompensa.mutateAsync({
        barbeariaId: barbeariaId!,
        data: {
          nome: fd.get("nome") as string,
          descricao: fd.get("descricao") as string,
          pontosNecessarios: parseInt(fd.get("pontosNecessarios") as string),
          tipo: fd.get("tipo") as string || "servico",
        }
      });
      invalidateAll();
      setRecompensaOpen(false);
      toast({ title: "Recompensa criada" });
    } catch { toast({ title: "Erro", variant: "destructive" }); }
  }

  async function handleResgate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const clienteId = parseInt(fd.get("clienteId") as string);
    const cliente = (clientes as any[]).find(c => c.id === clienteId);
    if (!cliente) { toast({ title: "Cliente não encontrado", variant: "destructive" }); return; }
    try {
      await createResgate.mutateAsync({
        barbeariaId: barbeariaId!,
        data: {
          clienteId,
          clienteNome: cliente.nome,
          recompensaId: selectedRecompensa.id,
          recompensaNome: selectedRecompensa.nome,
          pontosUsados: selectedRecompensa.pontosNecessarios,
        }
      });
      invalidateAll();
      setResgateOpen(false);
      toast({ title: "Resgate realizado" });
    } catch (err: any) { toast({ title: err?.response?.data?.error || "Pontos insuficientes", variant: "destructive" }); }
  }

  const RANK_ICON = [
    <Crown className="h-5 w-5 text-yellow-400" key={0} />,
    <Trophy className="h-5 w-5 text-slate-400" key={1} />,
    <Trophy className="h-5 w-5 text-amber-600" key={2} />,
  ];

  const TABS: { key: TabKey; label: string }[] = [
    { key: "ranking", label: "Ranking" },
    { key: "recompensas", label: `Recompensas (${(recompensas as any[]).length})` },
    { key: "resgates", label: `Resgates (${(resgates as any[]).length})` },
  ];

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground">Clube de Fidelidade</h1>
        <p className="text-muted-foreground mt-1">Programa de fidelidade e recompensas</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-9 w-9 rounded-lg bg-yellow-500/10 flex items-center justify-center"><Trophy className="h-5 w-5 text-yellow-400" /></div>
              <span className="text-sm text-muted-foreground">Total de Pontos</span>
            </div>
            <p className="text-3xl font-bold text-yellow-400">{totalPontos.toLocaleString("pt-BR")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center"><Crown className="h-5 w-5 text-amber-500" /></div>
              <span className="text-sm text-muted-foreground">Clientes VIP</span>
            </div>
            <p className="text-3xl font-bold text-amber-500">{vips.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-9 w-9 rounded-lg bg-green-500/10 flex items-center justify-center"><TrendingUp className="h-5 w-5 text-green-400" /></div>
              <span className="text-sm text-muted-foreground">Receita VIPs</span>
            </div>
            <p className="text-3xl font-bold text-green-400">{formatCurrency(vips.reduce((s, c) => s + c.totalGasto, 0))}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2 mb-6">
        {TABS.map(t => (
          <Button key={t.key} variant={tab === t.key ? "default" : "outline"} size="sm" onClick={() => setTab(t.key)}>{t.label}</Button>
        ))}
      </div>

      {tab === "ranking" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-yellow-400" /> Ranking de Fidelidade</CardTitle></CardHeader>
              <CardContent>
                {isLoading ? <div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}</div> :
                 top.length === 0 ? <p className="text-muted-foreground text-sm text-center py-8">Nenhum cliente cadastrado.</p> :
                 <div className="space-y-3">
                  {top.map((c: any, i: number) => (
                    <div key={c.id} className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${i === 0 ? "bg-yellow-500/5 border-yellow-500/20" : i === 1 ? "bg-slate-500/5 border-slate-500/20" : i === 2 ? "bg-amber-700/5 border-amber-700/20" : "bg-muted/30 border-border"}`}>
                      <div className="w-8 flex justify-center">{i < 3 ? RANK_ICON[i] : <span className="text-muted-foreground font-bold text-sm">{i + 1}</span>}</div>
                      <div className="h-10 w-10 rounded-full bg-card border border-border flex items-center justify-center font-bold text-primary">{c.nome.charAt(0).toUpperCase()}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm">{c.nome}</p>
                          {c.vip && <Badge className="text-xs bg-amber-500/10 text-amber-500 border-amber-500/20"><Crown className="h-2.5 w-2.5 mr-1" />VIP</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">{c.telefone}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
                          <span className="font-bold text-yellow-400">{c.pontosFidelidade}</span>
                          <span className="text-xs text-muted-foreground">pts</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{formatCurrency(c.totalGasto)} total</p>
                      </div>
                    </div>
                  ))}
                </div>}
              </CardContent>
            </Card>
          </div>
          <div>
            <Card>
              <CardHeader><CardTitle className="text-base">Clientes VIP</CardTitle></CardHeader>
              <CardContent>
                {vips.length === 0 ? <p className="text-sm text-muted-foreground">Marque clientes como VIP na gestão de clientes.</p> :
                 <div className="space-y-2">
                  {vips.slice(0, 5).map((c: any) => (
                    <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg bg-amber-500/5 border border-amber-500/15">
                      <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 font-bold text-sm border border-amber-500/20">{c.nome.charAt(0).toUpperCase()}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.nome}</p>
                        <p className="text-xs text-muted-foreground">{c.pontosFidelidade} pts</p>
                      </div>
                    </div>
                  ))}
                </div>}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {tab === "recompensas" && (
        <div>
          <div className="flex justify-end mb-4">
            <Dialog open={recompensaOpen} onOpenChange={setRecompensaOpen}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Nova Recompensa</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nova Recompensa</DialogTitle></DialogHeader>
                <form onSubmit={handleCreateRecompensa} className="space-y-4">
                  <div><Label>Nome</Label><Input name="nome" required placeholder="Ex: Hidratação Grátis" /></div>
                  <div><Label>Descrição</Label><Input name="descricao" placeholder="Descrição opcional" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Pontos Necessários</Label><Input name="pontosNecessarios" type="number" required /></div>
                    <div>
                      <Label>Tipo</Label>
                      <select name="tipo" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                        <option value="servico">Serviço</option>
                        <option value="produto">Produto</option>
                        <option value="desconto">Desconto</option>
                      </select>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={createRecompensa.isPending}>Criar Recompensa</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(recompensas as any[]).length === 0 ? <p className="col-span-3 text-center text-muted-foreground py-12">Nenhuma recompensa criada.</p> :
             (recompensas as any[]).map((r: any) => (
              <Card key={r.id}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><Gift className="h-5 w-5 text-primary" /></div>
                    <div className="flex-1">
                      <p className="font-semibold">{r.nome}</p>
                      <Badge variant="secondary" className="text-xs">{r.tipo}</Badge>
                    </div>
                  </div>
                  {r.descricao && <p className="text-sm text-muted-foreground mb-3">{r.descricao}</p>}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                      <span className="font-bold text-yellow-400">{r.pontosNecessarios}</span>
                      <span className="text-xs text-muted-foreground">pts</span>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => { setSelectedRecompensa(r); setResgateOpen(true); }}>
                      <Award className="h-4 w-4 mr-1" /> Resgatar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {tab === "resgates" && (
        <div className="space-y-3">
          {(resgates as any[]).length === 0 ? <p className="text-center text-muted-foreground py-12">Nenhum resgate realizado.</p> :
           (resgates as any[]).map((r: any) => (
            <div key={r.id} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center"><Gift className="h-5 w-5 text-green-400" /></div>
              <div className="flex-1">
                <p className="font-medium text-sm">{r.clienteNome}</p>
                <p className="text-xs text-muted-foreground">{r.recompensaNome}</p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 justify-end">
                  <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
                  <span className="font-bold text-sm">-{r.pontosUsados} pts</span>
                </div>
                <p className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString("pt-BR")}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={resgateOpen} onOpenChange={setResgateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Resgatar: {selectedRecompensa?.nome}</DialogTitle></DialogHeader>
          <form onSubmit={handleResgate} className="space-y-4">
            <p className="text-sm text-muted-foreground">Custo: {selectedRecompensa?.pontosNecessarios} pontos</p>
            <div>
              <Label>Selecionar Cliente</Label>
              <select name="clienteId" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required>
                <option value="">Selecione...</option>
                {sorted.filter(c => c.pontosFidelidade >= (selectedRecompensa?.pontosNecessarios || 0)).map(c => (
                  <option key={c.id} value={c.id}>{c.nome} ({c.pontosFidelidade} pts)</option>
                ))}
              </select>
            </div>
            <Button type="submit" className="w-full" disabled={createResgate.isPending}>Confirmar Resgate</Button>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
