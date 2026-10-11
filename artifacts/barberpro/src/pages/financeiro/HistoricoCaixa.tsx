import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { History, Search, Calendar, ArrowUpCircle, ArrowDownCircle } from "lucide-react";

export default function HistoricoCaixa() {
  const { barbeariaId } = useAuth();
  const [caixas, setCaixas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataInicio, setDataInicio] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10); });
  const [dataFim, setDataFim] = useState(() => new Date().toISOString().slice(0, 10));
  const BASE = import.meta.env.BASE_URL;

  useEffect(() => { if (barbeariaId) fetchHistorico(); }, [barbeariaId]);

  const fetchHistorico = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}api/barbearias/${barbeariaId}/caixa-diario/historico?dataInicio=${dataInicio}&dataFim=${dataFim}`, { credentials: "include" });
      if (res.ok) setCaixas(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-[24px] font-bold text-foreground">Histórico de caixas</h1>
        <p className="text-foreground/40 text-[14px] mt-0.5">Fechamentos anteriores, com totais e diferenças</p>
      </div>
      <div className="flex flex-wrap gap-3 mb-6">
        <Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="w-40 rounded-xl" />
        <Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="w-40 rounded-xl" />
        <Button onClick={fetchHistorico} className="rounded-xl"><Search className="h-4 w-4 mr-2" />Buscar</Button>
      </div>
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-card rounded-2xl animate-pulse" />)}</div>
      ) : caixas.length === 0 ? (
        <Card className="bg-card border-border shadow-none">
          <CardContent className="py-16 text-center">
            <History className="h-12 w-12 text-foreground/15 mx-auto mb-4" />
            <p className="text-foreground/40 text-[14px]">Nenhum caixa encontrado no período</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {caixas.map(c => (
            <Card key={c.id} className="bg-card border-border shadow-none">
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${c.status === "aberto" ? "bg-green-50" : "bg-gray-100"}`}>
                      <Calendar className={`h-5 w-5 ${c.status === "aberto" ? "text-green-600" : "text-gray-400"}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-[14px]">{new Date(c.dataAbertura).toLocaleDateString("pt-BR")}</p>
                      <p className="text-[12px] text-foreground/40">{c.abertoPor} · {c.status === "aberto" ? "Aberto" : `Fechado por ${c.fechadoPor || "—"}`}</p>
                    </div>
                  </div>
                  <div className="flex gap-6 text-right">
                    <div><p className="text-[11px] text-foreground/40">Abertura</p><p className="text-[14px] font-medium">{formatCurrency(c.valorAbertura)}</p></div>
                    <div><p className="text-[11px] text-green-500 flex items-center gap-1"><ArrowUpCircle className="h-3 w-3" />Entradas</p><p className="text-[14px] font-medium text-green-600">{formatCurrency(c.totalEntradas)}</p></div>
                    <div><p className="text-[11px] text-red-500 flex items-center gap-1"><ArrowDownCircle className="h-3 w-3" />Saídas</p><p className="text-[14px] font-medium text-red-600">{formatCurrency(c.totalSaidas)}</p></div>
                    <div><p className="text-[11px] text-foreground/40">Saldo</p><p className="text-[14px] font-bold">{formatCurrency(c.saldoFinal ?? (c.valorAbertura + c.totalEntradas - c.totalSaidas))}</p></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
