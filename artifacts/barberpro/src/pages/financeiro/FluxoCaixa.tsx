import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, ArrowUpCircle, ArrowDownCircle, DollarSign, Search, CreditCard, Gift } from "lucide-react";

export default function FluxoCaixa() {
  const { barbeariaId } = useAuth();
  const [comandas, setComandas] = useState<any[]>([]);
  const [contas, setContas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataInicio, setDataInicio] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10); });
  const [dataFim, setDataFim] = useState(() => new Date().toISOString().slice(0, 10));
  const BASE = import.meta.env.BASE_URL;

  useEffect(() => { if (barbeariaId) fetchData(); }, [barbeariaId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [comRes, finRes] = await Promise.all([
        fetch(`${BASE}api/barbearias/${barbeariaId}/comandas?dataInicio=${dataInicio}&dataFim=${dataFim}`, { credentials: "include" }),
        fetch(`${BASE}api/barbearias/${barbeariaId}/financeiro`, { credentials: "include" }),
      ]);
      if (comRes.ok) setComandas(await comRes.json());
      if (finRes.ok) setContas(await finRes.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const totalBruto = comandas.reduce((s, c) => s + c.valorTotal, 0);
  const totalLiquido = comandas.reduce((s, c) => s + (c.valorLiquido ?? c.valorTotal), 0);
  const totalTaxas = comandas.reduce((s, c) => s + (c.taxaCartao ?? 0), 0);
  const totalGorjetas = comandas.reduce((s, c) => s + (c.gorjeta?.valor ?? 0), 0);
  const totalReceber = contas.filter(c => c.tipo === "receber" && c.status === "pendente").reduce((s, c) => s + c.valor, 0);
  const totalPagar = contas.filter(c => c.tipo === "pagar" && c.status === "pendente").reduce((s, c) => s + c.valor, 0);
  const saldo = totalLiquido + totalReceber - totalPagar;

  const aCompensarFuturo = comandas.filter(c => c.dataCompensacao && new Date(c.dataCompensacao) > new Date());
  const totalACompensar = aCompensarFuturo.reduce((s, c) => s + (c.valorLiquido ?? c.valorTotal), 0);

  const byDay: Record<string, { bruto: number; liquido: number; taxas: number; gorjetas: number }> = {};
  comandas.forEach(c => {
    const d = c.dataFechamento ? new Date(c.dataFechamento).toLocaleDateString("pt-BR") : "—";
    if (!byDay[d]) byDay[d] = { bruto: 0, liquido: 0, taxas: 0, gorjetas: 0 };
    byDay[d].bruto += c.valorTotal;
    byDay[d].liquido += c.valorLiquido ?? c.valorTotal;
    byDay[d].taxas += c.taxaCartao ?? 0;
    byDay[d].gorjetas += c.gorjeta?.valor ?? 0;
  });

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-[24px] font-bold text-foreground">Fluxo de Caixa</h1>
        <p className="text-foreground/40 text-[14px] mt-0.5">Visão consolidada das finanças</p>
      </div>
      <div className="flex flex-wrap gap-3 mb-6">
        <Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="w-40 rounded-xl" />
        <Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="w-40 rounded-xl" />
        <Button onClick={fetchData} className="rounded-xl"><Search className="h-4 w-4 mr-2" />Filtrar</Button>
      </div>

      {loading ? <div className="animate-pulse h-48 bg-white rounded-2xl" /> : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="bg-green-50 border-green-100 shadow-none"><CardContent className="p-4">
              <p className="text-[12px] text-green-600 mb-1 flex items-center gap-1"><ArrowUpCircle className="h-3 w-3" />Receita Bruta</p>
              <p className="text-[20px] font-bold text-green-700">{formatCurrency(totalBruto)}</p>
              {totalGorjetas > 0 && <p className="text-[11px] text-green-500 mt-0.5">incl. gorjetas: {formatCurrency(totalGorjetas)}</p>}
            </CardContent></Card>
            <Card className="bg-emerald-50 border-emerald-100 shadow-none"><CardContent className="p-4">
              <p className="text-[12px] text-emerald-600 mb-1 flex items-center gap-1"><TrendingUp className="h-3 w-3" />Receita Líquida</p>
              <p className="text-[20px] font-bold text-emerald-700">{formatCurrency(totalLiquido)}</p>
              {totalTaxas > 0 && <p className="text-[11px] text-red-400 mt-0.5">taxas cartão: -{formatCurrency(totalTaxas)}</p>}
            </CardContent></Card>
            <Card className="bg-blue-50 border-blue-100 shadow-none"><CardContent className="p-4">
              <p className="text-[12px] text-blue-600 mb-1">A Receber</p>
              <p className="text-[20px] font-bold text-blue-700">{formatCurrency(totalReceber)}</p>
              {totalACompensar > 0 && <p className="text-[11px] text-blue-500 mt-0.5">{aCompensarFuturo.length} cartão a compensar</p>}
            </CardContent></Card>
            <Card className="bg-red-50 border-red-100 shadow-none"><CardContent className="p-4">
              <p className="text-[12px] text-red-600 mb-1 flex items-center gap-1"><ArrowDownCircle className="h-3 w-3" />A Pagar</p>
              <p className="text-[20px] font-bold text-red-700">{formatCurrency(totalPagar)}</p>
            </CardContent></Card>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <Card className="bg-white border-black/[0.04] shadow-none"><CardContent className="p-4">
              <p className="text-[12px] text-foreground/40 mb-1 flex items-center gap-1"><DollarSign className="h-3 w-3" />Saldo</p>
              <p className={`text-[20px] font-bold ${saldo >= 0 ? "text-green-700" : "text-red-700"}`}>{formatCurrency(saldo)}</p>
            </CardContent></Card>
            {totalTaxas > 0 && (
              <Card className="bg-orange-50 border-orange-100 shadow-none"><CardContent className="p-4">
                <p className="text-[12px] text-orange-600 mb-1 flex items-center gap-1"><CreditCard className="h-3 w-3" />Total Taxas Cartão</p>
                <p className="text-[20px] font-bold text-orange-700">-{formatCurrency(totalTaxas)}</p>
              </CardContent></Card>
            )}
          </div>

          <Card className="bg-white border-black/[0.04] shadow-none">
            <CardHeader><CardTitle className="text-[16px]">Receitas por Dia</CardTitle></CardHeader>
            <CardContent>
              {Object.keys(byDay).length === 0 ? (
                <p className="text-center text-foreground/40 py-8">Sem dados no período</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(byDay).map(([dia, v]) => (
                    <div key={dia} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                      <span className="text-[14px] font-medium">{dia}</span>
                      <div className="flex items-center gap-3">
                        {v.taxas > 0 && <span className="text-[11px] text-red-400">-{formatCurrency(v.taxas)}</span>}
                        {v.gorjetas > 0 && <Badge variant="outline" className="text-[10px] text-green-600 gap-0.5"><Gift className="h-2.5 w-2.5" />{formatCurrency(v.gorjetas)}</Badge>}
                        <span className="text-[14px] font-semibold text-green-600">+{formatCurrency(v.liquido)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {aCompensarFuturo.length > 0 && (
            <Card className="bg-white border-black/[0.04] shadow-none mt-4">
              <CardHeader><CardTitle className="text-[16px]">Recebimentos de Cartão Pendentes</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {aCompensarFuturo.map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-blue-50">
                      <div>
                        <span className="text-[13px] font-medium">Comanda #{c.id}</span>
                        <span className="text-[12px] text-foreground/40 ml-2">{c.clienteNome}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-foreground/40">Comp: {c.dataCompensacao}</span>
                        <span className="text-[14px] font-semibold text-blue-600">{formatCurrency(c.valorLiquido ?? c.valorTotal)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </AppLayout>
  );
}
