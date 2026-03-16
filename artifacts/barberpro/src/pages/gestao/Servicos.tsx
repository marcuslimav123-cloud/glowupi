import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useListServicos, useCreateServico } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Clock, DollarSign, Settings2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function Servicos() {
  const { barbeariaId } = useAuth();
  const { toast } = useToast();
  const { data: servicos = [], refetch, isLoading } = useListServicos(barbeariaId!, { query: { enabled: !!barbeariaId } });
  const createMutation = useCreateServico();
  const [isOpen, setIsOpen] = useState(false);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await createMutation.mutateAsync({
        barbeariaId: barbeariaId!,
        data: {
          nome: fd.get("nome") as string,
          descricao: fd.get("descricao") as string,
          preco: Number(fd.get("preco")),
          duracaoMinutos: Number(fd.get("duracaoMinutos")),
        }
      });
      toast({ title: "Serviço criado!" });
      setIsOpen(false);
      refetch();
    } catch (err) {
      toast({ title: "Erro", variant: "destructive" });
    }
  };

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Serviços</h1>
          <p className="text-muted-foreground mt-1">Catálogo de serviços oferecidos</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="shadow-lg shadow-primary/25"><Plus className="mr-2 h-4 w-4"/> Novo Serviço</Button>
          </DialogTrigger>
          <DialogContent className="bg-card">
            <DialogHeader><DialogTitle>Novo Serviço</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome do Serviço</Label>
                <Input name="nome" required className="bg-background"/>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Preço (R$)</Label>
                  <Input type="number" step="0.01" name="preco" required className="bg-background"/>
                </div>
                <div className="space-y-2">
                  <Label>Duração (minutos)</Label>
                  <Input type="number" name="duracaoMinutos" required className="bg-background"/>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea name="descricao" className="bg-background resize-none"/>
              </div>
              <Button type="submit" className="w-full mt-4" disabled={createMutation.isPending}>Salvar Serviço</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1,2,3].map(i => <div key={i} className="h-48 bg-card rounded-2xl"></div>)}
        </div>
      ) : servicos.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-border">
          <Settings2 className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-foreground">Nenhum serviço cadastrado</h3>
          <p className="text-muted-foreground">Clique no botão acima para criar o primeiro.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {servicos.map(s => (
            <Card key={s.id} className="bg-card border-border shadow-xl hover:shadow-primary/5 hover:border-primary/30 transition-all group overflow-hidden relative">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary opacity-50 group-hover:opacity-100 transition-opacity"></div>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl font-display">{s.nome}</CardTitle>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-2 h-10">{s.descricao || "Sem descrição."}</p>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="flex items-center gap-6 mt-2">
                  <div className="flex items-center gap-2 text-primary font-semibold">
                    <DollarSign className="h-4 w-4" /> {formatCurrency(s.preco)}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
                    <Clock className="h-4 w-4" /> {s.duracaoMinutos} min
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-0 flex justify-end">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">Editar</Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
