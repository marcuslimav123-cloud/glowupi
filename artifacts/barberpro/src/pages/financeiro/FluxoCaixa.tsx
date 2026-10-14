import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useLiveRefresh } from "@/lib/liveRefresh";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, apiUrl } from "@/lib/utils";
import { TrendingUp, ArrowUpCircle, ArrowDownCircle, DollarSign, Search, CreditCard, Gift, Clock, CheckCircle } from "lucide-react";

type TabKey = "movimentado" | "disponivel" | "receber";

export default function FluxoCaixa() {
  const { barbeariaId } = useAuth();
  const [comandas, setComandas] = useState<any[]>([]);
  const [contas, setContas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("movimentado");
  const [dataInicio, setDataInicio] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10); });
  const [dataFim, setDataFim] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => { if (barbeariaId) fetchData(); }, [barbeariaId]);
  useLiveRefresh(() => { if (barbeariaId) fetchData(); }, !!barbeariaId);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [comRes, finRes] = await Promise.all([
        fetch(apiUrl(`/barbearias/${barbeariaId}/comandas?dataInicio=${dataInicio}&dataFim=${dataFim}`), { credentials: "include" }),
        fetch(apiUrl(`/barbearias/${barbeariaId}/financeiro`), { credentials: "include" }),
      ]);
      if (comRes.ok) setComandas(await comRes.json());
      if (finRes.ok) setContas(await finRes.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const today = new Date().toISOString().slice(0, 10);

  const totalBruto = comandas.reduce((s, c) => s + c.valorTotal, 0);
  const totalLiquido = comandas.reduce((s, c) => s + (c.valorLiquido ?? c.valorTotal), 0);
  const totalTaxas = comandas.reduce((s, c) => s + (c.taxaCartao ?? 0), 0);
  const totalGorjetas = comandas.reduce((s, c) => s + (c.gorjeta?.valor ?? 0), 0);

  type PaymentEntry = { comandaId: number; clienteNome: string; dataFechamento: string; valor: number; metodo: string; bandeira?: string; dataCompensacao?: string; taxaCartao: number };
  const allPayments: PaymentEntry[] = [];
  comandas.forEach(c => {
    const pags = Array.isArray(c.pagamentos) ? c.pagamentos : [];
    const numPags = pags.length || 1;
    const taxaPorPag = (c.taxaCartao ?? 0) / numPags;
    if (pags.length === 0) {
      allPayments.push({ comandaId: c.id, clienteNome: c.clienteNome, dataFechamento: c.dataFechamento, valor: c.valorTotal, metodo: "dinheiro", taxaCartao: 0 });
    } else {
      pags.forEach((p: any) => {
        const isCardPag = p.metodo === "credito" || p.metodo === "debito";
        allPayments.push({
          comandaId: c.id, clienteNome: c.clienteNome, dataFechamento: c.dataFechamento,
          valor: Number(p.valor) || 0, metodo: p.metodo, bandeira: p.bandeira,
          dataCompensacao: isCardPag ? c.dataCompensacao : undefined,
          taxaCartao: isCardPag ? taxaPorPag : 0,
        });
      });
    }
  });

  const isCardPay = (p: PaymentEntry) => p.metodo === "credito" || p.metodo === "debito";
  const cashPayments = allPayments.filter(p => !isCardPay(p));
  const cardCompensated = allPayments.filter(p => isCardPay(p) && (!p.dataCompensacao || p.dataCompensacao <= today));
  const cardPending = allPayments.filter(p => isCardPay(p) && p.dataCompensacao && p.dataCompensacao > today);

  const totalDisponivel = [...cashPayments, ...cardCompensated].reduce((s, p) => s + p.valor - p.taxaCartao, 0);
  const totalAReceber = cardPending.reduce((s, p) => s + p.valor - p.taxaCartao, 0);

  const totalContasReceber = contas.filter(c => c.tipo === "receber" && c.status === "pendente").reduce((s, c) => s + c.valor, 0);
  const totalContasPagar = contas.filter(c => c.tipo === "pagar" && c.status === "pendente").reduce((s, c) => s + c.valor, 0);

  const byDay = (list: any[]) => {
    const grouped: Record<string, { bruto: number; liquido: number; taxas: number; gorjetas: number; count: number }> = {};
    list.forEach(c => {
      const d = c.dataFechamento ? new Date(c.dataFechamento).toLocaleDateString("pt-BR") : "—";
      if (!grouped[d]) grouped[d] = { bruto: 0, liquido: 0, taxas: 0, gorjetas: 0, count: 0 };
      grouped[d].bruto += c.valorTotal;
      grouped[d].liquido += c.valorLiquido ?? c.valorTotal;
      grouped[d].taxas += c.taxaCartao ?? 0;
      grouped[d].gorjetas += c.gorjeta?.valor ?? 0;
      grouped[d].count += 1;
    });
    return grouped;
  };

  const TABS: { key: TabKey; label: string; color: string }[] = [
    { key: "movimentado", label: "Total Movimentado", color: "text-foreground" },
    { key: "disponivel", label: "Total Disponível", color: "text-green-600" },
    { key: "receber", label: "Total a Receber", color: "text-blue-600" },
  ];

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-[24px] font-bold text-foreground">Fluxo de caixa</h1>
        <p className="text-foreground/40 text-[14px] mt-0.5">Entradas e saídas por período</p>
      </div>
      <div className="flex flex-wrap gap-3 mb-6">
        <Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="w-40 rounded-xl" />
        <Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="w-40 rounded-xl" />
        <Button onClick={fetchData} className="rounded-xl"><Search className="h-4 w-4 mr-2" />Filtrar</Button>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {TABS.map(t => (
          <Button key={t.key} variant={tab === t.key ? "default" : "outline"} size="sm" onClick={() => setTab(t.key)} className="rounded-xl shrink-0">
            {t.label}
          </Button>
        ))}
      </div>

      {loading ? <div className="animate-pulse h-48 bg-card rounded-2xl" /> : (
        <>
          {tab === "movimentado" && (
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
                  <p className="text-[12px] text-blue-600 mb-1 flex items-center gap-1"><Clock className="h-3 w-3" />Contas a Receber</p>
                  <p className="text-[20px] font-bold text-blue-700">{formatCurrency(totalContasReceber)}</p>
                </CardContent></Card>
                <Card className="bg-red-50 border-red-100 shadow-none"><CardContent className="p-4">
                  <p className="text-[12px] text-red-600 mb-1 flex items-center gap-1"><ArrowDownCircle className="h-3 w-3" />Contas a Pagar</p>
                  <p className="text-[20px] font-bold text-red-700">{formatCurrency(totalContasPagar)}</p>
                </CardContent></Card>
              </div>
              <Card className="bg-card border-border shadow-none mb-4">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[12px] text-foreground/40 flex items-center gap-1"><DollarSign className="h-3 w-3" />Saldo do Período</p>
                    <p className={`text-[20px] font-bold ${totalLiquido + totalContasReceber - totalContasPagar >= 0 ? "text-green-700" : "text-red-700"}`}>{formatCurrency(totalLiquido + totalContasReceber - totalContasPagar)}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card border-border shadow-none">
                <CardHeader><CardTitle className="text-[16px]">Receitas por Dia</CardTitle></CardHeader>
                <CardContent>
                  {Object.keys(byDay(comandas)).length === 0 ? (
                    <p className="text-center text-foreground/40 py-8">Sem dados no período</p>
                  ) : (
                    <div className="space-y-2">
                      {Object.entries(byDay(comandas)).map(([dia, v]) => (
                        <div key={dia} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                          <div>
                            <span className="text-[14px] font-medium">{dia}</span>
                            <span className="text-[11px] text-foreground/30 ml-2">{v.count} comanda{v.count !== 1 ? "s" : ""}</span>
                          </div>
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
            </>
          )}

          {tab === "disponivel" && (() => {
              const disponivelPayments = [...cashPayments, ...cardCompensated];
              const byDayDisp: Record<string, number> = {};
              disponivelPayments.forEach(p => {
                const d = p.dataFechamento ? new Date(p.dataFechamento).toLocaleDateString("pt-BR") : "—";
                byDayDisp[d] = (byDayDisp[d] || 0) + p.valor - p.taxaCartao;
              });
              return (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <Card className="bg-green-50 border-green-100 shadow-none"><CardContent className="p-4">
                      <p className="text-[12px] text-green-600 mb-1 flex items-center gap-1"><CheckCircle className="h-3 w-3" />Total Disponível</p>
                      <p className="text-[20px] font-bold text-green-700">{formatCurrency(totalDisponivel)}</p>
                      <p className="text-[11px] text-green-500 mt-0.5">Dinheiro/PIX + cartões compensados</p>
                    </CardContent></Card>
                    <Card className="bg-blue-50 border-blue-100 shadow-none"><CardContent className="p-4">
                      <p className="text-[12px] text-blue-600 mb-1 flex items-center gap-1"><Clock className="h-3 w-3" />Aguardando Compensação</p>
                      <p className="text-[20px] font-bold text-blue-700">{formatCurrency(totalAReceber)}</p>
                      <p className="text-[11px] text-blue-500 mt-0.5">{cardPending.length} pagamento{cardPending.length !== 1 ? "s" : ""} em cartão</p>
                    </CardContent></Card>
                    <Card className="bg-orange-50 border-orange-100 shadow-none"><CardContent className="p-4">
                      <p className="text-[12px] text-orange-600 mb-1 flex items-center gap-1"><CreditCard className="h-3 w-3" />Taxas Retidas</p>
                      <p className="text-[20px] font-bold text-orange-700">-{formatCurrency(totalTaxas)}</p>
                    </CardContent></Card>
                  </div>
                  <Card className="bg-card border-border shadow-none">
                    <CardHeader><CardTitle className="text-[16px]">Recebimentos Disponíveis por Dia</CardTitle></CardHeader>
                    <CardContent>
                      {Object.keys(byDayDisp).length === 0 ? (
                        <p className="text-center text-foreground/40 py-8">Sem recebimentos disponíveis</p>
                      ) : (
                        <div className="space-y-2">
                          {Object.entries(byDayDisp).map(([dia, val]) => (
                            <div key={dia} className="flex items-center justify-between p-3 rounded-xl bg-green-50">
                              <span className="text-[14px] font-medium">{dia}</span>
                              <span className="text-[14px] font-semibold text-green-600">+{formatCurrency(val)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              );
            })()}

          {tab === "receber" && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <Card className="bg-blue-50 border-blue-100 shadow-none"><CardContent className="p-4">
                  <p className="text-[12px] text-blue-600 mb-1 flex items-center gap-1"><CreditCard className="h-3 w-3" />Total a Receber (Cartão)</p>
                  <p className="text-[20px] font-bold text-blue-700">{formatCurrency(totalAReceber)}</p>
                  <p className="text-[11px] text-blue-500 mt-0.5">{cardPending.length} pagamento{cardPending.length !== 1 ? "s" : ""} pendente{cardPending.length !== 1 ? "s" : ""}</p>
                </CardContent></Card>
                <Card className="bg-green-50 border-green-100 shadow-none"><CardContent className="p-4">
                  <p className="text-[12px] text-green-600 mb-1 flex items-center gap-1"><CheckCircle className="h-3 w-3" />Contas a Receber</p>
                  <p className="text-[20px] font-bold text-green-700">{formatCurrency(totalContasReceber)}</p>
                </CardContent></Card>
              </div>
              <Card className="bg-card border-border shadow-none">
                <CardHeader><CardTitle className="text-[16px]">Recebimentos de Cartão Pendentes</CardTitle></CardHeader>
                <CardContent>
                  {cardPending.length === 0 ? (
                    <p className="text-center text-foreground/40 py-8">Nenhum recebimento de cartão pendente</p>
                  ) : (
                    <div className="space-y-2">
                      {cardPending.sort((a, b) => (a.dataCompensacao || "").localeCompare(b.dataCompensacao || "")).map((p, idx) => (
                        <div key={`${p.comandaId}-${idx}`} className="flex items-center justify-between p-3 rounded-xl bg-blue-50">
                          <div>
                            <span className="text-[13px] font-medium">Comanda #{p.comandaId}</span>
                            <span className="text-[12px] text-foreground/40 ml-2">{p.clienteNome}</span>
                            <Badge variant="outline" className="text-[10px] ml-2">{p.metodo === "credito" ? "Crédito" : "Débito"}</Badge>
                            {p.bandeira && <Badge variant="outline" className="text-[10px] ml-1">{p.bandeira}</Badge>}
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="text-[11px] text-foreground/40">Compensação</p>
                              <p className="text-[12px] font-medium text-blue-600">{p.dataCompensacao}</p>
                            </div>
                            <span className="text-[14px] font-semibold text-blue-600">{formatCurrency(p.valor - p.taxaCartao)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </AppLayout>
  );
}
