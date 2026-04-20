import React, { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { apiUrl } from "@/lib/utils";
import { Megaphone, TrendingDown, TrendingUp, Users, Eye, MousePointerClick, ShoppingCart, DollarSign, RefreshCw, Loader2, LineChart as LineChartIcon, Activity, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from "recharts";

interface SourceRow {
  source?: string;
  campaign?: string;
  pageview: number;
  lead: number;
  checkout: number;
  purchase: number;
  revenue: number;
}

interface TenantSourceRow {
  source: string;
  total: number;
  ativos: number;
  trial: number;
}

interface TenantRecent {
  id: number;
  nome: string;
  utmSource: string | null;
  utmCampaign: string | null;
  utmMedium: string | null;
  subscriptionStatus: string | null;
  subscriptionPlan: string | null;
  createdAt: string | null;
}

interface DailyRow {
  day: string;
  pageview: number;
  lead: number;
  checkout: number;
  purchase: number;
}

interface Metrics {
  days: number;
  totals: { pageview: number; lead: number; checkout: number; purchase: number };
  uniqueTotals: { pageview: number; lead: number; checkout: number; purchase: number };
  conversion: {
    pageviewToLead: number;
    leadToCheckout: number;
    checkoutToPurchase: number;
    pageviewToPurchase: number;
  };
  revenue: number;
  bySource: SourceRow[];
  byCampaign: SourceRow[];
  daily: DailyRow[];
  tenantsBySource: TenantSourceRow[];
  tenantsRecent: TenantRecent[];
}

const PERIODS = [
  { value: 7, label: "7 dias" },
  { value: 30, label: "30 dias" },
  { value: 90, label: "90 dias" },
];

function formatNumber(n: number): string {
  return new Intl.NumberFormat("pt-BR").format(n);
}

function formatCurrency(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function FunnelCard({ icon: Icon, label, value, unique, color }: any) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <p className="text-sm text-slate-400">{label}</p>
      </div>
      <p className="text-3xl font-bold text-white">{formatNumber(value)}</p>
      {unique !== undefined && (
        <p className="text-xs text-slate-500 mt-1">{formatNumber(unique)} sessões únicas</p>
      )}
    </div>
  );
}

function ConvBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-slate-400">{label}</span>
        <span className="text-xs font-semibold text-white">{value.toFixed(2)}%</span>
      </div>
      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary to-pink-500"
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  );
}

interface CapiHealth {
  days: number;
  totals: {
    total: number; sent: number; ok: number; erro: number; pending: number; skipped: number;
    withEmail: number; withPhone: number; withFbp: number; withFbc: number; withAnyMatch: number;
  };
  rates: {
    successRate: number; errorRate: number; pendingRate: number;
    emailCoverage: number; phoneCoverage: number; fbpCoverage: number; fbcCoverage: number; anyMatchCoverage: number;
  };
  byTipo: { tipo: string; total: number; ok: number; erro: number; pending: number; skipped: number; successRate: number }[];
  topErrors: { error: string; count: number }[];
  daily: { day: string; ok: number; erro: number; pending: number; skipped: number }[];
}

