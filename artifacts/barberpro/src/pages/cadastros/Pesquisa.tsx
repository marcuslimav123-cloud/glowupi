import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ClipboardList, Plus, Pencil, Trash2, Eye, Star } from "lucide-react";

export default function Pesquisa() {
  const { barbeariaId } = useAuth();
  const { toast } = useToast();
  const [pesquisas, setPesquisas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ titulo: "", perguntas: [{ texto: "", tipo: "nota" }], ativo: true });
  const [viewRespostas, setViewRespostas] = useState<any>(null);
  const [respostas, setRespostas] = useState<any[]>([]);
  const BASE = import.meta.env.BASE_URL;

  useEffect(() => { if (barbeariaId) fetchPesquisas(); }, [barbeariaId]);

  const fetchPesquisas = async () => {
    try {
      const res = await fetch(`${BASE}api/barbearias/${barbeariaId}/pesquisas`, { credentials: "include" });
      if (res.ok) setPesquisas(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const save = async () => {
    const url = editId ? `${BASE}api/barbearias/${barbeariaId}/pesquisas/${editId}` : `${BASE}api/barbearias/${barbeariaId}/pesquisas`;
    try {
      const res = await fetch(url, { method: editId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ titulo: form.titulo, perguntas: form.perguntas.filter(p => p.texto), ativo: form.ativo }) });
      if (res.ok) { toast({ title: editId ? "Pesquisa atualizada!" : "Pesquisa criada!" }); resetForm(); fetchPesquisas(); }
    } catch { toast({ title: "Erro ao salvar", variant: "destructive" }); }
  };

  const remove = async (id: number) => {
    if (!confirm("Excluir esta pesquisa?")) return;
    await fetch(`${BASE}api/barbearias/${barbeariaId}/pesquisas/${id}`, { method: "DELETE", credentials: "include" });
    fetchPesquisas();
  };

  const verRespostas = async (p: any) => {
    const res = await fetch(`${BASE}api/barbearias/${barbeariaId}/pesquisas/${p.id}/respostas`, { credentials: "include" });
    if (res.ok) { setRespostas(await res.json()); setViewRespostas(p); }
  };

  const addPergunta = () => setForm(f => ({ ...f, perguntas: [...f.perguntas, { texto: "", tipo: "nota" }] }));
  const updatePergunta = (i: number, texto: string) => setForm(f => ({ ...f, perguntas: f.perguntas.map((p, j) => j === i ? { ...p, texto } : p) }));
  const removePergunta = (i: number) => setForm(f => ({ ...f, perguntas: f.perguntas.filter((_, j) => j !== i) }));
  const edit = (p: any) => { setForm({ titulo: p.titulo, perguntas: (p.perguntas as any[])?.length ? p.perguntas : [{ texto: "", tipo: "nota" }], ativo: p.ativo }); setEditId(p.id); setShowForm(true); };
  const resetForm = () => { setShowForm(false); setEditId(null); setForm({ titulo: "", perguntas: [{ texto: "", tipo: "nota" }], ativo: true }); };

  if (viewRespostas) {
    return (
      <AppLayout>
        <button onClick={() => setViewRespostas(null)} className="text-sm text-primary mb-4 hover:underline">← Voltar</button>
        <h1 className="text-[24px] font-bold text-foreground mb-2">Respostas: {viewRespostas.titulo}</h1>
        {respostas.length === 0 ? (
          <Card className="bg-white border-black/[0.04] shadow-none"><CardContent className="py-16 text-center">
            <p className="text-foreground/40 text-[14px]">Nenhuma resposta recebida</p>
          </CardContent></Card>
        ) : (
          <div className="space-y-3">
            {respostas.map((r: any) => (
              <Card key={r.id} className="bg-white border-black/[0.04] shadow-none"><CardContent className="p-4">
                <p className="font-semibold text-[14px]">{r.clienteNome || "Anônimo"}</p>
                {r.nota && <div className="flex items-center gap-1 mt-1">{Array.from({ length: 5 }, (_, i) => <Star key={i} className={`h-4 w-4 ${i < r.nota ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />)}</div>}
                <p className="text-[12px] text-foreground/40 mt-1">{new Date(r.createdAt).toLocaleDateString("pt-BR")}</p>
              </CardContent></Card>
            ))}
          </div>
        )}
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-bold text-foreground">Pesquisa de Satisfação</h1>
          <p className="text-foreground/40 text-[14px] mt-0.5">Crie pesquisas e acompanhe a satisfação dos clientes</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="rounded-xl"><Plus className="h-4 w-4 mr-2" />Nova Pesquisa</Button>
      </div>

      {showForm && (
        <Card className="mb-6 bg-white border-black/[0.04] shadow-none">
          <CardHeader><CardTitle className="text-[16px]">{editId ? "Editar" : "Nova"} Pesquisa</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Título</Label><Input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} className="mt-1" /></div>
            <div>
              <Label className="mb-2 block">Perguntas</Label>
              {form.perguntas.map((p, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <Input value={p.texto} onChange={e => updatePergunta(i, e.target.value)} placeholder={`Pergunta ${i + 1}`} />
                  {form.perguntas.length > 1 && <Button variant="ghost" size="sm" onClick={() => removePergunta(i)} className="text-red-500"><Trash2 className="h-4 w-4" /></Button>}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addPergunta} className="rounded-xl text-[12px]"><Plus className="h-3 w-3 mr-1" />Pergunta</Button>
            </div>
            <div className="flex items-center gap-2"><Switch checked={form.ativo} onCheckedChange={v => setForm(f => ({ ...f, ativo: v }))} /><Label>Ativa</Label></div>
            <div className="flex gap-2"><Button onClick={save} className="rounded-xl">Salvar</Button><Button variant="ghost" onClick={resetForm} className="rounded-xl">Cancelar</Button></div>
          </CardContent>
        </Card>
      )}

      {loading ? <div className="animate-pulse h-48 bg-white rounded-2xl" /> : pesquisas.length === 0 ? (
        <Card className="bg-white border-black/[0.04] shadow-none"><CardContent className="py-16 text-center">
          <ClipboardList className="h-12 w-12 text-foreground/15 mx-auto mb-4" />
          <p className="text-foreground/40 text-[14px]">Nenhuma pesquisa cadastrada</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {pesquisas.map(p => (
            <Card key={p.id} className="bg-white border-black/[0.04] shadow-none">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-[14px] font-semibold">{p.titulo}</h3>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full ${p.ativo ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"}`}>{p.ativo ? "Ativa" : "Inativa"}</span>
                    </div>
                    <p className="text-[12px] text-foreground/40 mt-0.5">{(p.perguntas as any[])?.length || 0} perguntas</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => verRespostas(p)}><Eye className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => edit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => remove(p.id)} className="text-red-500"><Trash2 className="h-3.5 w-3.5" /></Button>
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
