import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useGetRelatorioFaturamento, useGetRelatorioComissoes } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { format, subDays, subMonths } from "date-fns";
import { TrendingUp, TrendingDown, DollarSign, Award } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Financeiro() {
  const { barbeariaId } = useAuth();
  const [dataInicio] = useState(format(subDays(new Date(), 29), "yyyy-MM-dd"));
  const [dataFim] = useState(format(new Date(), "yyyy-MM-dd"));
  const [mes] = useState(format(new Date(), "yyyy-MM"));
  const [mesPrev] = useState(format(subMonths(new Date(), 1), "yyyy-MM"));

  const { data: fat } = useGetRelatorioFaturamento(barbeariaId!, { dataInicio, dataFim }, { query: { enabled: !!barbeariaId } });
  const { data: com } = useGetRelatorioComissoes(barbeariaId!, { mes }, { query: { enabled: !!barbeariaId } });
  const { data: comPrev } = useGetRelatorioComissoes(barbeariaId!, { mes: mesPrev }, { query: { enabled: !!barbeariaId } });

  const totalComAtual = Array.isArray(com) ? com.reduce((s: number, p: any) => s + p.comissaoTotal, 0) : 0;
  const totalComPrev = Array.isArray(comPrev) ? comPrev.reduce((s: number, p: any) => s + p.comissaoTotal, 0) : 0;
  const variacao = totalComPrev > 0 ? ((totalComAtual - totalComPrev) / totalComPrev) * 100 : 0;

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground">Financeiro</h1>
        <p className="text-muted-foreground mt-1">Visão financeira completa dos últimos 30 dias</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center"><DollarSign className="h-5 w-5 text-primary" /></div>
              <span className="text-sm text-muted-foreground">Faturamento Bruto</span>
            </div>
            <p className="text-3xl font-bold text-primary">{fat ? formatCurrency(fat.totalBruto) : "—"}</p>
            <p className="text-xs text-muted-foreground mt-1">Últimos 30 dias</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-9 w-9 rounded-lg bg-green-500/10 flex items-center justify-center"><TrendingUp className="h-5 w-5 text-green-400" /></div>
              <span className="text-sm text-muted-foreground">Faturamento Líquido</span>
            </div>
            <p className="text-3xl font-bold text-green-400">{fat ? formatCurrency(fat.totalLiquido) : "—"}</p>
            <p className="text-xs text-muted-foreground mt-1">Após comissões</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-9 w-9 rounded-lg bg-yellow-500/10 flex items-center justify-center"><Award className="h-5 w-5 text-yellow-400" /></div>
              <span className="text-sm text-muted-foreground">Comissões do Mês</span>
            </div>
            <p className="text-3xl font-bold text-yellow-400">{formatCurrency(totalComAtual)}</p>
            <div className="flex items-center gap-1 mt-1">
              {variacao >= 0 ? <TrendingUp className="h-3 w-3 text-green-400" /> : <TrendingDown className="h-3 w-3 text-red-400" />}
              <span className={`text-xs font-medium ${variacao >= 0 ? "text-green-400" : "text-red-400"}`}>{Math.abs(variacao).toFixed(1)}% vs mês anterior</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader><CardTitle>Evolução do Faturamento</CardTitle></CardHeader>
          <CardContent>
            {fat?.porDia && fat.porDia.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={fat.porDia}>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="data" tickFormatter={d => format(new Date(d + "T00:00:00"), "dd/MM")} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickFormatter={v => `R$${v}`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} labelFormatter={l => format(new Date(l + "T00:00:00"), "dd/MM/yyyy")} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Area type="monotone" dataKey="valor" stroke="hsl(var(--primary))" fill="url(#areaGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Sem dados</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Comissões por Profissional</CardTitle></CardHeader>
          <CardContent>
            {Array.isArray(com) && com.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={com} layout="vertical">
                  <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickFormatter={v => `R$${v}`} />
                  <YAxis type="category" dataKey="nome" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} width={90} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Bar dataKey="comissaoTotal" fill="hsl(var(--primary))" radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Sem dados</div>}
          </CardContent>
        </Card>
      </div>

      {fat?.porServico && fat.porServico.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Serviços Mais Rentáveis</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fat.porServico.slice(0, 6).map((s: any, i: number) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border">
                  <div className="text-2xl font-bold text-muted-foreground/40 w-8">{i + 1}</div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{s.nome}</p>
                    <p className="text-xs text-muted-foreground">{s.quantidade} atendimentos</p>
                  </div>
                  <p className="font-bold text-primary">{formatCurrency(s.valor)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </AppLayout>
  );
}
