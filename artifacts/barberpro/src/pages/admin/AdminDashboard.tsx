import React, { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { apiUrl } from "@/lib/utils";
import {
  Building2,
  CreditCard,
  Clock,
  XCircle,
  TrendingDown,
  Users,
  TrendingUp,
  DollarSign,
} from "lucide-react";

interface DashboardData {
  totalStudios: number;
  activeSubscriptions: number;
  trialUsers: number;
  canceledUsers: number;
  churnRate: number;
  mrr: number;
  arr: number;
  recentSignups: Array<{
    id: number;
    nome: string;
    subscriptionStatus: string;
    subscriptionPlan: string | null;
    createdAt: string;
  }>;
  monthlyRevenue: Record<string, number>;
  planDistribution: Record<string, number>;
}

function StatCard({ title, value, icon: Icon, color }: { title: string; value: string | number; icon: any; color: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-slate-400">{title}</span>
        <div className={`h-10 w-10 rounded-xl ${color} flex items-center justify-center`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="text-3xl font-display font-bold text-white">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    ativo: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    trial: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    canceled: "bg-red-500/20 text-red-400 border-red-500/30",
    cancelado: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  const labels: Record<string, string> = {
    active: "Ativo",
    ativo: "Ativo",
    trial: "Trial",
    canceled: "Cancelado",
    cancelado: "Cancelado",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colors[status] || "bg-slate-500/20 text-slate-400 border-slate-500/30"}`}>
      {labels[status] || status}
    </span>
  );
}

export { StatusBadge };

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(apiUrl("/admin/dashboard"), { credentials: "include" })
      .then(r => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-display text-white mb-1">Dashboard</h1>
          <p className="text-slate-400">Visão geral da plataforma</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary"></div>
          </div>
        ) : data ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="MRR (Receita Mensal)" value={`R$ ${data.mrr.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} icon={DollarSign} color="bg-emerald-500/20 text-emerald-400" />
              <StatCard title="ARR (Receita Anual)" value={`R$ ${data.arr.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} icon={TrendingUp} color="bg-primary/20 text-primary" />
              <StatCard title="Total de Estúdios" value={data.totalStudios} icon={Building2} color="bg-blue-500/20 text-blue-400" />
              <StatCard title="Assinaturas Ativas" value={data.activeSubscriptions} icon={CreditCard} color="bg-violet-500/20 text-violet-400" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard title="Em Trial" value={data.trialUsers} icon={Clock} color="bg-amber-500/20 text-amber-400" />
              <StatCard title="Cancelados" value={data.canceledUsers} icon={XCircle} color="bg-red-500/20 text-red-400" />
              <StatCard title="Churn Rate" value={`${data.churnRate}%`} icon={TrendingDown} color="bg-red-500/10 text-red-300" />
            </div>

            {(() => {
              const entries = Object.entries(data.monthlyRevenue).sort(([a], [b]) => a.localeCompare(b)).slice(-6);
              const maxRev = Math.max(...entries.map(([, v]) => v), 1);
              return entries.length > 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <h2 className="text-lg font-display text-white mb-4 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Faturamento Mensal (Comandas)
                  </h2>
                  <div className="space-y-3">
                    {entries.map(([mesAno, total]) => {
                      const pct = (total / maxRev) * 100;
                      return (
                        <div key={mesAno} className="flex items-center gap-4">
                          <span className="text-sm text-slate-400 w-20 shrink-0">{mesAno}</span>
                          <div className="flex-1 h-8 bg-white/5 rounded-lg overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-primary/80 to-primary rounded-lg transition-all duration-500"
                              style={{ width: `${Math.max(pct, 2)}%` }}
                            />
                          </div>
                          <span className="text-sm text-white font-medium shrink-0 w-28 text-right">
                            R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null;
            })()}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h2 className="text-lg font-display text-white mb-4 flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Cadastros Recentes
                </h2>
                <div className="space-y-3">
                  {data.recentSignups.length === 0 ? (
                    <p className="text-slate-500 text-sm">Nenhum cadastro encontrado</p>
                  ) : (
                    data.recentSignups.map(s => (
                      <div key={s.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                        <div>
                          <p className="text-sm text-white font-medium">{s.nome}</p>
                          <p className="text-xs text-slate-500">{s.createdAt ? new Date(s.createdAt).toLocaleDateString("pt-BR") : "-"}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {s.subscriptionPlan && (
                            <span className="text-xs text-slate-400">{s.subscriptionPlan}</span>
                          )}
                          <StatusBadge status={s.subscriptionStatus} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h2 className="text-lg font-display text-white mb-4">Distribuição de Planos</h2>
                <div className="space-y-3">
                  {Object.entries(data.planDistribution).map(([plan, count]) => {
                    const total = data.totalStudios || 1;
                    const pct = ((count / total) * 100).toFixed(0);
                    return (
                      <div key={plan} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-300">{plan}</span>
                          <span className="text-slate-400">{count} ({pct}%)</span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {Object.keys(data.planDistribution).length === 0 && (
                    <p className="text-slate-500 text-sm">Nenhum dado disponível</p>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <p className="text-slate-400">Erro ao carregar dados</p>
        )}
      </div>
    </AdminLayout>
  );
}
