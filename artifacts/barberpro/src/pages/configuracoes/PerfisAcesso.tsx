import React, { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { cn, apiUrl } from "@/lib/utils";
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
} from "lucide-react";

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
      { key: "lembretes", label: "Lembretes" },
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

const ITEMS_PER_PAGE = 10;

export default function PerfisAcesso() {
  const { barbeariaId, role } = useAuth();
  const { toast } = useToast();
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

  const totalPages = Math.max(1, Math.ceil(filteredPerfis.length / ITEMS_PER_PAGE));
  const paginatedPerfis = filteredPerfis.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
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

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-[22px] font-bold text-foreground tracking-tight">Perfis de Acesso</h1>
            <p className="text-[13px] text-foreground/45 mt-1">Controle granular de permissões por menu para gerentes e colaboradores</p>
          </div>
          {role === "dono" && !showForm && (
            <Button onClick={startNew} className="rounded-xl h-9 text-[13px] gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Novo Perfil
            </Button>
          )}
        </div>

        {!showForm && (
          <>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex bg-white border border-black/[0.06] rounded-xl overflow-hidden">
                <button
                  onClick={() => setActiveTab("web")}
                  className={cn(
                    "px-5 py-2 text-[13px] font-medium transition-all",
                    activeTab === "web"
                      ? "bg-foreground text-white"
                      : "text-foreground/50 hover:text-foreground hover:bg-black/[0.02]"
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
                      : "text-foreground/50 hover:text-foreground hover:bg-black/[0.02]"
                  )}
                >
                  App
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
          <div className="bg-white rounded-2xl border border-black/[0.06] p-6 space-y-5">
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
                          : "bg-white text-foreground/50 border-black/[0.08] hover:border-black/[0.15]"
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
                    <div key={group.label} className="border border-black/[0.06] rounded-xl overflow-hidden">
                      <button
                        className="w-full flex items-center gap-3 px-4 py-2.5 bg-black/[0.01] hover:bg-black/[0.03] transition-colors"
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
                              : "border-black/[0.15] bg-white"
                          )}
                        >
                          {allChecked && <Check className="h-3 w-3 text-white" />}
                          {someChecked && !allChecked && <div className="h-1.5 w-1.5 bg-foreground rounded-sm" />}
                        </span>
                      </button>
                      {expanded && (
                        <div className="px-4 py-2 space-y-1 bg-white">
                          {group.items.map(item => (
                            <div
                              key={item.key}
                              role="checkbox"
                              tabIndex={0}
                              aria-checked={permissoes.includes(item.key)}
                              onClick={() => togglePermission(item.key)}
                              onKeyDown={e => { if (e.key === " " || e.key === "Enter") togglePermission(item.key); }}
                              className="flex items-center gap-3 py-1.5 cursor-pointer hover:bg-black/[0.01] px-2 rounded-lg"
                            >
                              <span
                                className={cn(
                                  "h-[18px] w-[18px] rounded-md border flex items-center justify-center transition-colors shrink-0",
                                  permissoes.includes(item.key)
                                    ? "bg-primary border-primary"
                                    : "border-black/[0.15] bg-white"
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
                        : "border-black/[0.06] hover:border-black/[0.12]"
                    )}
                  >
                    <span
                      className={cn(
                        "h-[18px] w-[18px] rounded-md border flex items-center justify-center transition-colors shrink-0",
                        selectedProfIds.includes(prof.id)
                          ? "bg-primary border-primary"
                          : "border-black/[0.15] bg-white"
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
              <div className="bg-white rounded-2xl border border-black/[0.06] p-12 text-center">
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
                <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-black/[0.04]">
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
                            "transition-colors hover:bg-black/[0.01]",
                            idx < paginatedPerfis.length - 1 && "border-b border-black/[0.04]"
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
                                <span className="px-2 py-0.5 rounded-md bg-black/[0.03] text-foreground/35 text-[10px] font-medium">
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

                {totalPages > 1 && (
                  <div className="flex items-center justify-between">
                    <p className="text-[12px] text-foreground/35">
                      {filteredPerfis.length} perfil(is) · Página {currentPage} de {totalPages}
                    </p>
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
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
