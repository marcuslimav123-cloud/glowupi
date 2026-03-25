import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useApiList, useApiCreate, useApiUpdate, useApiDelete } from "@/hooks/useCrudApi";
import { useListServicos } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, Crown, Users, CreditCard, Scissors, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { formatCurrency } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type TabKey = "planos" | "assinantes";

export default function Clubes() {
  const { barbeariaId } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<TabKey>("planos");
  const [planoDialogOpen, setPlanoDialogOpen] = useState(false);
  const [assinanteDialogOpen, setAssinanteDialogOpen] = useState(false);
  const [editingPlano, setEditingPlano] = useState<any>(null);
  const [selectedPlanoId, setSelectedPlanoId] = useState("");
  const [servicosInclusos, setServicosInclusos] = useState<{ id: number; nome: string }[]>([]);

  const { data: servicos = [] } = useListServicos(barbeariaId!, { query: { enabled: !!barbeariaId } });
  const servicosArr = servicos as any[];

  const planosPath = `/barbearias/${barbeariaId}/assinaturas/planos`;
  const assinantesPath = `/barbearias/${barbeariaId}/assinaturas/assinantes`;

  const { data: planos = [], isLoading: loadingPlanos } = useApiList("assinaturas-planos", planosPath, !!barbeariaId);
  const createPlano = useApiCreate("assinaturas-planos", planosPath);
  const updatePlano = useApiUpdate("assinaturas-planos", planosPath);
  const deletePlano = useApiDelete("assinaturas-planos", planosPath);

  const { data: assinantes = [], isLoading: loadingAssinantes } = useApiList("assinaturas-assinantes", assinantesPath, !!barbeariaId);
  const createAssinante = useApiCreate("assinaturas-assinantes", assinantesPath);
  const updateAssinante = useApiUpdate("assinaturas-assinantes", assinantesPath);
  const deleteAssinante = useApiDelete("assinaturas-assinantes", assinantesPath);

  const planosArr = planos as any[];
  const assinantesArr = assinantes as any[];

  async function handlePlanoSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = {
      nome: fd.get("nome") as string,
      descricao: fd.get("descricao") as string,
      precoMensal: parseFloat(fd.get("precoMensal") as string),
      limiteUso: fd.get("limiteUso") ? parseInt(fd.get("limiteUso") as string) : null,
      servicosInclusos: servicosInclusos.length > 0 ? servicosInclusos : null,
    };
    try {
      if (editingPlano) {
        await updatePlano.mutateAsync({ id: editingPlano.id, ...data });
        toast({ title: "Plano atualizado" });
      } else {
        await createPlano.mutateAsync(data);
        toast({ title: "Plano criado" });
      }
      setPlanoDialogOpen(false);
      setEditingPlano(null);
      setServicosInclusos([]);
    } catch { toast({ title: "Erro", variant: "destructive" }); }
  }

  function openEditPlano(p: any) {
    setEditingPlano(p);
    setServicosInclusos(Array.isArray(p.servicosInclusos) ? p.servicosInclusos : []);
    setPlanoDialogOpen(true);
  }

  async function handlePlanoToggle(item: any) {
    try { await updatePlano.mutateAsync({ id: item.id, ativo: !item.ativo }); }
    catch { toast({ title: "Erro", variant: "destructive" }); }
  }

  async function handleAssinanteSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (!selectedPlanoId) { toast({ title: "Selecione um plano", variant: "destructive" }); return; }
    const planoId = parseInt(selectedPlanoId);
    const plano = planosArr.find(p => p.id === planoId);
    const data = {
      clienteNome: fd.get("clienteNome") as string,
      planoId,
      planoNome: plano?.nome || "",
      status: "ativo",
    };
    try {
      await createAssinante.mutateAsync(data);
      toast({ title: "Assinante adicionado" });
      setAssinanteDialogOpen(false);
    } catch { toast({ title: "Erro", variant: "destructive" }); }
  }

  async function handleCancelar(assinante: any) {
    try {
      await updateAssinante.mutateAsync({ id: assinante.id, status: "cancelado", dataFim: new Date().toISOString() });
      toast({ title: "Assinatura cancelada" });
    } catch { toast({ title: "Erro", variant: "destructive" }); }
  }

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Clubes de Assinatura</h1>
          <p className="text-muted-foreground mt-1">Gerencie planos e assinantes</p>
        </div>
        {tab === "planos" ? (
          <Button onClick={() => { setEditingPlano(null); setPlanoDialogOpen(true); }}><Plus className="h-4 w-4 mr-2" /> Novo Plano</Button>
        ) : (
          <Button onClick={() => setAssinanteDialogOpen(true)} disabled={planosArr.length === 0}><Plus className="h-4 w-4 mr-2" /> Novo Assinante</Button>
        )}
      </div>

      <div className="flex gap-2 mb-6">
        <Button variant={tab === "planos" ? "default" : "outline"} size="sm" onClick={() => setTab("planos")}>
          <CreditCard className="h-4 w-4 mr-1" /> Planos ({planosArr.length})
        </Button>
        <Button variant={tab === "assinantes" ? "default" : "outline"} size="sm" onClick={() => setTab("assinantes")}>
          <Users className="h-4 w-4 mr-1" /> Assinantes ({assinantesArr.length})
        </Button>
      </div>

      {tab === "planos" && (
        loadingPlanos ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{[1,2,3].map(i => <div key={i} className="h-48 bg-muted rounded-xl animate-pulse" />)}</div>
        ) : planosArr.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">Nenhum plano criado ainda.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {planosArr.map((p: any) => (
              <Card key={p.id}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><Crown className="h-5 w-5 text-primary" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{p.nome}</p>
                      <Badge variant={p.ativo ? "default" : "secondary"}>{p.ativo ? "Ativo" : "Inativo"}</Badge>
                    </div>
                    <Switch checked={p.ativo} onCheckedChange={() => handlePlanoToggle(p)} />
                  </div>
                  {p.descricao && <p className="text-sm text-muted-foreground mb-3">{p.descricao}</p>}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-primary">{formatCurrency(p.precoMensal)}</p>
                      <p className="text-xs text-muted-foreground">/mês</p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditPlano(p)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400" onClick={() => deletePlano.mutateAsync(p.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {p.limiteUso && <p className="text-xs text-muted-foreground mt-2">Limite: {p.limiteUso} usos/mês</p>}
                  {Array.isArray(p.servicosInclusos) && p.servicosInclusos.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border">
                      <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Scissors className="h-3 w-3" /> Serviços inclusos:</p>
                      <div className="flex flex-wrap gap-1">
                        {p.servicosInclusos.map((s: any) => <Badge key={s.id} variant="secondary" className="text-[10px]">{s.nome}</Badge>)}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}

      {tab === "assinantes" && (
        loadingAssinantes ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}</div>
        ) : assinantesArr.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">Nenhum assinante registrado ainda.</p>
        ) : (
          <div className="space-y-2">
            {assinantesArr.map((a: any) => (
              <div key={a.id} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{a.clienteNome}</p>
                  <p className="text-xs text-muted-foreground">{a.planoNome} · Início: {new Date(a.dataInicio).toLocaleDateString("pt-BR")}</p>
                </div>
                <Badge variant={a.status === "ativo" ? "default" : a.status === "cancelado" ? "destructive" : "secondary"}>
                  {a.status === "ativo" ? "Ativo" : a.status === "cancelado" ? "Cancelado" : a.status}
                </Badge>
                {a.status === "ativo" && (
                  <Button size="sm" variant="outline" className="text-red-500 border-red-200" onClick={() => handleCancelar(a)}>Cancelar</Button>
                )}
                <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400" onClick={() => { if (confirm("Remover assinante?")) deleteAssinante.mutateAsync(a.id); }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )
      )}

      <Dialog open={planoDialogOpen} onOpenChange={(v) => { setPlanoDialogOpen(v); if (!v) { setEditingPlano(null); setServicosInclusos([]); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingPlano ? "Editar Plano" : "Novo Plano"}</DialogTitle></DialogHeader>
          <form onSubmit={handlePlanoSubmit} className="space-y-4">
            <div><Label>Nome</Label><Input name="nome" required defaultValue={editingPlano?.nome || ""} /></div>
            <div><Label>Descrição</Label><Input name="descricao" defaultValue={editingPlano?.descricao || ""} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Preço Mensal (R$)</Label><Input name="precoMensal" type="number" step="0.01" required defaultValue={editingPlano?.precoMensal || ""} /></div>
              <div><Label>Limite de Uso/mês</Label><Input name="limiteUso" type="number" placeholder="Sem limite" defaultValue={editingPlano?.limiteUso || ""} /></div>
            </div>
            <div>
              <Label>Serviços Inclusos</Label>
              <Select value="" onValueChange={(v) => {
                const sId = parseInt(v);
                const svc = servicosArr.find((s: any) => s.id === sId);
                if (svc && !servicosInclusos.find(si => si.id === sId)) {
                  setServicosInclusos([...servicosInclusos, { id: svc.id, nome: svc.nome }]);
                }
              }}>
                <SelectTrigger><SelectValue placeholder="Adicionar serviço..." /></SelectTrigger>
                <SelectContent>
                  {servicosArr.filter((s: any) => !servicosInclusos.find(si => si.id === s.id)).map((s: any) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {servicosInclusos.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {servicosInclusos.map(si => (
                    <Badge key={si.id} variant="secondary" className="gap-1 pr-1">
                      {si.nome}
                      <button type="button" onClick={() => setServicosInclusos(servicosInclusos.filter(s => s.id !== si.id))} className="hover:text-red-400">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={createPlano.isPending || updatePlano.isPending}>
              {editingPlano ? "Salvar" : "Criar Plano"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={assinanteDialogOpen} onOpenChange={setAssinanteDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Assinante</DialogTitle></DialogHeader>
          <form onSubmit={handleAssinanteSubmit} className="space-y-4">
            <div><Label>Nome do Cliente</Label><Input name="clienteNome" required /></div>
            <div>
              <Label>Plano</Label>
              <Select value={selectedPlanoId} onValueChange={setSelectedPlanoId}>
                <SelectTrigger><SelectValue placeholder="Selecione um plano" /></SelectTrigger>
                <SelectContent>
                  {planosArr.filter(p => p.ativo).map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.nome} — {formatCurrency(p.precoMensal)}/mês</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={createAssinante.isPending}>Adicionar Assinante</Button>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
