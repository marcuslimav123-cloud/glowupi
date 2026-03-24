import React, { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { apiUrl } from "@/lib/utils";
import { TrendingUp, Building2, PieChart, Calendar, DollarSign } from "lucide-react";

interface RevenueData {
  totalStudios: number;
  statusBreakdown: Record<string, number>;
  planBreakdown: Record<string, number>;
  periodBreakdown: Record<string, number>;
  revenueByMonth: Array<{ mesAno: string; total: number; count: number }>;
}

const STATUS_LABELS: Record<string, string> = {
  active: "Ativo",
  ativo: "Ativo",
  trial: "Trial",
  canceled: "Cancelado",
  cancelado: "Cancelado",
  inactive: "Inativo",
  past_due: "Atrasado",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-500",
  ativo: "bg-emerald-500",
  trial: "bg-amber-500",
  canceled: "bg-red-500",
  cancelado: "bg-red-500",
  inactive: "bg-slate-500",
  past_due: "bg-orange-500",
};

const PLAN_COLORS = ["bg-primary", "bg-emerald-500", "bg-violet-500", "bg-blue-500", "bg-pink-500", "bg-cyan-500"];

export default function AdminRevenue() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(apiUrl("/admin/revenue"), { credentials: "include" })
      .then(r => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const maxRevenue = data ? Math.max(...data.revenueByMonth.map(r => r.total), 1) : 1;

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-display text-white mb-1">Receita & Analytics</h1>
          <p className="text-slate-400">Análise detalhada de receitas e assinaturas</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary"></div>
          </div>
        ) : data ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
                    <PieChart className="h-5 w-5 text-primary" />
                  </div>
                  <h2 className="text-lg font-display text-white">Status de Assinatura</h2>
                </div>
                <div className="space-y-3">
                  {Object.entries(data.statusBreakdown).map(([status, count]) => {
                    const pct = data.totalStudios > 0 ? ((count / data.totalStudios) * 100).toFixed(0) : 0;
                    return (
                      <div key={status} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className={`h-2.5 w-2.5 rounded-full ${STATUS_COLORS[status] || "bg-slate-500"}`} />
                            <span className="text-slate-300">{STATUS_LABELS[status] || status}</span>
                          </div>
                          <span className="text-slate-400">{count} ({pct}%)</span>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${STATUS_COLORS[status] || "bg-slate-500"} transition-all duration-500`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {Object.keys(data.statusBreakdown).length === 0 && (
                    <p className="text-slate-500 text-sm">Sem dados</p>
                  )}
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-emerald-400" />
                  </div>
                  <h2 className="text-lg font-display text-white">Por Plano</h2>
                </div>
                <div className="space-y-3">
                  {Object.entries(data.planBreakdown).map(([plan, count], i) => {
                    const pct = data.totalStudios > 0 ? ((count / data.totalStudios) * 100).toFixed(0) : 0;
                    return (
                      <div key={plan} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className={`h-2.5 w-2.5 rounded-full ${PLAN_COLORS[i % PLAN_COLORS.length]}`} />
                            <span className="text-slate-300">{plan}</span>
                          </div>
                          <span className="text-slate-400">{count} ({pct}%)</span>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${PLAN_COLORS[i % PLAN_COLORS.length]} transition-all duration-500`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {Object.keys(data.planBreakdown).length === 0 && (
                    <p className="text-slate-500 text-sm">Sem dados</p>
                  )}
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-violet-400" />
                  </div>
                  <h2 className="text-lg font-display text-white">Por Período</h2>
                </div>
                <div className="space-y-3">
                  {Object.entries(data.periodBreakdown).map(([period, count], i) => {
                    const total = Object.values(data.periodBreakdown).reduce((a, b) => a + b, 0) || 1;
                    const pct = ((count / total) * 100).toFixed(0);
                    return (
                      <div key={period} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-300 capitalize">{period}</span>
                          <span className="text-slate-400">{count} ({pct}%)</span>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${PLAN_COLORS[(i + 2) % PLAN_COLORS.length]} transition-all duration-500`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {Object.keys(data.periodBreakdown).length === 0 && (
                    <p className="text-slate-500 text-sm">Sem dados</p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-display text-white">Faturamento por Mês</h2>
                  <p className="text-sm text-slate-400">Total de comandas fechadas por mês</p>
                </div>
              </div>

              {data.revenueByMonth.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                  <DollarSign className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">Sem dados de faturamento disponíveis</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.revenueByMonth.slice(-12).map(m => {
                    const pct = (m.total / maxRevenue) * 100;
                    return (
                      <div key={m.mesAno} className="flex items-center gap-4">
                        <span className="text-sm text-slate-400 w-20 shrink-0">{m.mesAno}</span>
                        <div className="flex-1 h-8 bg-white/5 rounded-lg overflow-hidden relative">
                          <div
                            className="h-full bg-gradient-to-r from-primary/80 to-primary rounded-lg transition-all duration-500"
                            style={{ width: `${Math.max(pct, 2)}%` }}
                          />
                        </div>
                        <div className="text-right shrink-0 w-32">
                          <span className="text-sm text-white font-medium">
                            R$ {m.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-xs text-slate-500 ml-2">({m.count})</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          <p className="text-slate-400">Erro ao carregar dados</p>
        )}
      </div>
    </AdminLayout>
  );
}
