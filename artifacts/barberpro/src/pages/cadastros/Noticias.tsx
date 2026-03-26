import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Newspaper, Plus, Pencil, Trash2 } from "lucide-react";

export default function Noticias() {
  const { barbeariaId } = useAuth();
  const { toast } = useToast();
  const [noticias, setNoticias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ titulo: "", conteudo: "", imagemUrl: "", ativo: true });
  const BASE = import.meta.env.BASE_URL;

  useEffect(() => { if (barbeariaId) fetchNoticias(); }, [barbeariaId]);

  const fetchNoticias = async () => {
    try {
      const res = await fetch(`${BASE}api/barbearias/${barbeariaId}/noticias`, { credentials: "include" });
      if (res.ok) setNoticias(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const save = async () => {
    const url = editId ? `${BASE}api/barbearias/${barbeariaId}/noticias/${editId}` : `${BASE}api/barbearias/${barbeariaId}/noticias`;
    const method = editId ? "PUT" : "POST";
    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ ...form, publicadoEm: new Date().toISOString() }) });
      if (res.ok) { toast({ title: editId ? "Notícia atualizada!" : "Notícia criada!" }); resetForm(); fetchNoticias(); }
    } catch { toast({ title: "Erro ao salvar", variant: "destructive" }); }
  };

  const remove = async (id: number) => {
    if (!confirm("Excluir esta notícia?")) return;
    await fetch(`${BASE}api/barbearias/${barbeariaId}/noticias/${id}`, { method: "DELETE", credentials: "include" });
    fetchNoticias();
  };

  const edit = (n: any) => { setForm({ titulo: n.titulo, conteudo: n.conteudo, imagemUrl: n.imagemUrl || "", ativo: n.ativo }); setEditId(n.id); setShowForm(true); };
  const resetForm = () => { setShowForm(false); setEditId(null); setForm({ titulo: "", conteudo: "", imagemUrl: "", ativo: true }); };

  return (
    <AppLayout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-bold text-foreground">Notícias</h1>
          <p className="text-foreground/40 text-[14px] mt-0.5">Envie notícias e comunicados para seus clientes</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="rounded-xl"><Plus className="h-4 w-4 mr-2" />Nova Notícia</Button>
      </div>

      {showForm && (
        <Card className="mb-6 bg-white border-black/[0.04] shadow-none">
          <CardHeader><CardTitle className="text-[16px]">{editId ? "Editar" : "Nova"} Notícia</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Título</Label><Input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} className="mt-1" /></div>
            <div><Label>Conteúdo</Label><Textarea value={form.conteudo} onChange={e => setForm(f => ({ ...f, conteudo: e.target.value }))} className="mt-1" rows={4} /></div>
            <div><Label>URL da Imagem</Label><Input value={form.imagemUrl} onChange={e => setForm(f => ({ ...f, imagemUrl: e.target.value }))} className="mt-1" placeholder="https://..." /></div>
            <div className="flex items-center gap-2"><Switch checked={form.ativo} onCheckedChange={v => setForm(f => ({ ...f, ativo: v }))} /><Label>Ativa</Label></div>
            <div className="flex gap-2"><Button onClick={save} className="rounded-xl">Salvar</Button><Button variant="ghost" onClick={resetForm} className="rounded-xl">Cancelar</Button></div>
          </CardContent>
        </Card>
      )}

      {loading ? <div className="animate-pulse h-48 bg-white rounded-2xl" /> : noticias.length === 0 ? (
        <Card className="bg-white border-black/[0.04] shadow-none"><CardContent className="py-16 text-center">
          <Newspaper className="h-12 w-12 text-foreground/15 mx-auto mb-4" />
          <p className="text-foreground/40 text-[14px]">Nenhuma notícia cadastrada</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {noticias.map(n => (
            <Card key={n.id} className="bg-white border-black/[0.04] shadow-none">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-[14px] font-semibold">{n.titulo}</h3>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full ${n.ativo ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"}`}>{n.ativo ? "Ativa" : "Inativa"}</span>
                    </div>
                    <p className="text-[13px] text-foreground/60 line-clamp-2">{n.conteudo}</p>
                    <p className="text-[11px] text-foreground/30 mt-1">{n.publicadoEm ? new Date(n.publicadoEm).toLocaleDateString("pt-BR") : "—"}</p>
                  </div>
                  <div className="flex gap-1 ml-4">
                    <Button variant="ghost" size="sm" onClick={() => edit(n)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => remove(n.id)} className="text-red-500"><Trash2 className="h-3.5 w-3.5" /></Button>
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
