import React, { useEffect, useState, useRef } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { apiUrl } from "@/lib/utils";
import { StatusBadge } from "./AdminDashboard";
import { Search, Building2, Users, Calendar, Clock, ChevronDown, ChevronUp, Plus, Minus, History, Download, FileSpreadsheet, Upload, CheckCircle2, AlertTriangle, XCircle, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ImportPreviewRow {
  linha: number;
  nome: string;
  preco: number | null;
  duracaoMinutos: number;
  descricao: string | null;
  status: "novo" | "duplicado" | "erro";
  motivo: string | null;
}
interface ImportPreview {
  barbearia: { id: number; nome: string };
  total: number;
  novos: number;
  duplicados: number;
  erros: number;
  rows: ImportPreviewRow[];
}

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
  const [importTenant, setImportTenant] = useState<Tenant | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [importStep, setImportStep] = useState<"upload" | "preview" | "done">("upload");
  const [importResult, setImportResult] = useState<{ inseridos: any[]; pulados: any[]; erros: any[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const openImport = (t: Tenant) => {
    setImportTenant(t);
    setImportPreview(null);
    setImportResult(null);
    setImportStep("upload");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const closeImport = () => {
    setImportTenant(null);
    setImportPreview(null);
    setImportResult(null);
    setImportStep("upload");
    setImportBusy(false);
  };

  const downloadImportTemplate = async (id: number) => {
    try {
      const res = await fetch(apiUrl(`/admin/tenants/${id}/servicos-import-template`), { credentials: "include" });
      if (!res.ok) throw new Error("Erro");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `template_servicos_${id}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast({ title: "Modelo baixado!", description: "Preencha a aba 'Serviços' e suba aqui de volta." });
    } catch {
      toast({ title: "Erro ao baixar modelo", variant: "destructive" });
    }
  };

  const uploadAndPreview = async (file: File) => {
    if (!importTenant) return;
    setImportBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(apiUrl(`/admin/tenants/${importTenant.id}/servicos-import-preview`), {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Erro", description: data?.error || "Falha ao analisar planilha", variant: "destructive" });
        return;
      }
      setImportPreview(data);
      setImportStep("preview");
    } catch (e: any) {
      toast({ title: "Erro de rede", description: e?.message, variant: "destructive" });
    } finally {
      setImportBusy(false);
    }
  };

  const confirmImport = async () => {
    if (!importTenant || !importPreview) return;
    const validRows = importPreview.rows.filter(r => r.status === "novo");
    if (validRows.length === 0) {
      toast({ title: "Nada pra cadastrar", description: "Não há linhas novas válidas na planilha.", variant: "destructive" });
      return;
    }
    setImportBusy(true);
    try {
      const res = await fetch(apiUrl(`/admin/tenants/${importTenant.id}/servicos-import-confirm`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ rows: validRows }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Erro", description: data?.error || "Falha ao cadastrar", variant: "destructive" });
        return;
      }
      setImportResult({ inseridos: data.inseridos, pulados: data.pulados, erros: data.erros });
      setImportStep("done");
      toast({ title: `${data.totalInseridos} serviço(s) cadastrado(s)!`, description: data.totalPulados > 0 ? `${data.totalPulados} pulado(s) por já existirem.` : undefined });
    } catch (e: any) {
      toast({ title: "Erro de rede", description: e?.message, variant: "destructive" });
    } finally {
      setImportBusy(false);
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
                        <p className="text-[11px] text-slate-500 mb-2 flex items-center gap-1"><FileSpreadsheet className="h-3 w-3" /> Importar Serviços por Planilha</p>
                        <p className="text-xs text-slate-400 mb-3">Cadastre vários serviços de uma vez subindo um arquivo Excel (.xlsx). Baixe o modelo, preencha e suba aqui.</p>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadImportTemplate(t.id)}
                            className="h-8 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 rounded-lg"
                          >
                            <Download className="h-3.5 w-3.5 mr-1.5" />
                            Baixar modelo
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => openImport(t)}
                            className="h-8 bg-emerald-500 hover:bg-emerald-400 text-black rounded-lg"
                          >
                            <Upload className="h-3.5 w-3.5 mr-1.5" />
                            Importar planilha
                          </Button>
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

      {importTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={importBusy ? undefined : closeImport}>
          <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <div>
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
                  Importar Serviços
                </h3>
                <p className="text-sm text-slate-400 mt-0.5">{importTenant.nome}</p>
              </div>
              <button onClick={closeImport} disabled={importBusy} className="text-slate-400 hover:text-white disabled:opacity-40">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {importStep === "upload" && (
                <div className="space-y-4">
                  <div className="bg-slate-800/50 border border-white/5 rounded-lg p-4">
                    <p className="text-sm text-white font-medium mb-2">Como funciona</p>
                    <ol className="text-xs text-slate-400 space-y-1 list-decimal list-inside">
                      <li>Baixe o modelo Excel (clique abaixo).</li>
                      <li>Abra no Excel ou Google Planilhas, vá na aba "Serviços" e preencha os serviços (1 por linha).</li>
                      <li>Salve como .xlsx e suba aqui.</li>
                      <li>Você verá um pré-visualização antes de cadastrar de verdade.</li>
                    </ol>
                  </div>
                  <div className="flex flex-col gap-3">
                    <Button onClick={() => downloadImportTemplate(importTenant.id)} variant="outline" className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">
                      <Download className="h-4 w-4 mr-2" />
                      Baixar modelo (.xlsx)
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) uploadAndPreview(f);
                      }}
                      className="block w-full text-sm text-slate-300 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-emerald-500 file:text-black file:font-medium hover:file:bg-emerald-400 file:cursor-pointer cursor-pointer"
                      disabled={importBusy}
                    />
                  </div>
                  {importBusy && (
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Loader2 className="h-4 w-4 animate-spin" /> Analisando planilha...
                    </div>
                  )}
                </div>
              )}

              {importStep === "preview" && importPreview && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-emerald-400">{importPreview.novos}</p>
                      <p className="text-[11px] text-emerald-300 uppercase tracking-wide">Novos</p>
                    </div>
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-yellow-400">{importPreview.duplicados}</p>
                      <p className="text-[11px] text-yellow-300 uppercase tracking-wide">Já existem</p>
                    </div>
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-red-400">{importPreview.erros}</p>
                      <p className="text-[11px] text-red-300 uppercase tracking-wide">Com erro</p>
                    </div>
                  </div>

                  <div className="bg-slate-800/50 border border-white/5 rounded-lg overflow-hidden">
                    <div className="max-h-72 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-white/5 sticky top-0">
                          <tr className="text-left text-slate-400">
                            <th className="px-3 py-2 w-10">#</th>
                            <th className="px-3 py-2">Nome</th>
                            <th className="px-3 py-2 w-20 text-right">Preço</th>
                            <th className="px-3 py-2 w-16 text-right">Min</th>
                            <th className="px-3 py-2 w-32">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {importPreview.rows.map(r => (
                            <tr key={r.linha} className={r.status === "erro" ? "bg-red-500/5" : r.status === "duplicado" ? "bg-yellow-500/5" : ""}>
                              <td className="px-3 py-2 text-slate-500">{r.linha}</td>
                              <td className="px-3 py-2 text-white">{r.nome || <span className="text-slate-600 italic">vazio</span>}</td>
                              <td className="px-3 py-2 text-right text-slate-300">{r.preco != null ? `R$ ${r.preco.toFixed(2)}` : "-"}</td>
                              <td className="px-3 py-2 text-right text-slate-300">{r.duracaoMinutos}</td>
                              <td className="px-3 py-2">
                                {r.status === "novo" && <span className="inline-flex items-center gap-1 text-emerald-400"><CheckCircle2 className="h-3 w-3" /> Novo</span>}
                                {r.status === "duplicado" && <span className="inline-flex items-center gap-1 text-yellow-400" title={r.motivo || ""}><AlertTriangle className="h-3 w-3" /> Pular</span>}
                                {r.status === "erro" && <span className="inline-flex items-center gap-1 text-red-400" title={r.motivo || ""}><XCircle className="h-3 w-3" /> {r.motivo}</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="text-xs text-slate-400 bg-slate-800/30 border border-white/5 rounded-lg p-3">
                    Vou cadastrar apenas os <span className="text-emerald-400 font-semibold">{importPreview.novos} novos</span>. Os duplicados e os com erro serão ignorados.
                    {importPreview.erros > 0 && <span className="block mt-1 text-red-400">⚠ Para corrigir os erros, edite a planilha e suba novamente.</span>}
                  </div>
                </div>
              )}

              {importStep === "done" && importResult && (
                <div className="space-y-4">
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 text-center">
                    <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-2" />
                    <p className="text-lg font-semibold text-white">{importResult.inseridos.length} serviço(s) cadastrado(s) com sucesso!</p>
                    {importResult.pulados.length > 0 && <p className="text-sm text-yellow-400 mt-1">{importResult.pulados.length} pulado(s) (já existiam)</p>}
                    {importResult.erros.length > 0 && <p className="text-sm text-red-400 mt-1">{importResult.erros.length} com erro</p>}
                  </div>

                  {importResult.inseridos.length > 0 && (
                    <div className="bg-slate-800/50 border border-white/5 rounded-lg overflow-hidden">
                      <p className="px-3 py-2 text-[11px] text-slate-400 bg-white/5 uppercase tracking-wide">Cadastrados</p>
                      <div className="max-h-48 overflow-y-auto divide-y divide-white/5">
                        {importResult.inseridos.map((s: any) => (
                          <div key={s.id} className="px-3 py-1.5 flex justify-between text-xs">
                            <span className="text-white">{s.nome}</span>
                            <span className="text-emerald-400">R$ {Number(s.preco).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 p-4 border-t border-white/10">
              {importStep === "upload" && (
                <Button variant="outline" onClick={closeImport} disabled={importBusy} className="border-white/10 text-white hover:bg-white/5">Cancelar</Button>
              )}
              {importStep === "preview" && (
                <>
                  <Button variant="outline" onClick={() => { setImportStep("upload"); setImportPreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} disabled={importBusy} className="border-white/10 text-white hover:bg-white/5">Voltar</Button>
                  <Button onClick={confirmImport} disabled={importBusy || (importPreview?.novos ?? 0) === 0} className="bg-emerald-500 hover:bg-emerald-400 text-black">
                    {importBusy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Cadastrando...</> : <>Cadastrar {importPreview?.novos ?? 0} serviço(s)</>}
                  </Button>
                </>
              )}
              {importStep === "done" && (
                <Button onClick={closeImport} className="bg-emerald-500 hover:bg-emerald-400 text-black">Concluir</Button>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
