import React, { useState, useEffect, useRef, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ImageUpload } from "@/components/ImageUpload";
import {
  FileText, Plus, Pencil, Trash2, ListPlus, Search, ChevronLeft,
  AlertTriangle, Camera, ClipboardCheck, Clock, User, Calendar,
  Heart, Shield, Image as ImageIcon, X, Check, GripVertical,
  ChevronDown, ChevronUp, Loader2, PenTool, Eye,
} from "lucide-react";

const BASE_URL = import.meta.env.BASE_URL;

const FIELD_TYPES = [
  { value: "texto", label: "Texto curto" },
  { value: "textarea", label: "Texto longo" },
  { value: "boolean", label: "Sim / Não" },
  { value: "select", label: "Seleção única" },
  { value: "multiselect", label: "Seleção múltipla" },
  { value: "numero", label: "Número" },
  { value: "data", label: "Data" },
  { value: "escala", label: "Escala (1-10)" },
];

interface FormField {
  label: string;
  tipo: string;
  obrigatorio?: boolean;
  opcoes?: string[];
  placeholder?: string;
}

function api(path: string, opts?: RequestInit) {
  return fetch(`${BASE_URL}api${path}`, { credentials: "include", ...opts });
}

function apiJson(path: string, method: string, body: any) {
  return api(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ===== FORMULÁRIOS DE ANAMNESE (Config) =====
export function AnamneseFormularios() {
  const { barbeariaId } = useAuth();
  const { toast } = useToast();
  const [tipos, setTipos] = useState<any[]>([]);
  const [formularios, setFormularios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showTipoForm, setShowTipoForm] = useState(false);
  const [editTipoId, setEditTipoId] = useState<number | null>(null);
  const [tipoForm, setTipoForm] = useState({ nome: "", descricao: "", ativo: true });

  const [showFormBuilder, setShowFormBuilder] = useState(false);
  const [editFormId, setEditFormId] = useState<number | null>(null);
  const [formBuilder, setFormBuilder] = useState<{
    titulo: string; tipoId: string; ativo: boolean; campos: FormField[];
  }>({ titulo: "", tipoId: "", ativo: true, campos: [] });

  useEffect(() => {
    if (barbeariaId) { fetchTipos(); fetchFormularios(); }
  }, [barbeariaId]);

  const fetchTipos = async () => {
    const res = await api(`/barbearias/${barbeariaId}/anamnese/tipos`);
    if (res.ok) setTipos(await res.json());
  };

  const fetchFormularios = async () => {
    const res = await api(`/barbearias/${barbeariaId}/anamnese/formularios`);
    if (res.ok) setFormularios(await res.json());
    setLoading(false);
  };

  const saveTipo = async () => {
    if (!tipoForm.nome.trim()) return toast({ title: "Informe o nome", variant: "destructive" });
    const url = `/barbearias/${barbeariaId}/anamnese/tipos${editTipoId ? `/${editTipoId}` : ""}`;
    const res = await apiJson(url, editTipoId ? "PUT" : "POST", tipoForm);
    if (res.ok) {
      toast({ title: "Tipo salvo!" });
      setShowTipoForm(false);
      setEditTipoId(null);
      setTipoForm({ nome: "", descricao: "", ativo: true });
      fetchTipos();
    }
  };

  const removeTipo = async (id: number) => {
    if (!confirm("Excluir este tipo?")) return;
    await api(`/barbearias/${barbeariaId}/anamnese/tipos/${id}`, { method: "DELETE" });
    fetchTipos();
  };

  const addField = () => {
    setFormBuilder(f => ({
      ...f,
      campos: [...f.campos, { label: "", tipo: "texto", obrigatorio: false }],
    }));
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    setFormBuilder(f => ({
      ...f,
      campos: f.campos.map((c, i) => i === index ? { ...c, ...updates } : c),
    }));
  };

  const removeField = (index: number) => {
    setFormBuilder(f => ({ ...f, campos: f.campos.filter((_, i) => i !== index) }));
  };

  const moveField = (index: number, direction: "up" | "down") => {
    setFormBuilder(f => {
      const campos = [...f.campos];
      const newIndex = direction === "up" ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= campos.length) return f;
      [campos[index], campos[newIndex]] = [campos[newIndex], campos[index]];
      return { ...f, campos };
    });
  };

  const saveFormulario = async () => {
    if (!formBuilder.titulo.trim()) return toast({ title: "Informe o título", variant: "destructive" });
    const validCampos = formBuilder.campos.filter(c => c.label.trim());
    if (validCampos.length === 0) return toast({ title: "Adicione pelo menos 1 campo", variant: "destructive" });
    const url = `/barbearias/${barbeariaId}/anamnese/formularios${editFormId ? `/${editFormId}` : ""}`;
    const res = await apiJson(url, editFormId ? "PUT" : "POST", {
      titulo: formBuilder.titulo,
      tipoId: formBuilder.tipoId ? parseInt(formBuilder.tipoId) : null,
      campos: validCampos,
      ativo: formBuilder.ativo,
    });
    if (res.ok) {
      toast({ title: "Formulário salvo!" });
      setShowFormBuilder(false);
      setEditFormId(null);
      setFormBuilder({ titulo: "", tipoId: "", ativo: true, campos: [] });
      fetchFormularios();
    }
  };

  const removeFormulario = async (id: number) => {
    if (!confirm("Excluir este formulário?")) return;
    await api(`/barbearias/${barbeariaId}/anamnese/formularios/${id}`, { method: "DELETE" });
    fetchFormularios();
  };

  const editForm = (f: any) => {
    setFormBuilder({
      titulo: f.titulo,
      tipoId: f.tipoId ? String(f.tipoId) : "",
      ativo: f.ativo,
      campos: (f.campos as FormField[])?.length ? f.campos : [],
    });
    setEditFormId(f.id);
    setShowFormBuilder(true);
  };

  if (showFormBuilder) {
    return (
      <AppLayout>
        <div className="mb-6">
          <button onClick={() => { setShowFormBuilder(false); setEditFormId(null); }} className="text-sm text-primary mb-3 hover:underline flex items-center gap-1">
            <ChevronLeft className="h-3.5 w-3.5" /> Voltar
          </button>
          <h1 className="text-[22px] font-bold text-foreground">{editFormId ? "Editar" : "Novo"} Formulário</h1>
          <p className="text-foreground/40 text-[13px] mt-0.5">Configure os campos da ficha de anamnese</p>
        </div>

        <div className="space-y-4 max-w-2xl">
          <Card className="bg-card border-border shadow-none">
            <CardContent className="p-4 space-y-4">
              <div>
                <Label className="text-[13px]">Título do Formulário</Label>
                <Input value={formBuilder.titulo} onChange={e => setFormBuilder(f => ({ ...f, titulo: e.target.value }))} className="mt-1" placeholder="Ex: Ficha de Anamnese Facial" />
              </div>
              {tipos.length > 0 && (
                <div>
                  <Label className="text-[13px]">Categoria</Label>
                  <select
                    className="mt-1 w-full h-10 rounded-xl border border-border bg-background px-3 text-[14px]"
                    value={formBuilder.tipoId}
                    onChange={e => setFormBuilder(f => ({ ...f, tipoId: e.target.value }))}
                  >
                    <option value="">Sem categoria</option>
                    {tipos.filter(t => t.ativo).map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                  </select>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Switch checked={formBuilder.ativo} onCheckedChange={v => setFormBuilder(f => ({ ...f, ativo: v }))} />
                <Label className="text-[13px]">Formulário ativo</Label>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-foreground">Campos ({formBuilder.campos.length})</h2>
            <Button size="sm" onClick={addField} className="rounded-xl text-[12px] h-8">
              <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar Campo
            </Button>
          </div>

          {formBuilder.campos.length === 0 && (
            <Card className="bg-card border-border shadow-none border-dashed">
              <CardContent className="py-10 text-center">
                <ListPlus className="h-10 w-10 text-foreground/15 mx-auto mb-3" />
                <p className="text-foreground/40 text-[13px]">Nenhum campo adicionado</p>
                <Button size="sm" variant="outline" onClick={addField} className="mt-3 rounded-xl text-[12px]">
                  <Plus className="h-3.5 w-3.5 mr-1" /> Primeiro Campo
                </Button>
              </CardContent>
            </Card>
          )}

          {formBuilder.campos.map((campo, i) => (
            <Card key={i} className="bg-card border-border shadow-none">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => moveField(i, "up")} disabled={i === 0} className="text-foreground/30 hover:text-foreground disabled:opacity-20"><ChevronUp className="h-3.5 w-3.5" /></button>
                    <button onClick={() => moveField(i, "down")} disabled={i === formBuilder.campos.length - 1} className="text-foreground/30 hover:text-foreground disabled:opacity-20"><ChevronDown className="h-3.5 w-3.5" /></button>
                  </div>
                  <span className="text-[12px] text-foreground/30 font-medium w-6">#{i + 1}</span>
                  <div className="flex-1" />
                  <button onClick={() => removeField(i)} className="text-red-500 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[12px] text-foreground/50">Pergunta</Label>
                    <Input value={campo.label} onChange={e => updateField(i, { label: e.target.value })} className="mt-1 text-[13px]" placeholder="Ex: Possui alergia a algum produto?" />
                  </div>
                  <div>
                    <Label className="text-[12px] text-foreground/50">Tipo de Campo</Label>
                    <select
                      className="mt-1 w-full h-10 rounded-xl border border-border bg-background px-3 text-[13px]"
                      value={campo.tipo}
                      onChange={e => updateField(i, { tipo: e.target.value })}
                    >
                      {FIELD_TYPES.map(ft => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
                    </select>
                  </div>
                </div>
                {(campo.tipo === "select" || campo.tipo === "multiselect") && (
                  <div className="mt-3">
                    <Label className="text-[12px] text-foreground/50">Opções (uma por linha)</Label>
                    <Textarea
                      value={(campo.opcoes || []).join("\n")}
                      onChange={e => updateField(i, { opcoes: e.target.value.split("\n") })}
                      className="mt-1 text-[13px]"
                      placeholder={"Opção 1\nOpção 2\nOpção 3"}
                      rows={3}
                    />
                  </div>
                )}
                <div className="mt-3 flex items-center gap-2">
                  <Switch checked={campo.obrigatorio || false} onCheckedChange={v => updateField(i, { obrigatorio: v })} />
                  <Label className="text-[12px] text-foreground/50">Obrigatório</Label>
                </div>
              </CardContent>
            </Card>
          ))}

          <div className="flex gap-2 pt-2 pb-8">
            <Button onClick={saveFormulario} className="rounded-xl flex-1">Salvar Formulário</Button>
            <Button variant="outline" onClick={() => { setShowFormBuilder(false); setEditFormId(null); }} className="rounded-xl">Cancelar</Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-foreground">Formulários de Anamnese</h1>
        <p className="text-foreground/40 text-[13px] mt-0.5">Crie fichas personalizáveis de avaliação para seus clientes</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <Button onClick={() => { setShowTipoForm(true); setEditTipoId(null); setTipoForm({ nome: "", descricao: "", ativo: true }); }} variant="outline" className="rounded-xl text-[13px]">
          <Plus className="h-4 w-4 mr-1.5" />Nova Categoria
        </Button>
        <Button onClick={() => { setShowFormBuilder(true); setEditFormId(null); setFormBuilder({ titulo: "", tipoId: "", ativo: true, campos: [] }); }} className="rounded-xl text-[13px]">
          <ListPlus className="h-4 w-4 mr-1.5" />Novo Formulário
        </Button>
      </div>

      {showTipoForm && (
        <Card className="mb-6 bg-card border-border shadow-none">
          <CardHeader className="pb-2"><CardTitle className="text-[15px]">{editTipoId ? "Editar" : "Nova"} Categoria</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label className="text-[13px]">Nome</Label><Input value={tipoForm.nome} onChange={e => setTipoForm(f => ({ ...f, nome: e.target.value }))} className="mt-1" placeholder="Ex: Estética Facial, Corporal..." /></div>
            <div><Label className="text-[13px]">Descrição</Label><Input value={tipoForm.descricao} onChange={e => setTipoForm(f => ({ ...f, descricao: e.target.value }))} className="mt-1" /></div>
            <div className="flex items-center gap-2"><Switch checked={tipoForm.ativo} onCheckedChange={v => setTipoForm(f => ({ ...f, ativo: v }))} /><Label className="text-[13px]">Ativo</Label></div>
            <div className="flex gap-2">
              <Button onClick={saveTipo} size="sm" className="rounded-xl">Salvar</Button>
              <Button variant="ghost" size="sm" onClick={() => setShowTipoForm(false)} className="rounded-xl">Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {tipos.length > 0 && (
        <Card className="mb-6 bg-card border-border shadow-none">
          <CardHeader className="pb-2"><CardTitle className="text-[15px]">Categorias</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {tipos.map(t => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                  <div>
                    <p className="text-[14px] font-medium">{t.nome}</p>
                    {t.descricao && <p className="text-[12px] text-foreground/40">{t.descricao}</p>}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setTipoForm({ nome: t.nome, descricao: t.descricao || "", ativo: t.ativo }); setEditTipoId(t.id); setShowTipoForm(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => removeTipo(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? <div className="animate-pulse h-48 bg-card rounded-2xl" /> : formularios.length === 0 && tipos.length === 0 ? (
        <Card className="bg-card border-border shadow-none">
          <CardContent className="py-16 text-center">
            <FileText className="h-12 w-12 text-foreground/15 mx-auto mb-4" />
            <h3 className="text-[15px] font-semibold text-foreground mb-1">Nenhum formulário cadastrado</h3>
            <p className="text-foreground/40 text-[13px] mb-4">Crie formulários personalizados para avaliar seus clientes</p>
            <Button onClick={() => { setShowFormBuilder(true); setEditFormId(null); setFormBuilder({ titulo: "", tipoId: "", ativo: true, campos: [] }); }} className="rounded-xl text-[13px]">
              <Plus className="h-4 w-4 mr-1.5" />Criar Primeiro Formulário
            </Button>
          </CardContent>
        </Card>
      ) : formularios.length > 0 && (
        <Card className="bg-card border-border shadow-none">
          <CardHeader className="pb-2"><CardTitle className="text-[15px]">Formulários</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {formularios.map(f => {
                const campos = (f.campos as FormField[]) || [];
                const tipo = tipos.find(t => t.id === f.tipoId);
                return (
                  <div key={f.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                    <div>
                      <p className="text-[14px] font-medium">{f.titulo}</p>
                      <p className="text-[12px] text-foreground/40">
                        {campos.length} campo{campos.length !== 1 ? "s" : ""}
                        {tipo ? ` · ${tipo.nome}` : ""}
                        {!f.ativo && " · Inativo"}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editForm(f)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => removeFormulario(f.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </AppLayout>
  );
}

// ===== PRONTUÁRIO DO CLIENTE (Perfil Completo) =====
export function AnamneseClientes() {
  const { barbeariaId } = useAuth();
  const { toast } = useToast();
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClienteId, setSelectedClienteId] = useState<number | null>(null);

  useEffect(() => { if (barbeariaId) fetchClientes(); }, [barbeariaId]);

  const fetchClientes = async () => {
    const res = await api(`/barbearias/${barbeariaId}/clientes`);
    if (res.ok) setClientes(await res.json());
    setLoading(false);
  };

  const filtered = clientes.filter(c =>
    (c.nome ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.telefone ?? "").includes(searchTerm)
  );

  if (selectedClienteId) {
    return <ClienteProntuario barbeariaId={barbeariaId!} clienteId={selectedClienteId} onBack={() => setSelectedClienteId(null)} />;
  }

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-foreground">Prontuário de Clientes</h1>
        <p className="text-foreground/40 text-[13px] mt-0.5">Fichas de anamnese, fotos, consentimentos e histórico</p>
      </div>
      <div className="relative max-w-sm mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/30" />
        <Input placeholder="Buscar cliente..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 rounded-xl" />
      </div>
      {loading ? <div className="animate-pulse h-48 bg-card rounded-2xl" /> : filtered.length === 0 ? (
        <Card className="bg-card border-border shadow-none"><CardContent className="py-16 text-center">
          <User className="h-12 w-12 text-foreground/15 mx-auto mb-4" />
          <p className="text-foreground/40 text-[13px]">{searchTerm ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(c => (
            <div key={c.id} onClick={() => setSelectedClienteId(c.id)}
              className="flex items-center justify-between p-4 rounded-xl bg-card border border-border cursor-pointer hover:shadow-md hover:border-primary/20 transition-all group">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[14px]">
                  {c.nome?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] font-medium">{c.nome}</p>
                    {(c.alergias || c.contraindicacoes) && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-500 text-[10px] font-semibold">
                        <AlertTriangle className="h-2.5 w-2.5" /> Alerta
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-foreground/40">{c.telefone || c.email || "—"}</p>
                </div>
              </div>
              <ChevronLeft className="h-4 w-4 text-foreground/20 rotate-180 group-hover:text-primary transition-colors" />
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}

// ===== PRONTUÁRIO COMPLETO DO CLIENTE =====
function ClienteProntuario({ barbeariaId, clienteId, onBack }: { barbeariaId: number; clienteId: number; onBack: () => void }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [perfil, setPerfil] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"fichas" | "fotos" | "consentimentos" | "historico" | "saude">("fichas");

  const [showFillForm, setShowFillForm] = useState(false);
  const [selectedFormId, setSelectedFormId] = useState<number | null>(null);

  const [showFotoUpload, setShowFotoUpload] = useState(false);
  const [showConsentForm, setShowConsentForm] = useState(false);

  const fetchPerfil = useCallback(async () => {
    const res = await api(`/barbearias/${barbeariaId}/anamnese/clientes/${clienteId}/perfil-completo`);
    if (res.ok) setPerfil(await res.json());
    setLoading(false);
  }, [barbeariaId, clienteId]);

  useEffect(() => { fetchPerfil(); }, [fetchPerfil]);

  if (loading) return <AppLayout><div className="animate-pulse h-48 bg-card rounded-2xl" /></AppLayout>;
  if (!perfil) return <AppLayout><p>Erro ao carregar prontuário</p></AppLayout>;

  const { cliente, fichas, fotos, consentimentos, formularios, historico } = perfil;
  const hasAlerts = cliente.alergias || cliente.contraindicacoes;

  const tabs = [
    { key: "fichas" as const, label: "Fichas", icon: FileText, count: fichas.length },
    { key: "fotos" as const, label: "Fotos", icon: Camera, count: fotos.length },
    { key: "consentimentos" as const, label: "Termos", icon: ClipboardCheck, count: consentimentos.length },
    { key: "historico" as const, label: "Histórico", icon: Clock, count: historico.length },
    { key: "saude" as const, label: "Saúde", icon: Heart, count: hasAlerts ? 1 : 0 },
  ];

  return (
    <AppLayout>
      <button onClick={onBack} className="text-sm text-primary mb-3 hover:underline flex items-center gap-1">
        <ChevronLeft className="h-3.5 w-3.5" /> Voltar
      </button>

      <div className="flex items-start gap-3 mb-4">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[18px] flex-shrink-0">
          {cliente.nome?.charAt(0)?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-[20px] font-bold text-foreground truncate">{cliente.nome}</h1>
          <p className="text-[13px] text-foreground/40">{cliente.telefone} {cliente.email ? `· ${cliente.email}` : ""}</p>
        </div>
      </div>

      {hasAlerts && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className="text-[13px] font-bold text-red-500">Alertas de Saúde</span>
          </div>
          {cliente.alergias && <p className="text-[12px] text-red-400 ml-6"><strong>Alergias:</strong> {cliente.alergias}</p>}
          {cliente.contraindicacoes && <p className="text-[12px] text-red-400 ml-6"><strong>Contraindicações:</strong> {cliente.contraindicacoes}</p>}
        </div>
      )}

      <div className="flex gap-1 mb-4 overflow-x-auto pb-1 -mx-1 px-1">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.key ? "bg-primary text-white" : "bg-muted/50 text-foreground/50 hover:text-foreground"
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
            {tab.count > 0 && <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === tab.key ? "bg-white/20" : "bg-foreground/10"}`}>{tab.count}</span>}
          </button>
        ))}
      </div>

      {activeTab === "fichas" && (
        <TabFichas
          fichas={fichas}
          formularios={formularios}
          barbeariaId={barbeariaId}
          clienteId={clienteId}
          onRefresh={fetchPerfil}
        />
      )}
      {activeTab === "fotos" && (
        <TabFotos
          fotos={fotos}
          barbeariaId={barbeariaId}
          clienteId={clienteId}
          onRefresh={fetchPerfil}
        />
      )}
      {activeTab === "consentimentos" && (
        <TabConsentimentos
          consentimentos={consentimentos}
          barbeariaId={barbeariaId}
          clienteId={clienteId}
          onRefresh={fetchPerfil}
        />
      )}
      {activeTab === "historico" && <TabHistorico historico={historico} />}
      {activeTab === "saude" && (
        <TabSaude cliente={cliente} barbeariaId={barbeariaId} clienteId={clienteId} onRefresh={fetchPerfil} />
      )}
    </AppLayout>
  );
}

// ===== TAB: FICHAS =====
function TabFichas({ fichas, formularios, barbeariaId, clienteId, onRefresh }: any) {
  const { toast } = useToast();
  const [showFill, setShowFill] = useState(false);
  const [selectedFormulario, setSelectedFormulario] = useState<any>(null);
  const [respostas, setRespostas] = useState<Record<string, any>>({});
  const [observacoes, setObservacoes] = useState("");
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const activeFormularios = formularios.filter((f: any) => f.ativo);

  const startFill = (form: any) => {
    setSelectedFormulario(form);
    setRespostas({});
    setObservacoes("");
    setShowFill(true);
  };

  const saveFicha = async () => {
    setSaving(true);
    const res = await apiJson(`/barbearias/${barbeariaId}/anamnese/clientes`, "POST", {
      clienteId, formularioId: selectedFormulario.id, respostas, observacoes,
    });
    setSaving(false);
    if (res.ok) {
      toast({ title: "Ficha salva!" });
      setShowFill(false);
      onRefresh();
    } else {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  };

  const deleteFicha = async (id: number) => {
    if (!confirm("Excluir esta ficha?")) return;
    await api(`/barbearias/${barbeariaId}/anamnese/clientes/ficha/${id}`, { method: "DELETE" });
    onRefresh();
  };

  if (showFill && selectedFormulario) {
    const campos = (selectedFormulario.campos as FormField[]) || [];
    return (
      <div>
        <button onClick={() => setShowFill(false)} className="text-sm text-primary mb-3 hover:underline flex items-center gap-1">
          <ChevronLeft className="h-3.5 w-3.5" /> Voltar
        </button>
        <h2 className="text-[17px] font-bold mb-4">{selectedFormulario.titulo}</h2>
        <div className="space-y-4">
          {campos.map((campo, i) => (
            <div key={i}>
              <Label className="text-[13px] mb-1 block">
                {campo.label} {campo.obrigatorio && <span className="text-red-500">*</span>}
              </Label>
              <FieldRenderer campo={campo} value={respostas[campo.label]} onChange={v => setRespostas(r => ({ ...r, [campo.label]: v }))} />
            </div>
          ))}
          <div>
            <Label className="text-[13px] mb-1 block">Observações adicionais</Label>
            <Textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Anotações livres..." rows={3} />
          </div>
          <div className="flex gap-2 pb-8">
            <Button onClick={saveFicha} disabled={saving} className="rounded-xl flex-1">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar Ficha
            </Button>
            <Button variant="outline" onClick={() => setShowFill(false)} className="rounded-xl">Cancelar</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {activeFormularios.length > 0 && (
        <div className="mb-4">
          <p className="text-[12px] text-foreground/40 mb-2">Preencher nova ficha:</p>
          <div className="flex flex-wrap gap-2">
            {activeFormularios.map((f: any) => (
              <Button key={f.id} size="sm" variant="outline" onClick={() => startFill(f)} className="rounded-xl text-[12px]">
                <Plus className="h-3 w-3 mr-1" /> {f.titulo}
              </Button>
            ))}
          </div>
        </div>
      )}

      {fichas.length === 0 ? (
        <Card className="bg-card border-border shadow-none">
          <CardContent className="py-12 text-center">
            <FileText className="h-10 w-10 text-foreground/15 mx-auto mb-3" />
            <p className="text-foreground/40 text-[13px]">Nenhuma ficha preenchida</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {fichas.map((ficha: any) => {
            const form = formularios.find((f: any) => f.id === ficha.formularioId);
            const campos = (form?.campos as FormField[]) || [];
            const isExpanded = expandedId === ficha.id;
            return (
              <Card key={ficha.id} className="bg-card border-border shadow-none">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : ficha.id)}>
                    <div>
                      <p className="text-[14px] font-medium">{form?.titulo || `Formulário #${ficha.formularioId}`}</p>
                      <p className="text-[12px] text-foreground/40">{new Date(ficha.preenchidoEm).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={e => { e.stopPropagation(); deleteFicha(ficha.id); }}><Trash2 className="h-3 w-3" /></Button>
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-foreground/30" /> : <ChevronDown className="h-4 w-4 text-foreground/30" />}
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-border space-y-2">
                      {campos.map((campo, i) => {
                        const resposta = (ficha.respostas as any)?.[campo.label];
                        return (
                          <div key={i} className="flex flex-col">
                            <span className="text-[11px] text-foreground/40 font-medium uppercase">{campo.label}</span>
                            <span className="text-[13px] text-foreground">
                              {resposta === undefined || resposta === "" ? "—" :
                                typeof resposta === "boolean" ? (resposta ? "Sim" : "Não") :
                                  Array.isArray(resposta) ? resposta.join(", ") :
                                    String(resposta)}
                            </span>
                          </div>
                        );
                      })}
                      {ficha.observacoes && (
                        <div className="flex flex-col">
                          <span className="text-[11px] text-foreground/40 font-medium uppercase">Observações</span>
                          <span className="text-[13px] text-foreground">{ficha.observacoes}</span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ===== FIELD RENDERER =====
function FieldRenderer({ campo, value, onChange }: { campo: FormField; value: any; onChange: (v: any) => void }) {
  switch (campo.tipo) {
    case "textarea":
      return <Textarea value={value || ""} onChange={e => onChange(e.target.value)} rows={3} />;
    case "boolean":
      return (
        <div className="flex gap-3">
          <button onClick={() => onChange(true)} className={`px-4 py-2 rounded-lg text-[13px] font-medium border transition-colors ${value === true ? "bg-green-500/15 border-green-500/30 text-green-600" : "border-border text-foreground/50"}`}>Sim</button>
          <button onClick={() => onChange(false)} className={`px-4 py-2 rounded-lg text-[13px] font-medium border transition-colors ${value === false ? "bg-red-500/15 border-red-500/30 text-red-600" : "border-border text-foreground/50"}`}>Não</button>
        </div>
      );
    case "select":
      return (
        <select className="w-full h-10 rounded-xl border border-border bg-background px-3 text-[13px]" value={value || ""} onChange={e => onChange(e.target.value)}>
          <option value="">Selecione...</option>
          {(campo.opcoes || []).filter(o => o.trim()).map((o, i) => <option key={i} value={o}>{o}</option>)}
        </select>
      );
    case "multiselect": {
      const selected: string[] = value || [];
      return (
        <div className="space-y-1">
          {(campo.opcoes || []).filter(o => o.trim()).map((o, i) => (
            <label key={i} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
              <input type="checkbox" checked={selected.includes(o)} onChange={e => {
                if (e.target.checked) onChange([...selected, o]);
                else onChange(selected.filter(s => s !== o));
              }} className="rounded" />
              <span className="text-[13px]">{o}</span>
            </label>
          ))}
        </div>
      );
    }
    case "numero":
      return <Input type="number" value={value || ""} onChange={e => onChange(e.target.value ? Number(e.target.value) : "")} />;
    case "data":
      return <Input type="date" value={value || ""} onChange={e => onChange(e.target.value)} />;
    case "escala":
      return (
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
            <button key={n} onClick={() => onChange(n)}
              className={`h-9 w-9 rounded-lg text-[12px] font-medium border transition-colors ${value === n ? "bg-primary text-white border-primary" : "border-border text-foreground/50 hover:border-primary/30"}`}>
              {n}
            </button>
          ))}
        </div>
      );
    default:
      return <Input value={value || ""} onChange={e => onChange(e.target.value)} placeholder={campo.placeholder} />;
  }
}

// ===== TAB: FOTOS =====
function TabFotos({ fotos, barbeariaId, clienteId, onRefresh }: any) {
  const { toast } = useToast();
  const [showUpload, setShowUpload] = useState(false);
  const [fotoForm, setFotoForm] = useState({ tipo: "antes" as string, descricao: "", procedimento: "", fotoUrl: "" });
  const [saving, setSaving] = useState(false);

  const saveFoto = async () => {
    if (!fotoForm.fotoUrl) return toast({ title: "Envie uma foto", variant: "destructive" });
    setSaving(true);
    const res = await apiJson(`/barbearias/${barbeariaId}/anamnese/fotos`, "POST", {
      clienteId, ...fotoForm,
    });
    setSaving(false);
    if (res.ok) {
      toast({ title: "Foto salva!" });
      setShowUpload(false);
      setFotoForm({ tipo: "antes", descricao: "", procedimento: "", fotoUrl: "" });
      onRefresh();
    }
  };

  const deleteFoto = async (id: number) => {
    if (!confirm("Excluir esta foto?")) return;
    await api(`/barbearias/${barbeariaId}/anamnese/fotos/${id}`, { method: "DELETE" });
    onRefresh();
  };

  const grouped: Record<string, any[]> = {};
  fotos.forEach((f: any) => {
    const key = f.grupoId || f.id;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(f);
  });

  return (
    <div>
      <Button size="sm" onClick={() => setShowUpload(true)} className="rounded-xl text-[12px] mb-4">
        <Camera className="h-3.5 w-3.5 mr-1.5" /> Nova Foto
      </Button>

      {showUpload && (
        <Card className="mb-4 bg-card border-border shadow-none">
          <CardContent className="p-4 space-y-3">
            <div className="flex gap-2">
              {["antes", "depois", "evolucao"].map(t => (
                <button key={t} onClick={() => setFotoForm(f => ({ ...f, tipo: t }))}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-colors ${fotoForm.tipo === t ? "bg-primary text-white border-primary" : "border-border"}`}>
                  {t === "antes" ? "Antes" : t === "depois" ? "Depois" : "Evolução"}
                </button>
              ))}
            </div>
            <ImageUpload value={fotoForm.fotoUrl || null} onChange={url => setFotoForm(f => ({ ...f, fotoUrl: url || "" }))} shape="square" size="lg" label="Foto" />
            <div><Label className="text-[12px]">Procedimento</Label><Input value={fotoForm.procedimento} onChange={e => setFotoForm(f => ({ ...f, procedimento: e.target.value }))} className="mt-1 text-[13px]" placeholder="Ex: Limpeza de pele, Peeling..." /></div>
            <div><Label className="text-[12px]">Descrição</Label><Input value={fotoForm.descricao} onChange={e => setFotoForm(f => ({ ...f, descricao: e.target.value }))} className="mt-1 text-[13px]" placeholder="Observação sobre a foto" /></div>
            <div className="flex gap-2">
              <Button size="sm" onClick={saveFoto} disabled={saving} className="rounded-xl">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null} Salvar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowUpload(false)} className="rounded-xl">Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {fotos.length === 0 ? (
        <Card className="bg-card border-border shadow-none">
          <CardContent className="py-12 text-center">
            <ImageIcon className="h-10 w-10 text-foreground/15 mx-auto mb-3" />
            <p className="text-foreground/40 text-[13px]">Nenhuma foto registrada</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {fotos.map((foto: any) => (
            <div key={foto.id} className="relative group rounded-xl overflow-hidden border border-border bg-card">
              <img src={foto.fotoUrl} alt={foto.descricao || "Foto"} className="w-full aspect-square object-cover" />
              <div className="absolute top-2 left-2">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${foto.tipo === "antes" ? "bg-red-500" : foto.tipo === "depois" ? "bg-green-500" : "bg-blue-500"}`}>
                  {foto.tipo === "antes" ? "ANTES" : foto.tipo === "depois" ? "DEPOIS" : "EVOLUÇÃO"}
                </span>
              </div>
              <button onClick={() => deleteFoto(foto.id)}
                className="absolute top-2 right-2 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <X className="h-3 w-3" />
              </button>
              <div className="p-2">
                {foto.procedimento && <p className="text-[11px] font-medium text-foreground truncate">{foto.procedimento}</p>}
                <p className="text-[10px] text-foreground/40">{new Date(foto.dataRegistro).toLocaleDateString("pt-BR")}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ===== TAB: CONSENTIMENTOS =====
function TabConsentimentos({ consentimentos, barbeariaId, clienteId, onRefresh }: any) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [consentForm, setConsentForm] = useState({ titulo: "", termoTexto: "" });
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#000";
  };

  useEffect(() => {
    if (showForm) setTimeout(initCanvas, 100);
  }, [showForm]);

  const getPos = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  };

  const startDraw = (e: any) => {
    isDrawingRef.current = true;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: any) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const endDraw = () => { isDrawingRef.current = false; };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureUrl(null);
  };

  const saveConsent = async () => {
    if (!consentForm.titulo.trim() || !consentForm.termoTexto.trim()) {
      return toast({ title: "Preencha título e texto do termo", variant: "destructive" });
    }

    let sigUrl = signatureUrl;
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL("image/png");
      const isBlank = !canvas.getContext("2d")?.getImageData(0, 0, canvas.width, canvas.height).data.some((v, i) => i % 4 === 3 && v > 0);
      if (!isBlank) {
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], "assinatura.png", { type: "image/png" });
        const uploadRes = await api("/storage/uploads/request-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "assinatura.png", size: file.size, contentType: "image/png" }),
        });
        if (uploadRes.ok) {
          const { uploadURL, objectPath } = await uploadRes.json();
          await fetch(uploadURL, { method: "PUT", headers: { "Content-Type": "image/png" }, body: file });
          sigUrl = `${BASE_URL}api/storage${objectPath}`;
        }
      }
    }

    setSaving(true);
    const res = await apiJson(`/barbearias/${barbeariaId}/anamnese/consentimentos`, "POST", {
      clienteId,
      titulo: consentForm.titulo,
      termoTexto: consentForm.termoTexto,
      assinaturaUrl: sigUrl,
      aceito: true,
    });
    setSaving(false);
    if (res.ok) {
      toast({ title: "Termo salvo!" });
      setShowForm(false);
      setConsentForm({ titulo: "", termoTexto: "" });
      setSignatureUrl(null);
      onRefresh();
    }
  };

  const deleteConsent = async (id: number) => {
    if (!confirm("Excluir este termo?")) return;
    await api(`/barbearias/${barbeariaId}/anamnese/consentimentos/${id}`, { method: "DELETE" });
    onRefresh();
  };

  return (
    <div>
      <Button size="sm" onClick={() => setShowForm(true)} className="rounded-xl text-[12px] mb-4">
        <ClipboardCheck className="h-3.5 w-3.5 mr-1.5" /> Novo Termo
      </Button>

      {showForm && (
        <Card className="mb-4 bg-card border-border shadow-none">
          <CardContent className="p-4 space-y-3">
            <div><Label className="text-[12px]">Título do Termo</Label><Input value={consentForm.titulo} onChange={e => setConsentForm(f => ({ ...f, titulo: e.target.value }))} className="mt-1 text-[13px]" placeholder="Ex: Termo de Consentimento - Peeling Químico" /></div>
            <div><Label className="text-[12px]">Texto do Termo</Label><Textarea value={consentForm.termoTexto} onChange={e => setConsentForm(f => ({ ...f, termoTexto: e.target.value }))} className="mt-1 text-[13px]" rows={6} placeholder="Descreva os termos, riscos e consentimentos do procedimento..." /></div>
            <div>
              <Label className="text-[12px] mb-2 block">Assinatura do Cliente</Label>
              <div className="border border-border rounded-xl overflow-hidden bg-white">
                <canvas
                  ref={canvasRef}
                  className="w-full cursor-crosshair touch-none"
                  style={{ height: "120px" }}
                  onMouseDown={startDraw}
                  onMouseMove={draw}
                  onMouseUp={endDraw}
                  onMouseLeave={endDraw}
                  onTouchStart={startDraw}
                  onTouchMove={draw}
                  onTouchEnd={endDraw}
                />
              </div>
              <button onClick={clearCanvas} className="text-[11px] text-primary mt-1 hover:underline">Limpar assinatura</button>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={saveConsent} disabled={saving} className="rounded-xl">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />} Salvar Termo
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)} className="rounded-xl">Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {consentimentos.length === 0 ? (
        <Card className="bg-card border-border shadow-none">
          <CardContent className="py-12 text-center">
            <Shield className="h-10 w-10 text-foreground/15 mx-auto mb-3" />
            <p className="text-foreground/40 text-[13px]">Nenhum termo de consentimento registrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {consentimentos.map((c: any) => (
            <Card key={c.id} className="bg-card border-border shadow-none">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-[14px] font-medium flex items-center gap-1.5">
                      {c.aceito && <Check className="h-3.5 w-3.5 text-green-500" />}
                      {c.titulo}
                    </p>
                    <p className="text-[12px] text-foreground/40">
                      {c.aceitoEm ? new Date(c.aceitoEm).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Pendente"}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => deleteConsent(c.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-[12px] text-foreground/50 whitespace-pre-line line-clamp-3">{c.termoTexto}</p>
                {c.assinaturaUrl && (
                  <div className="mt-2 p-2 bg-muted/50 rounded-lg">
                    <p className="text-[10px] text-foreground/40 mb-1">Assinatura:</p>
                    <img src={c.assinaturaUrl} alt="Assinatura" className="h-12 object-contain" />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ===== TAB: HISTÓRICO =====
function TabHistorico({ historico }: { historico: any[] }) {
  if (historico.length === 0) {
    return (
      <Card className="bg-card border-border shadow-none">
        <CardContent className="py-12 text-center">
          <Clock className="h-10 w-10 text-foreground/15 mx-auto mb-3" />
          <p className="text-foreground/40 text-[13px]">Nenhum atendimento registrado</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {historico.map((h: any) => (
        <div key={h.id} className="flex gap-3 p-3 rounded-xl bg-card border border-border">
          <div className="flex flex-col items-center">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <div className="w-px flex-1 bg-border mt-1" />
          </div>
          <div className="flex-1 min-w-0 pb-2">
            <p className="text-[13px] font-medium">{h.servico || h.servicoNome || "Atendimento"}</p>
            <p className="text-[12px] text-foreground/40">
              {h.data ? new Date(h.data).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
              {h.hora ? ` às ${h.hora}` : ""}
            </p>
            {h.profissionalNome && <p className="text-[11px] text-foreground/30">Profissional: {h.profissionalNome}</p>}
            <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
              h.status === "finalizado" || h.status === "concluido" ? "bg-green-500/10 text-green-600" :
                h.status === "cancelado" ? "bg-red-500/10 text-red-600" :
                  h.status === "confirmado" ? "bg-blue-500/10 text-blue-600" :
                    "bg-yellow-500/10 text-yellow-600"
            }`}>
              {h.status || "pendente"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ===== TAB: SAÚDE =====
function TabSaude({ cliente, barbeariaId, clienteId, onRefresh }: any) {
  const { toast } = useToast();
  const [alergias, setAlergias] = useState(cliente.alergias || "");
  const [contraindicacoes, setContraindicacoes] = useState(cliente.contraindicacoes || "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const res = await apiJson(`/barbearias/${barbeariaId}/anamnese/clientes/${clienteId}/saude`, "PUT", {
      alergias: alergias.trim() || null,
      contraindicacoes: contraindicacoes.trim() || null,
    });
    setSaving(false);
    if (res.ok) {
      toast({ title: "Informações de saúde salvas!" });
      onRefresh();
    } else {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  };

  return (
    <div className="max-w-lg space-y-4">
      <Card className="bg-card border-border shadow-none">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h3 className="text-[14px] font-semibold">Informações de Saúde e Alertas</h3>
          </div>
          <p className="text-[12px] text-foreground/40">Estas informações aparecem como alerta no prontuário da cliente, ajudando a evitar procedimentos contraindicados.</p>
          <div>
            <Label className="text-[13px]">Alergias</Label>
            <Textarea value={alergias} onChange={e => setAlergias(e.target.value)} className="mt-1" rows={3}
              placeholder="Ex: Alergia a ácido glicólico, látex, parabenos, esmalte com formaldeído..." />
          </div>
          <div>
            <Label className="text-[13px]">Contraindicações</Label>
            <Textarea value={contraindicacoes} onChange={e => setContraindicacoes(e.target.value)} className="mt-1" rows={3}
              placeholder="Ex: Gestante, uso de Roacutan, diabetes, problemas de cicatrização, marca-passo..." />
          </div>
          <Button onClick={save} disabled={saving} className="rounded-xl">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Salvar Informações
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
