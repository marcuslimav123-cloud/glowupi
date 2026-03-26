import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FileText, Plus, Pencil, Trash2, ExternalLink } from "lucide-react";

function useDocumentos(filtroTipo?: string) {
  const { barbeariaId } = useAuth();
  const { toast } = useToast();
  const [documentos, setDocumentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ titulo: "", tipo: filtroTipo || "geral", url: "", conteudo: "", clienteId: "" });
  const BASE = import.meta.env.BASE_URL;

  useEffect(() => { if (barbeariaId) fetchDocs(); }, [barbeariaId]);

  const fetchDocs = async () => {
    try {
      const res = await fetch(`${BASE}api/barbearias/${barbeariaId}/documentos`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setDocumentos(filtroTipo ? data.filter((d: any) => d.tipo === filtroTipo) : data);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const save = async () => {
    const url2 = editId ? `${BASE}api/barbearias/${barbeariaId}/documentos/${editId}` : `${BASE}api/barbearias/${barbeariaId}/documentos`;
    try {
      const res = await fetch(url2, { method: editId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ titulo: form.titulo, tipo: form.tipo, url: form.url, conteudo: form.conteudo, clienteId: form.clienteId ? parseInt(form.clienteId) : null }) });
      if (res.ok) { toast({ title: "Documento salvo!" }); setShowForm(false); setEditId(null); setForm({ titulo: "", tipo: filtroTipo || "geral", url: "", conteudo: "", clienteId: "" }); fetchDocs(); }
    } catch { toast({ title: "Erro ao salvar", variant: "destructive" }); }
  };

  const remove = async (id: number) => {
    if (!confirm("Excluir?")) return;
    await fetch(`${BASE}api/barbearias/${barbeariaId}/documentos/${id}`, { method: "DELETE", credentials: "include" });
    fetchDocs();
  };

  const edit = (d: any) => { setForm({ titulo: d.titulo, tipo: d.tipo, url: d.url || "", conteudo: d.conteudo || "", clienteId: d.clienteId ? String(d.clienteId) : "" }); setEditId(d.id); setShowForm(true); };

  return { documentos, loading, showForm, setShowForm, editId, setEditId, form, setForm, save, remove, edit };
}

export function DocumentosPage() {
  const { documentos, loading, showForm, setShowForm, editId, setEditId, form, setForm, save, remove, edit } = useDocumentos();

  return (
    <AppLayout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-bold text-foreground">Meus Documentos</h1>
          <p className="text-foreground/40 text-[14px] mt-0.5">Gerencie documentos do estúdio</p>
        </div>
        <Button onClick={() => { setShowForm(true); setEditId(null); setForm({ titulo: "", tipo: "geral", url: "", conteudo: "", clienteId: "" }); }} className="rounded-xl"><Plus className="h-4 w-4 mr-2" />Novo Documento</Button>
      </div>

      {showForm && (
        <Card className="mb-6 bg-white border-black/[0.04] shadow-none">
          <CardHeader><CardTitle className="text-[16px]">{editId ? "Editar" : "Novo"} Documento</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Título</Label><Input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="geral">Geral</SelectItem><SelectItem value="contrato">Contrato</SelectItem><SelectItem value="termo">Termo</SelectItem><SelectItem value="modelo">Modelo</SelectItem></SelectContent></Select>
              </div>
              <div><Label>URL (opcional)</Label><Input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} className="mt-1" placeholder="https://..." /></div>
            </div>
            <div><Label>Conteúdo</Label><Textarea value={form.conteudo} onChange={e => setForm(f => ({ ...f, conteudo: e.target.value }))} className="mt-1" rows={4} /></div>
            <div className="flex gap-2"><Button onClick={save} className="rounded-xl">Salvar</Button><Button variant="ghost" onClick={() => setShowForm(false)} className="rounded-xl">Cancelar</Button></div>
          </CardContent>
        </Card>
      )}

      {loading ? <div className="animate-pulse h-48 bg-white rounded-2xl" /> : documentos.length === 0 ? (
        <Card className="bg-white border-black/[0.04] shadow-none"><CardContent className="py-16 text-center">
          <FileText className="h-12 w-12 text-foreground/15 mx-auto mb-4" />
          <p className="text-foreground/40 text-[14px]">Nenhum documento cadastrado</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {documentos.map((d: any) => (
            <Card key={d.id} className="bg-white border-black/[0.04] shadow-none">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[14px] font-semibold">{d.titulo}</p>
                    <p className="text-[12px] text-foreground/40">{d.tipo} · {new Date(d.createdAt).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <div className="flex gap-1">
                    {d.url && <a href={d.url} target="_blank" rel="noopener noreferrer"><Button variant="ghost" size="sm"><ExternalLink className="h-3.5 w-3.5" /></Button></a>}
                    <Button variant="ghost" size="sm" onClick={() => edit(d)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => remove(d.id)} className="text-red-500"><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AppLayout>
  );
}

export function DocumentosClientePage() {
  const { barbeariaId } = useAuth();
  const [clientes, setClientes] = useState<any[]>([]);
  const [documentos, setDocumentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const BASE = import.meta.env.BASE_URL;

  useEffect(() => { if (barbeariaId) fetchData(); }, [barbeariaId]);

  const fetchData = async () => {
    try {
      const [cRes, dRes] = await Promise.all([
        fetch(`${BASE}api/barbearias/${barbeariaId}/clientes`, { credentials: "include" }),
        fetch(`${BASE}api/barbearias/${barbeariaId}/documentos`, { credentials: "include" }),
      ]);
      if (cRes.ok) setClientes(await cRes.json());
      if (dRes.ok) setDocumentos((await dRes.json()).filter((d: any) => d.clienteId));
    } catch {}
    finally { setLoading(false); }
  };

  const filtered = clientes.filter(c => (c.nome ?? "").toLowerCase().includes(searchTerm.toLowerCase()));
  const getClientDocs = (id: number) => documentos.filter(d => d.clienteId === id);

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-[24px] font-bold text-foreground">Documentos - Clientes</h1>
        <p className="text-foreground/40 text-[14px] mt-0.5">Documentos associados aos clientes</p>
      </div>
      <div className="mb-4 relative max-w-sm"><Input placeholder="Buscar cliente..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="rounded-xl" /></div>
      {loading ? <div className="animate-pulse h-48 bg-white rounded-2xl" /> : (
        <div className="space-y-2">
          {filtered.map(c => (
            <div key={c.id} className="p-4 rounded-xl bg-white border border-black/[0.04]">
              <p className="text-[14px] font-medium">{c.nome}</p>
              {getClientDocs(c.id).length > 0 ? (
                <div className="mt-2 space-y-1">
                  {getClientDocs(c.id).map((d: any) => (
                    <p key={d.id} className="text-[12px] text-foreground/60 pl-3 border-l-2 border-primary/20">{d.titulo} ({d.tipo})</p>
                  ))}
                </div>
              ) : <p className="text-[12px] text-foreground/30 mt-1">Sem documentos</p>}
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}

export function DocumentosProfissionalPage() {
  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-[24px] font-bold text-foreground">Documentos - Profissionais</h1>
        <p className="text-foreground/40 text-[14px] mt-0.5">Documentos associados aos profissionais</p>
      </div>
      <Card className="bg-white border-black/[0.04] shadow-none"><CardContent className="py-16 text-center">
        <FileText className="h-12 w-12 text-foreground/15 mx-auto mb-4" />
        <p className="text-foreground/40 text-[14px]">Use a seção "Meus Documentos" para gerenciar documentos de profissionais</p>
      </CardContent></Card>
    </AppLayout>
  );
}
