import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency, apiUrl } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Plus, Lock, Unlock, ArrowUpCircle, ArrowDownCircle, Banknote, Gift } from "lucide-react";

export default function CaixaDiario() {
  const { barbeariaId } = useAuth();
  const { toast } = useToast();
  const [caixa, setCaixa] = useState<any>(null);
  const [profissionais, setProfissionais] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAbrir, setShowAbrir] = useState(false);
  const [showMov, setShowMov] = useState(false);
  const [showFechar, setShowFechar] = useState(false);
  const [showSangria, setShowSangria] = useState(false);
  const [showVale, setShowVale] = useState(false);
  const [valorAbertura, setValorAbertura] = useState("0");
  const [obsAbertura, setObsAbertura] = useState("");
  const [movTipo, setMovTipo] = useState("entrada");
  const [movDescricao, setMovDescricao] = useState("");
  const [movValor, setMovValor] = useState("");
  const [movCategoria, setMovCategoria] = useState("");
  const [movFormaPag, setMovFormaPag] = useState("dinheiro");
  const [valorFechamento, setValorFechamento] = useState("");
  const [sangriaValor, setSangriaValor] = useState("");
  const [sangriaMotivo, setSangriaMotivo] = useState("");
  const [valeValor, setValeValor] = useState("");
  const [valeProfId, setValeProfId] = useState("");
  const [valeObs, setValeObs] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (barbeariaId) { fetchCaixa(); fetchProfissionais(); }
  }, [barbeariaId]);

  const fetchCaixa = async () => {
    try {
      const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/caixa-diario/atual`), { credentials: "include" });
      if (res.ok) setCaixa(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchProfissionais = async () => {
    try {
      const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/profissionais`), { credentials: "include" });
      if (res.ok) setProfissionais(await res.json());
    } catch {}
  };

  const abrirCaixa = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/caixa-diario/abrir`), {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ valorAbertura: parseFloat(valorAbertura) || 0, observacao: obsAbertura }),
      });
      if (res.ok) { toast({ title: "Caixa aberto com sucesso!" }); setShowAbrir(false); fetchCaixa(); }
      else { const err = await res.json(); toast({ title: err.error || "Erro ao abrir caixa", variant: "destructive" }); }
    } catch { toast({ title: "Erro ao abrir caixa", variant: "destructive" }); }
    finally { setSubmitting(false); }
  };

  const saldoEsperado = caixa ? caixa.valorAbertura + caixa.totalEntradas - caixa.totalSaidas : 0;
  const diferenca = parseFloat(valorFechamento || "0") - saldoEsperado;

  const fecharCaixa = async () => {
    if (!caixa) return;
    setSubmitting(true);
    try {
      const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/caixa-diario/${caixa.id}/fechar`), {
        method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ valorFechamento: parseFloat(valorFechamento) || 0 }),
      });
      if (res.ok) { toast({ title: "Caixa fechado com sucesso!" }); setShowFechar(false); setCaixa(null); fetchCaixa(); }
      else { const err = await res.json().catch(() => ({})); toast({ title: (err as any).error || "Erro ao fechar caixa", variant: "destructive" }); }
    } catch { toast({ title: "Erro ao fechar caixa", variant: "destructive" }); }
    finally { setSubmitting(false); }
  };

  const addMovimentacao = async () => {
    if (!caixa || !movDescricao || !movValor) return;
    setSubmitting(true);
    try {
      const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/caixa-diario/${caixa.id}/movimentacoes`), {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ tipo: movTipo, descricao: movDescricao, valor: parseFloat(movValor), categoria: movCategoria, formaPagamento: movFormaPag }),
      });
      if (res.ok) { toast({ title: "Movimentação registrada!" }); setShowMov(false); setMovDescricao(""); setMovValor(""); setMovCategoria(""); fetchCaixa(); }
    } catch { toast({ title: "Erro ao registrar", variant: "destructive" }); }
    finally { setSubmitting(false); }
  };

  const handleSangria = async () => {
    if (!caixa || !sangriaValor) return;
    setSubmitting(true);
    try {
      const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/caixa-diario/${caixa.id}/sangria`), {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ valor: parseFloat(sangriaValor), motivo: sangriaMotivo }),
      });
      if (res.ok) { toast({ title: "Sangria registrada!" }); setShowSangria(false); setSangriaValor(""); setSangriaMotivo(""); fetchCaixa(); }
      else { const err = await res.json(); toast({ title: err.error || "Erro", variant: "destructive" }); }
    } catch { toast({ title: "Erro ao registrar sangria", variant: "destructive" }); }
    finally { setSubmitting(false); }
  };

  const handleVale = async () => {
    if (!caixa || !valeValor || !valeProfId) return;
    setSubmitting(true);
    try {
      const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/caixa-diario/${caixa.id}/vale`), {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ valor: parseFloat(valeValor), profissionalId: parseInt(valeProfId), observacao: valeObs }),
      });
      if (res.ok) { toast({ title: "Vale registrado!" }); setShowVale(false); setValeValor(""); setValeProfId(""); setValeObs(""); fetchCaixa(); }
      else { const err = await res.json(); toast({ title: err.error || "Erro", variant: "destructive" }); }
    } catch { toast({ title: "Erro ao registrar vale", variant: "destructive" }); }
    finally { setSubmitting(false); }
  };

  if (loading) return <AppLayout><div className="animate-pulse h-48 bg-white rounded-2xl" /></AppLayout>;

  return (
    <AppLayout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-bold text-foreground">Caixa do Dia</h1>
          <p className="text-foreground/40 text-[14px] mt-0.5">Controle de abertura e fechamento do caixa diário</p>
        </div>
        {!caixa ? (
          <Button onClick={() => setShowAbrir(true)} className="rounded-xl"><Unlock className="h-4 w-4 mr-2" />Abrir Caixa</Button>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setShowMov(true)} variant="outline" className="rounded-xl"><Plus className="h-4 w-4 mr-2" />Movimentação</Button>
            <Button onClick={() => setShowSangria(true)} variant="outline" className="rounded-xl text-orange-600 border-orange-200 hover:bg-orange-50"><Banknote className="h-4 w-4 mr-2" />Sangria</Button>
            <Button onClick={() => setShowVale(true)} variant="outline" className="rounded-xl text-purple-600 border-purple-200 hover:bg-purple-50"><Gift className="h-4 w-4 mr-2" />Vale</Button>
            <Button onClick={() => { setValorFechamento(String(saldoEsperado.toFixed(2))); setShowFechar(true); }} variant="destructive" className="rounded-xl"><Lock className="h-4 w-4 mr-2" />Fechar Caixa</Button>
          </div>
        )}
      </div>

      {showAbrir && (
        <Card className="mb-6 bg-white border-black/[0.04] shadow-none">
          <CardHeader><CardTitle className="text-[16px]">Abrir Caixa</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Valor de Abertura (R$)</Label><Input type="number" value={valorAbertura} onChange={e => setValorAbertura(e.target.value)} className="mt-1" /></div>
            <div><Label>Observação</Label><Input value={obsAbertura} onChange={e => setObsAbertura(e.target.value)} className="mt-1" /></div>
            <div className="flex gap-2">
              <Button onClick={abrirCaixa} className="rounded-xl" disabled={submitting}>Confirmar Abertura</Button>
              <Button variant="ghost" onClick={() => setShowAbrir(false)} className="rounded-xl">Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={showFechar} onOpenChange={setShowFechar}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Fechar Caixa — Conferência</DialogTitle></DialogHeader>
          {caixa && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-xl bg-gray-50">
                  <p className="text-[11px] text-foreground/40">Abertura</p>
                  <p className="text-[16px] font-bold">{formatCurrency(caixa.valorAbertura)}</p>
                </div>
                <div className="p-3 rounded-xl bg-green-50">
                  <p className="text-[11px] text-green-600">Entradas</p>
                  <p className="text-[16px] font-bold text-green-700">+{formatCurrency(caixa.totalEntradas)}</p>
                </div>
                <div className="p-3 rounded-xl bg-red-50">
                  <p className="text-[11px] text-red-600">Saídas</p>
                  <p className="text-[16px] font-bold text-red-700">-{formatCurrency(caixa.totalSaidas)}</p>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-blue-50 text-center">
                <p className="text-[12px] text-blue-600">Valor Esperado em Caixa</p>
                <p className="text-[22px] font-bold text-blue-700">{formatCurrency(saldoEsperado)}</p>
              </div>
              <div>
                <Label>Valor Informado (R$)</Label>
                <Input type="number" step="0.01" value={valorFechamento} onChange={e => setValorFechamento(e.target.value)} className="mt-1 text-center text-lg font-bold" />
              </div>
              {valorFechamento && (
                <div className={`p-3 rounded-xl text-center ${diferenca === 0 ? "bg-green-50" : diferenca > 0 ? "bg-yellow-50" : "bg-red-50"}`}>
                  <p className="text-[12px] text-foreground/50">Diferença</p>
                  <p className={`text-[18px] font-bold ${diferenca === 0 ? "text-green-600" : diferenca > 0 ? "text-yellow-600" : "text-red-600"}`}>
                    {diferenca > 0 ? "+" : ""}{formatCurrency(diferenca)}
                    {diferenca === 0 && " ✓"}
                    {diferenca > 0 && " (sobra)"}
                    {diferenca < 0 && " (falta)"}
                  </p>
                </div>
              )}
              <Button onClick={fecharCaixa} variant="destructive" className="w-full rounded-xl" disabled={submitting}>
                {submitting ? "Fechando..." : "Confirmar Fechamento"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showMov} onOpenChange={setShowMov}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nova Movimentação</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Tipo</Label>
                <Select value={movTipo} onValueChange={setMovTipo}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="entrada">Entrada</SelectItem><SelectItem value="saida">Saída</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Forma de Pagamento</Label>
                <Select value={movFormaPag} onValueChange={setMovFormaPag}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="dinheiro">Dinheiro</SelectItem><SelectItem value="pix">PIX</SelectItem><SelectItem value="debito">Débito</SelectItem><SelectItem value="credito">Crédito</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Descrição</Label><Input value={movDescricao} onChange={e => setMovDescricao(e.target.value)} className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Valor (R$)</Label><Input type="number" value={movValor} onChange={e => setMovValor(e.target.value)} className="mt-1" /></div>
              <div><Label>Categoria</Label><Input value={movCategoria} onChange={e => setMovCategoria(e.target.value)} className="mt-1" placeholder="Ex: Venda, Despesa..." /></div>
            </div>
            <Button onClick={addMovimentacao} className="w-full rounded-xl" disabled={submitting}>Registrar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSangria} onOpenChange={setShowSangria}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Sangria de Caixa</DialogTitle></DialogHeader>
          <p className="text-[13px] text-foreground/50">Retirar dinheiro do caixa durante o expediente</p>
          <div className="space-y-4">
            <div><Label>Valor (R$)</Label><Input type="number" step="0.01" value={sangriaValor} onChange={e => setSangriaValor(e.target.value)} className="mt-1" /></div>
            <div><Label>Motivo</Label><Input value={sangriaMotivo} onChange={e => setSangriaMotivo(e.target.value)} className="mt-1" placeholder="Ex: Pagamento fornecedor" /></div>
            <Button onClick={handleSangria} className="w-full rounded-xl bg-orange-600 hover:bg-orange-700" disabled={submitting || !sangriaValor}>
              {submitting ? "Registrando..." : "Registrar Sangria"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showVale} onOpenChange={setShowVale}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Vale / Adiantamento</DialogTitle></DialogHeader>
          <p className="text-[13px] text-foreground/50">Lançar vale para profissional — saída do caixa + débito na conta</p>
          <div className="space-y-4">
            <div>
              <Label>Profissional</Label>
              <select value={valeProfId} onChange={e => setValeProfId(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm mt-1">
                <option value="">Selecione...</option>
                {profissionais.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.apelido || p.nomeExibicao}</option>
                ))}
              </select>
            </div>
            <div><Label>Valor (R$)</Label><Input type="number" step="0.01" value={valeValor} onChange={e => setValeValor(e.target.value)} className="mt-1" /></div>
            <div><Label>Observação</Label><Input value={valeObs} onChange={e => setValeObs(e.target.value)} className="mt-1" placeholder="Opcional" /></div>
            <Button onClick={handleVale} className="w-full rounded-xl bg-purple-600 hover:bg-purple-700" disabled={submitting || !valeProfId || !valeValor}>
              {submitting ? "Registrando..." : "Registrar Vale"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {caixa ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
            <Card className="bg-white border-black/[0.04] shadow-none">
              <CardContent className="p-4">
                <p className="text-[12px] text-foreground/40 mb-1">Abertura</p>
                <p className="text-[20px] font-bold">{formatCurrency(caixa.valorAbertura)}</p>
              </CardContent>
            </Card>
            <Card className="bg-green-50 border-green-100 shadow-none">
              <CardContent className="p-4">
                <p className="text-[12px] text-green-600 mb-1 flex items-center gap-1"><ArrowUpCircle className="h-3 w-3" />Entradas</p>
                <p className="text-[20px] font-bold text-green-700">{formatCurrency(caixa.totalEntradas)}</p>
              </CardContent>
            </Card>
            <Card className="bg-red-50 border-red-100 shadow-none">
              <CardContent className="p-4">
                <p className="text-[12px] text-red-600 mb-1 flex items-center gap-1"><ArrowDownCircle className="h-3 w-3" />Saídas</p>
                <p className="text-[20px] font-bold text-red-700">{formatCurrency(caixa.totalSaidas)}</p>
              </CardContent>
            </Card>
            <Card className="bg-blue-50 border-blue-100 shadow-none">
              <CardContent className="p-4">
                <p className="text-[12px] text-blue-600 mb-1">Saldo Atual</p>
                <p className="text-[20px] font-bold text-blue-700">{formatCurrency(saldoEsperado)}</p>
              </CardContent>
            </Card>
          </div>
          <Card className="bg-white border-black/[0.04] shadow-none">
            <CardHeader><CardTitle className="text-[16px]">Movimentações</CardTitle></CardHeader>
            <CardContent>
              {(!caixa.movimentacoes || caixa.movimentacoes.length === 0) ? (
                <p className="text-center text-foreground/40 py-8">Nenhuma movimentação registrada</p>
              ) : (
                <div className="space-y-2">
                  {caixa.movimentacoes.map((m: any) => (
                    <div key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                      <div className="flex items-center gap-3">
                        {m.tipo === "entrada" ? <ArrowUpCircle className="h-4 w-4 text-green-500" /> : <ArrowDownCircle className="h-4 w-4 text-red-500" />}
                        <div>
                          <p className="text-[14px] font-medium">{m.descricao}</p>
                          <div className="flex items-center gap-1.5 text-[12px] text-foreground/40">
                            {m.categoria && <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${m.categoria === "sangria" ? "bg-orange-100 text-orange-600" : m.categoria === "vale" ? "bg-purple-100 text-purple-600" : "bg-gray-100 text-gray-500"}`}>{m.categoria}</span>}
                            <span>{m.formaPagamento}</span>
                            <span>·</span>
                            <span>{new Date(m.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                          </div>
                        </div>
                      </div>
                      <span className={`text-[14px] font-semibold ${m.tipo === "entrada" ? "text-green-600" : "text-red-600"}`}>
                        {m.tipo === "entrada" ? "+" : "-"}{formatCurrency(m.valor)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : !showAbrir && (
        <Card className="bg-white border-black/[0.04] shadow-none">
          <CardContent className="py-16 text-center">
            <DollarSign className="h-12 w-12 text-foreground/15 mx-auto mb-4" />
            <p className="text-foreground/40 text-[14px]">Nenhum caixa aberto. Clique em "Abrir Caixa" para começar.</p>
          </CardContent>
        </Card>
      )}
    </AppLayout>
  );
}
