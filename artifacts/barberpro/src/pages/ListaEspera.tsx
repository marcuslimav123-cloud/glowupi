import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useListListaEspera, useAddToListaEspera, useUpdateListaEspera, useRemoveFromListaEspera } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, ClipboardList, Phone, Check, X, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getListListaEsperaQueryKey } from "@workspace/api-client-react";
import { format } from "date-fns";
import { formatPhone, stripPhone } from "@/lib/utils";

export default function ListaEspera() {
  const { barbeariaId } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [telefoneInput, setTelefoneInput] = useState("");

  const { data: itens = [], isLoading } = useListListaEspera(barbeariaId!, { query: { enabled: !!barbeariaId } });
  const addItem = useAddToListaEspera();
  const updateItem = useUpdateListaEspera();
  const removeItem = useRemoveFromListaEspera();

  function invalidate() {
    qc.invalidateQueries({ queryKey: getListListaEsperaQueryKey(barbeariaId!) });
  }

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await addItem.mutateAsync({
        barbeariaId: barbeariaId!,
        data: {
          clienteNome: fd.get("clienteNome") as string,
          clienteTelefone: stripPhone(telefoneInput),
          data: fd.get("data") as string || format(new Date(), "yyyy-MM-dd"),
          observacao: fd.get("observacao") as string,
        }
      });
      invalidate();
      setDialogOpen(false);
      setTelefoneInput("");
      toast({ title: "Adicionado à lista de espera" });
    } catch { toast({ title: "Erro", variant: "destructive" }); }
  }

  async function handleStatus(itemId: number, status: string) {
    try {
      await updateItem.mutateAsync({ barbeariaId: barbeariaId!, itemId, data: { status } });
      invalidate();
      toast({ title: status === "confirmado" ? "Cliente confirmado" : "Removido da espera" });
    } catch { toast({ title: "Erro", variant: "destructive" }); }
  }

  async function handleRemove(itemId: number) {
    try {
      await removeItem.mutateAsync({ barbeariaId: barbeariaId!, itemId });
      invalidate();
      toast({ title: "Removido da lista" });
    } catch { toast({ title: "Erro", variant: "destructive" }); }
  }

  const pendentes = (itens as any[]).filter(i => i.status === "esperando");
  const outros = (itens as any[]).filter(i => i.status !== "esperando");

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Lista de Espera</h1>
          <p className="text-muted-foreground mt-1">Gerencie clientes aguardando horário</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Adicionar</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Adicionar à Lista de Espera</DialogTitle></DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4">
              <div><Label>Nome do Cliente</Label><Input name="clienteNome" required /></div>
              <div><Label>Telefone</Label><Input value={telefoneInput} onChange={e => setTelefoneInput(formatPhone(e.target.value))} placeholder="(99) 91234-5678" /></div>
              <div><Label>Data Desejada</Label><Input name="data" type="date" defaultValue={format(new Date(), "yyyy-MM-dd")} /></div>
              <div><Label>Observação</Label><Input name="observacao" placeholder="Preferência de horário, etc." /></div>
              <Button type="submit" className="w-full" disabled={addItem.isPending}>Adicionar</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-9 w-9 rounded-lg bg-yellow-500/10 flex items-center justify-center"><ClipboardList className="h-5 w-5 text-yellow-400" /></div>
              <span className="text-sm text-muted-foreground">Aguardando</span>
            </div>
            <p className="text-3xl font-bold text-yellow-400">{pendentes.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-9 w-9 rounded-lg bg-green-500/10 flex items-center justify-center"><Check className="h-5 w-5 text-green-400" /></div>
              <span className="text-sm text-muted-foreground">Confirmados</span>
            </div>
            <p className="text-3xl font-bold text-green-400">{(itens as any[]).filter(i => i.status === "confirmado").length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center"><ClipboardList className="h-5 w-5 text-primary" /></div>
              <span className="text-sm text-muted-foreground">Total</span>
            </div>
            <p className="text-3xl font-bold text-primary">{(itens as any[]).length}</p>
          </CardContent>
        </Card>
      </div>

      {pendentes.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Aguardando ({pendentes.length})</h2>
          <div className="space-y-3">
            {pendentes.map((item: any) => (
              <div key={item.id} className="flex items-center gap-4 p-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5">
                <div className="h-10 w-10 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center font-bold text-yellow-400">
                  {item.clienteNome?.charAt(0)?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{item.clienteNome}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {item.clienteTelefone && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Phone className="h-3 w-3" />{formatPhone(item.clienteTelefone)}</span>}
                    {item.data && <span className="text-xs text-muted-foreground">{item.data}</span>}
                  </div>
                  {item.observacao && <p className="text-xs text-muted-foreground mt-1">{item.observacao}</p>}
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" className="text-green-400 border-green-500/20 hover:bg-green-500/10" onClick={() => handleStatus(item.id, "confirmado")}>
                    <Check className="h-4 w-4 mr-1" /> Confirmar
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400" onClick={() => handleRemove(item.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {outros.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Histórico</h2>
          <div className="space-y-2">
            {outros.map((item: any) => (
              <div key={item.id} className="flex items-center gap-4 p-3 rounded-xl border border-border bg-card/50">
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.clienteNome}</p>
                  <p className="text-xs text-muted-foreground">{item.data}</p>
                </div>
                <Badge variant={item.status === "confirmado" ? "default" : "secondary"}>{item.status}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {(itens as any[]).length === 0 && !isLoading && (
        <p className="text-center text-muted-foreground py-12">Nenhum cliente na lista de espera.</p>
      )}
    </AppLayout>
  );
}
