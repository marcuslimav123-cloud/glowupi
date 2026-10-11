import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, Search, Trash2 } from "lucide-react";

export default function ContaProfissional() {
  const { barbeariaId } = useAuth();
  const { toast } = useToast();
  const [contas, setContas] = useState<any[]>([]);
  const [profissionais, setProfissionais] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [mesAno, setMesAno] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; });
  const [filtroProf, setFiltroProf] = useState("__all__");
  const [form, setForm] = useState({ profissionalId: "", tipo: "credito", descricao: "", valor: "", data: "" });
  const BASE = import.meta.env.BASE_URL;

  useEffect(() => { if (barbeariaId) { fetchContas(); fetchProfissionais(); } }, [barbeariaId]);

  const fetchProfissionais = async () => {
    try {
      const res = await fetch(`${BASE}api/barbearias/${barbeariaId}/profissionais`, { credentials: "include" });
      if (res.ok) setProfissionais(await res.json());
    } catch {}
  };

  const fetchContas = async () => {
    setLoading(true);
    try {
      let url = `${BASE}api/barbearias/${barbeariaId}/contas-profissional?mesAno=${mesAno}`;
      if (filtroProf && filtroProf !== "__all__") url += `&profissionalId=${filtroProf}`;
      const res = await fetch(url, { credentials: "include" });
      if (res.ok) setContas(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const save = async () => {
    const prof = profissionais.find(p => p.id === parseInt(form.profissionalId));
    try {
      const res = await fetch(`${BASE}api/barbearias/${barbeariaId}/contas-profissional`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({
          profissionalId: parseInt(form.profissionalId), profissionalNome: prof?.nome || "",
          tipo: form.tipo, descricao: form.descricao, valor: parseFloat(form.valor) || 0,
          mesAno, data: form.data || new Date().toISOString().slice(0, 10),
        }),
      });
      if (res.ok) { toast({ title: "Conta registrada!" }); setShowForm(false); setForm({ profissionalId: "", tipo: "credito", descricao: "", valor: "", data: "" }); fetchContas(); }
    } catch { toast({ title: "Erro ao salvar", variant: "destructive" }); }
  };

  const remove = async (id: number) => {
    if (!confirm("Excluir esta conta?")) return;
    await fetch(`${BASE}api/barbearias/${barbeariaId}/contas-profissional/${id}`, { method: "DELETE", credentials: "include" });
    fetchContas();
  };

  const grouped = profissionais.map(p => ({
    ...p,
    contas: contas.filter(c => c.profissionalId === p.id),
    saldo: contas.filter(c => c.profissionalId === p.id).reduce((s, c) => s + (c.tipo === "credito" ? c.valor : -c.valor), 0),
  })).filter(p => !filtroProf || filtroProf === "__all__" || p.id === parseInt(filtroProf));

  return (
    <AppLayout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-bold text-foreground">Conta do profissional</h1>
          <p className="text-foreground/40 text-[14px] mt-0.5">Vales, adiantamentos e acertos de cada profissional no mês</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="rounded-xl"><Plus className="h-4 w-4 mr-2" />Novo lançamento</Button>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <Input type="month" value={mesAno} onChange={e => setMesAno(e.target.value)} className="w-44 rounded-xl" />
        <Select value={filtroProf} onValueChange={setFiltroProf}><SelectTrigger className="w-48 rounded-xl"><SelectValue placeholder="Todos profissionais" /></SelectTrigger>
          <SelectContent><SelectItem value="__all__">Todos</SelectItem>{profissionais.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.nomeExibicao || p.nome}</SelectItem>)}</SelectContent></Select>
        <Button onClick={fetchContas} className="rounded-xl"><Search className="h-4 w-4 mr-2" />Filtrar</Button>
      </div>

      {showForm && (
        <Card className="mb-6 bg-card border-border shadow-none">
          <CardHeader><CardTitle className="text-[16px]">Novo Lançamento</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Profissional</Label>
                <Select value={form.profissionalId} onValueChange={v => setForm(f => ({ ...f, profissionalId: v }))}><SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{profissionais.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.nomeExibicao || p.nome}</SelectItem>)}</SelectContent></Select>
              </div>
              <div><Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="credito">Crédito</SelectItem><SelectItem value="debito">Débito</SelectItem></SelectContent></Select>
              </div>
            </div>
            <div><Label>Descrição</Label><Input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Valor (R$)</Label><Input type="number" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} className="mt-1" /></div>
              <div><Label>Data</Label><Input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} className="mt-1" /></div>
            </div>
            <div className="flex gap-2"><Button onClick={save} className="rounded-xl">Salvar</Button><Button variant="ghost" onClick={() => setShowForm(false)} className="rounded-xl">Cancelar</Button></div>
          </CardContent>
        </Card>
      )}

      {loading ? <div className="animate-pulse h-48 bg-card rounded-2xl" /> : grouped.length === 0 ? (
        <Card className="bg-card border-border shadow-none"><CardContent className="py-16 text-center">
          <Users className="h-12 w-12 text-foreground/15 mx-auto mb-4" />
          <p className="text-foreground/40 text-[14px]">Nenhum lançamento neste mês</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-4">
          {grouped.map(p => (
            <Card key={p.id} className="bg-card border-border shadow-none">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center"><Users className="h-5 w-5 text-primary" /></div>
                    <div><p className="font-semibold text-[14px]">{p.nomeExibicao || p.nome}</p><p className="text-[12px] text-foreground/40">{p.contas.length} lançamentos</p></div>
                  </div>
                  <span className={`text-[16px] font-bold ${p.saldo >= 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(p.saldo)}</span>
                </div>
                {p.contas.length > 0 && (
                  <div className="space-y-1 mt-3 pt-3 border-t border-border">
                    {p.contas.map((c: any) => (
                      <div key={c.id} className="flex items-center justify-between py-1.5 text-[13px]">
                        <div><span className={c.tipo === "credito" ? "text-green-600" : "text-red-600"}>{c.tipo === "credito" ? "+" : "-"}</span> {c.descricao} <span className="text-foreground/30 text-[11px] ml-1">{c.data}</span></div>
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${c.tipo === "credito" ? "text-green-600" : "text-red-600"}`}>{formatCurrency(c.valor)}</span>
                          <button onClick={() => remove(c.id)} className="text-red-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
