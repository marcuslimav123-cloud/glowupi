import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ShieldAlert, Plus, Trash2, Search } from "lucide-react";

export default function RestricaoCliente() {
  const { barbeariaId } = useAuth();
  const { toast } = useToast();
  const [restricoes, setRestricoes] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ clienteId: "", tipo: "bloqueio", descricao: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const BASE = import.meta.env.BASE_URL;

  useEffect(() => { if (barbeariaId) { fetchRestricoes(); fetchClientes(); } }, [barbeariaId]);

  const fetchClientes = async () => {
    try {
      const res = await fetch(`${BASE}api/barbearias/${barbeariaId}/clientes`, { credentials: "include" });
      if (res.ok) setClientes(await res.json());
    } catch {}
  };

  const fetchRestricoes = async () => {
    try {
      const res = await fetch(`${BASE}api/barbearias/${barbeariaId}/documentos/restricoes`, { credentials: "include" });
      if (res.ok) setRestricoes(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const save = async () => {
    try {
      const res = await fetch(`${BASE}api/barbearias/${barbeariaId}/documentos/restricoes`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ clienteId: parseInt(form.clienteId), tipo: form.tipo, descricao: form.descricao }),
      });
      if (res.ok) { toast({ title: "Restrição cadastrada!" }); setShowForm(false); setForm({ clienteId: "", tipo: "bloqueio", descricao: "" }); fetchRestricoes(); }
    } catch { toast({ title: "Erro ao salvar", variant: "destructive" }); }
  };

  const remove = async (id: number) => {
    if (!confirm("Remover restrição?")) return;
    await fetch(`${BASE}api/barbearias/${barbeariaId}/documentos/restricoes/${id}`, { method: "DELETE", credentials: "include" });
    fetchRestricoes();
  };

  const getClienteNome = (id: number) => clientes.find(c => c.id === id)?.nome || `Cliente #${id}`;
  const filtered = restricoes.filter(r =>
    getClienteNome(r.clienteId).toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.descricao ?? "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-bold text-foreground">Lista de Restrições</h1>
          <p className="text-foreground/40 text-[14px] mt-0.5">Clientes com restrições cadastradas</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="rounded-xl"><Plus className="h-4 w-4 mr-2" />Nova Restrição</Button>
      </div>

      {showForm && (
        <Card className="mb-6 bg-card border-border shadow-none">
          <CardHeader><CardTitle className="text-[16px]">Nova Restrição</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Cliente</Label>
              <Select value={form.clienteId} onValueChange={v => setForm(f => ({ ...f, clienteId: v }))}><SelectTrigger className="mt-1"><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                <SelectContent>{clientes.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>)}</SelectContent></Select>
            </div>
            <div><Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="bloqueio">Bloqueio</SelectItem><SelectItem value="alerta">Alerta</SelectItem><SelectItem value="observacao">Observação</SelectItem></SelectContent></Select>
            </div>
            <div><Label>Descrição</Label><Input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} className="mt-1" placeholder="Motivo da restrição..." /></div>
            <div className="flex gap-2"><Button onClick={save} className="rounded-xl">Salvar</Button><Button variant="ghost" onClick={() => setShowForm(false)} className="rounded-xl">Cancelar</Button></div>
          </CardContent>
        </Card>
      )}

      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/30" />
        <Input placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 rounded-xl" />
      </div>

      {loading ? <div className="animate-pulse h-48 bg-card rounded-2xl" /> : filtered.length === 0 ? (
        <Card className="bg-card border-border shadow-none"><CardContent className="py-16 text-center">
          <ShieldAlert className="h-12 w-12 text-foreground/15 mx-auto mb-4" />
          <p className="text-foreground/40 text-[14px]">Nenhuma restrição cadastrada</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => (
            <div key={r.id} className="flex items-center justify-between p-4 rounded-xl bg-card border border-border">
              <div className="flex items-center gap-3">
                <ShieldAlert className={`h-5 w-5 ${r.tipo === "bloqueio" ? "text-red-500" : r.tipo === "alerta" ? "text-amber-500" : "text-blue-500"}`} />
                <div>
                  <p className="text-[14px] font-medium">{getClienteNome(r.clienteId)}</p>
                  <p className="text-[12px] text-foreground/40">{r.descricao}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${r.tipo === "bloqueio" ? "bg-red-50 text-red-600" : r.tipo === "alerta" ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"}`}>{r.tipo}</span>
                <Button variant="ghost" size="sm" onClick={() => remove(r.id)} className="text-red-500"><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
