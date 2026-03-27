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
import { Wallet, Plus, Trash2 } from "lucide-react";

export default function Caixinha() {
  const { barbeariaId } = useAuth();
  const { toast } = useToast();
  const [contas, setContas] = useState<any[]>([]);
  const [profissionais, setProfissionais] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ profissionalId: "", descricao: "Gorjeta", valor: "", data: "" });
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
      const mesAno = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; })();
      const res = await fetch(`${BASE}api/barbearias/${barbeariaId}/contas-profissional?mesAno=${mesAno}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setContas(data.filter((c: any) => c.tipo === "gorjeta" || (c.descricao ?? "").toLowerCase().includes("gorjeta") || (c.descricao ?? "").toLowerCase().includes("caixinha")));
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const save = async () => {
    const prof = profissionais.find(p => p.id === parseInt(form.profissionalId));
    const mesAno = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; })();
    try {
      const res = await fetch(`${BASE}api/barbearias/${barbeariaId}/contas-profissional`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({
          profissionalId: parseInt(form.profissionalId), profissionalNome: prof?.nome || "",
          tipo: "gorjeta", descricao: form.descricao || "Gorjeta",
          valor: parseFloat(form.valor) || 0, mesAno,
          data: form.data || new Date().toISOString().slice(0, 10),
        }),
      });
      if (res.ok) { toast({ title: "Gorjeta registrada!" }); setShowForm(false); setForm({ profissionalId: "", descricao: "Gorjeta", valor: "", data: "" }); fetchContas(); }
    } catch { toast({ title: "Erro ao salvar", variant: "destructive" }); }
  };

  const remove = async (id: number) => {
    if (!confirm("Excluir?")) return;
    await fetch(`${BASE}api/barbearias/${barbeariaId}/contas-profissional/${id}`, { method: "DELETE", credentials: "include" });
    fetchContas();
  };

  const grouped = profissionais.map(p => ({
    ...p,
    gorjetas: contas.filter(c => c.profissionalId === p.id),
    total: contas.filter(c => c.profissionalId === p.id).reduce((s, c) => s + c.valor, 0),
  })).filter(p => p.gorjetas.length > 0);

  return (
    <AppLayout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-bold text-foreground">Caixinha dos Profissionais</h1>
          <p className="text-foreground/40 text-[14px] mt-0.5">Gorjetas e caixinha do mês</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="rounded-xl"><Plus className="h-4 w-4 mr-2" />Registrar Gorjeta</Button>
      </div>

      {showForm && (
        <Card className="mb-6 bg-card border-border shadow-none">
          <CardHeader><CardTitle className="text-[16px]">Nova Gorjeta</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Profissional</Label>
                <Select value={form.profissionalId} onValueChange={v => setForm(f => ({ ...f, profissionalId: v }))}><SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{profissionais.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.nome}</SelectItem>)}</SelectContent></Select>
              </div>
              <div><Label>Valor (R$)</Label><Input type="number" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} className="mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Descrição</Label><Input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} className="mt-1" /></div>
              <div><Label>Data</Label><Input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} className="mt-1" /></div>
            </div>
            <div className="flex gap-2"><Button onClick={save} className="rounded-xl">Salvar</Button><Button variant="ghost" onClick={() => setShowForm(false)} className="rounded-xl">Cancelar</Button></div>
          </CardContent>
        </Card>
      )}

      <Card className="mb-6 bg-primary/5 border-primary/10 shadow-none"><CardContent className="p-4">
        <p className="text-[12px] text-primary/60 mb-1">Total Caixinha do Mês</p>
        <p className="text-[24px] font-bold text-primary">{formatCurrency(contas.reduce((s, c) => s + c.valor, 0))}</p>
      </CardContent></Card>

      {loading ? <div className="animate-pulse h-48 bg-card rounded-2xl" /> : grouped.length === 0 ? (
        <Card className="bg-card border-border shadow-none"><CardContent className="py-16 text-center">
          <Wallet className="h-12 w-12 text-foreground/15 mx-auto mb-4" />
          <p className="text-foreground/40 text-[14px]">Nenhuma gorjeta registrada este mês</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-4">
          {grouped.map(p => (
            <Card key={p.id} className="bg-card border-border shadow-none">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold text-[14px]">{p.nome}</p>
                  <span className="text-[16px] font-bold text-primary">{formatCurrency(p.total)}</span>
                </div>
                <div className="space-y-1">
                  {p.gorjetas.map((g: any) => (
                    <div key={g.id} className="flex items-center justify-between text-[13px] py-1">
                      <span className="text-foreground/60">{g.descricao} <span className="text-foreground/30 text-[11px]">{g.data}</span></span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{formatCurrency(g.valor)}</span>
                        <button onClick={() => remove(g.id)} className="text-red-400 hover:text-red-600"><Trash2 className="h-3 w-3" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
