import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import {
  useListPacotes, useListPacotesCliente, useVendaPacoteCliente, useUsarSessaoPacote,
  useAgendarPacoteCliente, useListServicos, useListProfissionais,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { ShoppingCart, Play, Boxes, Search, Calendar as CalendarIcon, ChevronRight, ChevronLeft, CheckCircle2, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getListPacotesQueryKey, getListPacotesClienteQueryKey } from "@workspace/api-client-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type SessionPick = { servicoId: string; profissionalId: string; data: string; horaInicio: string };

export default function VendaPacotes() {
  const { barbeariaId } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [vendaOpen, setVendaOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedPacoteId, setSelectedPacoteId] = useState("");

  const [agendarOpen, setAgendarOpen] = useState(false);
  const [agendarTarget, setAgendarTarget] = useState<any>(null);
  const [step, setStep] = useState(0);
  const [picks, setPicks] = useState<SessionPick[]>([]);

  const { data: pacotes = [] } = useListPacotes(barbeariaId!, { query: { enabled: !!barbeariaId } });
  const { data: vendidos = [], isLoading } = useListPacotesCliente(barbeariaId!, undefined, { query: { enabled: !!barbeariaId } });
  const { data: servicos = [] } = useListServicos(barbeariaId!, { query: { enabled: !!barbeariaId } });
  const { data: profissionais = [] } = useListProfissionais(barbeariaId!, { query: { enabled: !!barbeariaId } });
  const vendaPacote = useVendaPacoteCliente();
  const usarSessao = useUsarSessaoPacote();
  const agendarPacote = useAgendarPacoteCliente();

  function invalidateAll() {
    qc.invalidateQueries({ queryKey: getListPacotesQueryKey(barbeariaId!) });
    qc.invalidateQueries({ queryKey: getListPacotesClienteQueryKey(barbeariaId!) });
  }

  async function handleVenda(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (!selectedPacoteId) { toast({ title: "Selecione um pacote", variant: "destructive" }); return; }
    try {
      const sold = await vendaPacote.mutateAsync({
        barbeariaId: barbeariaId!,
        data: {
          pacoteId: parseInt(selectedPacoteId),
          clienteNome: fd.get("clienteNome") as string,
        }
      });
      invalidateAll();
      setVendaOpen(false);

      const wantSchedule = (fd.get("agendarAgora") as string) === "on";
      if (wantSchedule) {
        const pacote = (pacotes as any[]).find(p => String(p.id) === selectedPacoteId);
        startAgendarFlow({ ...sold, pacoteNome: pacote?.nome }, pacote);
        toast({ title: "Pacote vendido — agora agende as sessões" });
      } else {
        toast({ title: "Pacote vendido" });
      }
    } catch (err: any) {
      const detail = err?.data?.error || err?.message || "Erro desconhecido na venda";
      toast({ title: "Erro na venda", description: detail, variant: "destructive" });
    }
  }

  function startAgendarFlow(pc: any, pacoteOpt?: any) {
    const pacote = pacoteOpt || (pacotes as any[]).find(p => p.id === pc.pacoteId);
    const sessoesDisponiveis = pc.sessoesTotal - (pc.sessoesUsadas || 0);
    const today = new Date().toISOString().slice(0, 10);

    // Derive per-session predefined service from pacote.itens when structured.
    // Each item contributes (sessoesIncluidas || 1) sessions of its servicoId.
    const itensArr = pacote && Array.isArray(pacote.itens) ? pacote.itens : [];
    const expanded: string[] = [];
    for (const it of itensArr) {
      const sid = String(it?.servicoId ?? it?.id ?? "");
      const qty = Math.max(1, Number(it?.sessoesIncluidas ?? it?.quantidade ?? 1) || 1);
      if (sid) for (let i = 0; i < qty; i++) expanded.push(sid);
    }
    const initial: SessionPick[] = expanded.length > 0
      ? expanded.slice(0, sessoesDisponiveis).map(sid => ({
          servicoId: sid,
          profissionalId: "",
          data: today,
          horaInicio: "09:00",
        }))
      : Array.from({ length: sessoesDisponiveis }).map(() => ({
          servicoId: "",
          profissionalId: "",
          data: today,
          horaInicio: "09:00",
        }));

    setAgendarTarget({ ...pc, _hasStructuredItens: expanded.length > 0 });
    setPicks(initial);
    setStep(0);
    setAgendarOpen(true);
  }

  async function handleUsarSessao(pcId: number) {
    try {
      await usarSessao.mutateAsync({ barbeariaId: barbeariaId!, pacoteClienteId: pcId });
      invalidateAll();
      toast({ title: "Sessão registrada" });
    } catch (err: unknown) {
      const detail = (err as Record<string, Record<string, string>>)?.data?.error || (err instanceof Error ? err.message : "Erro ao usar sessão");
      toast({ title: detail, variant: "destructive" });
    }
  }

  async function handleConfirmarAgendar() {
    if (!agendarTarget) return;
    for (let i = 0; i < picks.length; i++) {
      const p = picks[i];
      if (!p.servicoId || !p.profissionalId || !p.data || !p.horaInicio) {
        toast({ title: `Sessão ${i + 1} incompleta`, variant: "destructive" });
        return;
      }
    }
    try {
      await agendarPacote.mutateAsync({
        barbeariaId: barbeariaId!,
        pacoteClienteId: agendarTarget.id,
        data: {
          itens: picks.map(p => ({
            servicoId: parseInt(p.servicoId),
            profissionalId: parseInt(p.profissionalId),
            data: p.data,
            horaInicio: p.horaInicio,
          })),
        },
      });
      invalidateAll();
      setAgendarOpen(false);
      setAgendarTarget(null);
      setPicks([]);
      toast({ title: `${picks.length} sessão(ões) agendada(s) com sucesso` });
    } catch (err: any) {
      const detail = err?.data?.error || err?.message || "Erro ao agendar";
      toast({ title: "Erro", description: detail, variant: "destructive" });
    }
  }

  function updatePick(idx: number, patch: Partial<SessionPick>) {
    setPicks(prev => prev.map((p, i) => i === idx ? { ...p, ...patch } : p));
  }

  const vendidosArr = vendidos as any[];
  const pacotesArr = pacotes as any[];
  const filtered = search
    ? vendidosArr.filter(v => v.clienteNome?.toLowerCase().includes(search.toLowerCase()) || v.pacoteNome?.toLowerCase().includes(search.toLowerCase()))
    : vendidosArr;

  const ativos = vendidosArr.filter(v => v.status === "ativo").length;
  const concluidos = vendidosArr.filter(v => v.status === "concluido").length;

  const isReview = step === picks.length;

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Venda de pacotes</h1>
          <p className="text-muted-foreground mt-1">Pacotes vendidos e sessões restantes de cada cliente</p>
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
          {filtered.map((pc: any) => {
            const podeAgendar = pc.status === "ativo" && pc.sessoesUsadas < pc.sessoesTotal;
            return (
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
                {podeAgendar && (
                  <Button size="sm" variant="outline" onClick={() => startAgendarFlow(pc)} data-testid={`btn-agendar-${pc.id}`}>
                    <CalendarIcon className="h-4 w-4 mr-1" /> Agendar
                  </Button>
                )}
                {pc.status === "ativo" && (
                  <Button size="sm" variant="outline" onClick={() => handleUsarSessao(pc.id)}>
                    <Play className="h-4 w-4 mr-1" /> Usar Sessão
                  </Button>
                )}
              </div>
            );
          })}
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
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="agendarAgora" defaultChecked className="h-4 w-4 rounded border-border" />
              <span>Agendar agora as sessões após vender</span>
            </label>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={vendaPacote.isPending} data-testid="btn-confirmar-venda">
                Confirmar Venda
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Marque "Agendar agora" para escolher data, hora e profissional de cada sessão na sequência. Sem marcar, o pacote é apenas vendido (sessões agendadas depois).
            </p>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={agendarOpen} onOpenChange={(v) => { if (!v) { setAgendarOpen(false); setAgendarTarget(null); setPicks([]); } }}>
        <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              Agendar sessões — {agendarTarget?.clienteNome}
            </DialogTitle>
          </DialogHeader>

          {picks.length === 0 ? (
            <p className="text-sm text-muted-foreground">Não há sessões disponíveis para agendar.</p>
          ) : (
            <>
              <div className="flex items-center gap-1 mb-3 overflow-x-auto pb-1">
                {picks.map((_, i) => (
                  <React.Fragment key={i}>
                    <button
                      onClick={() => setStep(i)}
                      className={`flex items-center justify-center min-w-[32px] h-8 rounded-md text-xs font-medium transition
                        ${step === i ? "bg-primary text-primary-foreground" :
                          i < step ? "bg-primary/20 text-primary" :
                          "bg-muted text-muted-foreground"}`}
                    >
                      {i + 1}
                    </button>
                    {i < picks.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />}
                  </React.Fragment>
                ))}
                <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                <button
                  onClick={() => setStep(picks.length)}
                  className={`flex items-center justify-center min-w-[64px] h-8 rounded-md text-xs font-medium transition
                    ${isReview ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                >
                  Resumo
                </button>
              </div>

              {!isReview && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold">Sessão {step + 1} de {picks.length}</p>
                  <div>
                    <Label className="text-xs">Serviço</Label>
                    <Select
                      value={picks[step]?.servicoId}
                      onValueChange={v => updatePick(step, { servicoId: v })}
                      disabled={!!agendarTarget?._hasStructuredItens}
                    >
                      <SelectTrigger data-testid={`select-servico-${step}`}><SelectValue placeholder="Selecione o serviço" /></SelectTrigger>
                      <SelectContent>
                        {(servicos as any[]).filter((s: any) => s.ativo !== false).map((s: any) => (
                          <SelectItem key={s.id} value={String(s.id)}>{s.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {agendarTarget?._hasStructuredItens && (
                      <p className="text-[10px] text-muted-foreground mt-1">Serviço definido pela composição do pacote.</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs">Profissional</Label>
                    <Select value={picks[step]?.profissionalId} onValueChange={v => updatePick(step, { profissionalId: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione o profissional" /></SelectTrigger>
                      <SelectContent>
                        {(profissionais as any[]).filter((p: any) => p.ativo !== false).map((p: any) => (
                          <SelectItem key={p.id} value={String(p.id)}>{p.apelido || p.nomeExibicao}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Data</Label>
                      <Input type="date" value={picks[step]?.data} onChange={e => updatePick(step, { data: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs">Hora</Label>
                      <Input type="time" value={picks[step]?.horaInicio} onChange={e => updatePick(step, { horaInicio: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    {step > 0 && (
                      <Button variant="outline" size="sm" onClick={() => setStep(step - 1)}>
                        <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                      </Button>
                    )}
                    <Button size="sm" className="flex-1" onClick={() => setStep(step + 1)}
                      disabled={!picks[step]?.servicoId || !picks[step]?.profissionalId || !picks[step]?.data || !picks[step]?.horaInicio}>
                      {step === picks.length - 1 ? "Revisar" : "Próxima sessão"} <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}

              {isReview && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold">Confirme as sessões</p>
                  <div className="space-y-2 max-h-[280px] overflow-y-auto">
                    {picks.map((p, i) => {
                      const serv = (servicos as any[]).find((s: any) => String(s.id) === p.servicoId);
                      const prof = (profissionais as any[]).find((pp: any) => String(pp.id) === p.profissionalId);
                      return (
                        <div key={i} className="rounded-lg border border-border p-3 text-xs">
                          <div className="flex justify-between items-start gap-2">
                            <div className="font-medium text-sm">Sessão {i + 1}</div>
                            <button onClick={() => setStep(i)} className="text-primary text-xs">Editar</button>
                          </div>
                          <div className="mt-1 text-muted-foreground space-y-0.5">
                            <div>Serviço: <span className="text-foreground">{serv?.nome || "—"}</span></div>
                            <div>Profissional: <span className="text-foreground">{prof?.apelido || prof?.nomeExibicao || "—"}</span></div>
                            <div>Data: <span className="text-foreground">{p.data}</span> às <span className="text-foreground">{p.horaInicio}</span></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <Button className="w-full" onClick={handleConfirmarAgendar} disabled={agendarPacote.isPending} data-testid="btn-confirmar-agendar-pacote">
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    {agendarPacote.isPending ? "Agendando..." : `Confirmar e agendar ${picks.length} sessão(ões)`}
                  </Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
