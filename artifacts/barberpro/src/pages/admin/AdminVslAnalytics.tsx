import React, { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { apiUrl } from "@/lib/utils";
import { Video, Play, Users, TrendingUp, Target, Filter, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DistributionBucket {
  bucket: number;
  count: number;
}

interface RecentSession {
  sessionId: string;
  maxPercent: number;
  events: number;
  firstAt: string;
  lastAt: string;
}

interface VslAnalytics {
  totalPlays: number;
  totalEvents: number;
  avgPercent: number;
  reachedCta: number;
  reachedCtaPct: number;
  completed: number;
  threshold: number;
  distribution: DistributionBucket[];
  recent: RecentSession[];
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoStr(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export default function AdminVslAnalytics() {
  const [from, setFrom] = useState<string>(daysAgoStr(30));
  const [to, setTo] = useState<string>(todayStr());
  const [data, setData] = useState<VslAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const res = await fetch(apiUrl(`/admin/vsl-analytics?${params.toString()}`), { credentials: "include" });
      if (!res.ok) throw new Error("Erro ao carregar analytics");
      const json = await res.json();
      setData(json);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  const setRange = (days: number) => {
    setFrom(daysAgoStr(days));
    setTo(todayStr());
  };

  const maxBucketCount = data ? Math.max(1, ...data.distribution.map(d => d.count)) : 1;

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-red-500/15 flex items-center justify-center">
            <Video className="h-6 w-6 text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-display text-white">VSL Analytics</h1>
            <p className="text-sm text-slate-400">Engajamento dos visitantes com o vídeo da página /pdvd</p>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-slate-400" />
            <span className="text-sm font-medium text-white">Filtrar por período</span>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">De</label>
              <input
                type="date"
                value={from}
                onChange={e => setFrom(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Até</label>
              <input
                type="date"
                value={to}
                onChange={e => setTo(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setRange(7)}>7d</Button>
              <Button size="sm" variant="outline" onClick={() => setRange(30)}>30d</Button>
              <Button size="sm" variant="outline" onClick={() => setRange(90)}>90d</Button>
            </div>
            <Button size="sm" onClick={load} disabled={loading} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl p-4 text-sm">{error}</div>
        )}

        {data && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                icon={<Play className="h-5 w-5 text-blue-400" />}
                label="Total de plays"
                value={data.totalPlays.toLocaleString("pt-BR")}
                hint="Sessões únicas que iniciaram o vídeo"
              />
              <StatCard
                icon={<TrendingUp className="h-5 w-5 text-purple-400" />}
                label="% médio assistido"
                value={`${data.avgPercent.toFixed(1)}%`}
                hint="Média do progresso máximo por sessão"
              />
              <StatCard
                icon={<Target className="h-5 w-5 text-primary" />}
                label={`Chegaram ao CTA (${data.threshold > 0 ? `${data.threshold}%` : "100%"})`}
                value={`${data.reachedCta.toLocaleString("pt-BR")}`}
                hint={`${data.reachedCtaPct.toFixed(1)}% dos visitantes`}
              />
              <StatCard
                icon={<Users className="h-5 w-5 text-green-400" />}
                label="Assistiram até o fim"
                value={data.completed.toLocaleString("pt-BR")}
                hint="Sessões com 95%+ assistidos"
              />
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Funil de retenção</h3>
              <div className="space-y-2">
                {data.distribution.map(b => {
                  const pct = data.totalPlays === 0 ? 0 : Math.round((b.count / data.totalPlays) * 1000) / 10;
                  const barW = (b.count / maxBucketCount) * 100;
                  return (
                    <div key={b.bucket} className="flex items-center gap-3">
                      <div className="w-16 text-xs text-slate-400 font-mono">≥{b.bucket}%</div>
                      <div className="flex-1 h-7 bg-white/[0.04] rounded-md overflow-hidden">
                        <div
                          className="h-full bg-primary/70 flex items-center px-2 text-[11px] font-semibold text-white"
                          style={{ width: `${barW}%`, minWidth: b.count > 0 ? "32px" : 0 }}
                        >
                          {b.count > 0 ? b.count : ""}
                        </div>
                      </div>
                      <div className="w-16 text-xs text-slate-400 text-right">{pct}%</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-white mb-3">Sessões recentes</h3>
              {data.recent.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhuma sessão registrada no período.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-slate-400 border-b border-white/[0.06]">
                        <th className="py-2 pr-4 font-medium">Sessão</th>
                        <th className="py-2 pr-4 font-medium">Máx. assistido</th>
                        <th className="py-2 pr-4 font-medium">Pings</th>
                        <th className="py-2 pr-4 font-medium">Início</th>
                        <th className="py-2 pr-4 font-medium">Última atividade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recent.map(s => (
                        <tr key={s.sessionId} className="border-b border-white/[0.04] last:border-0">
                          <td className="py-2 pr-4 text-slate-300 font-mono text-[11px]">{s.sessionId}</td>
                          <td className="py-2 pr-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${
                              s.maxPercent >= (data.threshold > 0 ? data.threshold : 100)
                                ? "bg-primary/20 text-primary"
                                : s.maxPercent >= 50
                                  ? "bg-blue-500/15 text-blue-300"
                                  : "bg-white/[0.06] text-slate-400"
                            }`}>{s.maxPercent}%</span>
                          </td>
                          <td className="py-2 pr-4 text-slate-400">{s.events}</td>
                          <td className="py-2 pr-4 text-slate-400 text-xs">{new Date(s.firstAt).toLocaleString("pt-BR")}</td>
                          <td className="py-2 pr-4 text-slate-400 text-xs">{new Date(s.lastAt).toLocaleString("pt-BR")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

function StatCard({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="h-9 w-9 rounded-lg bg-white/[0.04] flex items-center justify-center">{icon}</div>
        <span className="text-xs text-slate-400">{label}</span>
      </div>
      <div className="text-2xl font-display text-white">{value}</div>
      {hint && <div className="text-[11px] text-slate-500 mt-1">{hint}</div>}
    </div>
  );
}
