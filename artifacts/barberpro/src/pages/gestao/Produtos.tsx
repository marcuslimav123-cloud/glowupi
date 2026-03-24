import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useListProdutos, useCreateProduto, useUpdateProduto, useDeleteProduto } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Package, AlertTriangle, Edit, Trash2, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type Produto = {
  id: number;
  nome: string;
  preco: number;
  custo: number | null;
  quantidade: number;
  quantidadeMinima: number;
  ativo: boolean;
};

function ProdutoForm({ initial, onSave, onCancel }: { initial?: Partial<Produto>; onSave: (d: any) => void; onCancel: () => void }) {
  const [nome, setNome] = useState(initial?.nome ?? "");
  const [preco, setPreco] = useState(String(initial?.preco ?? ""));
  const [custo, setCusto] = useState(String(initial?.custo ?? ""));
  const [quantidade, setQuantidade] = useState(String(initial?.quantidade ?? "0"));
  const [quantidadeMinima, setQuantidadeMinima] = useState(String(initial?.quantidadeMinima ?? "5"));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ nome, preco: parseFloat(preco), custo: custo ? parseFloat(custo) : null, quantidade: parseInt(quantidade), quantidadeMinima: parseInt(quantidadeMinima) });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Nome do Produto</Label>
        <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Esmalte em Gel, Creme Hidratante" required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Preço de Venda (R$)</Label>
          <Input type="number" step="0.01" min="0" value={preco} onChange={e => setPreco(e.target.value)} placeholder="25.00" required />
        </div>
        <div className="space-y-2">
          <Label>Custo (R$) <span className="text-muted-foreground text-xs">(opcional)</span></Label>
          <Input type="number" step="0.01" min="0" value={custo} onChange={e => setCusto(e.target.value)} placeholder="12.00" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Quantidade em Estoque</Label>
          <Input type="number" min="0" value={quantidade} onChange={e => setQuantidade(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>Estoque Mínimo</Label>
          <Input type="number" min="0" value={quantidadeMinima} onChange={e => setQuantidadeMinima(e.target.value)} required />
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="submit" className="flex-1">Salvar Produto</Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
      </div>
    </form>
  );
}

export default function Produtos() {
  const { barbeariaId } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Produto | null>(null);

  const { data: produtos = [], isLoading } = useListProdutos(barbeariaId!, { query: { enabled: !!barbeariaId } });
  const createMutation = useCreateProduto();
  const updateMutation = useUpdateProduto();
  const deleteMutation = useDeleteProduto();

  const invalidate = () => qc.invalidateQueries({ queryKey: ["/api/barbearias", barbeariaId, "produtos"] });

  const handleSave = async (data: any) => {
    try {
      if (editing) {
        await updateMutation.mutateAsync({ barbeariaId: barbeariaId!, produtoId: editing.id, data });
        toast({ title: "Produto atualizado!" });
      } else {
        await createMutation.mutateAsync({ barbeariaId: barbeariaId!, data });
        toast({ title: "Produto criado!" });
      }
      invalidate();
      setModalOpen(false);
      setEditing(null);
    } catch {
      toast({ title: "Erro ao salvar produto", variant: "destructive" });
    }
  };

  const handleToggle = async (p: Produto) => {
    await updateMutation.mutateAsync({ barbeariaId: barbeariaId!, produtoId: p.id, data: { ativo: !p.ativo } });
    invalidate();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Remover produto?")) return;
    await deleteMutation.mutateAsync({ barbeariaId: barbeariaId!, produtoId: id });
    invalidate();
    toast({ title: "Produto removido" });
  };

  const baixoEstoque = (produtos as Produto[]).filter(p => p.ativo && p.quantidade <= p.quantidadeMinima).length;

  return (
    <AppLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Produtos & Estoque</h1>
          <p className="text-muted-foreground mt-1">Gerencie seu inventário</p>
        </div>
        <Button onClick={() => { setEditing(null); setModalOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Novo Produto
        </Button>
      </div>

      {baixoEstoque > 0 && (
        <div className="mb-6 flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3 text-yellow-400">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span className="text-sm font-medium">{baixoEstoque} produto(s) com estoque baixo ou zerado</span>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-40 bg-card rounded-2xl animate-pulse" />)}
        </div>
      ) : (produtos as Produto[]).length === 0 ? (
        <Card className="text-center py-16">
          <CardContent>
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum produto cadastrado.</p>
            <Button className="mt-4" onClick={() => setModalOpen(true)}>Adicionar primeiro produto</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(produtos as Produto[]).map(p => {
            const baixo = p.quantidade <= p.quantidadeMinima;
            const margem = p.custo && p.preco ? ((p.preco - p.custo) / p.preco * 100).toFixed(0) : null;
            return (
              <Card key={p.id} className={`relative overflow-hidden transition-all hover:shadow-lg ${!p.ativo ? "opacity-50" : ""}`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                        <Package className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{p.nome}</h3>
                        <p className="text-2xl font-bold text-primary mt-1">{formatCurrency(p.preco)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-4">
                    <Badge variant={baixo ? "destructive" : "secondary"} className="text-xs">
                      {baixo && <AlertTriangle className="h-3 w-3 mr-1" />}
                      {p.quantidade} em estoque
                    </Badge>
                    <span className="text-xs text-muted-foreground">mín: {p.quantidadeMinima}</span>
                    {margem && (
                      <Badge variant="outline" className="text-xs ml-auto">
                        <TrendingUp className="h-3 w-3 mr-1 text-green-400" />
                        {margem}% margem
                      </Badge>
                    )}
                  </div>
                  {p.custo && <p className="text-xs text-muted-foreground mb-4">Custo: {formatCurrency(p.custo)}</p>}
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => { setEditing(p); setModalOpen(true); }}>
                      <Edit className="h-3 w-3 mr-1" /> Editar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleToggle(p)} className="text-muted-foreground">
                      {p.ativo ? "Desativar" : "Ativar"}
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(p.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Produto" : "Novo Produto"}</DialogTitle>
          </DialogHeader>
          <ProdutoForm initial={editing ?? {}} onSave={handleSave} onCancel={() => { setModalOpen(false); setEditing(null); }} />
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
