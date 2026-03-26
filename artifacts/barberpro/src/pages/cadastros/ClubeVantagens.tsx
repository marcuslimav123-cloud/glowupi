import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Gift, Plus, Pencil, Trash2 } from "lucide-react";

export default function ClubeVantagens() {
  const { barbeariaId } = useAuth();
  const { toast } = useToast();
  const [vantagens, setVantagens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ nome: "", descricao: "", tipo: "desconto_percentual", valorDesconto: "", percentualDesconto: "", pontosNecessarios: "0", ativo: true });
  const BASE = import.meta.env.BASE_URL;

  useEffect(() => { if (barbeariaId) fetchVantagens(); }, [barbeariaId]);

  const fetchVantagens = async () => {
    try {
      const res = await fetch(`${BASE}api/barbearias/${barbeariaId}/clube-vantagens`, { credentials: "include" });
      if (res.ok) setVantagens(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const save = async () => {
    const url = editId ? `${BASE}api/barbearias/${barbeariaId}/clube-vantagens/${editId}` : `${BASE}api/barbearias/${barbeariaId}/clube-vantagens`;
    try {
      const res = await fetch(url, { method: editId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({
          nome: form.nome, descricao: form.descricao, tipo: form.tipo, ativo: form.ativo,
          valorDesconto: form.valorDesconto ? parseFloat(form.valorDesconto) : null,
          percentualDesconto: form.percentualDesconto ? parseFloat(form.percentualDesconto) : null,
          pontosNecessarios: parseInt(form.pontosNecessarios) || 0,
        }) });
      if (res.ok) { toast({ title: editId ? "Vantagem atualizada!" : "Vantagem criada!" }); resetForm(); fetchVantagens(); }
    } catch { toast({ title: "Erro ao salvar", variant: "destructive" }); }
  };

  const remove = async (id: number) => {
    if (!confirm("Excluir esta vantagem?")) return;
    await fetch(`${BASE}api/barbearias/${barbeariaId}/clube-vantagens/${id}`, { method: "DELETE", credentials: "include" });
    fetchVantagens();
  };

  const edit = (v: any) => { setForm({ nome: v.nome, descricao: v.descricao || "", tipo: v.tipo, valorDesconto: v.valorDesconto ? String(v.valorDesconto) : "", percentualDesconto: v.percentualDesconto ? String(v.percentualDesconto) : "", pontosNecessarios: String(v.pontosNecessarios || 0), ativo: v.ativo }); setEditId(v.id); setShowForm(true); };
  const resetForm = () => { setShowForm(false); setEditId(null); setForm({ nome: "", descricao: "", tipo: "desconto_percentual", valorDesconto: "", percentualDesconto: "", pontosNecessarios: "0", ativo: true }); };

  return (
    <AppLayout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-bold text-foreground">Clube de Vantagens</h1>
          <p className="text-foreground/40 text-[14px] mt-0.5">Crie benefícios exclusivos para clientes fiéis</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="rounded-xl"><Plus className="h-4 w-4 mr-2" />Nova Vantagem</Button>
      </div>

      {showForm && (
        <Card className="mb-6 bg-white border-black/[0.04] shadow-none">
          <CardHeader><CardTitle className="text-[16px]">{editId ? "Editar" : "Nova"} Vantagem</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Nome</Label><Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} className="mt-1" /></div>
            <div><Label>Descrição</Label><Textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="desconto_percentual">Desconto %</SelectItem><SelectItem value="desconto_valor">Desconto R$</SelectItem><SelectItem value="brinde">Brinde</SelectItem><SelectItem value="servico_gratis">Serviço Grátis</SelectItem></SelectContent></Select>
              </div>
              <div><Label>Pontos Necessários</Label><Input type="number" value={form.pontosNecessarios} onChange={e => setForm(f => ({ ...f, pontosNecessarios: e.target.value }))} className="mt-1" /></div>
            </div>
            {form.tipo === "desconto_percentual" && <div><Label>Percentual (%)</Label><Input type="number" value={form.percentualDesconto} onChange={e => setForm(f => ({ ...f, percentualDesconto: e.target.value }))} className="mt-1" /></div>}
            {form.tipo === "desconto_valor" && <div><Label>Valor do Desconto (R$)</Label><Input type="number" value={form.valorDesconto} onChange={e => setForm(f => ({ ...f, valorDesconto: e.target.value }))} className="mt-1" /></div>}
            <div className="flex items-center gap-2"><Switch checked={form.ativo} onCheckedChange={v => setForm(f => ({ ...f, ativo: v }))} /><Label>Ativa</Label></div>
            <div className="flex gap-2"><Button onClick={save} className="rounded-xl">Salvar</Button><Button variant="ghost" onClick={resetForm} className="rounded-xl">Cancelar</Button></div>
          </CardContent>
        </Card>
      )}

      {loading ? <div className="animate-pulse h-48 bg-white rounded-2xl" /> : vantagens.length === 0 ? (
        <Card className="bg-white border-black/[0.04] shadow-none"><CardContent className="py-16 text-center">
          <Gift className="h-12 w-12 text-foreground/15 mx-auto mb-4" />
          <p className="text-foreground/40 text-[14px]">Nenhuma vantagem cadastrada</p>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {vantagens.map(v => (
            <Card key={v.id} className="bg-white border-black/[0.04] shadow-none hover:shadow-lg hover:shadow-black/[0.03] transition-all">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center"><Gift className="h-4 w-4 text-primary" /></div>
                    <div>
                      <p className="text-[14px] font-semibold">{v.nome}</p>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full ${v.ativo ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"}`}>{v.ativo ? "Ativa" : "Inativa"}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => edit(v)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => remove(v.id)} className="text-red-500"><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
                {v.descricao && <p className="text-[12px] text-foreground/50 mb-2">{v.descricao}</p>}
                <div className="flex items-center gap-3 text-[12px] text-foreground/40">
                  <span>{v.tipo.replace(/_/g, " ")}</span>
                  {v.percentualDesconto && <span className="font-medium text-primary">{v.percentualDesconto}%</span>}
                  {v.valorDesconto && <span className="font-medium text-primary">{formatCurrency(v.valorDesconto)}</span>}
                  {v.pontosNecessarios > 0 && <span>{v.pontosNecessarios} pts</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
