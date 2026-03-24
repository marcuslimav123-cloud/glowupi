import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useGetDashboard } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, Users, Calendar, Sparkles, AlertCircle, ArrowUpRight, ArrowDownRight, Award, DollarSign } from "lucide-react";
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
          <div className="h-8 w-40 bg-black/[0.04] rounded-lg"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[1,2,3,4].map(i => <div key={i} className="h-28 bg-white rounded-2xl border border-black/[0.04]"></div>)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="h-80 bg-white rounded-2xl border border-black/[0.04] lg:col-span-2"></div>
            <div className="h-80 bg-white rounded-2xl border border-black/[0.04]"></div>
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
          <h1 className="text-[24px] font-bold text-foreground">Dashboard</h1>
          <p className="text-foreground/40 text-[14px] mt-0.5">Visão geral do seu negócio</p>
        </div>
        <div className="flex bg-white p-1 rounded-full border border-black/[0.06] w-fit">
          {["hoje", "semana", "mes"].map((p) => (
            <button
              key={p}
              onClick={() => setPeriodo(p as any)}
              className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-all duration-200 ${periodo === p ? 'bg-foreground text-white' : 'text-foreground/40 hover:text-foreground'}`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <Card className="lg:col-span-2 bg-white border-black/[0.04] shadow-none">
          <CardHeader>
            <CardTitle className="text-[15px] font-semibold">Faturamento ({periodo})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.faturamentoPorDia} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="data" stroke="hsl(var(--foreground) / 0.25)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--foreground) / 0.25)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val}`} />
                  <RechartsTooltip 
                    cursor={{fill: 'hsl(var(--foreground) / 0.03)'}}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '12px', fontSize: '13px' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
                    {data.faturamentoPorDia.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === data.faturamentoPorDia.length - 1 ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.3)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-black/[0.04] shadow-none">
          <CardHeader>
            <CardTitle className="text-[15px] font-semibold">Top Serviços</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center">
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.topServicos} innerRadius={55} outerRadius={75} paddingAngle={4} dataKey="valor">
                    {data.topServicos.map((entry, index) => (
                      <PieCell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '12px', fontSize: '13px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full space-y-2 mt-3">
              {data.topServicos.map((servico, idx) => (
                <div key={idx} className="flex items-center justify-between text-[13px]">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                    <span className="text-foreground/50">{servico.nome}</span>
                  </div>
                  <span className="font-semibold text-foreground">{servico.percentual}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-white border-black/[0.04] shadow-none">
          <CardHeader>
            <CardTitle className="text-[15px] font-semibold flex items-center gap-2"><Award className="h-4 w-4 text-primary" /> Ranking Profissionais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.rankingProfissionais.map((prof, idx) => (
                <div key={prof.profissionalId} className="flex items-center justify-between p-3 rounded-xl bg-[#fafafa] hover:bg-black/[0.02] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`h-7 w-7 rounded-full flex items-center justify-center font-bold text-[11px] ${idx === 0 ? 'bg-amber-100 text-amber-600' : idx === 1 ? 'bg-slate-100 text-slate-500' : idx === 2 ? 'bg-orange-100 text-orange-600' : 'bg-black/[0.04] text-foreground/40'}`}>
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-medium text-[13px] text-foreground">{prof.nome}</p>
                      <p className="text-[11px] text-foreground/35">{prof.atendimentos} atendimentos</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-[13px] text-primary">{formatCurrency(prof.faturamento)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-black/[0.04] shadow-none">
          <CardHeader>
            <CardTitle className="text-[15px] font-semibold flex items-center gap-2"><AlertCircle className="h-4 w-4 text-red-500" /> Alertas</CardTitle>
          </CardHeader>
          <CardContent>
            {data.alertas.length === 0 ? (
              <div className="text-center py-8 text-foreground/35 text-[14px]">Nenhum alerta no momento.</div>
            ) : (
              <div className="space-y-2">
                {data.alertas.map((alerta, idx) => (
                  <div key={idx} className={`p-3.5 rounded-xl border ${alerta.nivel === 'danger' ? 'bg-red-50 border-red-100 text-red-600' : 'bg-amber-50 border-amber-100 text-amber-600'}`}>
                    <p className="font-medium text-[13px]">{alerta.mensagem}</p>
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
    <Card className="bg-white border-black/[0.04] shadow-none hover:shadow-lg hover:shadow-black/[0.02] transition-all duration-300">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[13px] font-medium text-foreground/40">{title}</p>
          <div className="p-1.5 rounded-lg bg-primary/8 text-primary">
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div className="flex items-end gap-2">
          <h3 className="text-[26px] font-bold text-foreground tracking-tight">{value}</h3>
          {trend !== undefined && (
            <span className={`flex items-center text-[12px] font-medium mb-0.5 ${trend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {trend >= 0 ? <ArrowUpRight className="h-3.5 w-3.5 mr-0.5" /> : <ArrowDownRight className="h-3.5 w-3.5 mr-0.5" />}
              {Math.abs(trend)}%
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function DollarSignIcon(props: any) { return <DollarSign {...props} />; }
