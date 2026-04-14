import React, { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { apiUrl } from "@/lib/utils";
import { StatusBadge } from "./AdminDashboard";
import { Search, Building2, Users, Calendar, Clock, ChevronDown, ChevronUp, Plus, Minus, History, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Tenant {
  id: number;
  nome: string;
  slug: string;
  email: string | null;
  telefone: string | null;
  cidade: string | null;
  uf: string | null;
  subscriptionStatus: string | null;
  subscriptionPlan: string | null;
  subscriptionPeriod: string | null;
  planoVencimento: string | null;
  ativo: boolean;
  createdAt: string;
  dono: { id: number; nome: string; email: string } | null;
  proCount: number;
  proLimit: number;
  diasRestantes: number | null;
  mesesAcesso: number;
  anosAcesso: number;
}

interface LogEntry {
  id: number;
  acao: string;
  detalhes: any;
  createdAt: string;
}

const STATUS_OPTIONS = [
  { value: "trial", label: "Trial", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  { value: "pendente", label: "Pendente", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  { value: "ativo", label: "Ativo", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  { value: "inativo", label: "Inativo", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  { value: "suspenso", label: "Suspenso", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  { value: "inadimplente", label: "Inadimplente", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  { value: "cancelado", label: "Cancelado", color: "bg-slate-500/20 text-slate-400 border-slate-500/30" },
];

function formatDate(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("pt-BR");
}

export default function AdminTenants() {
  const { toast } = useToast();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [diasExtras, setDiasExtras] = useState("");

  const fetchTenants = () => {
    fetch(apiUrl("/admin/tenants"), { credentials: "include" })
      .then(r => r.json())
      .then(setTenants)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTenants(); }, []);

  const downloadExcel = async (endpoint: string, filename: string) => {
    try {
      const res = await fetch(apiUrl(endpoint), { credentials: "include" });
      if (!res.ok) throw new Error("Erro");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast({ title: "Exportação concluída!" });
    } catch {
      toast({ title: "Erro ao exportar", variant: "destructive" });
    }
  };

  const changeStatus = async (id: number, status: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(apiUrl(`/admin/tenants/${id}/status`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const data = await res.json();
        setTenants(prev => prev.map(t => t.id === id ? { ...t, subscriptionStatus: data.subscriptionStatus, ativo: data.ativo } : t));
        toast({ title: `Status alterado para "${status}"` });
      } else {
        const err = await res.json();
        toast({ title: "Erro", description: err.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro ao alterar status", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const adjustDates = async (id: number) => {
    const dias = parseInt(diasExtras);
    if (isNaN(dias) || dias === 0) {
      toast({ title: "Informe um número válido de dias", variant: "destructive" });
      return;
    }
    setActionLoading(id);
    try {
      const res = await fetch(apiUrl(`/admin/tenants/${id}/dates`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ diasExtras: dias }),
      });
      if (res.ok) {
        const data = await res.json();
        setTenants(prev => prev.map(t => t.id === id ? { ...t, planoVencimento: data.planoVencimento } : t));
        setDiasExtras("");
        toast({ title: `${dias > 0 ? "Adicionados" : "Removidos"} ${Math.abs(dias)} dias` });
      }
    } catch {
      toast({ title: "Erro ao ajustar datas", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const toggleExpand = async (id: number) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    setLogsLoading(true);
    try {
      const res = await fetch(apiUrl(`/admin/tenants/${id}/logs`), { credentials: "include" });
      const data = await res.json();
      setLogs(data);
    } catch {
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

  const filtered = tenants.filter(t =>
    t.nome.toLowerCase().includes(search.toLowerCase()) ||
    t.email?.toLowerCase().includes(search.toLowerCase()) ||
    t.dono?.nome.toLowerCase().includes(search.toLowerCase()) ||
    t.dono?.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display text-white mb-1">Assinantes</h1>
            <p className="text-slate-400">Gerenciar estúdios cadastrados ({tenants.length} total)</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button onClick={() => downloadExcel("/admin/export-clientes", "estabelecimentos")} variant="outline" className="border-white/10 text-white hover:bg-white/5 rounded-xl">
              <Download className="h-4 w-4 mr-2" />Estabelecimentos
            </Button>
            <Button onClick={() => downloadExcel("/admin/export-clientes-estabelecimentos", "clientes")} variant="outline" className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 rounded-xl">
              <Download className="h-4 w-4 mr-2" />Clientes
            </Button>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Buscar estúdio, dono ou email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-white/10 border-white/20 text-white placeholder:text-slate-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center text-slate-500">
                <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                Nenhum estúdio encontrado
              </div>
            ) : (
              filtered.map(t => (
                <div key={t.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                  <div
                    className="p-4 cursor-pointer hover:bg-white/5 transition-colors"
                    onClick={() => toggleExpand(t.id)}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <p className="text-white font-semibold text-lg">{t.nome}</p>
                          <StatusBadge status={t.subscriptionStatus || "trial"} />
                          {!t.ativo && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-500/20 text-red-400 border border-red-500/30">DESATIVADO</span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-slate-400 flex-wrap">
                          <span>{t.dono?.nome || "-"} · {t.dono?.email || "-"}</span>
                          {t.cidade && t.uf && <span>{t.cidade}/{t.uf}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-6 shrink-0">
                        <div className="text-center hidden sm:block">
                          <div className="flex items-center gap-1 text-sm">
                            <Users className="h-3.5 w-3.5 text-primary" />
                            <span className={`font-bold ${t.proCount >= t.proLimit ? "text-red-400" : "text-white"}`}>
                              {t.proCount}/{t.proLimit}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500">Profissionais</p>
                        </div>

                        <div className="text-center hidden md:block">
                          <p className="text-sm font-bold text-white">{t.subscriptionPlan || "Trial"}</p>
                          <p className="text-[11px] text-slate-500">{t.subscriptionPeriod || "-"}</p>
                        </div>

                        <div className="text-center hidden lg:block">
                          <p className={`text-sm font-bold ${t.diasRestantes !== null && t.diasRestantes <= 5 ? "text-red-400" : "text-white"}`}>
                            {t.diasRestantes !== null ? `${t.diasRestantes}d` : "-"}
                          </p>
                          <p className="text-[11px] text-slate-500">Restantes</p>
                        </div>

                        <div className="text-center hidden lg:block">
                          <p className="text-sm font-bold text-white">
                            {t.anosAcesso > 0 ? `${t.anosAcesso}a ${t.mesesAcesso % 12}m` : `${t.mesesAcesso}m`}
                          </p>
                          <p className="text-[11px] text-slate-500">Tempo</p>
                        </div>

                        {expandedId === t.id ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
                      </div>
                    </div>
                  </div>

                  {expandedId === t.id && (
                    <div className="border-t border-white/10 p-4 space-y-4 bg-white/[0.02]">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white/5 rounded-lg p-3">
                          <p className="text-[11px] text-slate-500 mb-1 flex items-center gap-1"><Users className="h-3 w-3" /> Profissionais</p>
                          <p className="text-white font-bold">{t.proCount} / {t.proLimit}</p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-3">
                          <p className="text-[11px] text-slate-500 mb-1 flex items-center gap-1"><Calendar className="h-3 w-3" /> Cadastro</p>
                          <p className="text-white font-bold">{formatDate(t.createdAt)}</p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-3">
                          <p className="text-[11px] text-slate-500 mb-1 flex items-center gap-1"><Clock className="h-3 w-3" /> Vencimento</p>
                          <p className={`font-bold ${t.diasRestantes !== null && t.diasRestantes <= 5 ? "text-red-400" : "text-white"}`}>
                            {formatDate(t.planoVencimento)} {t.diasRestantes !== null && `(${t.diasRestantes} dias)`}
                          </p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-3">
                          <p className="text-[11px] text-slate-500 mb-1">Tempo de acesso</p>
                          <p className="text-white font-bold">
                            {t.anosAcesso > 0 ? `${t.anosAcesso} ano(s) e ${t.mesesAcesso % 12} mês(es)` : `${t.mesesAcesso} mês(es)`}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1 bg-white/5 rounded-lg p-3">
                          <p className="text-[11px] text-slate-500 mb-2">Alterar Status</p>
                          <div className="flex flex-wrap gap-2">
                            {STATUS_OPTIONS.map(s => (
                              <button
                                key={s.value}
                                onClick={() => changeStatus(t.id, s.value)}
                                disabled={actionLoading === t.id || t.subscriptionStatus === s.value}
                                className={`px-3 py-1 rounded-full text-xs font-medium border transition-all disabled:opacity-40 ${
                                  t.subscriptionStatus === s.value ? s.color + " ring-1 ring-white/30" : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                                }`}
                              >
                                {s.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="sm:w-64 bg-white/5 rounded-lg p-3">
                          <p className="text-[11px] text-slate-500 mb-2">Ajustar Prazo (dias)</p>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              value={diasExtras}
                              onChange={e => setDiasExtras(e.target.value)}
                              placeholder="ex: 30 ou -7"
                              className="bg-white/10 border-white/20 text-white text-sm h-8"
                            />
                            <Button
                              size="sm"
                              onClick={() => adjustDates(t.id)}
                              disabled={actionLoading === t.id}
                              className="h-8 bg-primary/80 hover:bg-primary text-black"
                            >
                              Aplicar
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white/5 rounded-lg p-3">
                        <p className="text-[11px] text-slate-500 mb-2 flex items-center gap-1"><History className="h-3 w-3" /> Log de Ações</p>
                        {logsLoading ? (
                          <p className="text-slate-500 text-sm">Carregando...</p>
                        ) : logs.length === 0 ? (
                          <p className="text-slate-500 text-sm">Nenhum log registrado</p>
                        ) : (
                          <div className="space-y-1 max-h-48 overflow-y-auto">
                            {logs.map(l => (
                              <div key={l.id} className="flex items-center gap-3 text-sm py-1 border-b border-white/5 last:border-0">
                                <span className="text-slate-500 text-xs shrink-0">{formatDate(l.createdAt)}</span>
                                <span className="text-primary font-medium">{l.acao}</span>
                                {l.detalhes && (
                                  <span className="text-slate-400 text-xs truncate">
                                    {typeof l.detalhes === "object" ? Object.entries(l.detalhes).map(([k, v]) => `${k}: ${v}`).join(", ") : String(l.detalhes)}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
