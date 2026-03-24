import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { apiUrl, getRoleLabel, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { UsersRound, Plus, Trash2, Copy, Check, Mail, UserCog, X } from "lucide-react";

interface TeamMember {
  id: number;
  nome: string;
  email: string;
  role: string;
  telefone?: string;
  ativo: boolean;
  createdAt: string;
}

interface Invite {
  id: number;
  email: string;
  role: string;
  status: string;
  nomeConvidado?: string;
  token: string;
  createdAt: string;
  expiresAt: string;
}

export default function Equipe() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteNome, setInviteNome] = useState("");
  const [inviteRole, setInviteRole] = useState<"gerente" | "colaborador">("colaborador");
  const [submitting, setSubmitting] = useState(false);
  const [copiedToken, setCopiedToken] = useState<number | null>(null);

  React.useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [membersRes, invitesRes] = await Promise.all([
        fetch(apiUrl("/convites/equipe"), { credentials: "include" }),
        fetch(apiUrl("/convites"), { credentials: "include" }),
      ]);
      if (membersRes.ok) setMembers(await membersRes.json());
      if (invitesRes.ok) setInvites(await invitesRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(apiUrl("/convites"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: inviteEmail, role: inviteRole, nomeConvidado: inviteNome || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Erro", description: data.error, variant: "destructive" });
        return;
      }
      setInvites(prev => [...prev, data]);
      setShowInviteForm(false);
      setInviteEmail("");
      setInviteNome("");
      setInviteRole("colaborador");
      toast({ title: "Convite enviado", description: "O link do convite foi gerado com sucesso." });
    } catch {
      toast({ title: "Erro", description: "Falha ao criar convite", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteInvite(id: number) {
    try {
      await fetch(apiUrl(`/convites/${id}`), { method: "DELETE", credentials: "include" });
      setInvites(prev => prev.filter(i => i.id !== id));
      toast({ title: "Convite removido" });
    } catch {
      toast({ title: "Erro", variant: "destructive" });
    }
  }

  async function handleRemoveMember(id: number) {
    if (!confirm("Tem certeza que deseja remover este membro da equipe?")) return;
    try {
      const res = await fetch(apiUrl(`/convites/equipe/${id}`), { method: "DELETE", credentials: "include" });
      if (res.ok) {
        setMembers(prev => prev.filter(m => m.id !== id));
        toast({ title: "Membro removido" });
      }
    } catch {
      toast({ title: "Erro", variant: "destructive" });
    }
  }

  async function handleUpdateRole(id: number, role: string) {
    try {
      const res = await fetch(apiUrl(`/convites/equipe/${id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role }),
      });
      if (res.ok) {
        setMembers(prev => prev.map(m => m.id === id ? { ...m, role } : m));
        toast({ title: "Cargo atualizado" });
      }
    } catch {
      toast({ title: "Erro", variant: "destructive" });
    }
  }

  function copyInviteLink(invite: Invite) {
    const base = window.location.origin;
    const link = `${base}/convite/${invite.token}`;
    navigator.clipboard.writeText(link);
    setCopiedToken(invite.id);
    setTimeout(() => setCopiedToken(null), 2000);
    toast({ title: "Link copiado!" });
  }

  const pendingInvites = invites.filter(i => i.status === "pendente");

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-bold text-foreground tracking-tight">Equipe</h1>
            <p className="text-foreground/45 text-[14px] mt-1">Gerencie os membros do seu estúdio</p>
          </div>
          <Button onClick={() => setShowInviteForm(true)} className="rounded-xl h-10 text-[13px] gap-2">
            <Plus className="h-4 w-4" /> Convidar
          </Button>
        </div>

        {showInviteForm && (
          <div className="bg-white rounded-2xl border border-black/[0.04] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-semibold">Novo Convite</h2>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowInviteForm(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[13px] font-medium text-foreground/60 mb-1.5 block">Nome (opcional)</label>
                  <Input
                    value={inviteNome}
                    onChange={e => setInviteNome(e.target.value)}
                    placeholder="Nome da pessoa"
                    className="rounded-xl h-10 text-[14px]"
                  />
                </div>
                <div>
                  <label className="text-[13px] font-medium text-foreground/60 mb-1.5 block">Email *</label>
                  <Input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                    className="rounded-xl h-10 text-[14px]"
                  />
                </div>
              </div>
              <div>
                <label className="text-[13px] font-medium text-foreground/60 mb-1.5 block">Cargo</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setInviteRole("colaborador")}
                    className={cn(
                      "flex-1 px-4 py-2.5 rounded-xl border text-[13px] font-medium transition-all",
                      inviteRole === "colaborador"
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-black/[0.06] text-foreground/50 hover:border-black/[0.12]"
                    )}
                  >
                    Colaboradora
                    <span className="block text-[11px] font-normal mt-0.5 opacity-60">Acessa apenas a própria agenda</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInviteRole("gerente")}
                    className={cn(
                      "flex-1 px-4 py-2.5 rounded-xl border text-[13px] font-medium transition-all",
                      inviteRole === "gerente"
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-black/[0.06] text-foreground/50 hover:border-black/[0.12]"
                    )}
                  >
                    Gerente
                    <span className="block text-[11px] font-normal mt-0.5 opacity-60">Acessa dashboard, agenda e relatórios</span>
                  </button>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowInviteForm(false)} className="rounded-xl h-10 text-[13px]">
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting} className="rounded-xl h-10 text-[13px] gap-2">
                  <Mail className="h-4 w-4" /> {submitting ? "Enviando..." : "Gerar Convite"}
                </Button>
              </div>
            </form>
          </div>
        )}

        {members.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-[14px] font-semibold text-foreground/60">Membros Ativos</h2>
            <div className="bg-white rounded-2xl border border-black/[0.04] divide-y divide-black/[0.04]">
              {members.map(member => (
                <div key={member.id} className="flex items-center gap-4 p-4">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-semibold text-[13px] shrink-0">
                    {member.nome.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-foreground truncate">{member.nome}</p>
                    <p className="text-[12px] text-foreground/40 truncate">{member.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={member.role}
                      onChange={e => handleUpdateRole(member.id, e.target.value)}
                      className="text-[12px] bg-black/[0.03] border-0 rounded-lg px-2.5 py-1.5 text-foreground/60 font-medium cursor-pointer"
                    >
                      <option value="colaborador">Colaboradora</option>
                      <option value="gerente">Gerente</option>
                    </select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-foreground/30 hover:text-red-500 hover:bg-red-50"
                      onClick={() => handleRemoveMember(member.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {pendingInvites.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-[14px] font-semibold text-foreground/60">Convites Pendentes</h2>
            <div className="bg-white rounded-2xl border border-black/[0.04] divide-y divide-black/[0.04]">
              {pendingInvites.map(invite => (
                <div key={invite.id} className="flex items-center gap-4 p-4">
                  <div className="h-10 w-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 shrink-0">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-foreground truncate">
                      {invite.nomeConvidado || invite.email}
                    </p>
                    <p className="text-[12px] text-foreground/40">
                      {getRoleLabel(invite.role)} · Expira {new Date(invite.expiresAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-lg text-[12px] gap-1.5"
                      onClick={() => copyInviteLink(invite)}
                    >
                      {copiedToken === invite.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiedToken === invite.id ? "Copiado" : "Copiar Link"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-foreground/30 hover:text-red-500 hover:bg-red-50"
                      onClick={() => handleDeleteInvite(invite.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && members.length === 0 && pendingInvites.length === 0 && !showInviteForm && (
          <div className="text-center py-16">
            <div className="h-16 w-16 rounded-2xl bg-primary/5 flex items-center justify-center mx-auto mb-4">
              <UsersRound className="h-8 w-8 text-primary/40" />
            </div>
            <h3 className="text-[16px] font-semibold text-foreground mb-1">Nenhum membro na equipe</h3>
            <p className="text-[13px] text-foreground/40 mb-6">Convide profissionais para trabalhar no seu estúdio</p>
            <Button onClick={() => setShowInviteForm(true)} className="rounded-xl h-10 text-[13px] gap-2">
              <Plus className="h-4 w-4" /> Convidar Primeiro Membro
            </Button>
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
          </div>
        )}
      </div>
    </AppLayout>
  );
}
