import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { UsersRound, Plus, Pencil, Trash2 } from "lucide-react";

export default function GruposClientes() {
  const { barbeariaId } = useAuth();
  const { toast } = useToast();
  const [grupos, setGrupos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [nome, setNome] = useState("");
  const BASE = import.meta.env.BASE_URL;

  useEffect(() => { if (barbeariaId) fetchGrupos(); }, [barbeariaId]);

  const fetchGrupos = async () => {
    try {
      const res = await fetch(`${BASE}api/barbearias/${barbeariaId}/noticias/grupos`, { credentials: "include" });
      if (res.ok) setGrupos(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const save = async () => {
    const url = editId ? `${BASE}api/barbearias/${barbeariaId}/noticias/grupos/${editId}` : `${BASE}api/barbearias/${barbeariaId}/noticias/grupos`;
    const method = editId ? "PUT" : "POST";
    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ nome }) });
      if (res.ok) { toast({ title: editId ? "Grupo atualizado!" : "Grupo criado!" }); setShowForm(false); setEditId(null); setNome(""); fetchGrupos(); }
    } catch { toast({ title: "Erro ao salvar", variant: "destructive" }); }
  };

  const remove = async (id: number) => {
    if (!confirm("Excluir este grupo?")) return;
    await fetch(`${BASE}api/barbearias/${barbeariaId}/noticias/grupos/${id}`, { method: "DELETE", credentials: "include" });
    fetchGrupos();
  };

  return (
    <AppLayout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-bold text-foreground">Grupos de Clientes</h1>
          <p className="text-foreground/40 text-[14px] mt-0.5">Segmente seus clientes em grupos para comunicação direcionada</p>
        </div>
        <Button onClick={() => { setShowForm(true); setEditId(null); setNome(""); }} className="rounded-xl"><Plus className="h-4 w-4 mr-2" />Novo Grupo</Button>
      </div>

      {showForm && (
        <Card className="mb-6 bg-white border-black/[0.04] shadow-none">
          <CardHeader><CardTitle className="text-[16px]">{editId ? "Editar" : "Novo"} Grupo</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Nome do Grupo</Label><Input value={nome} onChange={e => setNome(e.target.value)} className="mt-1" placeholder="Ex: VIP, Frequentes, Novos..." /></div>
            <div className="flex gap-2"><Button onClick={save} className="rounded-xl">Salvar</Button><Button variant="ghost" onClick={() => setShowForm(false)} className="rounded-xl">Cancelar</Button></div>
          </CardContent>
        </Card>
      )}

      {loading ? <div className="animate-pulse h-48 bg-white rounded-2xl" /> : grupos.length === 0 ? (
        <Card className="bg-white border-black/[0.04] shadow-none"><CardContent className="py-16 text-center">
          <UsersRound className="h-12 w-12 text-foreground/15 mx-auto mb-4" />
          <p className="text-foreground/40 text-[14px]">Nenhum grupo cadastrado</p>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {grupos.map(g => (
            <Card key={g.id} className="bg-white border-black/[0.04] shadow-none hover:shadow-lg hover:shadow-black/[0.03] transition-all">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center"><UsersRound className="h-5 w-5 text-primary" /></div>
                    <div>
                      <p className="font-semibold text-[14px]">{g.nome}</p>
                      <p className="text-[12px] text-foreground/40">{new Date(g.createdAt).toLocaleDateString("pt-BR")}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => { setNome(g.nome); setEditId(g.id); setShowForm(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => remove(g.id)} className="text-red-500"><Trash2 className="h-3.5 w-3.5" /></Button>
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
