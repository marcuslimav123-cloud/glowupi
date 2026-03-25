import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { apiUrl, getRoleLabel, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { UsersRound, Plus, Trash2, Copy, Check, Mail, Send, X, Shield, RefreshCw } from "lucide-react";

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
  perfilAcessoId?: number | null;
  token: string;
  createdAt: string;
  expiresAt: string;
}

interface PerfilAcesso {
  id: number;
  descricao: string;
  tipo: string;
  permissoes: string[];
  ativo: boolean;
}

export default function Equipe() {
  const { user, barbeariaId } = useAuth();
  const { toast } = useToast();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [perfis, setPerfis] = useState<PerfilAcesso[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteNome, setInviteNome] = useState("");
  const [inviteRole, setInviteRole] = useState<"gerente" | "colaborador">("colaborador");
  const [invitePerfilId, setInvitePerfilId] = useState<string>("");
  const [enviarEmail, setEnviarEmail] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [copiedToken, setCopiedToken] = useState<number | null>(null);
  const [resendingId, setResendingId] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, [barbeariaId]);

  async function loadData() {
    try {
      const [membersRes, invitesRes, perfisRes] = await Promise.all([
        fetch(apiUrl("/convites/equipe"), { credentials: "include" }),
        fetch(apiUrl("/convites"), { credentials: "include" }),
        barbeariaId
          ? fetch(apiUrl(`/barbearias/${barbeariaId}/perfis-acesso`), { credentials: "include" })
          : Promise.resolve(null),
      ]);
      if (membersRes.ok) setMembers(await membersRes.json());
      if (invitesRes.ok) setInvites(await invitesRes.json());
      if (perfisRes && perfisRes.ok) {
        const all = await perfisRes.json();
        setPerfis(all.filter((p: PerfilAcesso) => p.ativo && p.tipo === "web"));
      }
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
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          nomeConvidado: inviteNome || undefined,
          perfilAcessoId: invitePerfilId || undefined,
          enviarEmail,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Erro", description: data.error, variant: "destructive" });
        return;
      }
      setInvites(prev => [...prev, data]);
      setShowInviteForm(false);
      resetForm();

      if (enviarEmail) {
        if (data.emailSent === false) {
          toast({ title: "Convite criado, mas o e-mail falhou", description: "Copie o link e envie manualmente pelo WhatsApp.", variant: "destructive" });
        } else {
          toast({ title: "Convite enviado por e-mail", description: `Um e-mail foi enviado para ${inviteEmail}` });
        }
      } else {
        toast({ title: "Convite criado", description: "Copie o link e envie manualmente pelo WhatsApp." });
      }
    } catch {
      toast({ title: "Erro", description: "Falha ao criar convite", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setInviteEmail("");
    setInviteNome("");
    setInviteRole("colaborador");
    setInvitePerfilId("");
    setEnviarEmail(true);
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

  async function handleResendInvite(id: number) {
    setResendingId(id);
    try {
      const res = await fetch(apiUrl(`/convites/${id}/resend`), {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Erro ao reenviar", description: data.error, variant: "destructive" });
        return;
      }
      toast({ title: "E-mail reenviado com sucesso!" });
    } catch {
      toast({ title: "Erro", description: "Falha ao reenviar convite", variant: "destructive" });
    } finally {
      setResendingId(null);
    }
  }

  function copyInviteLink(invite: Invite) {
    const base = window.location.origin;
    const link = `${base}/convite/${invite.token}`;
    navigator.clipboard.writeText(link);
    setCopiedToken(invite.id);
    setTimeout(() => setCopiedToken(null), 2000);
    toast({ title: "Link copiado para a area de transferencia!" });
  }

  const pendingInvites = invites.filter(i => i.status === "pendente");
  const filteredPerfis = perfis.filter(p => p.tipo === "web");

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-bold text-foreground tracking-tight">Equipe</h1>
            <p className="text-foreground/45 text-[14px] mt-1">Gerencie os membros do seu estudio</p>
          </div>
          <Button onClick={() => setShowInviteForm(true)} className="rounded-xl h-10 text-[13px] gap-2">
            <Plus className="h-4 w-4" /> Convidar
          </Button>
        </div>

        {showInviteForm && (
          <div className="bg-white rounded-2xl border border-black/[0.04] p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-semibold">Novo Convite</h2>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setShowInviteForm(false); resetForm(); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <form onSubmit={handleInvite} className="space-y-5">
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
                    Colaborador(a)
                    <span className="block text-[11px] font-normal mt-0.5 opacity-60">Acesso limitado ao perfil</span>
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
                    <span className="block text-[11px] font-normal mt-0.5 opacity-60">Acesso completo ao sistema</span>
                  </button>
                </div>
              </div>

              {inviteRole === "colaborador" && filteredPerfis.length > 0 && (
                <div>
                  <label className="text-[13px] font-medium text-foreground/60 mb-1.5 flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5" />
                    Perfil de Acesso
                  </label>
                  <select
                    value={invitePerfilId}
                    onChange={e => setInvitePerfilId(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-black/[0.06] text-[14px] text-foreground/70 bg-white"
                  >
                    <option value="">Sem perfil (acesso basico)</option>
                    {filteredPerfis.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.descricao} ({p.permissoes.length} permissoes)
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-foreground/30 mt-1">
                    O perfil define quais menus e funcionalidades o membro podera acessar.
                    Voce pode criar novos perfis em Configuracoes &gt; Perfis de Acesso.
                  </p>
                </div>
              )}

              <div>
                <label className="text-[13px] font-medium text-foreground/60 mb-1.5 block">Como enviar o convite?</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setEnviarEmail(true)}
                    className={cn(
                      "flex-1 px-4 py-2.5 rounded-xl border text-[13px] font-medium transition-all flex items-center justify-center gap-2",
                      enviarEmail
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-black/[0.06] text-foreground/50 hover:border-black/[0.12]"
                    )}
                  >
                    <Mail className="h-4 w-4" />
                    Enviar por E-mail
                  </button>
                  <button
                    type="button"
                    onClick={() => setEnviarEmail(false)}
                    className={cn(
                      "flex-1 px-4 py-2.5 rounded-xl border text-[13px] font-medium transition-all flex items-center justify-center gap-2",
                      !enviarEmail
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-black/[0.06] text-foreground/50 hover:border-black/[0.12]"
                    )}
                  >
                    <Copy className="h-4 w-4" />
                    Copiar Link
                  </button>
                </div>
                <p className="text-[11px] text-foreground/30 mt-1">
                  {enviarEmail
                    ? "Um e-mail sera enviado automaticamente com o link do convite."
                    : "O link sera gerado para voce copiar e enviar manualmente pelo WhatsApp."}
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => { setShowInviteForm(false); resetForm(); }} className="rounded-xl h-10 text-[13px]">
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting} className="rounded-xl h-10 text-[13px] gap-2">
                  <Send className="h-4 w-4" />
                  {submitting ? "Enviando..." : enviarEmail ? "Enviar Convite" : "Gerar Link"}
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
                      <option value="colaborador">Colaborador(a)</option>
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
              {pendingInvites.map(invite => {
                const perfil = invite.perfilAcessoId ? perfis.find(p => p.id === invite.perfilAcessoId) : null;
                return (
                  <div key={invite.id} className="flex items-center gap-4 p-4">
                    <div className="h-10 w-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 shrink-0">
                      <Mail className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-medium text-foreground truncate">
                        {invite.nomeConvidado || invite.email}
                      </p>
                      <p className="text-[12px] text-foreground/40">
                        {getRoleLabel(invite.role)}
                        {perfil && <> · <Shield className="h-3 w-3 inline" /> {perfil.descricao}</>}
                        {" "}· Expira {new Date(invite.expiresAt).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-lg text-[12px] gap-1.5"
                        onClick={() => handleResendInvite(invite.id)}
                        disabled={resendingId === invite.id}
                      >
                        <RefreshCw className={cn("h-3.5 w-3.5", resendingId === invite.id && "animate-spin")} />
                        {resendingId === invite.id ? "Enviando..." : "Reenviar"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-lg text-[12px] gap-1.5"
                        onClick={() => copyInviteLink(invite)}
                      >
                        {copiedToken === invite.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        {copiedToken === invite.id ? "Copiado" : "Link"}
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
                );
              })}
            </div>
          </div>
        )}

        {!loading && members.length === 0 && pendingInvites.length === 0 && !showInviteForm && (
          <div className="text-center py-16">
            <div className="h-16 w-16 rounded-2xl bg-primary/5 flex items-center justify-center mx-auto mb-4">
              <UsersRound className="h-8 w-8 text-primary/40" />
            </div>
            <h3 className="text-[16px] font-semibold text-foreground mb-1">Nenhum membro na equipe</h3>
            <p className="text-[13px] text-foreground/40 mb-6">Convide profissionais para trabalhar no seu estudio</p>
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
