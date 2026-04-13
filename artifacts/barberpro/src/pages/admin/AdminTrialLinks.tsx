import React, { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { apiUrl } from "@/lib/utils";
import { Link2, Plus, Copy, Check, Clock, User, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TrialLink {
  id: number;
  token: string;
  trialDays: number;
  used: boolean;
  usedAt: string | null;
  usedByEmail: string | null;
  usedByBarbeariaId: number | null;
  expiresAt: string;
  createdAt: string;
  url: string;
  adminNome: string | null;
}

export default function AdminTrialLinks() {
  const [links, setLinks] = useState<TrialLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  useEffect(() => {
    fetchLinks();
  }, []);

  const fetchLinks = async () => {
    try {
      const res = await fetch(apiUrl("/admin/trial-links"), { credentials: "include" });
      if (res.ok) setLinks(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const generateLink = async () => {
    setGenerating(true);
    try {
      const res = await fetch(apiUrl("/admin/trial-links"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        const newLink = await res.json();
        setLinks(prev => [newLink, ...prev]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  const copyUrl = (link: TrialLink) => {
    navigator.clipboard.writeText(link.url);
    setCopiedId(link.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatus = (link: TrialLink) => {
    if (link.used) return { label: "Utilizado", color: "text-emerald-400 bg-emerald-400/10" };
    if (new Date(link.expiresAt) < new Date()) return { label: "Expirado", color: "text-red-400 bg-red-400/10" };
    return { label: "Ativo", color: "text-blue-400 bg-blue-400/10" };
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  const activeCount = links.filter(l => !l.used && new Date(l.expiresAt) > new Date()).length;
  const usedCount = links.filter(l => l.used).length;
  const expiredCount = links.filter(l => !l.used && new Date(l.expiresAt) < new Date()).length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary" />
              Links de Trial
            </h1>
            <p className="text-white/40 text-sm mt-1">
              Gere links únicos de uso único para trials de 7 dias
            </p>
          </div>
          <Button onClick={generateLink} disabled={generating} className="gap-2">
            <Plus className="h-4 w-4" />
            {generating ? "Gerando..." : "Gerar Link"}
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[#111] border border-white/[0.06] rounded-xl p-4">
            <div className="text-[11px] uppercase tracking-wider text-white/30 mb-1">Ativos</div>
            <div className="text-2xl font-bold text-blue-400">{activeCount}</div>
          </div>
          <div className="bg-[#111] border border-white/[0.06] rounded-xl p-4">
            <div className="text-[11px] uppercase tracking-wider text-white/30 mb-1">Utilizados</div>
            <div className="text-2xl font-bold text-emerald-400">{usedCount}</div>
          </div>
          <div className="bg-[#111] border border-white/[0.06] rounded-xl p-4">
            <div className="text-[11px] uppercase tracking-wider text-white/30 mb-1">Expirados</div>
            <div className="text-2xl font-bold text-red-400">{expiredCount}</div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
          </div>
        ) : links.length === 0 ? (
          <div className="bg-[#111] border border-white/[0.06] rounded-xl p-12 text-center">
            <Link2 className="h-10 w-10 text-white/20 mx-auto mb-3" />
            <p className="text-white/40 text-sm">Nenhum link gerado ainda</p>
            <p className="text-white/20 text-xs mt-1">Clique em "Gerar Link" para criar o primeiro</p>
          </div>
        ) : (
          <div className="space-y-3">
            {links.map(link => {
              const status = getStatus(link);
              return (
                <div key={link.id} className="bg-[#111] border border-white/[0.06] rounded-xl p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${status.color}`}>
                          {status.label}
                        </span>
                        <span className="text-[11px] text-white/20">
                          Trial de {link.trialDays} dias
                        </span>
                      </div>

                      <div className="flex items-center gap-2 bg-black/30 rounded-lg px-3 py-2">
                        <code className="text-[12px] text-white/60 truncate flex-1">{link.url}</code>
                        <button
                          onClick={() => copyUrl(link)}
                          className="text-white/30 hover:text-white transition-colors flex-shrink-0"
                        >
                          {copiedId === link.id ? (
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>

                      <div className="flex items-center gap-4 text-[11px] text-white/30">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Criado: {formatDate(link.createdAt)}
                        </span>
                        {link.adminNome && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {link.adminNome}
                          </span>
                        )}
                        {!link.used && (
                          <span className="flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Expira: {formatDate(link.expiresAt)}
                          </span>
                        )}
                      </div>

                      {link.used && link.usedByEmail && (
                        <div className="flex items-center gap-2 text-[11px] text-emerald-400/80 bg-emerald-400/5 rounded-lg px-3 py-1.5">
                          <Check className="h-3 w-3" />
                          Usado por <span className="font-medium">{link.usedByEmail}</span>
                          {link.usedAt && <span className="text-white/20">em {formatDate(link.usedAt)}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="bg-[#111] border border-white/[0.06] rounded-xl p-4">
          <h3 className="text-[13px] font-medium text-white/60 mb-2">Informações</h3>
          <ul className="text-[12px] text-white/30 space-y-1">
            <li>• Cada link é de uso único e válido por 30 dias</li>
            <li>• O trial concedido é de 7 dias com acesso completo</li>
            <li>• Dados de usuários trial são automaticamente removidos após 3 meses sem contratação de plano</li>
          </ul>
        </div>
      </div>
    </AdminLayout>
  );
}