export default function AdminCampanha() {
  const [days, setDays] = useState<number>(30);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [capiHealth, setCapiHealth] = useState<CapiHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (selectedDays = days) => {
    try {
      const [resMetrics, resCapi] = await Promise.all([
        fetch(apiUrl(`/campaign/metrics?days=${selectedDays}`), { credentials: "include" }),
        fetch(apiUrl(`/campaign/capi-health?days=${selectedDays}`), { credentials: "include" }),
      ]);
      if (resMetrics.ok) setMetrics(await resMetrics.json());
      if (resCapi.ok) setCapiHealth(await resCapi.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load(days);
  }, [days]);

  const handleRefresh = () => {
    setRefreshing(true);
    load(days);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display text-white mb-1 flex items-center gap-3">
              <Megaphone className="h-7 w-7 text-primary" /> Campanha & Funil
            </h1>
            <p className="text-slate-400">Métricas de tráfego, conversão e atribuição (UTM)</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-white/5 border border-white/10 rounded-xl p-1">
              {PERIODS.map(p => (
                <button
                  key={p.value}
                  onClick={() => setDays(p.value)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    days === p.value ? "bg-primary text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="gap-2">
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Atualizar
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary"></div>
          </div>
        ) : !metrics ? (
          <div className="text-slate-400 text-sm">Não foi possível carregar as métricas.</div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <FunnelCard icon={Eye} label="Visitas" value={metrics.totals.pageview} unique={metrics.uniqueTotals.pageview} color="bg-blue-500/20 text-blue-400" />
              <FunnelCard icon={MousePointerClick} label="Leads" value={metrics.totals.lead} unique={metrics.uniqueTotals.lead} color="bg-purple-500/20 text-purple-400" />
              <FunnelCard icon={ShoppingCart} label="Checkouts" value={metrics.totals.checkout} unique={metrics.uniqueTotals.checkout} color="bg-amber-500/20 text-amber-400" />
              <FunnelCard icon={DollarSign} label="Compras" value={metrics.totals.purchase} unique={metrics.uniqueTotals.purchase} color="bg-green-500/20 text-green-400" />
            </div>

            {capiHealth && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-display text-white flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" /> Qualidade dos eventos no Facebook (CAPI)
                  </h2>
                  <p className="text-xs text-slate-500">{capiHealth.totals.sent} enviados / {capiHealth.totals.total} eventos</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="h-4 w-4 text-green-400" />
                      <p className="text-xs text-slate-400">Sucesso CAPI</p>
                    </div>
                    <p className="text-2xl font-bold text-white">{capiHealth.rates.successRate.toFixed(1)}%</p>
                    <p className="text-xs text-slate-500 mt-1">{formatNumber(capiHealth.totals.ok)} ok</p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-red-400" />
                      <p className="text-xs text-slate-400">Falhas</p>
                    </div>
                    <p className="text-2xl font-bold text-white">{capiHealth.rates.errorRate.toFixed(1)}%</p>
                    <p className="text-xs text-slate-500 mt-1">{formatNumber(capiHealth.totals.erro)} erros</p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-4 w-4 text-purple-400" />
                      <p className="text-xs text-slate-400">Email hash</p>
                    </div>
                    <p className="text-2xl font-bold text-white">{capiHealth.rates.emailCoverage.toFixed(1)}%</p>
                    <p className="text-xs text-slate-500 mt-1">{formatNumber(capiHealth.totals.withEmail)} eventos</p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-4 w-4 text-blue-400" />
                      <p className="text-xs text-slate-400">Telefone hash</p>
                    </div>
                    <p className="text-2xl font-bold text-white">{capiHealth.rates.phoneCoverage.toFixed(1)}%</p>
                    <p className="text-xs text-slate-500 mt-1">{formatNumber(capiHealth.totals.withPhone)} eventos</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <div>
                    <p className="text-xs text-slate-500 mb-3">Cobertura de parâmetros de match</p>
                    <div className="space-y-3">
                      <ConvBar label="Email" value={capiHealth.rates.emailCoverage} />
                      <ConvBar label="Telefone" value={capiHealth.rates.phoneCoverage} />
                      <ConvBar label="_fbp (cookie pixel)" value={capiHealth.rates.fbpCoverage} />
                      <ConvBar label="_fbc (clique do anúncio)" value={capiHealth.rates.fbcCoverage} />
                      <div className="pt-2 border-t border-white/5">
                        <ConvBar label="Pelo menos 1 parâmetro" value={capiHealth.rates.anyMatchCoverage} />
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-3">Status por tipo de evento</p>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-slate-500 border-b border-white/5">
                          <th className="pb-2 font-medium">Tipo</th>
                          <th className="pb-2 font-medium text-right">Total</th>
                          <th className="pb-2 font-medium text-right">OK</th>
                          <th className="pb-2 font-medium text-right">Erro</th>
                          <th className="pb-2 font-medium text-right">Sucesso</th>
                        </tr>
                      </thead>
                      <tbody>
                        {capiHealth.byTipo.length === 0 && (
                          <tr><td colSpan={5} className="py-4 text-center text-slate-500">Sem dados</td></tr>
                        )}
                        {capiHealth.byTipo.map(row => (
                          <tr key={row.tipo} className="border-b border-white/5 last:border-0">
                            <td className="py-2 text-white">{row.tipo}</td>
                            <td className="py-2 text-right text-slate-300">{formatNumber(row.total)}</td>
                            <td className="py-2 text-right text-green-400">{formatNumber(row.ok)}</td>
                            <td className="py-2 text-right text-red-400">{formatNumber(row.erro)}</td>
                            <td className="py-2 text-right text-white font-semibold">{row.successRate.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {capiHealth.topErrors.length > 0 && (
                  <div className="mt-5 pt-5 border-t border-white/5">
                    <p className="text-xs text-slate-500 mb-3">Erros mais comuns</p>
                    <div className="space-y-2">
                      {capiHealth.topErrors.map((e, i) => (
                        <div key={i} className="flex items-start gap-3 bg-red-500/5 border border-red-500/10 rounded-lg p-3">
                          <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-red-300 break-words">{e.error}</p>
                          </div>
                          <span className="text-xs text-slate-400 flex-shrink-0">{e.count}×</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-display text-white flex items-center gap-2">
                  <LineChartIcon className="h-5 w-5 text-primary" /> Funil ao longo do tempo
                </h2>
                <p className="text-xs text-slate-500">Eventos por dia ({metrics.days}d)</p>
              </div>
              {metrics.daily.length === 0 ? (
                <div className="h-[260px] flex items-center justify-center text-sm text-slate-500">
                  Nenhum evento no período
                </div>
              ) : (
                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={metrics.daily.map(d => ({
                        ...d,
                        label: new Date(d.day + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
                      }))}
                      margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="gradPageview" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.5} />
                          <stop offset="100%" stopColor="#60a5fa" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradLead" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.5} />
                          <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradCheckout" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.5} />
                          <stop offset="100%" stopColor="#fbbf24" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradPurchase" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#34d399" stopOpacity={0.5} />
                          <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="label" stroke="rgba(255,255,255,0.35)" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="rgba(255,255,255,0.35)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                      <RechartsTooltip
                        contentStyle={{ backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", fontSize: "13px", color: "#fff" }}
                        labelStyle={{ color: "#cbd5e1", marginBottom: 4 }}
                        formatter={(value: any, name: any) => [formatNumber(Number(value)), name]}
                      />
                      <Legend wrapperStyle={{ fontSize: "12px", color: "#cbd5e1" }} iconType="circle" />
                      <Area type="monotone" dataKey="pageview" name="Visitas" stroke="#60a5fa" strokeWidth={2} fill="url(#gradPageview)" />
                      <Area type="monotone" dataKey="lead" name="Leads" stroke="#a78bfa" strokeWidth={2} fill="url(#gradLead)" />
                      <Area type="monotone" dataKey="checkout" name="Checkouts" stroke="#fbbf24" strokeWidth={2} fill="url(#gradCheckout)" />
                      <Area type="monotone" dataKey="purchase" name="Compras" stroke="#34d399" strokeWidth={2} fill="url(#gradPurchase)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 lg:col-span-2">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-display text-white">Taxas de Conversão (sessões únicas)</h2>
                </div>
                <div className="space-y-4">
                  <ConvBar label="Visita → Lead" value={metrics.conversion.pageviewToLead} />
                  <ConvBar label="Lead → Checkout" value={metrics.conversion.leadToCheckout} />
                  <ConvBar label="Checkout → Compra" value={metrics.conversion.checkoutToPurchase} />
                  <div className="pt-3 border-t border-white/5">
                    <ConvBar label="Visita → Compra (geral)" value={metrics.conversion.pageviewToPurchase} />
                  </div>
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-green-400" />
                  </div>
                  <p className="text-sm text-slate-400">Receita rastreada</p>
                </div>
                <p className="text-3xl font-bold text-white">{formatCurrency(metrics.revenue)}</p>
                <p className="text-xs text-slate-500 mt-2">Soma dos eventos Purchase no período. Use a régua do Stripe para receita oficial.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h2 className="text-lg font-display text-white mb-4">Por Origem (utm_source)</h2>
                <div className="overflow-x-auto -mx-6 px-6">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-slate-500 border-b border-white/5">
                        <th className="pb-2 font-medium">Origem</th>
                        <th className="pb-2 font-medium text-right">Visitas</th>
                        <th className="pb-2 font-medium text-right">Leads</th>
                        <th className="pb-2 font-medium text-right">Compras</th>
                        <th className="pb-2 font-medium text-right">Receita</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.bySource.length === 0 && (
                        <tr><td colSpan={5} className="py-6 text-center text-slate-500">Nenhum evento registrado</td></tr>
                      )}
                      {metrics.bySource.map(row => (
                        <tr key={row.source} className="border-b border-white/5 last:border-0">
                          <td className="py-2.5 text-white truncate max-w-[160px]">{row.source}</td>
                          <td className="py-2.5 text-right text-slate-300">{formatNumber(row.pageview)}</td>
                          <td className="py-2.5 text-right text-slate-300">{formatNumber(row.lead)}</td>
                          <td className="py-2.5 text-right text-green-400 font-semibold">{formatNumber(row.purchase)}</td>
                          <td className="py-2.5 text-right text-green-400">{formatCurrency(row.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h2 className="text-lg font-display text-white mb-4">Por Campanha (utm_campaign)</h2>
                <div className="overflow-x-auto -mx-6 px-6">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-slate-500 border-b border-white/5">
                        <th className="pb-2 font-medium">Campanha</th>
                        <th className="pb-2 font-medium text-right">Visitas</th>
                        <th className="pb-2 font-medium text-right">Leads</th>
                        <th className="pb-2 font-medium text-right">Compras</th>
                        <th className="pb-2 font-medium text-right">Receita</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.byCampaign.length === 0 && (
                        <tr><td colSpan={5} className="py-6 text-center text-slate-500">Nenhuma campanha rastreada</td></tr>
                      )}
                      {metrics.byCampaign.map(row => (
                        <tr key={row.campaign} className="border-b border-white/5 last:border-0">
                          <td className="py-2.5 text-white truncate max-w-[160px]">{row.campaign}</td>
                          <td className="py-2.5 text-right text-slate-300">{formatNumber(row.pageview)}</td>
                          <td className="py-2.5 text-right text-slate-300">{formatNumber(row.lead)}</td>
                          <td className="py-2.5 text-right text-green-400 font-semibold">{formatNumber(row.purchase)}</td>
                          <td className="py-2.5 text-right text-green-400">{formatCurrency(row.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-lg font-display text-white mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" /> Cadastros por Origem (no período)
              </h2>
              <div className="overflow-x-auto -mx-6 px-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 border-b border-white/5">
                      <th className="pb-2 font-medium">Origem</th>
                      <th className="pb-2 font-medium text-right">Total</th>
                      <th className="pb-2 font-medium text-right">Ativos</th>
                      <th className="pb-2 font-medium text-right">Trial</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.tenantsBySource.length === 0 && (
                      <tr><td colSpan={4} className="py-6 text-center text-slate-500">Nenhum cadastro com atribuição</td></tr>
                    )}
                    {metrics.tenantsBySource.map(row => (
                      <tr key={row.source} className="border-b border-white/5 last:border-0">
                        <td className="py-2.5 text-white">{row.source}</td>
                        <td className="py-2.5 text-right text-white font-semibold">{row.total}</td>
                        <td className="py-2.5 text-right text-green-400">{row.ativos}</td>
                        <td className="py-2.5 text-right text-amber-400">{row.trial}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-lg font-display text-white mb-4">Cadastros recentes com atribuição</h2>
              <div className="overflow-x-auto -mx-6 px-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 border-b border-white/5">
                      <th className="pb-2 font-medium">Tenant</th>
                      <th className="pb-2 font-medium">Origem</th>
                      <th className="pb-2 font-medium">Campanha</th>
                      <th className="pb-2 font-medium">Plano</th>
                      <th className="pb-2 font-medium">Status</th>
                      <th className="pb-2 font-medium">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.tenantsRecent.length === 0 && (
                      <tr><td colSpan={6} className="py-6 text-center text-slate-500">Nenhum cadastro no período</td></tr>
                    )}
                    {metrics.tenantsRecent.map(t => (
                      <tr key={t.id} className="border-b border-white/5 last:border-0">
                        <td className="py-2.5 text-white truncate max-w-[160px]">{t.nome}</td>
                        <td className="py-2.5 text-slate-300">{t.utmSource || "—"}</td>
                        <td className="py-2.5 text-slate-300 truncate max-w-[160px]">{t.utmCampaign || "—"}</td>
                        <td className="py-2.5 text-slate-300">{t.subscriptionPlan || "—"}</td>
                        <td className="py-2.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            t.subscriptionStatus === "ativo" || t.subscriptionStatus === "active"
                              ? "bg-green-500/20 text-green-400"
                              : t.subscriptionStatus === "trial"
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-white/10 text-slate-400"
                          }`}>
                            {t.subscriptionStatus || "—"}
                          </span>
                        </td>
                        <td className="py-2.5 text-slate-400 text-xs">
                          {t.createdAt ? new Date(t.createdAt).toLocaleDateString("pt-BR") : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="text-xs text-slate-500 text-center">
              Janela: últimos {metrics.days} dias.
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
