import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useGetDashboard } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, Users, Calendar, Scissors, AlertCircle, ArrowUpRight, ArrowDownRight, Award } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart, Pie, Cell as PieCell } from "recharts";

export default function Dashboard() {
  const { barbeariaId } = useAuth();
  const [periodo, setPeriodo] = useState<"hoje"|"semana"|"mes">("semana");

  const { data, isLoading } = useGetDashboard(barbeariaId!, { periodo }, {
    query: { enabled: !!barbeariaId }
  });

  if (isLoading || !data) {
    return (
      <AppLayout>
        <div className="space-y-6 animate-pulse">
          <div className="h-10 w-48 bg-card rounded-lg"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1,2,3,4].map(i => <div key={i} className="h-32 bg-card rounded-2xl"></div>)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="h-96 bg-card rounded-2xl lg:col-span-2"></div>
            <div className="h-96 bg-card rounded-2xl"></div>
          </div>
        </div>
      </AppLayout>
    );
  }

  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  return (
    <AppLayout>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Visão geral do seu negócio</p>
        </div>
        <div className="flex bg-card p-1 rounded-lg border border-border w-fit">
          {["hoje", "semana", "mes"].map((p) => (
            <button
              key={p}
              onClick={() => setPeriodo(p as any)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${periodo === p ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard 
          title="Faturamento" 
          value={formatCurrency(data.faturamentoTotal)} 
          icon={TrendingUp} 
          trend={data.faturamentoVariacao} 
        />
        <MetricCard 
          title="Agendamentos" 
          value={data.totalAgendamentos} 
          icon={Calendar} 
        />
        <MetricCard 
          title="Ticket Médio" 
          value={formatCurrency(data.ticketMedio)} 
          icon={DollarSignIcon} 
        />
        <MetricCard 
          title="Novos Clientes" 
          value={data.clientesNovos} 
          icon={Users} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2 border-border/50 shadow-xl bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg">Faturamento ({periodo})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.faturamentoPorDia} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="data" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val}`} />
                  <RechartsTooltip 
                    cursor={{fill: 'hsl(var(--muted)/0.5)'}}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                    {data.faturamentoPorDia.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === data.faturamentoPorDia.length - 1 ? 'hsl(var(--primary))' : 'hsl(var(--primary)/0.4)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-xl bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg">Top Serviços</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center">
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.topServicos} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="valor">
                    {data.topServicos.map((entry, index) => (
                      <PieCell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full space-y-2 mt-4">
              {data.topServicos.map((servico, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                    <span className="text-muted-foreground">{servico.nome}</span>
                  </div>
                  <span className="font-semibold text-foreground">{servico.percentual}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/50 shadow-xl bg-card/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><Award className="h-5 w-5 text-primary" /> Ranking Profissionais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.rankingProfissionais.map((prof, idx) => (
                <div key={prof.profissionalId} className="flex items-center justify-between p-3 rounded-xl bg-background/50 border border-border/50 hover:border-primary/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm ${idx === 0 ? 'bg-yellow-500/20 text-yellow-500' : idx === 1 ? 'bg-slate-300/20 text-slate-300' : idx === 2 ? 'bg-amber-700/20 text-amber-700' : 'bg-muted text-muted-foreground'}`}>
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{prof.nome}</p>
                      <p className="text-xs text-muted-foreground">{prof.atendimentos} atendimentos</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">{formatCurrency(prof.faturamento)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-xl bg-card/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><AlertCircle className="h-5 w-5 text-destructive" /> Alertas</CardTitle>
          </CardHeader>
          <CardContent>
            {data.alertas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Nenhum alerta no momento.</div>
            ) : (
              <div className="space-y-3">
                {data.alertas.map((alerta, idx) => (
                  <div key={idx} className={`p-4 rounded-xl border ${alerta.nivel === 'danger' ? 'bg-destructive/10 border-destructive/30 text-destructive-foreground' : 'bg-amber-500/10 border-amber-500/30 text-amber-500'}`}>
                    <p className="font-medium text-sm">{alerta.mensagem}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </AppLayout>
  );
}

function MetricCard({ title, value, icon: Icon, trend }: any) {
  return (
    <Card className="border-border/50 shadow-xl bg-card/50 backdrop-blur-sm hover:shadow-primary/5 transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <div className="flex items-end gap-3">
          <h3 className="text-3xl font-display font-bold text-foreground">{value}</h3>
          {trend !== undefined && (
            <span className={`flex items-center text-sm font-medium mb-1 ${trend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {trend >= 0 ? <ArrowUpRight className="h-4 w-4 mr-1" /> : <ArrowDownRight className="h-4 w-4 mr-1" />}
              {Math.abs(trend)}%
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function DollarSignIcon(props: any) { return <DollarSign {...props} />; }
