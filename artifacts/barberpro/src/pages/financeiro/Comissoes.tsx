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
import { Percent, Plus, Search, CheckCircle, Clock } from "lucide-react";

export default function Comissoes() {
  const { barbeariaId } = useAuth();
  const { toast } = useToast();
  const [comissoes, setComissoes] = useState<any[]>([]);
  const [profissionais, setProfissionais] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [mesAno, setMesAno] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; });
  const [filtroProf, setFiltroProf] = useState("__all__");
  const [form, setForm] = useState({ profissionalId: "", profissionalNome: "", valorBase: "", percentual: "", valorComissao: "" });
  const BASE = import.meta.env.BASE_URL;

  useEffect(() => { if (barbeariaId) { fetchComissoes(); fetchProfissionais(); } }, [barbeariaId]);

  const fetchProfissionais = async () => {
    try {
      const res = await fetch(`${BASE}api/barbearias/${barbeariaId}/profissionais`, { credentials: "include" });
      if (res.ok) setProfissionais(await res.json());
    } catch {}
  };

  const fetchComissoes = async () => {
    setLoading(true);
    try {
      let url = `${BASE}api/barbearias/${barbeariaId}/comissoes?mesAno=${mesAno}`;
      if (filtroProf && filtroProf !== "__all__") url += `&profissionalId=${filtroProf}`;
      const res = await fetch(url, { credentials: "include" });
      if (res.ok) setComissoes(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const save = async () => {
    const prof = profissionais.find(p => p.id === parseInt(form.profissionalId));
    try {
      const res = await fetch(`${BASE}api/barbearias/${barbeariaId}/comissoes`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({
          profissionalId: parseInt(form.profissionalId), profissionalNome: prof?.nome || form.profissionalNome, mesAno,
          valorBase: parseFloat(form.valorBase) || 0, percentual: parseFloat(form.percentual) || 0,
          valorComissao: parseFloat(form.valorComissao) || ((parseFloat(form.valorBase) || 0) * (parseFloat(form.percentual) || 0) / 100),
        }),
      });
      if (res.ok) { toast({ title: "Comissão registrada!" }); setShowForm(false); fetchComissoes(); }
    } catch { toast({ title: "Erro ao salvar", variant: "destructive" }); }
  };

  const marcarPago = async (id: number) => {
    await fetch(`${BASE}api/barbearias/${barbeariaId}/comissoes/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ status: "pago", dataPagamento: new Date().toISOString().slice(0, 10) }),
    });
    fetchComissoes();
  };

  const totalPendente = comissoes.filter(c => c.status === "pendente").reduce((s, c) => s + c.valorComissao, 0);
  const totalPago = comissoes.filter(c => c.status === "pago").reduce((s, c) => s + c.valorComissao, 0);

  return (
    <AppLayout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-bold text-foreground">Comissões</h1>
          <p className="text-foreground/40 text-[14px] mt-0.5">Gerencie comissões dos profissionais</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="rounded-xl"><Plus className="h-4 w-4 mr-2" />Nova Comissão</Button>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <Input type="month" value={mesAno} onChange={e => setMesAno(e.target.value)} className="w-44 rounded-xl" />
        <Select value={filtroProf} onValueChange={setFiltroProf}><SelectTrigger className="w-48 rounded-xl"><SelectValue placeholder="Todos profissionais" /></SelectTrigger>
          <SelectContent><SelectItem value="__all__">Todos</SelectItem>{profissionais.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.nome}</SelectItem>)}</SelectContent></Select>
        <Button onClick={fetchComissoes} className="rounded-xl"><Search className="h-4 w-4 mr-2" />Filtrar</Button>
      </div>

      {showForm && (
        <Card className="mb-6 bg-card border-border shadow-none">
          <CardHeader><CardTitle className="text-[16px]">Nova Comissão</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Profissional</Label>
              <Select value={form.profissionalId} onValueChange={v => setForm(f => ({ ...f, profissionalId: v }))}><SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{profissionais.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.nome}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Valor Base (R$)</Label><Input type="number" value={form.valorBase} onChange={e => { const vb = e.target.value; setForm(f => ({ ...f, valorBase: vb, valorComissao: String((parseFloat(vb) || 0) * (parseFloat(f.percentual) || 0) / 100) })); }} className="mt-1" /></div>
              <div><Label>Percentual (%)</Label><Input type="number" value={form.percentual} onChange={e => { const pc = e.target.value; setForm(f => ({ ...f, percentual: pc, valorComissao: String((parseFloat(f.valorBase) || 0) * (parseFloat(pc) || 0) / 100) })); }} className="mt-1" /></div>
              <div><Label>Valor Comissão</Label><Input type="number" value={form.valorComissao} onChange={e => setForm(f => ({ ...f, valorComissao: e.target.value }))} className="mt-1" /></div>
            </div>
            <div className="flex gap-2"><Button onClick={save} className="rounded-xl">Salvar</Button><Button variant="ghost" onClick={() => setShowForm(false)} className="rounded-xl">Cancelar</Button></div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Card className="bg-amber-50 border-amber-100 shadow-none"><CardContent className="p-4">
          <p className="text-[12px] text-amber-600 mb-1 flex items-center gap-1"><Clock className="h-3 w-3" />Pendente</p>
          <p className="text-[20px] font-bold text-amber-700">{formatCurrency(totalPendente)}</p>
        </CardContent></Card>
        <Card className="bg-green-50 border-green-100 shadow-none"><CardContent className="p-4">
          <p className="text-[12px] text-green-600 mb-1 flex items-center gap-1"><CheckCircle className="h-3 w-3" />Pago</p>
          <p className="text-[20px] font-bold text-green-700">{formatCurrency(totalPago)}</p>
        </CardContent></Card>
      </div>

      {loading ? <div className="animate-pulse h-48 bg-card rounded-2xl" /> : comissoes.length === 0 ? (
        <Card className="bg-card border-border shadow-none"><CardContent className="py-16 text-center">
          <Percent className="h-12 w-12 text-foreground/15 mx-auto mb-4" />
          <p className="text-foreground/40 text-[14px]">Nenhuma comissão encontrada</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {comissoes.map(c => (
            <div key={c.id} className="flex items-center justify-between p-4 rounded-xl bg-card border border-border">
              <div>
                <p className="text-[14px] font-medium">{c.profissionalNome}</p>
                <p className="text-[12px] text-foreground/40">Base: {formatCurrency(c.valorBase)} · {c.percentual}%</p>
              </div>
              <div className="flex items-center gap-4">
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${c.status === "pago" ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-600"}`}>{c.status}</span>
                <span className="text-[14px] font-semibold">{formatCurrency(c.valorComissao)}</span>
                {c.status === "pendente" && <Button size="sm" variant="outline" onClick={() => marcarPago(c.id)} className="rounded-xl text-[12px]"><CheckCircle className="h-3 w-3 mr-1" />Pagar</Button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
