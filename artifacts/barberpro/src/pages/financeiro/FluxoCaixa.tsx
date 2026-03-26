import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, ArrowUpCircle, ArrowDownCircle, DollarSign, Search } from "lucide-react";

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

  const totalReceitas = comandas.reduce((s, c) => s + c.valorTotal, 0);
  const totalReceber = contas.filter(c => c.tipo === "receber" && c.status === "pendente").reduce((s, c) => s + c.valor, 0);
  const totalPagar = contas.filter(c => c.tipo === "pagar" && c.status === "pendente").reduce((s, c) => s + c.valor, 0);
  const saldo = totalReceitas + totalReceber - totalPagar;

  const byDay: Record<string, { entradas: number; saidas: number }> = {};
  comandas.forEach(c => {
    const d = c.dataFechamento ? new Date(c.dataFechamento).toLocaleDateString("pt-BR") : "—";
    if (!byDay[d]) byDay[d] = { entradas: 0, saidas: 0 };
    byDay[d].entradas += c.valorTotal;
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
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
            <Card className="bg-green-50 border-green-100 shadow-none"><CardContent className="p-4">
              <p className="text-[12px] text-green-600 mb-1 flex items-center gap-1"><ArrowUpCircle className="h-3 w-3" />Receitas (Comandas)</p>
              <p className="text-[20px] font-bold text-green-700">{formatCurrency(totalReceitas)}</p>
            </CardContent></Card>
            <Card className="bg-blue-50 border-blue-100 shadow-none"><CardContent className="p-4">
              <p className="text-[12px] text-blue-600 mb-1">A Receber</p>
              <p className="text-[20px] font-bold text-blue-700">{formatCurrency(totalReceber)}</p>
            </CardContent></Card>
            <Card className="bg-red-50 border-red-100 shadow-none"><CardContent className="p-4">
              <p className="text-[12px] text-red-600 mb-1 flex items-center gap-1"><ArrowDownCircle className="h-3 w-3" />A Pagar</p>
              <p className="text-[20px] font-bold text-red-700">{formatCurrency(totalPagar)}</p>
            </CardContent></Card>
            <Card className="bg-white border-black/[0.04] shadow-none"><CardContent className="p-4">
              <p className="text-[12px] text-foreground/40 mb-1 flex items-center gap-1"><DollarSign className="h-3 w-3" />Saldo</p>
              <p className={`text-[20px] font-bold ${saldo >= 0 ? "text-green-700" : "text-red-700"}`}>{formatCurrency(saldo)}</p>
            </CardContent></Card>
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
                      <span className="text-[14px] font-semibold text-green-600">+{formatCurrency(v.entradas)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </AppLayout>
  );
}
