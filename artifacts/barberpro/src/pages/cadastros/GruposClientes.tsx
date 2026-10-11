import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { UsersRound, Plus, Pencil, Trash2, Search, Check } from "lucide-react";

export default function GruposClientes() {
  const { barbeariaId } = useAuth();
  const { toast } = useToast();
  const [grupos, setGrupos] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [nome, setNome] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [selectedClienteIds, setSelectedClienteIds] = useState<number[]>([]);
  const [clienteSearch, setClienteSearch] = useState("");
  const BASE = import.meta.env.BASE_URL;

  useEffect(() => { if (barbeariaId) { fetchGrupos(); fetchClientes(); } }, [barbeariaId]);

  const fetchGrupos = async () => {
    try {
      const res = await fetch(`${BASE}api/barbearias/${barbeariaId}/noticias/grupos`, { credentials: "include" });
      if (res.ok) setGrupos(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchClientes = async () => {
    try {
      const res = await fetch(`${BASE}api/barbearias/${barbeariaId}/clientes`, { credentials: "include" });
      if (res.ok) setClientes(await res.json());
    } catch (e) { console.error(e); }
  };

  const save = async () => {
    const url = editId ? `${BASE}api/barbearias/${barbeariaId}/noticias/grupos/${editId}` : `${BASE}api/barbearias/${barbeariaId}/noticias/grupos`;
    const method = editId ? "PUT" : "POST";
    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({
          nome,
          filtroJson: {
            tipo: filtroTipo,
            clienteIds: filtroTipo === "manual" ? selectedClienteIds : undefined,
          }
        })
      });
      if (res.ok) {
        toast({ title: editId ? "Grupo atualizado!" : "Grupo criado!" });
        resetForm();
        fetchGrupos();
      } else {
        const data = await res.json().catch(() => ({}));
        toast({ title: "Erro ao salvar", description: data.error || "Tente novamente", variant: "destructive" });
      }
    } catch { toast({ title: "Erro ao salvar", variant: "destructive" }); }
  };

  const remove = async (id: number) => {
    if (!confirm("Excluir este grupo?")) return;
    await fetch(`${BASE}api/barbearias/${barbeariaId}/noticias/grupos/${id}`, { method: "DELETE", credentials: "include" });
    fetchGrupos();
  };

  const resetForm = () => {
    setShowForm(false);
    setEditId(null);
    setNome("");
    setFiltroTipo("todos");
    setSelectedClienteIds([]);
    setClienteSearch("");
  };

  const editGrupo = (g: any) => {
    setNome(g.nome);
    setFiltroTipo(g.filtroJson?.tipo || "todos");
    setSelectedClienteIds(g.filtroJson?.clienteIds || []);
    setEditId(g.id);
    setShowForm(true);
  };

  const toggleCliente = (id: number) => {
    setSelectedClienteIds(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const filteredClientes = clienteSearch
    ? clientes.filter((c: any) => c.nome?.toLowerCase().includes(clienteSearch.toLowerCase()) || c.telefone?.includes(clienteSearch))
    : clientes;

  const getFilterLabel = (filtro: any) => {
    if (!filtro?.tipo || filtro.tipo === "todos") return "Todos os clientes";
    if (filtro.tipo === "vip") return "Clientes VIP";
    if (filtro.tipo === "inativos") return "Clientes Inativos (+30 dias)";
    if (filtro.tipo === "aniversariantes") return "Aniversariantes do mês";
    if (filtro.tipo === "manual") return `${filtro.clienteIds?.length || 0} clientes selecionados`;
    return "Todos os clientes";
  };

  return (
    <AppLayout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-bold text-foreground">Grupos de clientes</h1>
          <p className="text-foreground/40 text-[14px] mt-0.5">Separe clientes em grupos para mandar mensagens direcionadas</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="rounded-xl"><Plus className="h-4 w-4 mr-2" />Novo Grupo</Button>
      </div>

      {showForm && (
        <Card className="mb-6 bg-card border-border shadow-none">
          <CardHeader><CardTitle className="text-[16px]">{editId ? "Editar" : "Novo"} Grupo</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Nome do Grupo</Label><Input value={nome} onChange={e => setNome(e.target.value)} className="mt-1" placeholder="Ex: VIP, Frequentes, Novos..." /></div>
            <div>
              <Label>Segmentação</Label>
              <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm mt-1">
                <option value="todos">Todos os clientes</option>
                <option value="vip">Clientes VIP</option>
                <option value="inativos">Clientes Inativos (+30 dias)</option>
                <option value="aniversariantes">Aniversariantes do mês</option>
                <option value="manual">Selecionar clientes manualmente</option>
              </select>
            </div>

            {filtroTipo === "manual" && (
              <div>
                <Label className="mb-2 block">Selecionar Clientes ({selectedClienteIds.length} selecionados)</Label>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-10" placeholder="Buscar cliente..." value={clienteSearch} onChange={e => setClienteSearch(e.target.value)} />
                </div>
                <div className="max-h-60 overflow-y-auto border border-border rounded-lg">
                  {filteredClientes.length === 0 ? (
                    <p className="text-center text-foreground/40 text-sm py-4">Nenhum cliente encontrado</p>
                  ) : (
                    filteredClientes.map((c: any) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleCliente(c.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-muted/50 transition-colors border-b border-border last:border-b-0 ${selectedClienteIds.includes(c.id) ? "bg-primary/5" : ""}`}
                      >
                        <div className={`h-5 w-5 rounded border flex items-center justify-center shrink-0 ${selectedClienteIds.includes(c.id) ? "bg-primary border-primary" : "border-border"}`}>
                          {selectedClienteIds.includes(c.id) && <Check className="h-3 w-3 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium truncate">{c.nome}</p>
                          {c.telefone && <p className="text-[11px] text-foreground/40">{c.telefone}</p>}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={save} className="rounded-xl">Salvar</Button>
              <Button variant="ghost" onClick={resetForm} className="rounded-xl">Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? <div className="animate-pulse h-48 bg-card rounded-2xl" /> : grupos.length === 0 ? (
        <Card className="bg-card border-border shadow-none"><CardContent className="py-16 text-center">
          <UsersRound className="h-12 w-12 text-foreground/15 mx-auto mb-4" />
          <p className="text-foreground/40 text-[14px]">Nenhum grupo cadastrado</p>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {grupos.map(g => (
            <Card key={g.id} className="bg-card border-border shadow-none hover:shadow-lg hover:shadow-black/[0.03] transition-all">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center"><UsersRound className="h-5 w-5 text-primary" /></div>
                    <div>
                      <p className="font-semibold text-[14px]">{g.nome}</p>
                      <p className="text-[12px] text-foreground/40">{getFilterLabel(g.filtroJson)}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => editGrupo(g)}><Pencil className="h-3.5 w-3.5" /></Button>
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
