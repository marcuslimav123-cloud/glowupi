import React, { useState, useEffect, useRef, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useApiList, useApiCreate, useApiUpdate, useApiDelete } from "@/hooks/useCrudApi";
import { useListServicos } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, Crown, Users, CreditCard, Scissors, X, Search, UserPlus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { formatCurrency, apiUrl } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type TabKey = "planos" | "assinantes";
type ClienteMode = "search" | "new";

interface ClienteSearchResult {
  id: number;
  nome: string;
  telefone: string | null;
  email: string | null;
}

export default function Clubes() {
  const { barbeariaId } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<TabKey>("planos");
  const [planoDialogOpen, setPlanoDialogOpen] = useState(false);
  const [assinanteDialogOpen, setAssinanteDialogOpen] = useState(false);
  const [editingPlano, setEditingPlano] = useState<any>(null);
  const [selectedPlanoId, setSelectedPlanoId] = useState("");
  const [servicosInclusos, setServicosInclusos] = useState<{ id: number; nome: string }[]>([]);

  const [clienteMode, setClienteMode] = useState<ClienteMode>("search");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<ClienteSearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<ClienteSearchResult | null>(null);
  const [clienteNome, setClienteNome] = useState("");
  const [clienteTelefone, setClienteTelefone] = useState("");
  const [clienteEmail, setClienteEmail] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const { data: servicos = [] } = useListServicos(barbeariaId!, { query: { enabled: !!barbeariaId } });
  const servicosArr = servicos as any[];

  const planosPath = `/barbearias/${barbeariaId}/assinaturas/planos`;
  const assinantesPath = `/barbearias/${barbeariaId}/assinaturas/assinantes`;

  const { data: planos = [], isLoading: loadingPlanos } = useApiList("assinaturas-planos", planosPath, !!barbeariaId);
  const createPlano = useApiCreate("assinaturas-planos", planosPath);
  const updatePlano = useApiUpdate("assinaturas-planos", planosPath);
  const deletePlano = useApiDelete("assinaturas-planos", planosPath);

  const { data: assinantes = [], isLoading: loadingAssinantes } = useApiList("assinaturas-assinantes", assinantesPath, !!barbeariaId);
  const createAssinante = useApiCreate("assinaturas-assinantes", assinantesPath);
  const updateAssinante = useApiUpdate("assinaturas-assinantes", assinantesPath);
  const deleteAssinante = useApiDelete("assinaturas-assinantes", assinantesPath);

  const planosArr = planos as any[];
  const assinantesArr = assinantes as any[];

  const searchClientes = useCallback(async (term: string) => {
    if (!barbeariaId || term.length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/clientes?search=${encodeURIComponent(term)}`), { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.slice(0, 10));
        setShowDropdown(true);
      }
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [barbeariaId]);

  useEffect(() => {
    if (searchTerm.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchClientes(searchTerm), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchTerm, searchClientes]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function selectCliente(c: ClienteSearchResult) {
    setSelectedCliente(c);
    setClienteNome(c.nome);
    setClienteTelefone(c.telefone || "");
    setClienteEmail(c.email || "");
    setSearchTerm(c.nome);
    setShowDropdown(false);
  }

  function resetAssinanteForm() {
    setClienteMode("search");
    setSearchTerm("");
    setSearchResults([]);
    setSelectedCliente(null);
    setClienteNome("");
    setClienteTelefone("");
    setClienteEmail("");
    setSelectedPlanoId("");
    setShowDropdown(false);
  }

  function switchToNewCliente() {
    setClienteMode("new");
    setSelectedCliente(null);
    setClienteNome(searchTerm);
    setClienteTelefone("");
    setClienteEmail("");
    setShowDropdown(false);
  }

  async function handlePlanoSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = {
      nome: fd.get("nome") as string,
      descricao: fd.get("descricao") as string,
      precoMensal: parseFloat(fd.get("precoMensal") as string),
      limiteUso: fd.get("limiteUso") ? parseInt(fd.get("limiteUso") as string) : null,
      servicosInclusos: servicosInclusos.length > 0 ? servicosInclusos : null,
    };
    try {
      if (editingPlano) {
        await updatePlano.mutateAsync({ id: editingPlano.id, ...data });
        toast({ title: "Plano atualizado" });
      } else {
        await createPlano.mutateAsync(data);
        toast({ title: "Plano criado" });
      }
      setPlanoDialogOpen(false);
      setEditingPlano(null);
      setServicosInclusos([]);
    } catch { toast({ title: "Erro", variant: "destructive" }); }
  }

  function openEditPlano(p: any) {
    setEditingPlano(p);
    setServicosInclusos(Array.isArray(p.servicosInclusos) ? p.servicosInclusos : []);
    setPlanoDialogOpen(true);
  }

  async function handlePlanoToggle(item: any) {
    try { await updatePlano.mutateAsync({ id: item.id, ativo: !item.ativo }); }
    catch { toast({ title: "Erro", variant: "destructive" }); }
  }

  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleAssinanteSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isSubmitting) return;
    if (!clienteNome.trim()) { toast({ title: "Informe o nome do cliente", variant: "destructive" }); return; }
    if (!selectedPlanoId) { toast({ title: "Selecione um plano", variant: "destructive" }); return; }
    if (!selectedCliente && !clienteTelefone.trim()) {
      toast({ title: "Informe o telefone do cliente", variant: "destructive" }); return;
    }

    const planoId = parseInt(selectedPlanoId);
    const plano = planosArr.find(p => p.id === planoId);

    setIsSubmitting(true);
    try {
      let finalClienteId = selectedCliente?.id ?? null;

      if (selectedCliente) {
        const needsUpdate =
          clienteNome !== selectedCliente.nome ||
          clienteTelefone !== (selectedCliente.telefone || "") ||
          clienteEmail !== (selectedCliente.email || "");
        if (needsUpdate) {
          const updateRes = await fetch(apiUrl(`/barbearias/${barbeariaId}/clientes/${selectedCliente.id}`), {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              nome: clienteNome,
              telefone: clienteTelefone || undefined,
              email: clienteEmail || undefined,
            }),
          });
          if (!updateRes.ok) {
            const err = await updateRes.json().catch(() => null);
            throw new Error(err?.error || "Erro ao atualizar cliente");
          }
        }
      } else {
        const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/clientes`), {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nome: clienteNome,
            telefone: clienteTelefone,
            email: clienteEmail || undefined,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => null);
          throw new Error(err?.error || "Erro ao criar cliente");
        }
        const newCliente = await res.json();
        finalClienteId = newCliente.id;
      }

      await createAssinante.mutateAsync({
        clienteId: finalClienteId,
        clienteNome,
        planoId,
        planoNome: plano?.nome || "",
        status: "ativo",
      });
      toast({ title: "Assinante adicionado" });
      setAssinanteDialogOpen(false);
      resetAssinanteForm();
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "Erro ao adicionar assinante", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCancelar(assinante: any) {
    try {
      await updateAssinante.mutateAsync({ id: assinante.id, status: "cancelado", dataFim: new Date().toISOString() });
      toast({ title: "Assinatura cancelada" });
    } catch { toast({ title: "Erro", variant: "destructive" }); }
  }

  return (
    <AppLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">Planos de assinatura</h1>
          <p className="text-muted-foreground mt-1">Planos mensais para clientes, com serviços inclusos</p>
        </div>
        {tab === "planos" ? (
          <Button onClick={() => { setEditingPlano(null); setPlanoDialogOpen(true); }}><Plus className="h-4 w-4 mr-2" /> Novo Plano</Button>
        ) : (
          <Button onClick={() => { resetAssinanteForm(); setAssinanteDialogOpen(true); }} disabled={planosArr.length === 0}><Plus className="h-4 w-4 mr-2" /> Novo Assinante</Button>
        )}
      </div>

      <div className="flex gap-2 mb-6">
        <Button variant={tab === "planos" ? "default" : "outline"} size="sm" onClick={() => setTab("planos")}>
          <CreditCard className="h-4 w-4 mr-1" /> Planos ({planosArr.length})
        </Button>
        <Button variant={tab === "assinantes" ? "default" : "outline"} size="sm" onClick={() => setTab("assinantes")}>
          <Users className="h-4 w-4 mr-1" /> Assinantes ({assinantesArr.length})
        </Button>
      </div>

      {tab === "planos" && (
        loadingPlanos ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{[1,2,3].map(i => <div key={i} className="h-48 bg-muted rounded-xl animate-pulse" />)}</div>
        ) : planosArr.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">Nenhum plano criado ainda.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {planosArr.map((p: any) => (
              <Card key={p.id}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><Crown className="h-5 w-5 text-primary" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{p.nome}</p>
                      <Badge variant={p.ativo ? "default" : "secondary"}>{p.ativo ? "Ativo" : "Inativo"}</Badge>
                    </div>
                    <Switch checked={p.ativo} onCheckedChange={() => handlePlanoToggle(p)} />
                  </div>
                  {p.descricao && <p className="text-sm text-muted-foreground mb-3">{p.descricao}</p>}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-primary">{formatCurrency(p.precoMensal)}</p>
                      <p className="text-xs text-muted-foreground">/mês</p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditPlano(p)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400" onClick={() => deletePlano.mutateAsync(p.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {p.limiteUso && <p className="text-xs text-muted-foreground mt-2">Limite: {p.limiteUso} usos/mês</p>}
                  {Array.isArray(p.servicosInclusos) && p.servicosInclusos.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border">
                      <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Scissors className="h-3 w-3" /> Serviços inclusos:</p>
                      <div className="flex flex-wrap gap-1">
                        {p.servicosInclusos.map((s: any) => <Badge key={s.id} variant="secondary" className="text-[10px]">{s.nome}</Badge>)}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}

      {tab === "assinantes" && (
        loadingAssinantes ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}</div>
        ) : assinantesArr.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">Nenhum assinante registrado ainda.</p>
        ) : (
          <div className="space-y-2">
            {assinantesArr.map((a: any) => (
              <div key={a.id} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{a.clienteNome}</p>
                  <p className="text-xs text-muted-foreground">{a.planoNome} · Início: {new Date(a.dataInicio).toLocaleDateString("pt-BR")}</p>
                </div>
                <Badge variant={a.status === "ativo" ? "default" : a.status === "cancelado" ? "destructive" : "secondary"}>
                  {a.status === "ativo" ? "Ativo" : a.status === "cancelado" ? "Cancelado" : a.status}
                </Badge>
                {a.status === "ativo" && (
                  <Button size="sm" variant="outline" className="text-red-500 border-red-200" onClick={() => handleCancelar(a)}>Cancelar</Button>
                )}
                <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400" onClick={() => { if (confirm("Remover assinante?")) deleteAssinante.mutateAsync(a.id); }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )
      )}

      <Dialog open={planoDialogOpen} onOpenChange={(v) => { setPlanoDialogOpen(v); if (!v) { setEditingPlano(null); setServicosInclusos([]); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingPlano ? "Editar Plano" : "Novo Plano"}</DialogTitle></DialogHeader>
          <form onSubmit={handlePlanoSubmit} className="space-y-4">
            <div><Label>Nome</Label><Input name="nome" required defaultValue={editingPlano?.nome || ""} /></div>
            <div><Label>Descrição</Label><Input name="descricao" defaultValue={editingPlano?.descricao || ""} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Preço Mensal (R$)</Label><Input name="precoMensal" type="number" step="0.01" required defaultValue={editingPlano?.precoMensal || ""} /></div>
              <div><Label>Limite de Uso/mês</Label><Input name="limiteUso" type="number" placeholder="Sem limite" defaultValue={editingPlano?.limiteUso || ""} /></div>
            </div>
            <div>
              <Label>Serviços Inclusos</Label>
              <Select value="" onValueChange={(v) => {
                const sId = parseInt(v);
                const svc = servicosArr.find((s: any) => s.id === sId);
                if (svc && !servicosInclusos.find(si => si.id === sId)) {
                  setServicosInclusos([...servicosInclusos, { id: svc.id, nome: svc.nome }]);
                }
              }}>
                <SelectTrigger><SelectValue placeholder="Adicionar serviço..." /></SelectTrigger>
                <SelectContent>
                  {servicosArr.filter((s: any) => !servicosInclusos.find(si => si.id === s.id)).map((s: any) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {servicosInclusos.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {servicosInclusos.map(si => (
                    <Badge key={si.id} variant="secondary" className="gap-1 pr-1">
                      {si.nome}
                      <button type="button" onClick={() => setServicosInclusos(servicosInclusos.filter(s => s.id !== si.id))} className="hover:text-red-400">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={createPlano.isPending || updatePlano.isPending}>
              {editingPlano ? "Salvar" : "Criar Plano"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={assinanteDialogOpen} onOpenChange={(v) => { setAssinanteDialogOpen(v); if (!v) resetAssinanteForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Novo Assinante</DialogTitle></DialogHeader>
          <form onSubmit={handleAssinanteSubmit} className="space-y-4">
            {clienteMode === "search" && !selectedCliente && (
              <div ref={searchRef} className="relative">
                <Label>Buscar Cliente</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setSelectedCliente(null); }}
                    onFocus={() => { if (searchResults.length > 0) setShowDropdown(true); }}
                    placeholder="Digite nome ou telefone..."
                    className="pl-9"
                    autoComplete="off"
                  />
                </div>
                {showDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {isSearching ? (
                      <div className="p-3 text-center text-sm text-muted-foreground">Buscando...</div>
                    ) : searchResults.length > 0 ? (
                      searchResults.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          className="w-full px-3 py-2.5 text-left hover:bg-accent flex items-center gap-3 border-b last:border-0 border-border"
                          onClick={() => selectCliente(c)}
                        >
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Users className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{c.nome}</p>
                            {c.telefone && <p className="text-xs text-muted-foreground">{c.telefone}</p>}
                          </div>
                        </button>
                      ))
                    ) : searchTerm.length >= 2 ? (
                      <div className="p-3 text-center text-sm text-muted-foreground">Nenhum cliente encontrado</div>
                    ) : null}
                  </div>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 w-full"
                  onClick={switchToNewCliente}
                >
                  <UserPlus className="h-4 w-4 mr-2" /> Cadastrar Novo Cliente
                </Button>
              </div>
            )}

            {selectedCliente && clienteMode === "search" && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="gap-1">
                    <Users className="h-3 w-3" /> Cliente existente
                  </Badge>
                  <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => { setSelectedCliente(null); setSearchTerm(""); setClienteNome(""); setClienteTelefone(""); setClienteEmail(""); }}>
                    Trocar
                  </Button>
                </div>
                <div><Label>Nome</Label><Input value={clienteNome} onChange={e => setClienteNome(e.target.value)} required /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Telefone</Label><Input value={clienteTelefone} onChange={e => setClienteTelefone(e.target.value)} placeholder="(00) 00000-0000" /></div>
                  <div><Label>Email</Label><Input value={clienteEmail} onChange={e => setClienteEmail(e.target.value)} type="email" placeholder="email@exemplo.com" /></div>
                </div>
              </div>
            )}

            {clienteMode === "new" && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="gap-1">
                    <UserPlus className="h-3 w-3" /> Novo cliente
                  </Badge>
                  <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => { setClienteMode("search"); setSearchTerm(""); setClienteNome(""); setClienteTelefone(""); setClienteEmail(""); }}>
                    Buscar existente
                  </Button>
                </div>
                <div><Label>Nome</Label><Input value={clienteNome} onChange={e => setClienteNome(e.target.value)} required /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Telefone <span className="text-red-500">*</span></Label><Input value={clienteTelefone} onChange={e => setClienteTelefone(e.target.value)} placeholder="(00) 00000-0000" required /></div>
                  <div><Label>Email</Label><Input value={clienteEmail} onChange={e => setClienteEmail(e.target.value)} type="email" placeholder="email@exemplo.com" /></div>
                </div>
              </div>
            )}

            <div>
              <Label>Plano</Label>
              <Select value={selectedPlanoId} onValueChange={setSelectedPlanoId}>
                <SelectTrigger><SelectValue placeholder="Selecione um plano" /></SelectTrigger>
                <SelectContent>
                  {planosArr.filter(p => p.ativo).map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.nome} — {formatCurrency(p.precoMensal)}/mês</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || !clienteNome.trim() || !selectedPlanoId}
            >
              {isSubmitting ? "Salvando..." : "Adicionar Assinante"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
