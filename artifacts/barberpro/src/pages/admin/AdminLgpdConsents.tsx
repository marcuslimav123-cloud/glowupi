import React, { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { apiUrl } from "@/lib/utils";
import { Shield, ChevronLeft, ChevronRight, User, Clock, Globe, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ConsentEntry {
  id: number;
  userId: number;
  tipo: string;
  ipAddress: string | null;
  userAgent: string | null;
  acceptedAt: string;
  userName: string | null;
  userEmail: string | null;
}

export default function AdminLgpdConsents() {
  const [consents, setConsents] = useState<ConsentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const loadConsents = async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/admin/lgpd-consents?page=${p}&limit=20`), { credentials: "include" });
      const data = await res.json();
      setConsents(data.consents || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
      setPage(data.page || 1);
    } catch {
      console.error("Erro ao carregar consents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadConsents(1); }, []);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const shortenUA = (ua: string | null) => {
    if (!ua) return "—";
    if (ua.length > 60) return ua.substring(0, 57) + "...";
    return ua;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display text-white mb-1 flex items-center gap-3">
            <Shield className="h-8 w-8 text-green-400" />
            Log de Consentimentos LGPD
          </h1>
          <p className="text-slate-400">
            Registro de todos os usuários que aceitaram a Política de Privacidade e Termos de Uso ({total} registros)
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary" />
          </div>
        ) : consents.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
            <Shield className="h-12 w-12 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-400">Nenhum consentimento registrado ainda</p>
          </div>
        ) : (
          <>
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.03]">
                      <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">ID</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Usuário</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Tipo</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">IP</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider hidden lg:table-cell">Navegador</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {consents.map(c => (
                      <tr key={c.id} className="hover:bg-white/[0.03] transition-colors">
                        <td className="px-4 py-3 text-white/50 font-mono text-xs">{c.id}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <User className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                            <div>
                              <span className="text-white text-sm">{c.userName || "—"}</span>
                              <p className="text-xs text-white/40">{c.userEmail || `ID: ${c.userId}`}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 text-xs font-medium">
                            {c.tipo === "full" ? "Completo" : c.tipo}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-white/50 text-xs font-mono">
                            <Globe className="h-3 w-3" />
                            {c.ipAddress || "—"}
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <div className="flex items-center gap-1.5 text-white/40 text-xs max-w-[200px]" title={c.userAgent || ""}>
                            <Monitor className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{shortenUA(c.userAgent)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-white/60 text-xs">
                            <Clock className="h-3 w-3" />
                            {formatDate(c.acceptedAt)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">
                  Página {page} de {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => loadConsents(page - 1)}
                    className="gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" /> Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => loadConsents(page + 1)}
                    className="gap-1"
                  >
                    Próxima <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
