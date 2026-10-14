import React, { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { cn, apiUrl } from "@/lib/utils";
import { useLocation } from "wouter";
import {
  Plus,
  Pencil,
  Trash2,
  Shield,
  Users,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  Search,
  ChevronLeft,
  ArrowUpCircle,
} from "lucide-react";

const PLAN_PERFIL_LIMITS: Record<string, number> = {
  "1_pro": 0,
  "2_5_pro": 5,
  "6_15_pro": 15,
  "15_plus_pro": 999,
  "single": 999,
  "trial": 999,
};

const PLAN_LABELS: Record<string, string> = {
  "1_pro": "1 Profissional",
  "2_5_pro": "2 a 5 Profissionais",
  "6_15_pro": "6 a 15 Profissionais",
  "15_plus_pro": "15+ Profissionais",
};

const WEB_PERMISSION_GROUPS = [
  {
    label: "Principal",
    items: [
      { key: "dashboard", label: "Dashboard" },
      { key: "agenda", label: "Agenda" },
      { key: "agenda_picos", label: "Horários de Pico" },
      { key: "comandas", label: "Comandas" },
    ],
  },
  {
    label: "Cadastros",
    items: [
      { key: "clientes", label: "Clientes" },
      { key: "profissionais", label: "Profissionais" },
      { key: "servicos", label: "Serviços" },
      { key: "produtos", label: "Produtos" },
      { key: "tipos", label: "Tipos / Categorias" },
      { key: "cupons", label: "Cupons de Desconto" },
      { key: "mensagens", label: "Mensagens" },
      { key: "avaliacoes", label: "Avaliações" },
      { key: "clube", label: "Clube de Fidelidade" },
      { key: "clubes_assinatura", label: "Clubes de Assinatura" },
    ],
  },
  {
    label: "Pacotes",
    items: [
      { key: "pacotes", label: "Meus Pacotes" },
      { key: "venda_pacotes", label: "Venda de Pacotes" },
    ],
  },
  {
    label: "Relatórios",
    items: [
      { key: "relatorios", label: "Relatórios" },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { key: "caixa", label: "Caixa" },
      { key: "financeiro", label: "Financeiro" },
      { key: "comissoes", label: "Comissões" },
    ],
  },
  {
    label: "Operacional",
    items: [
      { key: "lista_espera", label: "Lista de Espera" },
      { key: "configuracoes", label: "Configurações" },
      { key: "empresa", label: "Meu Estúdio" },
      { key: "equipe", label: "Equipe" },
    ],
  },
  {
    label: "Usuário",
    items: [
      { key: "dados_usuario", label: "Dados Usuário" },
      { key: "senha_acesso", label: "Senha de Acesso" },
    ],
  },
];

const APP_PERMISSION_GROUPS = [
  {
    label: "Principal",
    items: [
      { key: "app_dashboard", label: "Dashboard Profissional" },
      { key: "app_agenda", label: "Agenda" },
      { key: "app_comandas", label: "Comandas" },
    ],
  },
  {
    label: "Cadastros",
    items: [
      { key: "app_clientes", label: "Clientes" },
      { key: "app_servicos", label: "Serviços" },
      { key: "app_produtos", label: "Produtos" },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { key: "app_caixa", label: "Caixa" },
      { key: "app_comissoes", label: "Comissões" },
    ],
  },
  {
    label: "Marketing",
    items: [
      { key: "app_rede_social", label: "Rede Social" },
      { key: "app_divulgacao", label: "Divulgação" },
    ],
  },
  {
    label: "Outros",
    items: [
      { key: "app_ajuda", label: "Ajuda" },
      { key: "app_videos_tutoriais", label: "Vídeos Tutoriais" },
      { key: "app_documentos", label: "Documentos" },
      { key: "app_tap_to_pay", label: "Tap to Pay" },
    ],
  },
];

function getGroupsForTipo(tipo: string) {
  return tipo === "app" ? APP_PERMISSION_GROUPS : WEB_PERMISSION_GROUPS;
}

function getAllPermsForTipo(tipo: string) {
  return getGroupsForTipo(tipo).flatMap(g => g.items.map(i => i.key));
}

const ALL_PERMISSION_ITEMS = [...WEB_PERMISSION_GROUPS, ...APP_PERMISSION_GROUPS].flatMap(g => g.items);

type Perfil = {
  id: number;
  descricao: string;
  tipo: string;
  permissoes: string[];
  ativo: boolean;
  profissionais: { id: number; nome: string }[];
  createdAt: string;
  updatedAt: string;
};

type Profissional = {
  id: number;
  nomeExibicao: string;
};

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

export default function PerfisAcesso() {
  const { barbeariaId, role, user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const rawPlan = ((user as any)?.barbearia?.subscriptionPlan || (user as any)?.barbearia?.planoNome || "").toLowerCase().replace(/\s+/g, "_");
  const isTrial = (user as any)?.barbearia?.subscriptionStatus === "trial";
  const isOnePro = rawPlan === "1_pro" && !isTrial;
  const perfilLimit = isTrial ? 999 : (PLAN_PERFIL_LIMITS[rawPlan] ?? (rawPlan ? 0 : 999));
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo] = useState("web");
  const [permissoes, setPermissoes] = useState<string[]>([]);
  const [selectedProfIds, setSelectedProfIds] = useState<number[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  const [activeTab, setActiveTab] = useState<"web" | "app">("web");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    if (barbeariaId) {
      loadPerfis();
      loadProfissionais();
    }
  }, [barbeariaId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery]);

  const filteredPerfis = useMemo(() => {
    let filtered = perfis.filter(p => p.tipo === activeTab);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.descricao.toLowerCase().includes(q) ||
        p.profissionais.some(pr => pr.nome.toLowerCase().includes(q))
      );
    }
    return filtered;
  }, [perfis, activeTab, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredPerfis.length / pageSize));
  const paginatedPerfis = filteredPerfis.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  async function loadPerfis() {
    try {
      setLoading(true);
      const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/perfis-acesso`), { credentials: "include" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPerfis(data);
    } catch {
      toast({ title: "Erro ao carregar perfis", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function loadProfissionais() {
    try {
      const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/profissionais`), { credentials: "include" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setProfissionais(data);
    } catch {}
  }

  function resetForm() {
    setShowForm(false);
    setEditingId(null);
    setDescricao("");
    setTipo(activeTab);
    setPermissoes([]);
    setSelectedProfIds([]);
    setExpandedGroups({});
  }

  function startEdit(perfil: Perfil) {
    setEditingId(perfil.id);
    setDescricao(perfil.descricao);
    setTipo(perfil.tipo);
    setPermissoes(perfil.permissoes);
    setSelectedProfIds(perfil.profissionais.map(p => p.id));
    setShowForm(true);
    const groups: Record<string, boolean> = {};
    getGroupsForTipo(perfil.tipo).forEach(g => { groups[g.label] = true; });
    setExpandedGroups(groups);
  }

  function startNew() {
    resetForm();
    setTipo(activeTab);
    setShowForm(true);
    const groups: Record<string, boolean> = {};
    getGroupsForTipo(activeTab).forEach(g => { groups[g.label] = true; });
    setExpandedGroups(groups);
  }

  function togglePermission(key: string) {
    setPermissoes(prev =>
      prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]
    );
  }

  function toggleGroup(groupLabel: string) {
    const groups = getGroupsForTipo(tipo);
    const groupItems = groups.find(g => g.label === groupLabel)?.items.map(i => i.key) || [];
    const allSelected = groupItems.every(k => permissoes.includes(k));
    if (allSelected) {
      setPermissoes(prev => prev.filter(p => !groupItems.includes(p)));
    } else {
      setPermissoes(prev => [...new Set([...prev, ...groupItems])]);
    }
  }

  function toggleAllPermissions() {
    const allPerms = getAllPermsForTipo(tipo);
    if (allPerms.every(k => permissoes.includes(k))) {
      setPermissoes(prev => prev.filter(p => !allPerms.includes(p)));
    } else {
      setPermissoes(prev => [...new Set([...prev, ...allPerms])]);
    }
  }

  function toggleProfissional(id: number) {
    setSelectedProfIds(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  }

  async function handleSave() {
    if (!descricao.trim()) {
      toast({ title: "Informe a descrição do perfil", variant: "destructive" });
      return;
    }
    if (permissoes.length === 0) {
      toast({ title: "Selecione ao menos uma permissão", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const body = { descricao, tipo, permissoes, profissionalIds: selectedProfIds };
      const url = editingId
        ? apiUrl(`/barbearias/${barbeariaId}/perfis-acesso/${editingId}`)
        : apiUrl(`/barbearias/${barbeariaId}/perfis-acesso`);
      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      toast({ title: editingId ? "Perfil atualizado" : "Perfil criado" });
      resetForm();
      loadPerfis();
    } catch {
      toast({ title: "Erro ao salvar perfil", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Excluir este perfil de acesso?")) return;
    try {
      const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/perfis-acesso/${id}`), {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      toast({ title: "Perfil excluído" });
      loadPerfis();
    } catch {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    }
  }

  if (role !== "dono" && role !== "gerente") {
    return (
      <AppLayout>
        <div className="text-center py-20 text-foreground/40">Sem permissão para acessar esta página.</div>
      </AppLayout>
    );
  }

  const currentGroups = getGroupsForTipo(tipo);
  const totalPerfilCount = perfis.length;
  const atLimit = perfilLimit !== 999 && totalPerfilCount >= perfilLimit;

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-[22px] font-bold text-foreground tracking-tight">Perfis de acesso</h1>
            <p className="text-[13px] text-foreground/45 mt-1">O que gerentes e profissionais podem ver e fazer no painel</p>
          </div>
          {role === "dono" && !showForm && !isOnePro && (
            <div className="flex items-center gap-3">
              {perfilLimit !== 999 && (
                <span className={cn(
                  "text-[12px] font-medium px-2.5 py-1 rounded-lg",
                  atLimit ? "bg-red-50 text-red-600" : "bg-muted text-foreground/50"
                )}>
                  {totalPerfilCount}/{perfilLimit} perfis
                </span>
              )}
              <Button onClick={startNew} disabled={atLimit} className="rounded-xl h-9 text-[13px] gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Novo Perfil
              </Button>
            </div>
          )}
        </div>

        {isOnePro && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex gap-4">
            <div className="shrink-0 h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <ArrowUpCircle className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-amber-900">Plano não permite perfis de acesso</p>
              <p className="text-[13px] text-amber-700 mt-0.5">
                O plano <strong>{PLAN_LABELS[rawPlan] || rawPlan}</strong> é para uso individual e não inclui gerenciamento de equipe.
                Faça upgrade para o plano <strong>2 a 5 Profissionais</strong> ou superior para criar perfis e adicionar colaboradores.
              </p>
              <Button
                size="sm"
                className="mt-3 rounded-xl h-9 text-[13px] bg-amber-600 hover:bg-amber-700 text-white border-0"
                onClick={() => navigate("/empresa")}
              >
                Ver planos e fazer upgrade
              </Button>
            </div>
          </div>
        )}

        {atLimit && !isOnePro && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-start gap-3">
            <ArrowUpCircle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-[13px] font-semibold text-orange-900">Limite de perfis atingido</p>
              <p className="text-[12px] text-orange-700 mt-0.5">
                Você atingiu o limite de <strong>{perfilLimit} perfis</strong> do seu plano. Faça upgrade para adicionar mais.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-2 rounded-xl h-8 text-[12px] border-orange-300 text-orange-700 hover:bg-orange-50"
                onClick={() => navigate("/empresa")}
              >
                Fazer upgrade
              </Button>
            </div>
          </div>
        )}

        {!showForm && (
          <>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex bg-card border border-border rounded-xl overflow-hidden">
                <button
                  onClick={() => setActiveTab("web")}
                  className={cn(
                    "px-5 py-2 text-[13px] font-medium transition-all",
                    activeTab === "web"
                      ? "bg-foreground text-white"
                      : "text-foreground/50 hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  Web Admin
                </button>
                <button
                  onClick={() => setActiveTab("app")}
                  className={cn(
                    "px-5 py-2 text-[13px] font-medium transition-all",
                    activeTab === "app"
                      ? "bg-foreground text-white"
                      : "text-foreground/50 hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  App Profissionais
                </button>
              </div>

              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground/30" />
                <Input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Buscar perfil..."
                  className="rounded-xl h-9 pl-9 text-[13px]"
                />
              </div>
            </div>
          </>
        )}

        {showForm && (
          <div className="bg-card rounded-2xl border border-border p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-semibold text-foreground">
                {editingId ? "Editar Perfil" : "Novo Perfil de Acesso"}
              </h2>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={resetForm}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-[13px]">Descrição</Label>
                <Input
                  value={descricao}
                  onChange={e => setDescricao(e.target.value)}
                  placeholder="Ex: Gerente Financeiro"
                  className="rounded-xl h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px]">Tipo</Label>
                <div className="flex gap-2">
                  {(["web", "app"] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => {
                        setTipo(t);
                        setPermissoes([]);
                        const groups: Record<string, boolean> = {};
                        getGroupsForTipo(t).forEach(g => { groups[g.label] = true; });
                        setExpandedGroups(groups);
                      }}
                      className={cn(
                        "px-4 py-2 rounded-xl text-[13px] font-medium border transition-all",
                        tipo === t
                          ? "bg-foreground text-white border-foreground"
                          : "bg-card text-foreground/50 border-border hover:border-black/[0.15]"
                      )}
                    >
                      {t === "web" ? "Web Admin" : "App"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-[13px] font-semibold">Permissões ({tipo === "web" ? "Web Admin" : "App"})</Label>
                <button
                  onClick={toggleAllPermissions}
                  className="text-[12px] text-primary hover:underline"
                >
                  {getAllPermsForTipo(tipo).every(k => permissoes.includes(k)) ? "Desmarcar tudo" : "Selecionar tudo"}
                </button>
              </div>

              <div className="space-y-2">
                {currentGroups.map(group => {
                  const groupKeys = group.items.map(i => i.key);
                  const allChecked = groupKeys.every(k => permissoes.includes(k));
                  const someChecked = groupKeys.some(k => permissoes.includes(k));
                  const expanded = expandedGroups[group.label] !== false;

                  return (
                    <div key={group.label} className="border border-border rounded-xl overflow-hidden">
                      <button
                        className="w-full flex items-center gap-3 px-4 py-2.5 bg-muted/50 hover:bg-muted/50 transition-colors"
                        onClick={() => setExpandedGroups(prev => ({ ...prev, [group.label]: !expanded }))}
                      >
                        {expanded ? <ChevronDown className="h-3.5 w-3.5 text-foreground/30" /> : <ChevronRight className="h-3.5 w-3.5 text-foreground/30" />}
                        <span className="text-[13px] font-medium text-foreground flex-1 text-left">{group.label}</span>
                        <span
                          role="checkbox"
                          tabIndex={0}
                          onClick={e => { e.stopPropagation(); toggleGroup(group.label); }}
                          onKeyDown={e => { if (e.key === " " || e.key === "Enter") { e.stopPropagation(); toggleGroup(group.label); } }}
                          className={cn(
                            "h-5 w-5 rounded-md border flex items-center justify-center transition-colors cursor-pointer",
                            allChecked
                              ? "bg-foreground border-foreground"
                              : someChecked
                              ? "bg-foreground/20 border-foreground/30"
                              : "border-black/[0.15] bg-card"
                          )}
                        >
                          {allChecked && <Check className="h-3 w-3 text-white" />}
                          {someChecked && !allChecked && <div className="h-1.5 w-1.5 bg-foreground rounded-sm" />}
                        </span>
                      </button>
                      {expanded && (
                        <div className="px-4 py-2 space-y-1 bg-card">
                          {group.items.map(item => (
                            <div
                              key={item.key}
                              role="checkbox"
                              tabIndex={0}
                              aria-checked={permissoes.includes(item.key)}
                              onClick={() => togglePermission(item.key)}
                              onKeyDown={e => { if (e.key === " " || e.key === "Enter") togglePermission(item.key); }}
                              className="flex items-center gap-3 py-1.5 cursor-pointer hover:bg-muted/50 px-2 rounded-lg"
                            >
                              <span
                                className={cn(
                                  "h-[18px] w-[18px] rounded-md border flex items-center justify-center transition-colors shrink-0",
                                  permissoes.includes(item.key)
                                    ? "bg-primary border-primary"
                                    : "border-black/[0.15] bg-card"
                                )}
                              >
                                {permissoes.includes(item.key) && <Check className="h-3 w-3 text-white" />}
                              </span>
                              <span className="text-[13px] text-foreground/70">{item.label}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-[13px] font-semibold">Vincular Profissionais</Label>
              <p className="text-[12px] text-foreground/40">Gestores (gerentes) não estarão na lista abaixo, pois já possuem acesso completo pelo cargo.</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {profissionais.map(prof => (
                  <div
                    key={prof.id}
                    role="checkbox"
                    tabIndex={0}
                    aria-checked={selectedProfIds.includes(prof.id)}
                    onClick={() => toggleProfissional(prof.id)}
                    onKeyDown={e => { if (e.key === " " || e.key === "Enter") toggleProfissional(prof.id); }}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                      selectedProfIds.includes(prof.id)
                        ? "border-primary/30 bg-primary/[0.03]"
                        : "border-border hover:border-black/[0.12]"
                    )}
                  >
                    <span
                      className={cn(
                        "h-[18px] w-[18px] rounded-md border flex items-center justify-center transition-colors shrink-0",
                        selectedProfIds.includes(prof.id)
                          ? "bg-primary border-primary"
                          : "border-black/[0.15] bg-card"
                      )}
                    >
                      {selectedProfIds.includes(prof.id) && <Check className="h-3 w-3 text-white" />}
                    </span>
                    <span className="text-[13px] text-foreground">{prof.nomeExibicao}</span>
                  </div>
                ))}
                {profissionais.length === 0 && (
                  <p className="text-[13px] text-foreground/35 col-span-2">Nenhum profissional cadastrado</p>
                )}
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <Button variant="outline" onClick={resetForm} className="rounded-xl h-9 text-[13px]">Cancelar</Button>
              <Button onClick={handleSave} disabled={saving} className="rounded-xl h-9 text-[13px] gap-1.5">
                {saving ? "Salvando..." : editingId ? "Salvar Alterações" : "Criar Perfil"}
              </Button>
            </div>
          </div>
        )}

        {!showForm && (
          <>
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
              </div>
            ) : filteredPerfis.length === 0 ? (
              <div className="bg-card rounded-2xl border border-border p-12 text-center">
                <Shield className="h-10 w-10 text-foreground/15 mx-auto mb-4" />
                <h3 className="text-[15px] font-semibold text-foreground mb-1">
                  {searchQuery ? "Nenhum perfil encontrado" : `Nenhum perfil ${activeTab === "web" ? "Web Admin" : "App"} criado`}
                </h3>
                <p className="text-[13px] text-foreground/40 mb-5">
                  {searchQuery
                    ? "Tente buscar com outros termos"
                    : "Crie perfis para controlar quais menus cada colaborador ou gerente pode acessar"}
                </p>
                {role === "dono" && !searchQuery && (
                  <Button onClick={startNew} className="rounded-xl h-9 text-[13px] gap-1.5">
                    <Plus className="h-3.5 w-3.5" /> Criar Primeiro Perfil
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="bg-card rounded-2xl border border-border overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-5 py-3 text-[12px] font-semibold text-foreground/40 uppercase tracking-wider">Perfil</th>
                        <th className="text-left px-5 py-3 text-[12px] font-semibold text-foreground/40 uppercase tracking-wider hidden sm:table-cell">Permissões</th>
                        <th className="text-left px-5 py-3 text-[12px] font-semibold text-foreground/40 uppercase tracking-wider hidden md:table-cell">Profissionais</th>
                        {role === "dono" && (
                          <th className="text-right px-5 py-3 text-[12px] font-semibold text-foreground/40 uppercase tracking-wider w-24">Ações</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedPerfis.map((perfil, idx) => (
                        <tr
                          key={perfil.id}
                          className={cn(
                            "transition-colors hover:bg-muted/50",
                            idx < paginatedPerfis.length - 1 && "border-b border-border"
                          )}
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-lg bg-primary/[0.06] flex items-center justify-center shrink-0">
                                <Shield className="h-3.5 w-3.5 text-primary" />
                              </div>
                              <div>
                                <p className="text-[13px] font-medium text-foreground">{perfil.descricao}</p>
                                <p className="text-[11px] text-foreground/35 sm:hidden">
                                  {perfil.permissoes.length} permissões
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 hidden sm:table-cell">
                            <div className="flex flex-wrap gap-1">
                              {perfil.permissoes.slice(0, 4).map(p => {
                                const item = ALL_PERMISSION_ITEMS.find(i => i.key === p);
                                return (
                                  <span key={p} className="px-2 py-0.5 rounded-md bg-primary/[0.06] text-primary text-[10px] font-medium">
                                    {item?.label || p}
                                  </span>
                                );
                              })}
                              {perfil.permissoes.length > 4 && (
                                <span className="px-2 py-0.5 rounded-md bg-muted/50 text-foreground/35 text-[10px] font-medium">
                                  +{perfil.permissoes.length - 4}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 hidden md:table-cell">
                            {perfil.profissionais.length > 0 ? (
                              <div className="flex items-center gap-1.5">
                                <Users className="h-3 w-3 text-foreground/25 shrink-0" />
                                <span className="text-[12px] text-foreground/50 truncate max-w-[200px]">
                                  {perfil.profissionais.map(p => p.nome).join(", ")}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[12px] text-foreground/25">—</span>
                            )}
                          </td>
                          {role === "dono" && (
                            <td className="px-5 py-3.5 text-right">
                              <div className="flex gap-1 justify-end">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(perfil)}>
                                  <Pencil className="h-3 w-3 text-foreground/40" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(perfil.id)}>
                                  <Trash2 className="h-3 w-3 text-red-400" />
                                </Button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <p className="text-[12px] text-foreground/35">
                      {filteredPerfis.length} perfil(is)
                      {totalPages > 1 && <> · Página {currentPage} de {totalPages}</>}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[12px] text-foreground/35">Exibir</span>
                      <select
                        value={pageSize}
                        onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                        className="h-7 px-2 rounded-lg border border-border bg-card text-[12px] text-foreground/60"
                      >
                        {PAGE_SIZE_OPTIONS.map(n => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                      <span className="text-[12px] text-foreground/35">por página</span>
                    </div>
                  </div>
                  {totalPages > 1 && (
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-lg"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-lg"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
