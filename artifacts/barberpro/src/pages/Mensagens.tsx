import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import {
  useListMensagens, useCreateMensagem, useDeleteMensagem,
  useGetModoHumano,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Plus, MessageSquare, Send, Trash2, Mail, Megaphone, Search, Check, BookOpen, ShieldOff, Settings } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getListMensagensQueryKey } from "@workspace/api-client-react";
import { BancoDeModelos } from "@/components/mensagens/BancoDeModelos";
import { Link } from "wouter";

type MsgTipo = "retorno" | "promocao";
type DestinatarioTipo = "todos" | "grupo" | "individual";
type Tab = "campanhas" | "modelos";

export default function Mensagens() {
  const { barbeariaId } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("campanhas");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tipo, setTipo] = useState<MsgTipo>("retorno");
  const [destTipo, setDestTipo] = useState<DestinatarioTipo>("todos");
  const [selectedGrupoId, setSelectedGrupoId] = useState("");
  const [selectedClienteIds, setSelectedClienteIds] = useState<number[]>([]);
  const [clienteSearch, setClienteSearch] = useState("");
  const [clientes, setClientes] = useState<any[]>([]);
  const [grupos, setGrupos] = useState<any[]>([]);
  const BASE = import.meta.env.BASE_URL;

  const { data: mensagens = [], isLoading } = useListMensagens(barbeariaId!, { query: { enabled: !!barbeariaId } });
  const { data: modoHumanoData } = useGetModoHumano(barbeariaId!, { query: { enabled: !!barbeariaId } });
  const createMsg = useCreateMensagem();
  const deleteMsg = useDeleteMensagem();

  useEffect(() => {
    if (barbeariaId) {
      fetch(`${BASE}api/barbearias/${barbeariaId}/clientes`, { credentials: "include" })
        .then(r => r.ok ? r.json() : []).then(setClientes).catch(() => {});
      fetch(`${BASE}api/barbearias/${barbeariaId}/noticias/grupos`, { credentials: "include" })
        .then(r => r.ok ? r.json() : []).then(setGrupos).catch(() => {});
    }
  }, [barbeariaId]);

  function invalidate() {
    qc.invalidateQueries({ queryKey: getListMensagensQueryKey(barbeariaId!) });
  }

  function buildDestinatarios(): any[] {
    if (destTipo === "todos") return [{ tipo: "todos" }];
    if (destTipo === "grupo" && selectedGrupoId) return [{ tipo: "grupo", grupoId: parseInt(selectedGrupoId) }];
    if (destTipo === "individual" && selectedClienteIds.length > 0) {
      return selectedClienteIds.map(id => {
        const c = clientes.find((cl: any) => cl.id === id);
        return { tipo: "cliente", clienteId: id, nome: c?.nome || "" };
      });
    }
    return [{ tipo: "todos" }];
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await createMsg.mutateAsync({
        barbeariaId: barbeariaId!,
        data: {
          tipo, titulo: fd.get("titulo") as string, conteudo: fd.get("conteudo") as string,
          destinatarios: buildDestinatarios(), status: "rascunho",
        }
      });
      invalidate(); setDialogOpen(false); resetForm();
      toast({ title: "Mensagem criada" });
    } catch (err: any) {
      toast({ title: "Erro", description: err?.data?.error || err?.message || "Erro ao criar mensagem", variant: "destructive" });
    }
  }

  async function handleSend(msg: any) {
    try {
      await deleteMsg.mutateAsync({ barbeariaId: barbeariaId!, mensagemId: msg.id });
      await createMsg.mutateAsync({
        barbeariaId: barbeariaId!,
        data: { tipo: msg.tipo, titulo: msg.titulo, conteudo: msg.conteudo, destinatarios: msg.destinatarios || [{ tipo: "todos" }], status: "enviada" }
      });
      invalidate();
      toast({ title: "Mensagem enviada" });
    } catch (err: any) {
      toast({ title: "Erro ao enviar", description: err?.data?.error || err?.message || "Erro ao enviar", variant: "destructive" });
    }
  }

  async function handleDelete(msgId: number) {
    try {
      await deleteMsg.mutateAsync({ barbeariaId: barbeariaId!, mensagemId: msgId });
      invalidate();
      toast({ title: "Mensagem removida" });
    } catch { toast({ title: "Erro", variant: "destructive" }); }
  }

  function resetForm() {
    setTipo("retorno"); setDestTipo("todos"); setSelectedGrupoId(""); setSelectedClienteIds([]); setClienteSearch("");
  }
  function toggleCliente(id: number) {
    setSelectedClienteIds(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  }
  function getDestLabel(msg: any) {
    const dests = msg.destinatarios as any[];
    if (!dests || dests.length === 0) return "Todos os clientes";
    if (dests[0]?.tipo === "todos") return "Todos os clientes";
    if (dests[0]?.tipo === "grupo") {
      const g = grupos.find((gr: any) => gr.id === dests[0].grupoId);
      return `Grupo: ${g?.nome || "Grupo #" + dests[0].grupoId}`;
    }
    if (dests[0]?.tipo === "cliente") return `${dests.length} cliente(s) selecionado(s)`;
    return "Todos os clientes";
  }

  const list = mensagens as any[];
  const retornos = list.filter(m => m.tipo === "retorno");
  const promocoes = list.filter(m => m.tipo === "promocao");
  const filteredClientes = clienteSearch
    ? clientes.filter((c: any) => c.nome?.toLowerCase().includes(clienteSearch.toLowerCase()) || c.telefone?.includes(clienteSearch))
    : clientes;
  const modoHumanoAtivo = !!(modoHumanoData as any)?.modoHumano;

  return (
    <AppLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">Mensagens WhatsApp</h1>
          <p className="text-muted-foreground mt-1">Promoções e retornos enviados pelo WhatsApp, com modelos prontos</p>
        </div>
      </div>

      {modoHumanoAtivo && (
        <div className="mb-6 rounded-2xl border border-yellow-500/40 bg-yellow-500/5 p-4 flex items-start gap-3" data-testid="card-modo-humano-aviso">
          <div className="h-10 w-10 rounded-lg bg-yellow-500/20 text-yellow-600 flex items-center justify-center shrink-0">
            <ShieldOff className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <p className="font-semibold text-sm">Modo Humano está ativo</p>
              <Badge variant="secondary" className="text-[10px] bg-yellow-500/20 text-yellow-700">Ativo</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Confirmações, lembretes e aniversários estão indo para a <strong>Inbox → Sugeridas</strong> para envio manual.{" "}
              <Link href="/configuracoes?secao=notificacoes" className="text-primary underline inline-flex items-center gap-1">
                <Settings className="h-3 w-3" /> Configurar
              </Link>
            </p>
          </div>
        </div>
      )}

      <div className="flex gap-1 mb-6 border-b border-border">
        <button
          onClick={() => setTab("campanhas")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${tab === "campanhas" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          data-testid="tab-campanhas"
        >
          <Megaphone className="h-4 w-4" /> Campanhas e Retornos
        </button>
        <button
          onClick={() => setTab("modelos")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${tab === "modelos" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          data-testid="tab-modelos"
        >
          <BookOpen className="h-4 w-4" /> Banco de Modelos
        </button>
      </div>

      {tab === "modelos" ? (
        <BancoDeModelos />
      ) : (
        <>
          <div className="flex justify-end mb-4">
            <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) resetForm(); }}>
              <DialogTrigger asChild><Button data-testid="button-nova-campanha"><Plus className="h-4 w-4 mr-2" /> Nova Mensagem</Button></DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Nova Mensagem</DialogTitle></DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="flex gap-2">
                    <Button type="button" variant={tipo === "retorno" ? "default" : "outline"} onClick={() => setTipo("retorno")} className="flex-1">
                      <Mail className="h-4 w-4 mr-1" /> Retorno
                    </Button>
                    <Button type="button" variant={tipo === "promocao" ? "default" : "outline"} onClick={() => setTipo("promocao")} className="flex-1">
                      <Megaphone className="h-4 w-4 mr-1" /> Promoção
                    </Button>
                  </div>
                  <div><Label>Título</Label><Input name="titulo" required placeholder={tipo === "retorno" ? "Lembrete de retorno" : "Promoção especial"} /></div>
                  <div><Label>Conteúdo</Label><Textarea name="conteudo" required rows={4} placeholder="Escreva o conteúdo da mensagem..." /></div>
                  <div>
                    <Label className="mb-2 block">Destinatários</Label>
                    <div className="flex gap-2 mb-3">
                      <Button type="button" size="sm" variant={destTipo === "todos" ? "default" : "outline"} onClick={() => setDestTipo("todos")}>Todos</Button>
                      <Button type="button" size="sm" variant={destTipo === "grupo" ? "default" : "outline"} onClick={() => setDestTipo("grupo")}>Por Grupo</Button>
                      <Button type="button" size="sm" variant={destTipo === "individual" ? "default" : "outline"} onClick={() => setDestTipo("individual")}>Individual</Button>
                    </div>
                    {destTipo === "grupo" && (
                      <select value={selectedGrupoId} onChange={e => setSelectedGrupoId(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
                        <option value="">Selecione um grupo</option>
                        {grupos.map((g: any) => <option key={g.id} value={g.id}>{g.nome}</option>)}
                      </select>
                    )}
                    {destTipo === "individual" && (
                      <div>
                        <div className="relative mb-2">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input className="pl-10" placeholder="Buscar cliente..." value={clienteSearch} onChange={e => setClienteSearch(e.target.value)} />
                        </div>
                        {selectedClienteIds.length > 0 && <p className="text-xs text-primary mb-2">{selectedClienteIds.length} selecionado(s)</p>}
                        <div className="max-h-40 overflow-y-auto border border-border rounded-lg">
                          {filteredClientes.length === 0 ? (
                            <p className="text-center text-muted-foreground text-sm py-3">Nenhum cliente</p>
                          ) : (
                            filteredClientes.slice(0, 50).map((c: any) => (
                              <button key={c.id} type="button" onClick={() => toggleCliente(c.id)}
                                className={`w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-black/[0.02] border-b border-border last:border-b-0 ${selectedClienteIds.includes(c.id) ? "bg-primary/5" : ""}`}>
                                <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${selectedClienteIds.includes(c.id) ? "bg-primary border-primary" : "border-border"}`}>
                                  {selectedClienteIds.includes(c.id) && <Check className="h-2.5 w-2.5 text-white" />}
                                </div>
                                <span className="text-[13px] truncate">{c.nome}</span>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <Button type="submit" className="w-full" disabled={createMsg.isPending}>Salvar Rascunho</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <Card><CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center"><MessageSquare className="h-5 w-5 text-primary" /></div>
                <span className="text-sm text-muted-foreground">Total</span>
              </div>
              <p className="text-3xl font-bold text-primary">{list.length}</p>
            </CardContent></Card>
            <Card><CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center"><Mail className="h-5 w-5 text-blue-400" /></div>
                <span className="text-sm text-muted-foreground">Retornos</span>
              </div>
              <p className="text-3xl font-bold text-blue-400">{retornos.length}</p>
            </CardContent></Card>
            <Card><CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-9 w-9 rounded-lg bg-yellow-500/10 flex items-center justify-center"><Megaphone className="h-5 w-5 text-yellow-400" /></div>
                <span className="text-sm text-muted-foreground">Promoções</span>
              </div>
              <p className="text-3xl font-bold text-yellow-400">{promocoes.length}</p>
            </CardContent></Card>
          </div>

          {isLoading ? <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />)}</div> :
           list.length === 0 ? <p className="text-center text-muted-foreground py-12">Nenhuma mensagem criada ainda.</p> :
           <div className="space-y-3">
            {list.map((m: any) => (
              <div key={m.id} className="flex items-start gap-4 p-4 rounded-xl border border-border bg-card">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${m.tipo === "retorno" ? "bg-blue-500/10" : "bg-yellow-500/10"}`}>
                  {m.tipo === "retorno" ? <Mail className="h-5 w-5 text-blue-400" /> : <Megaphone className="h-5 w-5 text-yellow-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-sm">{m.titulo}</p>
                    <Badge variant={m.status === "enviada" ? "default" : "secondary"} className="text-xs">
                      {m.status === "enviada" ? "Enviada" : "Rascunho"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{m.conteudo}</p>
                  <p className="text-xs text-muted-foreground mt-1">Para: {getDestLabel(m)}</p>
                  {m.dataEnvio && <p className="text-xs text-muted-foreground">Enviada em: {new Date(m.dataEnvio).toLocaleDateString("pt-BR")}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  {m.status === "rascunho" && (
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-green-400" onClick={() => handleSend(m)}>
                      <Send className="h-4 w-4" />
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400" onClick={() => handleDelete(m.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>}
        </>
      )}
    </AppLayout>
  );
}
