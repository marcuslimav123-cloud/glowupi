import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useGetDashboard } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, Users, Calendar, Sparkles, AlertCircle, ArrowUpRight, ArrowDownRight, Award, DollarSign } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart, Pie, Cell as PieCell } from "recharts";

export default function Dashboard() {
  const { barbeariaId, isColaborador } = useAuth();
  const [periodo, setPeriodo] = useState<"hoje"|"semana"|"mes">("semana");

  const { data, isLoading } = useGetDashboard(barbeariaId!, { periodo }, {
    query: { enabled: !!barbeariaId }
  });

  if (isLoading || !data) {
    return (
      <AppLayout>
        <div className="space-y-6 animate-pulse">
          <div className="h-8 w-40 bg-muted rounded-lg"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[1,2,3,4].map(i => <div key={i} className="h-28 bg-card rounded-2xl border border-border"></div>)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="h-80 bg-card rounded-2xl border border-border lg:col-span-2"></div>
            <div className="h-80 bg-card rounded-2xl border border-border"></div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (isColaborador || (data as any).isColaboradorView) {
    const colabData = data as any;
    return (
      <AppLayout>
        <div className="mb-8">
          <h1 className="text-[24px] font-bold text-foreground">Início</h1>
          <p className="text-foreground/40 text-[14px] mt-0.5">Seus agendamentos de hoje</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <MetricCard title="Agendamentos Hoje" value={colabData.totalAgendamentosHoje ?? 0} icon={Calendar} />
          <MetricCard title="Confirmados" value={colabData.confirmados ?? 0} icon={Sparkles} />
          <MetricCard title="Pagos" value={colabData.pagos ?? 0} icon={DollarSignIcon} />
        </div>

        <Card className="bg-card border-border shadow-none">
          <CardHeader>
            <CardTitle className="text-[15px] font-semibold">Agenda do Dia</CardTitle>
          </CardHeader>
          <CardContent>
            {(!colabData.meusAgendamentosHoje || colabData.meusAgendamentosHoje.length === 0) ? (
              <div className="text-center py-8 text-foreground/35 text-[14px]">Nenhum agendamento para hoje.</div>
            ) : (
              <div className="space-y-2">
                {colabData.meusAgendamentosHoje.map((ag: any) => (
                  <div key={ag.id} className="flex items-center justify-between p-3.5 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                    <div>
                      <p className="font-medium text-[13px] text-foreground">{ag.horario} — {ag.clienteNome || "Cliente"}</p>
                      <p className="text-[11px] text-foreground/35">{ag.servicoNome || "Serviço"}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-[12px] px-2 py-0.5 rounded-full font-medium ${ag.status === "confirmado" ? "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400" : ag.status === "cancelado" ? "bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400" : "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"}`}>
                        {ag.status}
                      </span>
                      {ag.valor > 0 && <p className="text-[12px] text-foreground/50 mt-1">{formatCurrency(ag.valor)}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  return (
    <AppLayout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] sm:text-[24px] font-bold text-foreground">Início</h1>
          <p className="text-foreground/40 text-[13px] mt-0.5">Visão geral do seu negócio</p>
        </div>
        <div className="flex bg-card p-1 rounded-full border border-border w-fit">
          {["hoje", "semana", "mes"].map((p) => (
            <button
              key={p}
              onClick={() => setPeriodo(p as any)}
              className={`px-3 sm:px-4 py-1.5 rounded-full text-[12px] sm:text-[13px] font-medium transition-all duration-200 ${periodo === p ? 'bg-foreground text-background' : 'text-foreground/40 hover:text-foreground'}`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <Card className="lg:col-span-2 bg-card border-border shadow-none">
          <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
            <CardTitle className="text-[14px] sm:text-[15px] font-semibold">Faturamento {periodo === "hoje" ? "de hoje" : periodo === "semana" ? "da semana" : "do mês"}</CardTitle>
          </CardHeader>
          <CardContent className="px-2 sm:px-6 pb-4 sm:pb-6">
            <div className="h-[180px] sm:h-[280px] w-full">
              {(!data.faturamentoPorDia || data.faturamentoPorDia.every((d: any) => !Number(d.valor))) ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-4">
                  <p className="text-sm font-medium text-foreground/70">Nenhuma comanda fechada neste período</p>
                  <p className="text-xs text-muted-foreground mt-1">O faturamento aparece aqui conforme você fecha as comandas.</p>
                </div>
              ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.faturamentoPorDia} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="data" stroke="hsl(var(--foreground) / 0.25)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--foreground) / 0.25)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val}`} />
                  <RechartsTooltip 
                    cursor={{fill: 'hsl(var(--foreground) / 0.03)'}}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '13px', color: 'hsl(var(--foreground))' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
                    {data.faturamentoPorDia.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={index === data.faturamentoPorDia.length - 1 ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.3)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-none">
          <CardHeader>
            <CardTitle className="text-[15px] font-semibold">Serviços mais vendidos</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center">
            {(!data.topServicos || data.topServicos.length === 0) ? (
              <div className="h-[200px] flex flex-col items-center justify-center text-center px-4">
                <p className="text-sm font-medium text-foreground/70">Ainda sem vendas no período</p>
                <p className="text-xs text-muted-foreground mt-1">Os serviços mais vendidos aparecem aqui.</p>
              </div>
            ) : (<>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.topServicos} innerRadius={55} outerRadius={75} paddingAngle={4} dataKey="valor">
                    {data.topServicos.map((entry: any, index: number) => (
                      <PieCell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '13px', color: 'hsl(var(--foreground))' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full space-y-2 mt-3">
              {data.topServicos.map((servico: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between text-[13px]">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                    <span className="text-foreground/50">{servico.nome}</span>
                  </div>
                  <span className="font-semibold text-foreground">{typeof servico.percentual === 'number' ? servico.percentual.toFixed(1) : servico.percentual}%</span>
                </div>
              ))}
            </div>
            </>)}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <Card className="bg-card border-border shadow-none">
          <CardHeader>
            <CardTitle className="text-[15px] font-semibold flex items-center gap-2"><Award className="h-4 w-4 text-primary" /> Profissionais no período</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.rankingProfissionais.map((prof: any, idx: number) => (
                <div key={prof.profissionalId} className="flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`h-7 w-7 rounded-full flex items-center justify-center font-bold text-[11px] ${idx === 0 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' : idx === 1 ? 'bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400' : idx === 2 ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' : 'bg-muted text-foreground/40'}`}>
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

        <Card className="bg-card border-border shadow-none">
          <CardHeader>
            <CardTitle className="text-[15px] font-semibold flex items-center gap-2"><AlertCircle className="h-4 w-4 text-red-500" /> Alertas</CardTitle>
          </CardHeader>
          <CardContent>
            {data.alertas.length === 0 ? (
              <div className="text-center py-8 text-foreground/35 text-[14px]">Nenhum alerta no momento.</div>
            ) : (
              <div className="space-y-2">
                {data.alertas.map((alerta: any, idx: number) => (
                  <div key={idx} className={`p-3.5 rounded-xl border ${alerta.nivel === 'danger' ? 'bg-red-50 dark:bg-red-950/30 border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400' : 'bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/30 text-amber-600 dark:text-amber-400'}`}>
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
    <Card className="bg-card border-border shadow-none hover:shadow-lg hover:shadow-foreground/[0.02] transition-all duration-300">
      <CardContent className="p-3 sm:p-5">
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <p className="text-[11px] sm:text-[13px] font-medium text-foreground/40">{title}</p>
          <div className="p-1 sm:p-1.5 rounded-lg bg-primary/8 text-primary">
            <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </div>
        </div>
        <div className="flex items-end gap-1.5">
          <h3 className="text-[20px] sm:text-[26px] font-bold text-foreground tracking-tight leading-none">{value}</h3>
          {trend !== undefined && (
            <span className={`flex items-center text-[10px] sm:text-[12px] font-medium mb-0.5 ${trend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {trend >= 0 ? <ArrowUpRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-0.5" />}
              {Math.abs(trend)}%
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function DollarSignIcon(props: any) { return <DollarSign {...props} />; }
