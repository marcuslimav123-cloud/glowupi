import React, { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { apiUrl } from "@/lib/utils";
import { Shield, ShieldCheck, ShieldOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface AdminUser {
  id: number;
  nome: string;
  email: string;
  ativo: boolean;
  createdAt: string;
}

interface MeResp {
  id: number;
  nome: string;
  email: string;
}

export default function AdminAdmins() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [me, setMe] = useState<MeResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const { toast } = useToast();

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        fetch(apiUrl("/admin/admins"), { credentials: "include" }),
        fetch(apiUrl("/admin/me"), { credentials: "include" }),
      ]);
      if (!r1.ok) {
        const err = await r1.json().catch(() => ({}));
        throw new Error(err?.error || `Erro ${r1.status} ao carregar admins`);
      }
      if (!r2.ok) {
        const err = await r2.json().catch(() => ({}));
        throw new Error(err?.error || `Erro ${r2.status} ao identificar usuário`);
      }
      setAdmins(await r1.json());
      setMe(await r2.json());
    } catch (e: any) {
      toast({ title: "Erro ao carregar admins", description: e?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const toggle = async (admin: AdminUser) => {
    setActionLoading(admin.id);
    try {
      const res = await fetch(apiUrl(`/admin/admins/${admin.id}/toggle`), {
        method: "PATCH",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Erro", description: data?.error || "Falha ao alterar status", variant: "destructive" });
        return;
      }
      setAdmins(prev => prev.map(a => a.id === admin.id ? { ...a, ativo: data.ativo } : a));
      toast({
        title: data.ativo ? "Admin ativado" : "Admin desativado",
        description: data.ativo
          ? `${data.nome} pode acessar o painel novamente.`
          : `${data.nome} não pode mais acessar o painel.`,
      });
    } catch (e: any) {
      toast({ title: "Erro de rede", description: e?.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
      setConfirmId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-1">
          <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white tracking-tight">Gerenciar Admins</h1>
            <p className="text-sm text-white/40">Controle quem tem acesso ao painel administrativo</p>
          </div>
        </div>

        <div className="mt-6 bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-white/40">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
              Carregando...
            </div>
          ) : admins.length === 0 ? (
            <div className="p-10 text-center text-white/40">Nenhum admin cadastrado.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-white/[0.03]">
                <tr className="text-left text-white/40 text-xs uppercase tracking-wide">
                  <th className="px-5 py-3">Nome</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {admins.map(a => {
                  const isMe = me?.id === a.id;
                  return (
                    <tr key={a.id} className="hover:bg-white/[0.02]">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center text-primary text-xs font-semibold">
                            {a.nome.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-white">{a.nome}</span>
                          {isMe && <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-primary/20 text-primary">Você</span>}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-white/60">{a.email}</td>
                      <td className="px-5 py-3">
                        {a.ativo ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
                            <ShieldCheck className="h-3.5 w-3.5" /> Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-red-400 text-xs font-medium">
                            <ShieldOff className="h-3.5 w-3.5" /> Desativado
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {isMe ? (
                          <span className="text-xs text-white/30 italic">Não pode alterar a si mesmo</span>
                        ) : confirmId === a.id ? (
                          <div className="inline-flex items-center gap-2">
                            <span className="text-xs text-white/60">
                              {a.ativo ? "Tirar acesso?" : "Devolver acesso?"}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setConfirmId(null)}
                              disabled={actionLoading === a.id}
                              className="h-7 px-2 text-xs border-white/10 text-white hover:bg-white/5"
                            >
                              Não
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => toggle(a)}
                              disabled={actionLoading === a.id}
                              className={a.ativo
                                ? "h-7 px-3 text-xs bg-red-500 hover:bg-red-400 text-white"
                                : "h-7 px-3 text-xs bg-emerald-500 hover:bg-emerald-400 text-black"
                              }
                            >
                              {actionLoading === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Sim"}
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setConfirmId(a.id)}
                            className={a.ativo
                              ? "h-7 px-3 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10"
                              : "h-7 px-3 text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                            }
                          >
                            {a.ativo ? "Desativar" : "Ativar"}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <p className="text-xs text-white/30 mt-4">
          Admins desativados não conseguem fazer login. A operação é reversível — basta clicar em "Ativar" depois.
        </p>
      </div>
    </AdminLayout>
  );
}
