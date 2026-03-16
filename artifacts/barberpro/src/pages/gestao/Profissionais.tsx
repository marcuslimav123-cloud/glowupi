import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useListProfissionais, useCreateProfissional } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Profissionais() {
  const { barbeariaId } = useAuth();
  const { toast } = useToast();
  const { data: profissionais = [], refetch, isLoading } = useListProfissionais(barbeariaId!, { query: { enabled: !!barbeariaId } });
  const createMutation = useCreateProfissional();
  const [isOpen, setIsOpen] = useState(false);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await createMutation.mutateAsync({
        barbeariaId: barbeariaId!,
        data: {
          nomeExibicao: fd.get("nomeExibicao") as string,
          especialidade: fd.get("especialidade") as string,
          comissaoTipo: fd.get("comissaoTipo") as any,
          comissaoValor: Number(fd.get("comissaoValor")),
        }
      });
      toast({ title: "Profissional adicionado!" });
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
          <h1 className="text-3xl font-display font-bold text-foreground">Profissionais</h1>
          <p className="text-muted-foreground mt-1">Gerencie a equipe da barbearia</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="shadow-lg shadow-primary/25"><Plus className="mr-2 h-4 w-4"/> Adicionar Membro</Button>
          </DialogTrigger>
          <DialogContent className="bg-card">
            <DialogHeader><DialogTitle>Novo Profissional</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome de Exibição</Label>
                <Input name="nomeExibicao" required className="bg-background"/>
              </div>
              <div className="space-y-2">
                <Label>Especialidade</Label>
                <Input name="especialidade" placeholder="Ex: Especialista em Degradê" className="bg-background"/>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Comissão</Label>
                  <Select name="comissaoTipo" defaultValue="percentual">
                    <SelectTrigger className="bg-background"><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentual">Percentual (%)</SelectItem>
                      <SelectItem value="valor_fixo">Valor Fixo (R$)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Valor/Porcentagem</Label>
                  <Input type="number" step="0.01" name="comissaoValor" required className="bg-background"/>
                </div>
              </div>
              <Button type="submit" className="w-full mt-4" disabled={createMutation.isPending}>Salvar</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead>Profissional</TableHead>
              <TableHead>Especialidade</TableHead>
              <TableHead>Comissão</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
               <TableRow><TableCell colSpan={5} className="text-center py-8">Carregando...</TableCell></TableRow>
            ) : profissionais.length === 0 ? (
               <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum profissional cadastrado.</TableCell></TableRow>
            ) : (
              profissionais.map(p => (
                <TableRow key={p.id} className="hover:bg-muted/10 transition-colors">
                  <TableCell className="font-medium flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">
                      {p.nomeExibicao.charAt(0)}
                    </div>
                    {p.nomeExibicao}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.especialidade || '-'}</TableCell>
                  <TableCell>
                    {p.comissaoTipo === 'percentual' ? `${p.comissaoValor}%` : `R$ ${p.comissaoValor}`}
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.ativo ? "default" : "secondary"} className={p.ativo ? "bg-green-500/20 text-green-500 border-green-500/30" : ""}>
                      {p.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"><Edit2 className="h-4 w-4"/></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4"/></Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </AppLayout>
  );
}
