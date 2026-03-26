import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Plus, Lock, Unlock, ArrowUpCircle, ArrowDownCircle, Clock } from "lucide-react";

export default function CaixaDiario() {
  const { barbeariaId } = useAuth();
  const { toast } = useToast();
  const [caixa, setCaixa] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAbrir, setShowAbrir] = useState(false);
  const [showMov, setShowMov] = useState(false);
  const [showFechar, setShowFechar] = useState(false);
  const [valorAbertura, setValorAbertura] = useState("0");
  const [obsAbertura, setObsAbertura] = useState("");
  const [movTipo, setMovTipo] = useState("entrada");
  const [movDescricao, setMovDescricao] = useState("");
  const [movValor, setMovValor] = useState("");
  const [movCategoria, setMovCategoria] = useState("");
  const [movFormaPag, setMovFormaPag] = useState("dinheiro");
  const [valorFechamento, setValorFechamento] = useState("");

  const BASE = import.meta.env.BASE_URL;

  useEffect(() => {
    if (barbeariaId) fetchCaixa();
  }, [barbeariaId]);

  const fetchCaixa = async () => {
    try {
      const res = await fetch(`${BASE}api/barbearias/${barbeariaId}/caixa-diario/atual`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setCaixa(data);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const abrirCaixa = async () => {
    try {
      const res = await fetch(`${BASE}api/barbearias/${barbeariaId}/caixa-diario/abrir`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ valorAbertura: parseFloat(valorAbertura) || 0, observacao: obsAbertura }),
      });
      if (res.ok) {
        toast({ title: "Caixa aberto com sucesso!" });
        setShowAbrir(false);
        fetchCaixa();
      } else {
        const err = await res.json();
        toast({ title: err.error || "Erro ao abrir caixa", variant: "destructive" });
      }
    } catch { toast({ title: "Erro ao abrir caixa", variant: "destructive" }); }
  };

  const fecharCaixa = async () => {
    if (!caixa) return;
    try {
      const res = await fetch(`${BASE}api/barbearias/${barbeariaId}/caixa-diario/${caixa.id}/fechar`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ valorFechamento: parseFloat(valorFechamento) || 0 }),
      });
      if (res.ok) {
        toast({ title: "Caixa fechado com sucesso!" });
        setShowFechar(false);
        setCaixa(null);
        fetchCaixa();
      }
    } catch { toast({ title: "Erro ao fechar caixa", variant: "destructive" }); }
  };

  const addMovimentacao = async () => {
    if (!caixa || !movDescricao || !movValor) return;
    try {
      const res = await fetch(`${BASE}api/barbearias/${barbeariaId}/caixa-diario/${caixa.id}/movimentacoes`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ tipo: movTipo, descricao: movDescricao, valor: parseFloat(movValor), categoria: movCategoria, formaPagamento: movFormaPag }),
      });
      if (res.ok) {
        toast({ title: "Movimentação registrada!" });
        setShowMov(false);
        setMovDescricao(""); setMovValor(""); setMovCategoria("");
        fetchCaixa();
      }
    } catch { toast({ title: "Erro ao registrar", variant: "destructive" }); }
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
          <div className="flex gap-2">
            <Button onClick={() => setShowMov(true)} variant="outline" className="rounded-xl"><Plus className="h-4 w-4 mr-2" />Movimentação</Button>
            <Button onClick={() => { setValorFechamento(String(caixa.valorAbertura + caixa.totalEntradas - caixa.totalSaidas)); setShowFechar(true); }} variant="destructive" className="rounded-xl"><Lock className="h-4 w-4 mr-2" />Fechar Caixa</Button>
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
              <Button onClick={abrirCaixa} className="rounded-xl">Confirmar Abertura</Button>
              <Button variant="ghost" onClick={() => setShowAbrir(false)} className="rounded-xl">Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {showFechar && caixa && (
        <Card className="mb-6 bg-white border-black/[0.04] shadow-none">
          <CardHeader><CardTitle className="text-[16px]">Fechar Caixa</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Valor em Caixa (R$)</Label><Input type="number" value={valorFechamento} onChange={e => setValorFechamento(e.target.value)} className="mt-1" /></div>
            <p className="text-sm text-foreground/60">Saldo esperado: {formatCurrency(caixa.valorAbertura + caixa.totalEntradas - caixa.totalSaidas)}</p>
            <div className="flex gap-2">
              <Button onClick={fecharCaixa} variant="destructive" className="rounded-xl">Confirmar Fechamento</Button>
              <Button variant="ghost" onClick={() => setShowFechar(false)} className="rounded-xl">Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {showMov && caixa && (
        <Card className="mb-6 bg-white border-black/[0.04] shadow-none">
          <CardHeader><CardTitle className="text-[16px]">Nova Movimentação</CardTitle></CardHeader>
          <CardContent className="space-y-4">
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
            <div className="flex gap-2">
              <Button onClick={addMovimentacao} className="rounded-xl">Registrar</Button>
              <Button variant="ghost" onClick={() => setShowMov(false)} className="rounded-xl">Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

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
                <p className="text-[20px] font-bold text-blue-700">{formatCurrency(caixa.valorAbertura + caixa.totalEntradas - caixa.totalSaidas)}</p>
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
                          <p className="text-[12px] text-foreground/40">{m.categoria} · {m.formaPagamento} · {new Date(m.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
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
