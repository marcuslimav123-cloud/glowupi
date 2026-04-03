import React, { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { apiUrl } from "@/lib/utils";
import { History, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface LogEntry {
  id: number;
  adminId: number;
  acao: string;
  barbeariaId: number | null;
  detalhes: any;
  createdAt: string;
}

const ACAO_LABELS: Record<string, { label: string; color: string }> = {
  login: { label: "Login", color: "text-blue-400" },
  ativar_tenant: { label: "Ativar Tenant", color: "text-emerald-400" },
  desativar_tenant: { label: "Desativar Tenant", color: "text-red-400" },
  mudar_status: { label: "Mudar Status", color: "text-yellow-400" },
  ajustar_datas: { label: "Ajustar Datas", color: "text-purple-400" },
  alterar_config: { label: "Alterar Config", color: "text-orange-400" },
};

export default function AdminLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch(apiUrl("/admin/logs?limit=200"), { credentials: "include" })
      .then(r => r.json())
      .then(setLogs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = logs.filter(l =>
    l.acao.toLowerCase().includes(search.toLowerCase()) ||
    (l.detalhes && JSON.stringify(l.detalhes).toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display text-white mb-1">Log de Ações</h1>
            <p className="text-slate-400">Histórico de todas as ações administrativas</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Filtrar logs..."
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
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left p-4 text-slate-400 font-medium">Data/Hora</th>
                    <th className="text-left p-4 text-slate-400 font-medium">Ação</th>
                    <th className="text-left p-4 text-slate-400 font-medium hidden md:table-cell">Estúdio ID</th>
                    <th className="text-left p-4 text-slate-400 font-medium">Detalhes</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-500">
                        <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        Nenhum log encontrado
                      </td>
                    </tr>
                  ) : (
                    filtered.map(l => {
                      const acaoInfo = ACAO_LABELS[l.acao] || { label: l.acao, color: "text-slate-300" };
                      return (
                        <tr key={l.id} className="border-b border-white/5 hover:bg-white/5">
                          <td className="p-4 text-slate-400 whitespace-nowrap">
                            {new Date(l.createdAt).toLocaleString("pt-BR")}
                          </td>
                          <td className="p-4">
                            <span className={`font-medium ${acaoInfo.color}`}>{acaoInfo.label}</span>
                          </td>
                          <td className="p-4 hidden md:table-cell text-slate-500">
                            {l.barbeariaId || "-"}
                          </td>
                          <td className="p-4 text-slate-400 text-xs max-w-[300px] truncate">
                            {l.detalhes ? (
                              typeof l.detalhes === "object"
                                ? Object.entries(l.detalhes).map(([k, v]) => `${k}: ${v}`).join(" | ")
                                : String(l.detalhes)
                            ) : "-"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
