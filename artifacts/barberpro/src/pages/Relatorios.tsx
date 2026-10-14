import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useGetRelatorioFaturamento, useGetRelatorioComissoes } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, DollarSign, Heart, CreditCard, Award } from "lucide-react";
import { format, subDays } from "date-fns";

const COLORS = ["hsl(var(--chart-1))","hsl(var(--chart-2))","hsl(var(--chart-3))","hsl(var(--chart-4))","hsl(var(--chart-5))"];

export default function Relatorios() {
  const { barbeariaId } = useAuth();
  const [dataInicio, setDataInicio] = useState(format(subDays(new Date(), 29), "yyyy-MM-dd"));
  const [dataFim, setDataFim] = useState(format(new Date(), "yyyy-MM-dd"));
  const [mes, setMes] = useState(format(new Date(), "yyyy-MM"));

  const { data: fat, isLoading: fatLoading } = useGetRelatorioFaturamento(barbeariaId!, { dataInicio, dataFim }, { query: { enabled: !!barbeariaId } });
  const { data: com, isLoading: comLoading } = useGetRelatorioComissoes(barbeariaId!, { mes }, { query: { enabled: !!barbeariaId } });

  const PAYMENT_LABELS: Record<string, string> = { dinheiro: "Dinheiro", pix: "PIX", credito: "Crédito", debito: "Débito", outros: "Outros" };

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">Relatórios</h1>
        <p className="text-muted-foreground mt-1">Quanto entrou e quanto foi para comissões no período</p>
      </div>

      <Tabs defaultValue="faturamento" className="space-y-6">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="faturamento">Faturamento</TabsTrigger>
          <TabsTrigger value="comissoes">Comissões</TabsTrigger>
        </TabsList>

        <TabsContent value="faturamento" className="space-y-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="space-y-1">
                  <Label>Data Início</Label>
                  <Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="w-40" />
                </div>
                <div className="space-y-1">
                  <Label>Data Fim</Label>
                  <Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="w-40" />
                </div>
              </div>
            </CardContent>
          </Card>

          {fatLoading ? (
            <div className="grid grid-cols-3 gap-4"><div className="h-28 bg-card rounded-2xl animate-pulse" /><div className="h-28 bg-card rounded-2xl animate-pulse" /><div className="h-28 bg-card rounded-2xl animate-pulse" /></div>
          ) : fat ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center"><DollarSign className="h-5 w-5 text-primary" /></div>
                      <span className="text-sm text-muted-foreground">Faturamento Bruto</span>
                    </div>
                    <p className="text-3xl font-bold text-primary">{formatCurrency(fat.totalBruto)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-9 w-9 rounded-lg bg-green-500/10 flex items-center justify-center"><TrendingUp className="h-5 w-5 text-green-400" /></div>
                      <span className="text-sm text-muted-foreground">Faturamento Líquido</span>
                    </div>
                    <p className="text-3xl font-bold text-green-400">{formatCurrency(fat.totalLiquido)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-9 w-9 rounded-lg bg-yellow-500/10 flex items-center justify-center"><Award className="h-5 w-5 text-yellow-400" /></div>
                      <span className="text-sm text-muted-foreground">Total Comissões</span>
                    </div>
                    <p className="text-3xl font-bold text-yellow-400">{formatCurrency(fat.totalComissoes)}</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                  <CardHeader><CardTitle>Faturamento por dia</CardTitle></CardHeader>
                  <CardContent>
                    {fat.porDia.every((d: any) => !Number(d.valor ?? d.total)) ? <p className="text-muted-foreground text-sm">Sem dados neste período</p> : (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={fat.porDia}>
                        <XAxis dataKey="data" tickFormatter={d => format(new Date(d + "T00:00:00"), "dd/MM")} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                        <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickFormatter={v => `R$${v}`} />
                        <Tooltip formatter={(v: number) => formatCurrency(v)} labelFormatter={l => format(new Date(l + "T00:00:00"), "dd/MM/yyyy")} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                        <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle>Formas de Pagamento</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {fat.porFormaPagamento.map((p: any, i: number) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                          <span className="text-sm">{PAYMENT_LABELS[p.metodo] ?? p.metodo}</span>
                        </div>
                        <span className="font-medium text-sm">{formatCurrency(p.valor)}</span>
                      </div>
                    ))}
                    {fat.porFormaPagamento.length === 0 && <p className="text-muted-foreground text-sm">Sem dados neste período</p>}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader><CardTitle>Top Serviços</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {fat.porServico.slice(0, 8).map((s: any, i: number) => (
                      <div key={i}>
                        <div className="flex justify-between text-sm mb-1">
                          <div className="flex items-center gap-2">
                            <Heart className="h-4 w-4 text-primary" />
                            <span className="font-medium">{s.nome}</span>
                            <Badge variant="secondary" className="text-xs">{s.quantidade}x</Badge>
                          </div>
                          <span className="font-bold text-primary">{formatCurrency(s.valor)}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full">
                          <div className="h-2 rounded-full bg-primary" style={{ width: `${s.percentual}%` }} />
                        </div>
                      </div>
                    ))}
                    {fat.porServico.length === 0 && <p className="text-muted-foreground text-sm">Sem dados neste período</p>}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}
        </TabsContent>

        <TabsContent value="comissoes" className="space-y-6">
          <Card>
            <CardContent className="p-4">
              <div className="space-y-1">
                <Label>Mês de Referência</Label>
                <Input type="month" value={mes} onChange={e => setMes(e.target.value)} className="w-48" />
              </div>
            </CardContent>
          </Card>

          {comLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-card rounded-xl animate-pulse" />)}</div>
          ) : Array.isArray(com) && com.length > 0 ? (
            <Card>
              <CardHeader><CardTitle>Comissões por Profissional</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {com.map((prof: any, i: number) => (
                    <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-muted/40 border border-border">
                      <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold border border-primary/20">
                        {prof.nome.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold">{prof.nome}</p>
                        <p className="text-xs text-muted-foreground">{prof.totalAtendimentos} atendimentos • {prof.percentualMedio.toFixed(1)}% média</p>
                        <div className="h-2 bg-muted rounded-full mt-2">
                          <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.min(prof.percentualMedio, 100)}%` }} />
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Bruto</p>
                        <p className="font-semibold text-sm">{formatCurrency(prof.faturamentoBruto)}</p>
                        <p className="text-xs text-muted-foreground mt-1">Comissão</p>
                        <p className="font-bold text-primary">{formatCurrency(prof.comissaoTotal)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="text-center py-12">
              <CardContent>
                <Award className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhum dado para este mês.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
