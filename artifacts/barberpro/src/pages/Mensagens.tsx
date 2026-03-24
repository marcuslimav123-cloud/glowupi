import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useListMensagens, useCreateMensagem, useDeleteMensagem } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Plus, MessageSquare, Send, Trash2, Mail, Megaphone } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getListMensagensQueryKey } from "@workspace/api-client-react";

type MsgTipo = "retorno" | "promocao";

export default function Mensagens() {
  const { barbeariaId } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tipo, setTipo] = useState<MsgTipo>("retorno");

  const { data: mensagens = [], isLoading } = useListMensagens(barbeariaId!, { query: { enabled: !!barbeariaId } });
  const createMsg = useCreateMensagem();
  const deleteMsg = useDeleteMensagem();

  function invalidate() {
    qc.invalidateQueries({ queryKey: getListMensagensQueryKey(barbeariaId!) });
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await createMsg.mutateAsync({
        barbeariaId: barbeariaId!,
        data: {
          tipo,
          titulo: fd.get("titulo") as string,
          conteudo: fd.get("conteudo") as string,
          status: "rascunho",
        }
      });
      invalidate();
      setDialogOpen(false);
      toast({ title: "Mensagem criada" });
    } catch { toast({ title: "Erro", variant: "destructive" }); }
  }

  async function handleSend(msg: any) {
    try {
      await deleteMsg.mutateAsync({ barbeariaId: barbeariaId!, mensagemId: msg.id });
      await createMsg.mutateAsync({
        barbeariaId: barbeariaId!,
        data: { tipo: msg.tipo, titulo: msg.titulo, conteudo: msg.conteudo, status: "enviada" }
      });
      invalidate();
      toast({ title: "Mensagem enviada" });
    } catch { toast({ title: "Erro ao enviar", variant: "destructive" }); }
  }

  async function handleDelete(msgId: number) {
    try {
      await deleteMsg.mutateAsync({ barbeariaId: barbeariaId!, mensagemId: msgId });
      invalidate();
      toast({ title: "Mensagem removida" });
    } catch { toast({ title: "Erro", variant: "destructive" }); }
  }

  const list = mensagens as any[];
  const retornos = list.filter(m => m.tipo === "retorno");
  const promocoes = list.filter(m => m.tipo === "promocao");

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Mensagens</h1>
          <p className="text-muted-foreground mt-1">Mensagens de retorno e promoções</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Nova Mensagem</Button></DialogTrigger>
          <DialogContent>
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
              <Button type="submit" className="w-full" disabled={createMsg.isPending}>Salvar Rascunho</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center"><MessageSquare className="h-5 w-5 text-primary" /></div>
              <span className="text-sm text-muted-foreground">Total</span>
            </div>
            <p className="text-3xl font-bold text-primary">{list.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center"><Mail className="h-5 w-5 text-blue-400" /></div>
              <span className="text-sm text-muted-foreground">Retornos</span>
            </div>
            <p className="text-3xl font-bold text-blue-400">{retornos.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-9 w-9 rounded-lg bg-yellow-500/10 flex items-center justify-center"><Megaphone className="h-5 w-5 text-yellow-400" /></div>
              <span className="text-sm text-muted-foreground">Promoções</span>
            </div>
            <p className="text-3xl font-bold text-yellow-400">{promocoes.length}</p>
          </CardContent>
        </Card>
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
              {m.dataEnvio && <p className="text-xs text-muted-foreground mt-1">Enviada em: {new Date(m.dataEnvio).toLocaleDateString("pt-BR")}</p>}
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
    </AppLayout>
  );
}
