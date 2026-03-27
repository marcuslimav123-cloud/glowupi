import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ClipboardList, Plus, Pencil, Trash2, Eye, Star, Link2, Copy, BarChart3 } from "lucide-react";

export default function Pesquisa() {
  const { barbeariaId } = useAuth();
  const { toast } = useToast();
  const [pesquisas, setPesquisas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ titulo: "", perguntas: [{ texto: "", tipo: "nota" }], ativo: true, envioAutomatico: false });
  const [viewRespostas, setViewRespostas] = useState<any>(null);
  const [respostas, setRespostas] = useState<any[]>([]);
  const [estatisticas, setEstatisticas] = useState<any>(null);
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
        body: JSON.stringify({ titulo: form.titulo, perguntas: form.perguntas.filter(p => p.texto), ativo: form.ativo, envioAutomatico: form.envioAutomatico }) });
      if (res.ok) { toast({ title: editId ? "Pesquisa atualizada!" : "Pesquisa criada!" }); resetForm(); fetchPesquisas(); }
      else {
        const data = await res.json().catch(() => ({}));
        toast({ title: "Erro ao salvar", description: data.error || "", variant: "destructive" });
      }
    } catch { toast({ title: "Erro ao salvar", variant: "destructive" }); }
  };

  const remove = async (id: number) => {
    if (!confirm("Excluir esta pesquisa?")) return;
    await fetch(`${BASE}api/barbearias/${barbeariaId}/pesquisas/${id}`, { method: "DELETE", credentials: "include" });
    fetchPesquisas();
  };

  const verRespostas = async (p: any) => {
    const [resRes, statRes] = await Promise.all([
      fetch(`${BASE}api/barbearias/${barbeariaId}/pesquisas/${p.id}/respostas`, { credentials: "include" }),
      fetch(`${BASE}api/barbearias/${barbeariaId}/pesquisas/${p.id}/estatisticas`, { credentials: "include" }),
    ]);
    if (resRes.ok) setRespostas(await resRes.json());
    if (statRes.ok) setEstatisticas(await statRes.json());
    setViewRespostas(p);
  };

  const getPublicLink = (p: any) => {
    const origin = window.location.origin;
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    return `${origin}${base}/pesquisa/${barbeariaId}/${p.id}`;
  };

  const copyLink = (p: any) => {
    navigator.clipboard.writeText(getPublicLink(p));
    toast({ title: "Link copiado!" });
  };

  const addPergunta = () => setForm(f => ({ ...f, perguntas: [...f.perguntas, { texto: "", tipo: "nota" }] }));
  const updatePergunta = (i: number, texto: string) => setForm(f => ({ ...f, perguntas: f.perguntas.map((p, j) => j === i ? { ...p, texto } : p) }));
  const updatePerguntaTipo = (i: number, tipo: string) => setForm(f => ({ ...f, perguntas: f.perguntas.map((p, j) => j === i ? { ...p, tipo } : p) }));
  const removePergunta = (i: number) => setForm(f => ({ ...f, perguntas: f.perguntas.filter((_, j) => j !== i) }));
  const edit = (p: any) => { setForm({ titulo: p.titulo, perguntas: (p.perguntas as any[])?.length ? p.perguntas : [{ texto: "", tipo: "nota" }], ativo: p.ativo, envioAutomatico: p.envioAutomatico || false }); setEditId(p.id); setShowForm(true); };
  const resetForm = () => { setShowForm(false); setEditId(null); setForm({ titulo: "", perguntas: [{ texto: "", tipo: "nota" }], ativo: true, envioAutomatico: false }); };

  if (viewRespostas) {
    return (
      <AppLayout>
        <button onClick={() => { setViewRespostas(null); setEstatisticas(null); }} className="text-sm text-primary mb-4 hover:underline">← Voltar</button>
        <h1 className="text-[24px] font-bold text-foreground mb-2">Resultados: {viewRespostas.titulo}</h1>

        {estatisticas && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <Card className="bg-card border-border shadow-none">
              <CardContent className="p-5 text-center">
                <p className="text-[12px] text-foreground/40 mb-1">Total de Respostas</p>
                <p className="text-3xl font-bold text-primary">{estatisticas.totalRespostas}</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border shadow-none">
              <CardContent className="p-5 text-center">
                <p className="text-[12px] text-foreground/40 mb-1">Nota Média</p>
                <div className="flex items-center justify-center gap-1">
                  <p className="text-3xl font-bold text-amber-500">{estatisticas.mediaNota}</p>
                  <Star className="h-6 w-6 fill-amber-400 text-amber-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border shadow-none">
              <CardContent className="p-5">
                <p className="text-[12px] text-foreground/40 mb-2 text-center">Distribuição</p>
                <div className="space-y-1">
                  {[5, 4, 3, 2, 1].map(n => {
                    const count = estatisticas.distribuicaoNotas?.[n] || 0;
                    const pct = estatisticas.totalRespostas > 0 ? (count / estatisticas.totalRespostas) * 100 : 0;
                    return (
                      <div key={n} className="flex items-center gap-2 text-[12px]">
                        <span className="w-8 text-right">{n}★</span>
                        <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-6 text-foreground/40">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="mb-4 p-3 bg-blue-50 rounded-xl flex items-center gap-2">
          <Link2 className="h-4 w-4 text-blue-500 shrink-0" />
          <input readOnly value={getPublicLink(viewRespostas)} className="flex-1 text-[12px] bg-transparent text-blue-600 outline-none" />
          <Button size="sm" variant="ghost" onClick={() => copyLink(viewRespostas)}><Copy className="h-3.5 w-3.5" /></Button>
        </div>

        {respostas.length === 0 ? (
          <Card className="bg-card border-border shadow-none"><CardContent className="py-16 text-center">
            <p className="text-foreground/40 text-[14px]">Nenhuma resposta recebida ainda</p>
          </CardContent></Card>
        ) : (
          <div className="space-y-3">
            {respostas.map((r: any) => (
              <Card key={r.id} className="bg-card border-border shadow-none"><CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-[14px]">{r.clienteNome || "Anônimo"}</p>
                  <p className="text-[11px] text-foreground/30">{new Date(r.createdAt).toLocaleDateString("pt-BR")}</p>
                </div>
                {r.nota && <div className="flex items-center gap-1 mb-2">{Array.from({ length: 5 }, (_, i) => <Star key={i} className={`h-4 w-4 ${i < r.nota ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />)}</div>}
                {r.respostas && typeof r.respostas === "object" && Object.keys(r.respostas).length > 0 && (
                  <div className="space-y-1 mt-2">
                    {Object.entries(r.respostas).map(([key, val]) => {
                      const pergunta = (viewRespostas.perguntas as any[])?.[parseInt(key)];
                      return (
                        <div key={key} className="text-[12px]">
                          <span className="text-foreground/50">{pergunta?.texto || `Pergunta ${parseInt(key) + 1}`}: </span>
                          <span className="text-foreground/80">{String(val)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
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
          <p className="text-foreground/40 text-[14px] mt-0.5">Crie pesquisas, gere links públicos e acompanhe a satisfação dos clientes</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="rounded-xl"><Plus className="h-4 w-4 mr-2" />Nova Pesquisa</Button>
      </div>

      {showForm && (
        <Card className="mb-6 bg-card border-border shadow-none">
          <CardHeader><CardTitle className="text-[16px]">{editId ? "Editar" : "Nova"} Pesquisa</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Título</Label><Input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} className="mt-1" /></div>
            <div>
              <Label className="mb-2 block">Perguntas</Label>
              {form.perguntas.map((p, i) => (
                <div key={i} className="flex gap-2 mb-2 items-start">
                  <Input value={p.texto} onChange={e => updatePergunta(i, e.target.value)} placeholder={`Pergunta ${i + 1}`} className="flex-1" />
                  <select value={p.tipo} onChange={e => updatePerguntaTipo(i, e.target.value)} className="rounded-lg border border-border bg-background px-2 py-2 text-sm w-28">
                    <option value="nota">Nota (★)</option>
                    <option value="texto">Texto</option>
                  </select>
                  {form.perguntas.length > 1 && <Button variant="ghost" size="sm" onClick={() => removePergunta(i)} className="text-red-500 shrink-0"><Trash2 className="h-4 w-4" /></Button>}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addPergunta} className="rounded-xl text-[12px]"><Plus className="h-3 w-3 mr-1" />Pergunta</Button>
            </div>
            <div className="flex items-center gap-2"><Switch checked={form.ativo} onCheckedChange={v => setForm(f => ({ ...f, ativo: v }))} /><Label>Ativa</Label></div>
            <div className="flex items-center gap-2">
              <Switch checked={form.envioAutomatico} onCheckedChange={v => setForm(f => ({ ...f, envioAutomatico: v }))} />
              <div>
                <Label>Envio Automático</Label>
                <p className="text-xs text-muted-foreground">Envia automaticamente ao cliente após finalizar comanda/agendamento</p>
              </div>
            </div>
            <div className="flex gap-2"><Button onClick={save} className="rounded-xl">Salvar</Button><Button variant="ghost" onClick={resetForm} className="rounded-xl">Cancelar</Button></div>
          </CardContent>
        </Card>
      )}

      {loading ? <div className="animate-pulse h-48 bg-card rounded-2xl" /> : pesquisas.length === 0 ? (
        <Card className="bg-card border-border shadow-none"><CardContent className="py-16 text-center">
          <ClipboardList className="h-12 w-12 text-foreground/15 mx-auto mb-4" />
          <p className="text-foreground/40 text-[14px]">Nenhuma pesquisa cadastrada</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {pesquisas.map(p => (
            <Card key={p.id} className="bg-card border-border shadow-none">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[14px] font-semibold">{p.titulo}</h3>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full ${p.ativo ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"}`}>{p.ativo ? "Ativa" : "Inativa"}</span>
                    </div>
                    <p className="text-[12px] text-foreground/40 mt-0.5">
                      {(p.perguntas as any[])?.length || 0} perguntas
                      {p.envioAutomatico && <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px]">Envio automático</span>}
                    </p>
                    {p.ativo && (
                      <div className="flex items-center gap-1 mt-2">
                        <Link2 className="h-3 w-3 text-blue-400" />
                        <button onClick={() => copyLink(p)} className="text-[11px] text-blue-500 hover:underline truncate max-w-xs">
                          Copiar link público
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => verRespostas(p)} title="Ver resultados"><BarChart3 className="h-3.5 w-3.5" /></Button>
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
