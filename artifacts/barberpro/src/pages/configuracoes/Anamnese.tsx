import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { FileText, Plus, Pencil, Trash2, ListPlus } from "lucide-react";

export function AnamneseFormularios() {
  const { barbeariaId } = useAuth();
  const { toast } = useToast();
  const [tipos, setTipos] = useState<any[]>([]);
  const [formularios, setFormularios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTipoForm, setShowTipoForm] = useState(false);
  const [showFormForm, setShowFormForm] = useState(false);
  const [editTipoId, setEditTipoId] = useState<number | null>(null);
  const [editFormId, setEditFormId] = useState<number | null>(null);
  const [tipoForm, setTipoForm] = useState({ nome: "", descricao: "", ativo: true });
  const [formForm, setFormForm] = useState({ titulo: "", tipoId: "", campos: [{ label: "", tipo: "texto" }], ativo: true });
  const BASE = import.meta.env.BASE_URL;

  useEffect(() => { if (barbeariaId) { fetchTipos(); fetchFormularios(); } }, [barbeariaId]);

  const fetchTipos = async () => {
    try {
      const res = await fetch(`${BASE}api/barbearias/${barbeariaId}/anamnese/tipos`, { credentials: "include" });
      if (res.ok) setTipos(await res.json());
    } catch {}
  };

  const fetchFormularios = async () => {
    try {
      const res = await fetch(`${BASE}api/barbearias/${barbeariaId}/anamnese/formularios`, { credentials: "include" });
      if (res.ok) setFormularios(await res.json());
    } catch {}
    finally { setLoading(false); }
  };

  const saveTipo = async () => {
    const url = editTipoId ? `${BASE}api/barbearias/${barbeariaId}/anamnese/tipos/${editTipoId}` : `${BASE}api/barbearias/${barbeariaId}/anamnese/tipos`;
    try {
      const res = await fetch(url, { method: editTipoId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(tipoForm) });
      if (res.ok) { toast({ title: "Tipo salvo!" }); setShowTipoForm(false); setEditTipoId(null); setTipoForm({ nome: "", descricao: "", ativo: true }); fetchTipos(); }
    } catch { toast({ title: "Erro ao salvar", variant: "destructive" }); }
  };

  const saveFormulario = async () => {
    const url = editFormId ? `${BASE}api/barbearias/${barbeariaId}/anamnese/formularios/${editFormId}` : `${BASE}api/barbearias/${barbeariaId}/anamnese/formularios`;
    try {
      const res = await fetch(url, { method: editFormId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ titulo: formForm.titulo, tipoId: formForm.tipoId ? parseInt(formForm.tipoId) : null, campos: formForm.campos.filter(c => c.label), ativo: formForm.ativo }) });
      if (res.ok) { toast({ title: "Formulário salvo!" }); setShowFormForm(false); setEditFormId(null); setFormForm({ titulo: "", tipoId: "", campos: [{ label: "", tipo: "texto" }], ativo: true }); fetchFormularios(); }
    } catch { toast({ title: "Erro ao salvar", variant: "destructive" }); }
  };

  const removeTipo = async (id: number) => {
    if (!confirm("Excluir?")) return;
    await fetch(`${BASE}api/barbearias/${barbeariaId}/anamnese/tipos/${id}`, { method: "DELETE", credentials: "include" });
    fetchTipos();
  };

  const removeFormulario = async (id: number) => {
    if (!confirm("Excluir?")) return;
    await fetch(`${BASE}api/barbearias/${barbeariaId}/anamnese/formularios/${id}`, { method: "DELETE", credentials: "include" });
    fetchFormularios();
  };

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-[24px] font-bold text-foreground">Formulários de Anamnese</h1>
        <p className="text-foreground/40 text-[14px] mt-0.5">Configure tipos e formulários de avaliação</p>
      </div>

      <div className="flex gap-2 mb-6">
        <Button onClick={() => { setShowTipoForm(true); setEditTipoId(null); setTipoForm({ nome: "", descricao: "", ativo: true }); }} variant="outline" className="rounded-xl"><Plus className="h-4 w-4 mr-2" />Novo Tipo</Button>
        <Button onClick={() => { setShowFormForm(true); setEditFormId(null); setFormForm({ titulo: "", tipoId: "", campos: [{ label: "", tipo: "texto" }], ativo: true }); }} className="rounded-xl"><ListPlus className="h-4 w-4 mr-2" />Novo Formulário</Button>
      </div>

      {showTipoForm && (
        <Card className="mb-6 bg-white border-black/[0.04] shadow-none">
          <CardHeader><CardTitle className="text-[16px]">{editTipoId ? "Editar" : "Novo"} Tipo</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Nome</Label><Input value={tipoForm.nome} onChange={e => setTipoForm(f => ({ ...f, nome: e.target.value }))} className="mt-1" /></div>
            <div><Label>Descrição</Label><Input value={tipoForm.descricao} onChange={e => setTipoForm(f => ({ ...f, descricao: e.target.value }))} className="mt-1" /></div>
            <div className="flex items-center gap-2"><Switch checked={tipoForm.ativo} onCheckedChange={v => setTipoForm(f => ({ ...f, ativo: v }))} /><Label>Ativo</Label></div>
            <div className="flex gap-2"><Button onClick={saveTipo} className="rounded-xl">Salvar</Button><Button variant="ghost" onClick={() => setShowTipoForm(false)} className="rounded-xl">Cancelar</Button></div>
          </CardContent>
        </Card>
      )}

      {showFormForm && (
        <Card className="mb-6 bg-white border-black/[0.04] shadow-none">
          <CardHeader><CardTitle className="text-[16px]">{editFormId ? "Editar" : "Novo"} Formulário</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Título</Label><Input value={formForm.titulo} onChange={e => setFormForm(f => ({ ...f, titulo: e.target.value }))} className="mt-1" /></div>
            <div>
              <Label className="mb-2 block">Campos</Label>
              {formForm.campos.map((c, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <Input value={c.label} onChange={e => setFormForm(f => ({ ...f, campos: f.campos.map((cc, j) => j === i ? { ...cc, label: e.target.value } : cc) }))} placeholder={`Campo ${i+1}`} />
                  {formForm.campos.length > 1 && <Button variant="ghost" size="sm" onClick={() => setFormForm(f => ({ ...f, campos: f.campos.filter((_, j) => j !== i) }))} className="text-red-500"><Trash2 className="h-4 w-4" /></Button>}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setFormForm(f => ({ ...f, campos: [...f.campos, { label: "", tipo: "texto" }] }))} className="rounded-xl text-[12px]"><Plus className="h-3 w-3 mr-1" />Campo</Button>
            </div>
            <div className="flex items-center gap-2"><Switch checked={formForm.ativo} onCheckedChange={v => setFormForm(f => ({ ...f, ativo: v }))} /><Label>Ativo</Label></div>
            <div className="flex gap-2"><Button onClick={saveFormulario} className="rounded-xl">Salvar</Button><Button variant="ghost" onClick={() => setShowFormForm(false)} className="rounded-xl">Cancelar</Button></div>
          </CardContent>
        </Card>
      )}

      {tipos.length > 0 && (
        <Card className="mb-6 bg-white border-black/[0.04] shadow-none">
          <CardHeader><CardTitle className="text-[16px]">Tipos de Anamnese</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {tipos.map(t => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                  <div><p className="text-[14px] font-medium">{t.nome}</p>{t.descricao && <p className="text-[12px] text-foreground/40">{t.descricao}</p>}</div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => { setTipoForm({ nome: t.nome, descricao: t.descricao || "", ativo: t.ativo }); setEditTipoId(t.id); setShowTipoForm(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => removeTipo(t.id)} className="text-red-500"><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? <div className="animate-pulse h-48 bg-white rounded-2xl" /> : formularios.length === 0 && tipos.length === 0 ? (
        <Card className="bg-white border-black/[0.04] shadow-none"><CardContent className="py-16 text-center">
          <FileText className="h-12 w-12 text-foreground/15 mx-auto mb-4" />
          <p className="text-foreground/40 text-[14px]">Nenhum formulário de anamnese cadastrado</p>
        </CardContent></Card>
      ) : formularios.length > 0 && (
        <Card className="bg-white border-black/[0.04] shadow-none">
          <CardHeader><CardTitle className="text-[16px]">Formulários</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {formularios.map(f => (
                <div key={f.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                  <div>
                    <p className="text-[14px] font-medium">{f.titulo}</p>
                    <p className="text-[12px] text-foreground/40">{(f.campos as any[])?.length || 0} campos · {f.ativo ? "Ativo" : "Inativo"}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => { setFormForm({ titulo: f.titulo, tipoId: f.tipoId ? String(f.tipoId) : "", campos: (f.campos as any[])?.length ? f.campos : [{ label: "", tipo: "texto" }], ativo: f.ativo }); setEditFormId(f.id); setShowFormForm(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => removeFormulario(f.id)} className="text-red-500"><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </AppLayout>
  );
}

export function AnamneseClientes() {
  const { barbeariaId } = useAuth();
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCliente, setSelectedCliente] = useState<any>(null);
  const [fichas, setFichas] = useState<any[]>([]);
  const BASE = import.meta.env.BASE_URL;

  useEffect(() => { if (barbeariaId) fetchClientes(); }, [barbeariaId]);

  const fetchClientes = async () => {
    try {
      const res = await fetch(`${BASE}api/barbearias/${barbeariaId}/clientes`, { credentials: "include" });
      if (res.ok) setClientes(await res.json());
    } catch {}
    finally { setLoading(false); }
  };

  const selectCliente = async (c: any) => {
    setSelectedCliente(c);
    try {
      const res = await fetch(`${BASE}api/barbearias/${barbeariaId}/anamnese/clientes/${c.id}`, { credentials: "include" });
      if (res.ok) setFichas(await res.json());
    } catch {}
  };

  const filtered = clientes.filter(c => (c.nome ?? "").toLowerCase().includes(searchTerm.toLowerCase()));

  if (selectedCliente) {
    return (
      <AppLayout>
        <button onClick={() => setSelectedCliente(null)} className="text-sm text-primary mb-4 hover:underline">← Voltar</button>
        <h1 className="text-[24px] font-bold text-foreground mb-4">Anamnese: {selectedCliente.nome}</h1>
        {fichas.length === 0 ? (
          <Card className="bg-white border-black/[0.04] shadow-none"><CardContent className="py-16 text-center">
            <p className="text-foreground/40 text-[14px]">Nenhuma ficha de anamnese preenchida</p>
          </CardContent></Card>
        ) : (
          <div className="space-y-3">
            {fichas.map((f: any) => (
              <Card key={f.id} className="bg-white border-black/[0.04] shadow-none"><CardContent className="p-4">
                <p className="text-[14px] font-medium">Formulário #{f.formularioId}</p>
                <p className="text-[12px] text-foreground/40">{new Date(f.preenchidoEm).toLocaleDateString("pt-BR")}</p>
                <pre className="text-[12px] mt-2 bg-gray-50 p-3 rounded-lg overflow-auto">{JSON.stringify(f.respostas, null, 2)}</pre>
              </CardContent></Card>
            ))}
          </div>
        )}
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-[24px] font-bold text-foreground">Anamnese - Clientes</h1>
        <p className="text-foreground/40 text-[14px] mt-0.5">Fichas de anamnese preenchidas por cliente</p>
      </div>
      <div className="mb-4 relative max-w-sm">
        <Input placeholder="Buscar cliente..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-4 rounded-xl" />
      </div>
      {loading ? <div className="animate-pulse h-48 bg-white rounded-2xl" /> : filtered.length === 0 ? (
        <Card className="bg-white border-black/[0.04] shadow-none"><CardContent className="py-16 text-center">
          <FileText className="h-12 w-12 text-foreground/15 mx-auto mb-4" />
          <p className="text-foreground/40 text-[14px]">Nenhum cliente encontrado</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(c => (
            <div key={c.id} onClick={() => selectCliente(c)} className="flex items-center justify-between p-4 rounded-xl bg-white border border-black/[0.04] cursor-pointer hover:shadow-md transition-shadow">
              <p className="text-[14px] font-medium">{c.nome}</p>
              <span className="text-[12px] text-foreground/40">{c.telefone || c.email || "—"}</span>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
