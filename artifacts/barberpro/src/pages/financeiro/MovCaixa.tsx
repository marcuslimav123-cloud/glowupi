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
import { ArrowUpDown, Plus, ArrowUpCircle, ArrowDownCircle, Search } from "lucide-react";

export default function MovCaixa() {
  const { barbeariaId } = useAuth();
  const { toast } = useToast();
  const [contas, setContas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ tipo: "pagar", categoria: "", descricao: "", valor: "", dataVencimento: "", status: "pendente" });
  const [editId, setEditId] = useState<number | null>(null);
  const BASE = import.meta.env.BASE_URL;

  useEffect(() => { if (barbeariaId) fetchContas(); }, [barbeariaId]);

  const fetchContas = async () => {
    try {
      const res = await fetch(`${BASE}api/barbearias/${barbeariaId}/financeiro`, { credentials: "include" });
      if (res.ok) setContas(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const save = async () => {
    const url = editId ? `${BASE}api/barbearias/${barbeariaId}/financeiro/${editId}` : `${BASE}api/barbearias/${barbeariaId}/financeiro`;
    const method = editId ? "PUT" : "POST";
    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ ...form, valor: parseFloat(form.valor) || 0 }) });
      if (res.ok) { toast({ title: editId ? "Conta atualizada!" : "Conta criada!" }); setShowForm(false); setEditId(null); setForm({ tipo: "pagar", categoria: "", descricao: "", valor: "", dataVencimento: "", status: "pendente" }); fetchContas(); }
    } catch { toast({ title: "Erro ao salvar", variant: "destructive" }); }
  };

  const remove = async (id: number) => {
    if (!confirm("Excluir esta conta?")) return;
    await fetch(`${BASE}api/barbearias/${barbeariaId}/financeiro/${id}`, { method: "DELETE", credentials: "include" });
    fetchContas();
  };

  const edit = (c: any) => { setForm({ tipo: c.tipo, categoria: c.categoria || "", descricao: c.descricao, valor: String(c.valor), dataVencimento: c.dataVencimento || "", status: c.status }); setEditId(c.id); setShowForm(true); };

  const pagar = contas.filter(c => c.tipo === "pagar");
  const receber = contas.filter(c => c.tipo === "receber");

  return (
    <AppLayout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-bold text-foreground">Movimentações Financeiras</h1>
          <p className="text-foreground/40 text-[14px] mt-0.5">Contas a pagar e receber</p>
        </div>
        <Button onClick={() => { setShowForm(true); setEditId(null); setForm({ tipo: "pagar", categoria: "", descricao: "", valor: "", dataVencimento: "", status: "pendente" }); }} className="rounded-xl"><Plus className="h-4 w-4 mr-2" />Nova Conta</Button>
      </div>

      {showForm && (
        <Card className="mb-6 bg-card border-border shadow-none">
          <CardHeader><CardTitle className="text-[16px]">{editId ? "Editar" : "Nova"} Conta</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="pagar">A Pagar</SelectItem><SelectItem value="receber">A Receber</SelectItem></SelectContent></Select>
              </div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="pendente">Pendente</SelectItem><SelectItem value="pago">Pago</SelectItem><SelectItem value="vencido">Vencido</SelectItem></SelectContent></Select>
              </div>
            </div>
            <div><Label>Descrição</Label><Input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} className="mt-1" /></div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Valor (R$)</Label><Input type="number" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} className="mt-1" /></div>
              <div><Label>Categoria</Label><Input value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} className="mt-1" /></div>
              <div><Label>Vencimento</Label><Input type="date" value={form.dataVencimento} onChange={e => setForm(f => ({ ...f, dataVencimento: e.target.value }))} className="mt-1" /></div>
            </div>
            <div className="flex gap-2"><Button onClick={save} className="rounded-xl">Salvar</Button><Button variant="ghost" onClick={() => setShowForm(false)} className="rounded-xl">Cancelar</Button></div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Card className="bg-red-50 border-red-100 shadow-none"><CardContent className="p-4">
          <p className="text-[12px] text-red-600 mb-1">Total a Pagar</p>
          <p className="text-[20px] font-bold text-red-700">{formatCurrency(pagar.filter(c => c.status === "pendente").reduce((s, c) => s + c.valor, 0))}</p>
        </CardContent></Card>
        <Card className="bg-green-50 border-green-100 shadow-none"><CardContent className="p-4">
          <p className="text-[12px] text-green-600 mb-1">Total a Receber</p>
          <p className="text-[20px] font-bold text-green-700">{formatCurrency(receber.filter(c => c.status === "pendente").reduce((s, c) => s + c.valor, 0))}</p>
        </CardContent></Card>
      </div>

      {loading ? <div className="animate-pulse h-48 bg-card rounded-2xl" /> : contas.length === 0 ? (
        <Card className="bg-card border-border shadow-none"><CardContent className="py-16 text-center">
          <ArrowUpDown className="h-12 w-12 text-foreground/15 mx-auto mb-4" />
          <p className="text-foreground/40 text-[14px]">Nenhuma movimentação cadastrada</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {contas.map(c => (
            <div key={c.id} className="flex items-center justify-between p-4 rounded-xl bg-card border border-border">
              <div className="flex items-center gap-3">
                {c.tipo === "receber" ? <ArrowUpCircle className="h-5 w-5 text-green-500" /> : <ArrowDownCircle className="h-5 w-5 text-red-500" />}
                <div>
                  <p className="text-[14px] font-medium">{c.descricao}</p>
                  <p className="text-[12px] text-foreground/40">{c.categoria || "Sem categoria"} · {c.dataVencimento || "Sem vencimento"}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${c.status === "pago" ? "bg-green-50 text-green-600" : c.status === "vencido" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"}`}>{c.status}</span>
                <span className={`text-[14px] font-semibold ${c.tipo === "receber" ? "text-green-600" : "text-red-600"}`}>{formatCurrency(c.valor)}</span>
                <Button variant="ghost" size="sm" onClick={() => edit(c)} className="text-[12px]">Editar</Button>
                <Button variant="ghost" size="sm" onClick={() => remove(c.id)} className="text-[12px] text-red-500">Excluir</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
