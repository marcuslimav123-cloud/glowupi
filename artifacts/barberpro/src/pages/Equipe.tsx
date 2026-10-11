import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { apiUrl, getRoleLabel, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  UsersRound, Plus, Trash2, Copy, Check, Mail, Send, X, Shield, RefreshCw,
  ArrowUpCircle, AlertTriangle, UserPlus, UserCheck, User, ChevronRight, Link2, Loader2,
} from "lucide-react";
import { useLocation } from "wouter";

interface ProfStatus {
  id: number;
  nomeExibicao: string;
  fotoUrl?: string | null;
  especialidade?: string | null;
  celular?: string | null;
  ativo: boolean;
  usuarioId?: number | null;
  perfilAcesso: { id: number; descricao: string; tipo: string } | null;
  hasPendingInvite: boolean;
}

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
  profissionalId?: number | null;
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

const PLANS_WITH_TEAM = ["2_5_pro", "6_15_pro", "15_plus_pro"];

const PLAN_LABELS: Record<string, string> = {
  "1_pro": "1 Profissional",
  "2_5_pro": "2 a 5 Profissionais",
  "6_15_pro": "6 a 15 Profissionais",
  "15_plus_pro": "15+ Profissionais",
};

export default function Equipe() {
  const { user, barbeariaId } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [profStatus, setProfStatus] = useState<ProfStatus[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [perfis, setPerfis] = useState<PerfilAcesso[]>([]);
  const [loading, setLoading] = useState(true);

  const [invitingProfId, setInvitingProfId] = useState<number | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteNome, setInviteNome] = useState("");
  const [inviteRole, setInviteRole] = useState<"gerente" | "colaborador">("colaborador");
  const [invitePerfilId, setInvitePerfilId] = useState<string>("");
  const [enviarEmail, setEnviarEmail] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [copiedToken, setCopiedToken] = useState<number | null>(null);
  const [resendingId, setResendingId] = useState<number | null>(null);
  const [showGenericInvite, setShowGenericInvite] = useState(false);
  const [creatingDefaultPerfil, setCreatingDefaultPerfil] = useState(false);

  const rawPlan = ((user as any)?.barbearia?.subscriptionPlan || (user as any)?.barbearia?.planoNome || "").toLowerCase().replace(/\s+/g, "_");
  const isTrial = (user as any)?.barbearia?.subscriptionStatus === "trial";
  const isOnePro = rawPlan === "1_pro" && !isTrial;
  const hasTeamPlan = isTrial || PLANS_WITH_TEAM.includes(rawPlan);
  const webPerfis = perfis.filter(p => p.tipo === "web");

  useEffect(() => {
    loadData();
  }, [barbeariaId]);

  async function loadData() {
    try {
      const [membersRes, invitesRes, perfisRes, profRes] = await Promise.all([
        fetch(apiUrl("/convites/equipe"), { credentials: "include" }),
        fetch(apiUrl("/convites"), { credentials: "include" }),
        barbeariaId
          ? fetch(apiUrl(`/barbearias/${barbeariaId}/perfis-acesso`), { credentials: "include" })
          : Promise.resolve(null),
        fetch(apiUrl("/convites/equipe/profissionais-status"), { credentials: "include" }),
      ]);
      if (membersRes.ok) setMembers(await membersRes.json());
      if (invitesRes.ok) setInvites(await invitesRes.json());
      if (perfisRes && perfisRes.ok) {
        const all = await perfisRes.json();
        setPerfis(all.filter((p: PerfilAcesso) => p.ativo));
      }
      if (profRes.ok) setProfStatus(await profRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function openInviteForProf(prof: ProfStatus) {
    setInvitingProfId(prof.id);
    setInviteNome(prof.nomeExibicao);
    setInviteRole("colaborador");
    setInvitePerfilId(prof.perfilAcesso ? String(prof.perfilAcesso.id) : "");
    setInviteEmail("");
    setEnviarEmail(true);
    setShowGenericInvite(false);
  }

  function openGenericInvite() {
    setInvitingProfId(null);
    setInviteNome("");
    setInviteRole("gerente");
    setInvitePerfilId("");
    setInviteEmail("");
    setEnviarEmail(true);
    setShowGenericInvite(true);
  }

  async function createDefaultColaboradorPerfil() {
    if (!barbeariaId) return;
    setCreatingDefaultPerfil(true);
    try {
      const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/perfis-acesso`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          descricao: "Colaborador básico",
          tipo: "web",
          permissoes: [
            "dashboard", "agenda", "comandas",
            "clientes", "servicos",
            "dados_usuario", "senha_acesso",
          ],
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.message || "Falha ao criar perfil");
      }
      const novo = await res.json();
      const perfilNormalizado: PerfilAcesso = {
        id: novo.id,
        descricao: novo.descricao,
        tipo: novo.tipo,
        permissoes: novo.permissoes || [],
        ativo: novo.ativo ?? true,
      };
      setPerfis(prev => [...prev, perfilNormalizado]);
      setInvitePerfilId(String(perfilNormalizado.id));
      toast({ title: "Perfil criado!", description: "Perfil 'Colaborador básico' pronto para uso." });
    } catch (err: any) {
      toast({ title: "Erro ao criar perfil", description: err.message, variant: "destructive" });
    } finally {
      setCreatingDefaultPerfil(false);
    }
  }

  function closeInviteForm() {
    setInvitingProfId(null);
    setShowGenericInvite(false);
    setInviteEmail("");
    setInviteNome("");
    setInvitePerfilId("");
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (inviteRole === "colaborador" && !invitePerfilId) {
      toast({ title: "Perfil obrigatório", description: "Selecione um perfil de acesso para o colaborador.", variant: "destructive" });
      return;
    }
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
          profissionalId: invitingProfId || undefined,
          enviarEmail,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Erro", description: data.error, variant: "destructive" });
        return;
      }
      setInvites(prev => [...prev, data]);
      closeInviteForm();
      await loadData();

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

  async function handleDeleteInvite(id: number) {
    try {
      await fetch(apiUrl(`/convites/${id}`), { method: "DELETE", credentials: "include" });
      setInvites(prev => prev.filter(i => i.id !== id));
      await loadData();
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
      const res = await fetch(apiUrl(`/convites/${id}/resend`), { method: "POST", credentials: "include" });
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
    toast({ title: "Link copiado para a área de transferência!" });
  }

  const pendingInvites = invites.filter(i => i.status === "pendente");
  const profsWithoutUser = profStatus.filter(p => !p.usuarioId && p.ativo);
  const profsReadyToInvite = profsWithoutUser.filter(p => p.perfilAcesso && !p.hasPendingInvite);
  const profsWithPendingInvite = profsWithoutUser.filter(p => p.hasPendingInvite);
  const profsMissingPerfil = profsWithoutUser.filter(p => !p.perfilAcesso && !p.hasPendingInvite);
  const isInviteFormOpen = invitingProfId !== null || showGenericInvite;

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-bold text-foreground tracking-tight">Equipe</h1>
            <p className="text-foreground/45 text-[14px] mt-1">Quem tem acesso ao painel e o que cada pessoa pode fazer</p>
          </div>
          {hasTeamPlan && !isOnePro && (
            <Button
              onClick={openGenericInvite}
              className="rounded-xl h-10 text-[13px] gap-2"
              variant="outline"
            >
              <Plus className="h-4 w-4" /> Convidar gerente
            </Button>
          )}
        </div>

        {isOnePro && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex gap-4">
            <div className="shrink-0 h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <ArrowUpCircle className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-amber-900">Seu plano não permite equipe</p>
              <p className="text-[13px] text-amber-700 mt-0.5">
                O plano <strong>{PLAN_LABELS[rawPlan] || rawPlan}</strong> é para uso individual.
                Faça upgrade para o plano <strong>2 a 5 Profissionais</strong> ou superior.
              </p>
              <Button size="sm" className="mt-3 rounded-xl h-9 text-[13px] bg-amber-600 hover:bg-amber-700 text-white border-0" onClick={() => navigate("/empresa")}>
                Ver planos e fazer upgrade
              </Button>
            </div>
          </div>
        )}

        {!isOnePro && !loading && profStatus.length === 0 && (
          <div className="bg-card border border-border rounded-2xl p-8 text-center">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <UsersRound className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-[16px] font-semibold text-foreground mb-1">Cadastre seu primeiro profissional</h3>
            <p className="text-[13px] text-foreground/50 max-w-md mx-auto mb-4">
              Para montar sua equipe, comece cadastrando os profissionais com nome, comissão e serviços.
              Depois, vincule um perfil de acesso e convide-os.
            </p>
            <div className="flex flex-col items-center gap-2">
              <Button onClick={() => navigate("/gestao/profissionais")} className="rounded-xl h-10 text-[13px] gap-2">
                <UserPlus className="h-4 w-4" /> Cadastrar Profissional
              </Button>
            </div>
            <div className="mt-6 bg-muted/30 rounded-xl p-4 text-left max-w-sm mx-auto">
              <p className="text-[12px] font-semibold text-foreground/60 mb-2">Passo a passo:</p>
              <div className="space-y-2">
                <Step n={1} text="Cadastre o profissional (nome, comissão, serviços)" />
                <Step n={2} text="Crie e vincule um perfil de acesso" />
                <Step n={3} text="Convide para a equipe (e-mail ou link)" />
              </div>
            </div>
          </div>
        )}

        {profsReadyToInvite.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-[14px] font-semibold text-foreground/60 flex items-center gap-2">
              <UserPlus className="h-4 w-4" /> Prontos para convidar
            </h2>
            <div className="bg-card rounded-2xl border border-border divide-y divide-black/[0.04]">
              {profsReadyToInvite.map(prof => (
                <div key={prof.id} className="flex items-center gap-4 p-4">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-400/20 to-green-600/10 flex items-center justify-center text-green-600 font-semibold text-[13px] shrink-0">
                    {prof.fotoUrl
                      ? <img src={prof.fotoUrl} className="h-10 w-10 rounded-full object-cover" />
                      : prof.nomeExibicao.charAt(0).toUpperCase()
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-foreground truncate">{prof.nomeExibicao}</p>
                    <p className="text-[12px] text-foreground/40 flex items-center gap-1">
                      <Shield className="h-3 w-3" /> {prof.perfilAcesso?.descricao}
                      {prof.especialidade && <> · {prof.especialidade}</>}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="rounded-xl h-9 text-[13px] gap-1.5"
                    onClick={() => openInviteForProf(prof)}
                    disabled={isInviteFormOpen}
                  >
                    <Send className="h-3.5 w-3.5" /> Convidar
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {profsMissingPerfil.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-[14px] font-semibold text-foreground/60 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Profissionais sem perfil de acesso
            </h2>
            <div className="bg-card rounded-2xl border border-amber-200 divide-y divide-black/[0.04]">
              {profsMissingPerfil.map(prof => (
                <div key={prof.id} className="flex items-center gap-4 p-4">
                  <div className="h-10 w-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 font-semibold text-[13px] shrink-0">
                    {prof.fotoUrl
                      ? <img src={prof.fotoUrl} className="h-10 w-10 rounded-full object-cover" />
                      : prof.nomeExibicao.charAt(0).toUpperCase()
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-foreground truncate">{prof.nomeExibicao}</p>
                    <p className="text-[12px] text-amber-600">
                      Sem perfil de acesso — vincule um perfil para poder convidar
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl h-9 text-[13px] gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50"
                    onClick={() => navigate("/configuracoes/acessos")}
                  >
                    <Shield className="h-3.5 w-3.5" /> Vincular
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {isInviteFormOpen && (
          <div className="bg-card rounded-2xl border border-primary/20 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-semibold">
                {invitingProfId
                  ? `Convidar ${inviteNome}`
                  : "Novo Convite"
                }
              </h2>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={closeInviteForm}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <form onSubmit={handleInvite} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {!invitingProfId && (
                  <div>
                    <label className="text-[13px] font-medium text-foreground/60 mb-1.5 block">Nome (opcional)</label>
                    <Input
                      value={inviteNome}
                      onChange={e => setInviteNome(e.target.value)}
                      placeholder="Nome da pessoa"
                      className="rounded-xl h-10 text-[14px]"
                    />
                  </div>
                )}
                <div className={invitingProfId ? "col-span-full" : ""}>
                  <label className="text-[13px] font-medium text-foreground/60 mb-1.5 block">Email *</label>
                  <Input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                    className="rounded-xl h-10 text-[14px]"
                  />
                  <p className="text-[11px] text-foreground/30 mt-1">
                    O profissional usará este e-mail para fazer login no sistema
                  </p>
                </div>
              </div>

              {!invitingProfId && (
                <div>
                  <label className="text-[13px] font-medium text-foreground/60 mb-1.5 block">Cargo</label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => { setInviteRole("colaborador"); setInvitePerfilId(""); }}
                      className={cn(
                        "flex-1 px-4 py-2.5 rounded-xl border text-[13px] font-medium transition-all",
                        inviteRole === "colaborador"
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border text-foreground/50 hover:border-black/[0.12]"
                      )}
                    >
                      Profissional
                      <span className="block text-[11px] font-normal mt-0.5 opacity-60">Acesso definido pelo perfil</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setInviteRole("gerente"); setInvitePerfilId(""); }}
                      className={cn(
                        "flex-1 px-4 py-2.5 rounded-xl border text-[13px] font-medium transition-all",
                        inviteRole === "gerente"
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border text-foreground/50 hover:border-black/[0.12]"
                      )}
                    >
                      Gerente
                      <span className="block text-[11px] font-normal mt-0.5 opacity-60">Acesso completo ao sistema</span>
                    </button>
                  </div>
                </div>
              )}

              {inviteRole === "colaborador" && !invitingProfId && (
                <div>
                  <label className="text-[13px] font-medium text-foreground/60 mb-1.5 flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5" />
                    Perfil de Acesso <span className="text-red-500">*</span>
                  </label>
                  {webPerfis.length === 0 ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[13px] text-amber-800 font-medium">Nenhum perfil criado ainda</p>
                          <p className="text-[12px] text-amber-700 mt-0.5">
                            Crie um perfil de acesso antes de convidar. Você pode criar um perfil padrão "Colaborador básico" agora ou montar um personalizado.
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 pl-6">
                        <Button
                          type="button"
                          size="sm"
                          className="rounded-lg h-8 text-[12px] gap-1.5"
                          onClick={createDefaultColaboradorPerfil}
                          disabled={creatingDefaultPerfil}
                        >
                          {creatingDefaultPerfil ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Shield className="h-3.5 w-3.5" />}
                          {creatingDefaultPerfil ? "Criando..." : "Criar perfil 'Colaborador básico' agora"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="rounded-lg h-8 text-[12px]"
                          onClick={() => navigate("/configuracoes/acessos")}
                        >
                          Personalizar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <select
                      value={invitePerfilId}
                      onChange={e => setInvitePerfilId(e.target.value)}
                      required
                      className="w-full h-10 px-3 rounded-xl border border-border text-[14px] text-foreground/70 bg-card"
                    >
                      <option value="">Selecione um perfil de acesso...</option>
                      {webPerfis.map(p => (
                        <option key={p.id} value={p.id}>{p.descricao} ({p.permissoes.length} permissões)</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {invitingProfId && invitePerfilId && (
                <div className="bg-green-50 rounded-xl p-3 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-green-600 shrink-0" />
                  <p className="text-[13px] text-green-700">
                    Perfil de acesso: <strong>{perfis.find(p => String(p.id) === invitePerfilId)?.descricao || "Vinculado"}</strong>
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
                        : "border-border text-foreground/50 hover:border-black/[0.12]"
                    )}
                  >
                    <Mail className="h-4 w-4" /> Enviar por E-mail
                  </button>
                  <button
                    type="button"
                    onClick={() => setEnviarEmail(false)}
                    className={cn(
                      "flex-1 px-4 py-2.5 rounded-xl border text-[13px] font-medium transition-all flex items-center justify-center gap-2",
                      !enviarEmail
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border text-foreground/50 hover:border-black/[0.12]"
                    )}
                  >
                    <Copy className="h-4 w-4" /> Copiar Link
                  </button>
                </div>
                <p className="text-[11px] text-foreground/30 mt-1">
                  {enviarEmail
                    ? "Um e-mail será enviado automaticamente com o link do convite."
                    : "O link será gerado para você copiar e enviar manualmente pelo WhatsApp."}
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={closeInviteForm} className="rounded-xl h-10 text-[13px]">
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={submitting || (inviteRole === "colaborador" && !invitePerfilId)}
                  className="rounded-xl h-10 text-[13px] gap-2"
                >
                  <Send className="h-4 w-4" />
                  {submitting ? "Enviando..." : enviarEmail ? "Enviar Convite" : "Gerar Link"}
                </Button>
              </div>
            </form>
          </div>
        )}

        {pendingInvites.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-[14px] font-semibold text-foreground/60 flex items-center gap-2">
              <Mail className="h-4 w-4" /> Convites Pendentes
            </h2>
            <div className="bg-card rounded-2xl border border-border divide-y divide-black/[0.04]">
              {pendingInvites.map(invite => {
                const perfil = invite.perfilAcessoId ? perfis.find(p => p.id === invite.perfilAcessoId) : null;
                const linkedProf = invite.profissionalId ? profStatus.find(p => p.id === invite.profissionalId) : null;
                return (
                  <div key={invite.id} className="flex items-center gap-4 p-4">
                    <div className="h-10 w-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 shrink-0">
                      <Mail className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-medium text-foreground truncate flex items-center gap-2">
                        {invite.nomeConvidado || invite.email}
                        {new Date(invite.expiresAt) < new Date() && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 uppercase tracking-wide">Expirado</span>
                        )}
                      </p>
                      <p className="text-[12px] text-foreground/40">
                        {getRoleLabel(invite.role)}
                        {perfil && <> · <Shield className="h-3 w-3 inline" /> {perfil.descricao}</>}
                        {linkedProf && <> · <User className="h-3 w-3 inline" /> {linkedProf.nomeExibicao}</>}
                        {" "}· {new Date(invite.expiresAt) < new Date() ? "Expirou em" : "Expira em"} {new Date(invite.expiresAt).toLocaleDateString("pt-BR")}
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
                        {resendingId === invite.id ? "..." : "Reenviar"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-lg text-[12px] gap-1.5"
                        onClick={() => copyInviteLink(invite)}
                      >
                        {copiedToken === invite.id ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
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

        {members.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-[14px] font-semibold text-foreground/60 flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-green-500" /> Quem já tem acesso
            </h2>
            <div className="bg-card rounded-2xl border border-border divide-y divide-black/[0.04]">
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
                    {member.role === "dono" ? (
                      <span className="text-[12px] bg-primary/10 text-primary rounded-lg px-2.5 py-1.5 font-medium">Responsável</span>
                    ) : (
                      <>
                        <select
                          value={member.role}
                          onChange={e => handleUpdateRole(member.id, e.target.value)}
                          className="text-[12px] bg-muted/50 border-0 rounded-lg px-2.5 py-1.5 text-foreground/60 font-medium cursor-pointer"
                        >
                          <option value="colaborador">Profissional</option>
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
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!isOnePro && !loading && profStatus.length > 0 && profsReadyToInvite.length === 0 && profsMissingPerfil.length === 0 && pendingInvites.length === 0 && members.length === 0 && (
          <div className="bg-muted/20 border border-border rounded-2xl p-6 text-center">
            <p className="text-[14px] text-foreground/50">
              Todos os profissionais já estão com convite aceito ou aguardando configuração.
            </p>
          </div>
        )}

        {!isOnePro && hasTeamPlan && !loading && profStatus.length > 0 && (
          <div className="pt-2 border-t border-border/50">
            <div className="flex flex-wrap gap-3 justify-center">
              <Button
                variant="ghost"
                size="sm"
                className="rounded-xl h-9 text-[12px] text-foreground/40 gap-1.5"
                onClick={() => navigate("/gestao/profissionais")}
              >
                <UserPlus className="h-3.5 w-3.5" /> Cadastrar Profissional
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-xl h-9 text-[12px] text-foreground/40 gap-1.5"
                onClick={() => navigate("/configuracoes/acessos")}
              >
                <Shield className="h-3.5 w-3.5" /> Gerenciar Perfis de Acesso
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="h-5 w-5 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
        {n}
      </span>
      <span className="text-[12px] text-foreground/50">{text}</span>
    </div>
  );
}
