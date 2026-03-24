import React, { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { apiUrl } from "@/lib/utils";
import { StatusBadge } from "./AdminDashboard";
import { Search, ToggleLeft, ToggleRight, Building2 } from "lucide-react";
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
  ativo: boolean;
  createdAt: string;
  dono: { id: number; nome: string; email: string } | null;
}

export default function AdminTenants() {
  const { toast } = useToast();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [toggling, setToggling] = useState<number | null>(null);

  const fetchTenants = () => {
    fetch(apiUrl("/admin/tenants"), { credentials: "include" })
      .then(r => r.json())
      .then(setTenants)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTenants(); }, []);

  const toggleTenant = async (id: number) => {
    setToggling(id);
    try {
      const res = await fetch(apiUrl(`/admin/tenants/${id}/toggle`), {
        method: "PUT",
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        setTenants(prev => prev.map(t => t.id === id ? { ...t, ativo: data.ativo } : t));
        toast({ title: data.ativo ? "Estúdio ativado" : "Estúdio desativado" });
      }
    } catch {
      toast({ title: "Erro", description: "Falha ao alterar status", variant: "destructive" });
    } finally {
      setToggling(null);
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
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left p-4 text-slate-400 font-medium">Estúdio</th>
                    <th className="text-left p-4 text-slate-400 font-medium hidden md:table-cell">Proprietário</th>
                    <th className="text-left p-4 text-slate-400 font-medium hidden lg:table-cell">Localização</th>
                    <th className="text-left p-4 text-slate-400 font-medium">Status</th>
                    <th className="text-left p-4 text-slate-400 font-medium hidden sm:table-cell">Plano</th>
                    <th className="text-left p-4 text-slate-400 font-medium">Ativo</th>
                    <th className="text-left p-4 text-slate-400 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        Nenhum estúdio encontrado
                      </td>
                    </tr>
                  ) : (
                    filtered.map(t => (
                      <tr key={t.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="p-4">
                          <div>
                            <p className="text-white font-medium">{t.nome}</p>
                            <p className="text-xs text-slate-500">{t.email || "-"}</p>
                          </div>
                        </td>
                        <td className="p-4 hidden md:table-cell">
                          <div>
                            <p className="text-slate-300 text-sm">{t.dono?.nome || "-"}</p>
                            <p className="text-xs text-slate-500">{t.dono?.email || "-"}</p>
                          </div>
                        </td>
                        <td className="p-4 hidden lg:table-cell text-slate-400">
                          {t.cidade && t.uf ? `${t.cidade}/${t.uf}` : "-"}
                        </td>
                        <td className="p-4">
                          <StatusBadge status={t.subscriptionStatus || "trial"} />
                        </td>
                        <td className="p-4 hidden sm:table-cell text-slate-400">
                          {t.subscriptionPlan || "Trial"}
                          {t.subscriptionPeriod && <span className="text-xs text-slate-500 ml-1">({t.subscriptionPeriod})</span>}
                        </td>
                        <td className="p-4">
                          {t.ativo ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Sim</span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">Não</span>
                          )}
                        </td>
                        <td className="p-4">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-white/20 text-slate-300 hover:text-white hover:bg-white/10 h-8"
                            onClick={() => toggleTenant(t.id)}
                            disabled={toggling === t.id}
                          >
                            {t.ativo ? <ToggleRight className="h-4 w-4 mr-1" /> : <ToggleLeft className="h-4 w-4 mr-1" />}
                            {t.ativo ? "Desativar" : "Ativar"}
                          </Button>
                        </td>
                      </tr>
                    ))
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
