import React, { useState, useEffect } from "react";
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
} from "lucide-react";

const PERMISSION_GROUPS = [
  {
    label: "Principal",
    items: [
      { key: "dashboard", label: "Dashboard" },
      { key: "agenda", label: "Agenda" },
      { key: "agenda_picos", label: "Horários de Pico" },
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
];

const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap(g => g.items.map(i => i.key));

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

  useEffect(() => {
    if (barbeariaId) {
      loadPerfis();
      loadProfissionais();
    }
  }, [barbeariaId]);

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
    } catch {
    }
  }

  function resetForm() {
    setShowForm(false);
    setEditingId(null);
    setDescricao("");
    setTipo("web");
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
    PERMISSION_GROUPS.forEach(g => { groups[g.label] = true; });
    setExpandedGroups(groups);
  }

  function startNew() {
    resetForm();
    setShowForm(true);
    const groups: Record<string, boolean> = {};
    PERMISSION_GROUPS.forEach(g => { groups[g.label] = true; });
    setExpandedGroups(groups);
  }

  function togglePermission(key: string) {
    setPermissoes(prev =>
      prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]
    );
  }

  function toggleGroup(groupLabel: string) {
    const groupItems = PERMISSION_GROUPS.find(g => g.label === groupLabel)?.items.map(i => i.key) || [];
    const allSelected = groupItems.every(k => permissoes.includes(k));
    if (allSelected) {
      setPermissoes(prev => prev.filter(p => !groupItems.includes(p)));
    } else {
      setPermissoes(prev => [...new Set([...prev, ...groupItems])]);
    }
  }

  function toggleAllPermissions() {
    if (permissoes.length === ALL_PERMISSIONS.length) {
      setPermissoes([]);
    } else {
      setPermissoes([...ALL_PERMISSIONS]);
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

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
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
                  {["web", "app"].map(t => (
                    <button
                      key={t}
                      onClick={() => setTipo(t)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-[13px] font-medium border transition-all",
                        tipo === t
                          ? "bg-foreground text-white border-foreground"
                          : "bg-white text-foreground/50 border-black/[0.08] hover:border-black/[0.15]"
                      )}
                    >
                      {t === "web" ? "Web" : "App"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-[13px] font-semibold">Permissões</Label>
                <button
                  onClick={toggleAllPermissions}
                  className="text-[12px] text-primary hover:underline"
                >
                  {permissoes.length === ALL_PERMISSIONS.length ? "Desmarcar tudo" : "Selecionar tudo"}
                </button>
              </div>

              <div className="space-y-2">
                {PERMISSION_GROUPS.map(group => {
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
                        <button
                          onClick={e => { e.stopPropagation(); toggleGroup(group.label); }}
                          className={cn(
                            "h-5 w-5 rounded-md border flex items-center justify-center transition-colors",
                            allChecked
                              ? "bg-foreground border-foreground"
                              : someChecked
                              ? "bg-foreground/20 border-foreground/30"
                              : "border-black/[0.15] bg-white"
                          )}
                        >
                          {allChecked && <Check className="h-3 w-3 text-white" />}
                          {someChecked && !allChecked && <div className="h-1.5 w-1.5 bg-foreground rounded-sm" />}
                        </button>
                      </button>
                      {expanded && (
                        <div className="px-4 py-2 space-y-1 bg-white">
                          {group.items.map(item => (
                            <label key={item.key} className="flex items-center gap-3 py-1.5 cursor-pointer hover:bg-black/[0.01] px-2 rounded-lg">
                              <button
                                onClick={() => togglePermission(item.key)}
                                className={cn(
                                  "h-4.5 w-4.5 rounded-md border flex items-center justify-center transition-colors shrink-0",
                                  permissoes.includes(item.key)
                                    ? "bg-primary border-primary"
                                    : "border-black/[0.15] bg-white"
                                )}
                              >
                                {permissoes.includes(item.key) && <Check className="h-3 w-3 text-white" />}
                              </button>
                              <span className="text-[13px] text-foreground/70">{item.label}</span>
                            </label>
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
                  <label
                    key={prof.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                      selectedProfIds.includes(prof.id)
                        ? "border-primary/30 bg-primary/[0.03]"
                        : "border-black/[0.06] hover:border-black/[0.12]"
                    )}
                  >
                    <button
                      onClick={() => toggleProfissional(prof.id)}
                      className={cn(
                        "h-4.5 w-4.5 rounded-md border flex items-center justify-center transition-colors shrink-0",
                        selectedProfIds.includes(prof.id)
                          ? "bg-primary border-primary"
                          : "border-black/[0.15] bg-white"
                      )}
                    >
                      {selectedProfIds.includes(prof.id) && <Check className="h-3 w-3 text-white" />}
                    </button>
                    <span className="text-[13px] text-foreground">{prof.nomeExibicao}</span>
                  </label>
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

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
          </div>
        ) : perfis.length === 0 && !showForm ? (
          <div className="bg-white rounded-2xl border border-black/[0.06] p-12 text-center">
            <Shield className="h-10 w-10 text-foreground/15 mx-auto mb-4" />
            <h3 className="text-[15px] font-semibold text-foreground mb-1">Nenhum perfil de acesso criado</h3>
            <p className="text-[13px] text-foreground/40 mb-5">
              Crie perfis para controlar quais menus cada colaborador ou gerente pode acessar
            </p>
            {role === "dono" && (
              <Button onClick={startNew} className="rounded-xl h-9 text-[13px] gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Criar Primeiro Perfil
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {perfis.map(perfil => (
              <div key={perfil.id} className="bg-white rounded-2xl border border-black/[0.06] p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-primary/[0.06] flex items-center justify-center">
                      <Shield className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-[14px] font-semibold text-foreground">{perfil.descricao}</h3>
                      <p className="text-[12px] text-foreground/35">
                        {perfil.tipo === "web" ? "Web" : "App"} · {perfil.permissoes.length} permissões
                      </p>
                    </div>
                  </div>
                  {role === "dono" && (
                    <div className="flex gap-1.5">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(perfil)}>
                        <Pencil className="h-3.5 w-3.5 text-foreground/40" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(perfil.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-red-400" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  {perfil.permissoes.slice(0, 8).map(p => {
                    const item = PERMISSION_GROUPS.flatMap(g => g.items).find(i => i.key === p);
                    return (
                      <span key={p} className="px-2.5 py-1 rounded-lg bg-primary/[0.06] text-primary text-[11px] font-medium">
                        {item?.label || p}
                      </span>
                    );
                  })}
                  {perfil.permissoes.length > 8 && (
                    <span className="px-2.5 py-1 rounded-lg bg-black/[0.03] text-foreground/35 text-[11px] font-medium">
                      +{perfil.permissoes.length - 8} mais
                    </span>
                  )}
                </div>

                {perfil.profissionais.length > 0 && (
                  <div className="flex items-center gap-2 pt-2 border-t border-black/[0.04]">
                    <Users className="h-3.5 w-3.5 text-foreground/25" />
                    <span className="text-[12px] text-foreground/40">
                      {perfil.profissionais.map(p => p.nome).join(", ")}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
