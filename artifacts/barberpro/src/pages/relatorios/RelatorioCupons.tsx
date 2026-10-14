import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { apiUrl, formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Search, Ticket, Download, ChevronRight, X, Trophy, TrendingUp,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type CupomReportRow = {
  cupomId: number;
  codigo: string;
  tipo: string;
  valor: number;
  ativo: boolean;
  usos: number;
  receitaBruta: number;
  receitaLiquida: number;
  descontoTotal: number;
  ticketMedio: number;
};

type ComandaCupom = {
  id: number;
  clienteNome: string;
  profissionalNome: string;
  dataFechamento: string | null;
  valorBruto: number;
  cupomDesconto: number;
  valorFinal: number;
};

export default function RelatorioCupons() {
  const { barbeariaId } = useAuth();
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  const [dataInicio, setDataInicio] = useState(monthAgo);
  const [dataFim, setDataFim] = useState(today);
  const [searchInicio, setSearchInicio] = useState(monthAgo);
  const [searchFim, setSearchFim] = useState(today);
  const [drillCupom, setDrillCupom] = useState<CupomReportRow | null>(null);

  const { data = [], isLoading } = useQuery<CupomReportRow[]>({
    queryKey: ["cupons-relatorio", barbeariaId, searchInicio, searchFim],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchInicio) params.set("inicio", searchInicio);
      if (searchFim) params.set("fim", searchFim);
      const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/cupons/relatorio?${params}`), { credentials: "include" });
      if (!res.ok) throw new Error("Erro ao carregar relatório");
      return res.json();
    },
    enabled: !!barbeariaId,
  });

  const { data: drillData, isLoading: loadingDrill } = useQuery<{ cupom: any; comandas: ComandaCupom[] }>({
    queryKey: ["cupons-drill", barbeariaId, drillCupom?.cupomId, searchInicio, searchFim],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchInicio) params.set("inicio", searchInicio);
      if (searchFim) params.set("fim", searchFim);
      const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/cupons/${drillCupom!.cupomId}/comandas?${params}`), { credentials: "include" });
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
    enabled: !!drillCupom && !!barbeariaId,
  });

  const totals = data.reduce(
    (acc, r) => {
      acc.usos += r.usos;
      acc.receitaBruta += r.receitaBruta;
      acc.receitaLiquida += r.receitaLiquida;
      acc.descontoTotal += r.descontoTotal;
      return acc;
    },
    { usos: 0, receitaBruta: 0, receitaLiquida: 0, descontoTotal: 0 }
  );

  const top5Ids = new Set(data.slice(0, 5).map(r => r.cupomId));

  async function exportExcel() {
    const XLSX = await import("xlsx");
    const exportData = data.map((r, idx) => ({
      Posição: idx + 1,
      Código: r.codigo,
      Tipo: r.tipo === "percentual" ? "%" : "R$",
      "Valor do cupom": r.valor,
      Ativo: r.ativo ? "Sim" : "Não",
      Usos: r.usos,
      "Receita bruta": Number(r.receitaBruta.toFixed(2)),
      "Desconto concedido": Number(r.descontoTotal.toFixed(2)),
      "Receita líquida": Number(r.receitaLiquida.toFixed(2)),
      "Ticket médio": Number(r.ticketMedio.toFixed(2)),
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cupons");
    XLSX.writeFile(wb, `Relatorio_Cupons_${searchInicio}_a_${searchFim}.xlsx`);
  }

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-[24px] font-bold text-foreground">Cupons</h1>
        <p className="text-foreground/40 text-[14px] mt-0.5">Vendas geradas por cada cupom</p>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-end gap-3 flex-wrap">
            <div className="space-y-1">
              <Label className="text-xs">Data inicial</Label>
              <Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="w-40" data-testid="input-data-inicio" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Data final</Label>
              <Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="w-40" data-testid="input-data-fim" />
            </div>
            <Button onClick={() => { setSearchInicio(dataInicio); setSearchFim(dataFim); }} size="sm" data-testid="button-pesquisar">
              <Search className="h-4 w-4 mr-1.5" /> Pesquisar
            </Button>
            <div className="flex-1" />
            <Button variant="outline" size="sm" className="gap-1.5" onClick={exportExcel} disabled={data.length === 0} data-testid="button-export">
              <Download className="h-4 w-4" /> Excel/CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-[12px] text-foreground/40 mb-1">Cupons usados</p>
            <p className="text-[22px] font-bold">{data.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[12px] text-foreground/40 mb-1">Total de usos</p>
            <p className="text-[22px] font-bold">{totals.usos}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[12px] text-foreground/40 mb-1">Receita líquida</p>
            <p className="text-[22px] font-bold text-primary">{formatCurrency(totals.receitaLiquida)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[12px] text-foreground/40 mb-1">Desconto concedido</p>
            <p className="text-[22px] font-bold text-orange-600">{formatCurrency(totals.descontoTotal)}</p>
          </CardContent>
        </Card>
      </div>

      {data.length > 0 && (
        <Card className="mb-6 border-amber-200 bg-gradient-to-br from-amber-50/60 to-transparent dark:from-amber-900/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" /> Top 5 Cupons
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {data.slice(0, 5).map((r, idx) => (
                <button
                  key={r.cupomId}
                  onClick={() => setDrillCupom(r)}
                  className="text-left p-3 rounded-xl bg-card border border-amber-200/40 hover:border-amber-400 hover:bg-amber-50/40 transition-colors"
                  data-testid={`top-cupom-${r.cupomId}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <Badge className="bg-amber-500/10 text-amber-700 border-amber-300/50">#{idx + 1}</Badge>
                    <TrendingUp className="h-3.5 w-3.5 text-amber-500" />
                  </div>
                  <p className="font-mono font-bold text-sm truncate">{r.codigo}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">{r.usos} {r.usos === 1 ? "uso" : "usos"}</p>
                  <p className="text-[15px] font-semibold text-primary mt-1">{formatCurrency(r.receitaLiquida)}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Ranking de Cupons</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[1, 2, 3, 4].map(i => <div key={i} className="h-12 bg-muted/30 rounded-lg animate-pulse" />)}</div>
          ) : data.length === 0 ? (
            <div className="text-center py-16">
              <Ticket className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">Nenhum cupom utilizado neste período.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-border text-[12px] text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">#</th>
                    <th className="py-2 pr-3 font-medium">Código</th>
                    <th className="py-2 pr-3 font-medium">Cupom</th>
                    <th className="py-2 pr-3 font-medium text-right">Usos</th>
                    <th className="py-2 pr-3 font-medium text-right">Receita bruta</th>
                    <th className="py-2 pr-3 font-medium text-right">Desconto</th>
                    <th className="py-2 pr-3 font-medium text-right">Receita líquida</th>
                    <th className="py-2 pr-3 font-medium text-right">Ticket médio</th>
                    <th className="py-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {data.map((r, idx) => {
                    const isTop = top5Ids.has(r.cupomId);
                    return (
                      <tr
                        key={r.cupomId}
                        className={`border-b border-border/50 hover:bg-muted/30 cursor-pointer ${isTop ? "bg-amber-50/30 dark:bg-amber-900/5" : ""}`}
                        onClick={() => setDrillCupom(r)}
                        data-testid={`row-cupom-${r.cupomId}`}
                      >
                        <td className="py-2.5 pr-3 font-medium">
                          {isTop ? (
                            <Badge className="bg-amber-500/10 text-amber-700 border-amber-300/50">#{idx + 1}</Badge>
                          ) : (
                            <span className="text-muted-foreground">{idx + 1}</span>
                          )}
                        </td>
                        <td className="py-2.5 pr-3 font-mono font-semibold">{r.codigo}</td>
                        <td className="py-2.5 pr-3 text-muted-foreground text-[12px]">
                          {r.tipo === "percentual" ? `${r.valor}%` : `R$ ${r.valor.toFixed(2)}`}
                          {!r.ativo && <Badge variant="secondary" className="ml-2 text-[10px]">Inativo</Badge>}
                        </td>
                        <td className="py-2.5 pr-3 text-right">{r.usos}</td>
                        <td className="py-2.5 pr-3 text-right">{formatCurrency(r.receitaBruta)}</td>
                        <td className="py-2.5 pr-3 text-right text-orange-600">{formatCurrency(r.descontoTotal)}</td>
                        <td className="py-2.5 pr-3 text-right font-semibold text-primary">{formatCurrency(r.receitaLiquida)}</td>
                        <td className="py-2.5 pr-3 text-right">{formatCurrency(r.ticketMedio)}</td>
                        <td className="py-2.5 text-right">
                          <ChevronRight className="h-4 w-4 text-muted-foreground inline-block" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!drillCupom} onOpenChange={v => { if (!v) setDrillCupom(null); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ticket className="h-4 w-4 text-primary" />
              Comandas com cupom <span className="font-mono">{drillCupom?.codigo}</span>
            </DialogTitle>
          </DialogHeader>
          {loadingDrill ? (
            <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-10 bg-muted/30 rounded-lg animate-pulse" />)}</div>
          ) : !drillData || drillData.comandas.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhuma comanda encontrada no período.</p>
          ) : (
            <div className="overflow-x-auto max-h-[60vh]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-background">
                  <tr className="text-left border-b border-border text-[12px] text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Data</th>
                    <th className="py-2 pr-3 font-medium">Cliente</th>
                    <th className="py-2 pr-3 font-medium">Profissional</th>
                    <th className="py-2 pr-3 font-medium text-right">Bruto</th>
                    <th className="py-2 pr-3 font-medium text-right">Desconto</th>
                    <th className="py-2 font-medium text-right">Final</th>
                  </tr>
                </thead>
                <tbody>
                  {drillData.comandas.map(c => (
                    <tr key={c.id} className="border-b border-border/50">
                      <td className="py-2 pr-3">{c.dataFechamento ? new Date(c.dataFechamento).toLocaleDateString("pt-BR") : "—"}</td>
                      <td className="py-2 pr-3">{c.clienteNome}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{c.profissionalNome}</td>
                      <td className="py-2 pr-3 text-right">{formatCurrency(c.valorBruto)}</td>
                      <td className="py-2 pr-3 text-right text-orange-600">{formatCurrency(c.cupomDesconto)}</td>
                      <td className="py-2 text-right font-semibold text-primary">{formatCurrency(c.valorFinal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
