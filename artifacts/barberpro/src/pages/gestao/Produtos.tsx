import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useListProdutos, useCreateProduto, useUpdateProduto, useDeleteProduto, useListMovimentacoesEstoque, useCreateMovimentacaoEstoque } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUpload } from "@/components/ImageUpload";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Package, AlertTriangle, Edit, Trash2, TrendingUp, ArrowDownCircle, ArrowUpCircle, History, Barcode, CalendarClock } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type Produto = {
  id: number;
  nome: string;
  preco: number;
  custo: number | null;
  quantidade: number;
  quantidadeMinima: number;
  codigoBarras?: string | null;
  validade?: string | null;
  imagemUrl?: string | null;
  ativo: boolean;
};

type Movimentacao = {
  id: number;
  tipo: string;
  quantidade: number;
  motivo: string;
  observacao?: string | null;
  createdAt: string;
};

function ProdutoForm({ initial, onSave, onCancel }: { initial?: Partial<Produto>; onSave: (d: any) => void; onCancel: () => void }) {
  const [nome, setNome] = useState(initial?.nome ?? "");
  const [preco, setPreco] = useState(String(initial?.preco ?? ""));
  const [custo, setCusto] = useState(String(initial?.custo ?? ""));
  const [quantidade, setQuantidade] = useState(String(initial?.quantidade ?? "0"));
  const [quantidadeMinima, setQuantidadeMinima] = useState(String(initial?.quantidadeMinima ?? "5"));
  const [codigoBarras, setCodigoBarras] = useState(initial?.codigoBarras ?? "");
  const [validade, setValidade] = useState(initial?.validade ?? "");
  const [imagemUrl, setImagemUrl] = useState<string | null>(initial?.imagemUrl ?? null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      nome,
      preco: parseFloat(preco),
      custo: custo ? parseFloat(custo) : null,
      quantidade: parseInt(quantidade),
      quantidadeMinima: parseInt(quantidadeMinima),
      codigoBarras: codigoBarras || null,
      validade: validade || null,
      imagemUrl,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Foto do Produto</Label>
        <ImageUpload
          value={imagemUrl}
          onChange={setImagemUrl}
          shape="square"
          size="md"
          placeholder={<Package className="h-6 w-6 text-muted-foreground" />}
          compressMaxDimension={800}
        />
      </div>
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
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5"><Barcode className="h-3.5 w-3.5" /> Código de Barras</Label>
          <Input value={codigoBarras} onChange={e => setCodigoBarras(e.target.value)} placeholder="7891234567890" />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5"><CalendarClock className="h-3.5 w-3.5" /> Validade</Label>
          <Input type="date" value={validade} onChange={e => setValidade(e.target.value)} />
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="submit" className="flex-1">Salvar Produto</Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
      </div>
    </form>
  );
}

function MovimentacaoDialog({ produto, barbeariaId, onClose }: { produto: Produto; barbeariaId: number; onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: movimentacoes = [] } = useListMovimentacoesEstoque(barbeariaId, produto.id, { query: { enabled: true } });
  const createMov = useCreateMovimentacaoEstoque();

  const [tipo, setTipo] = useState<string>("entrada");
  const [quantidade, setQuantidade] = useState("");
  const [motivo, setMotivo] = useState("");
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMov.mutateAsync({
        barbeariaId,
        produtoId: produto.id,
        data: { tipo, quantidade: parseInt(quantidade), motivo, barbeariaId, produtoId: produto.id }
      });
      toast({ title: "Movimentação registrada!" });
      qc.invalidateQueries({ queryKey: [`/api/barbearias/${barbeariaId}/produtos/${produto.id}/movimentacoes`] });
      qc.invalidateQueries({ queryKey: ["/api/barbearias", barbeariaId, "produtos"] });
      setShowForm(false);
      setQuantidade("");
      setMotivo("");
    } catch {
      toast({ title: "Erro ao registrar", variant: "destructive" });
    }
  };

  return (
    <DialogContent className="bg-card border-border sm:max-w-[520px] max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="text-xl font-display flex items-center gap-2">
          <History className="h-5 w-5 text-primary" /> Estoque: {produto.nome}
        </DialogTitle>
      </DialogHeader>

      <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border">
        <div className="text-center">
          <p className="text-2xl font-bold text-foreground">{produto.quantidade}</p>
          <p className="text-xs text-muted-foreground">em estoque</p>
        </div>
        <div className="h-10 w-px bg-border" />
        <div className="text-center">
          <p className="text-lg font-semibold text-muted-foreground">{produto.quantidadeMinima}</p>
          <p className="text-xs text-muted-foreground">mínimo</p>
        </div>
        <Button size="sm" className="ml-auto" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-3 w-3 mr-1" /> Nova Movimentação
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-3 p-3 rounded-xl border border-primary/20 bg-primary/5">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger className="h-9 bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">
                    <span className="flex items-center gap-1.5"><ArrowDownCircle className="h-3.5 w-3.5 text-green-500" /> Entrada</span>
                  </SelectItem>
                  <SelectItem value="saida">
                    <span className="flex items-center gap-1.5"><ArrowUpCircle className="h-3.5 w-3.5 text-red-500" /> Saída</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Quantidade</Label>
              <Input type="number" min="1" value={quantidade} onChange={e => setQuantidade(e.target.value)} required className="h-9 bg-background" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Motivo</Label>
            <Input value={motivo} onChange={e => setMotivo(e.target.value)} required placeholder="Ex: Compra fornecedor, Uso interno" className="h-9 bg-background" />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" className="flex-1" disabled={createMov.isPending}>
              {createMov.isPending ? "Salvando..." : "Registrar"}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
          </div>
        </form>
      )}

      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground mb-2">Histórico de Movimentações</p>
        {(movimentacoes as Movimentacao[]).length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhuma movimentação registrada</p>
        ) : (
          <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
            {(movimentacoes as Movimentacao[]).map(m => (
              <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border/50 hover:bg-muted/20 transition-colors">
                {m.tipo === "entrada" ? (
                  <ArrowDownCircle className="h-5 w-5 text-green-500 shrink-0" />
                ) : (
                  <ArrowUpCircle className="h-5 w-5 text-red-500 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{m.motivo}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(m.createdAt).toLocaleDateString('pt-BR')} às {new Date(m.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <Badge variant={m.tipo === "entrada" ? "default" : "destructive"} className={`text-xs shrink-0 ${m.tipo === "entrada" ? "bg-green-500/15 text-green-400 border-green-500/25" : ""}`}>
                  {m.tipo === "entrada" ? "+" : "-"}{m.quantidade}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </DialogContent>
  );
}

export default function Produtos() {
  const { barbeariaId } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Produto | null>(null);
  const [movProduto, setMovProduto] = useState<Produto | null>(null);

  const { data: produtos = [], isLoading } = useListProdutos(barbeariaId!, { query: { enabled: !!barbeariaId } });
  const createMutation = useCreateProduto();
  const updateMutation = useUpdateProduto();
  const deleteMutation = useDeleteProduto();

  const invalidate = () => qc.invalidateQueries({ queryKey: ["/api/barbearias", barbeariaId, "produtos"] });

  const queryKey = ["/api/barbearias", barbeariaId, "produtos"];

  const handleSave = async (data: any) => {
    const snapshot = qc.getQueryData<Produto[]>(queryKey);
    try {
      if (editing) {
        qc.setQueryData(queryKey, (old: Produto[] | undefined) =>
          (old || []).map(p => p.id === editing.id ? { ...p, ...data } : p)
        );
        await updateMutation.mutateAsync({ barbeariaId: barbeariaId!, produtoId: editing.id, data });
        toast({ title: "Produto atualizado!" });
      } else {
        const tempId = -Date.now();
        qc.setQueryData(queryKey, (old: Produto[] | undefined) =>
          [...(old || []), { ...data, id: tempId, ativo: true } as Produto]
        );
        await createMutation.mutateAsync({ barbeariaId: barbeariaId!, data });
        toast({ title: "Produto criado!" });
      }
      setModalOpen(false);
      setEditing(null);
    } catch {
      qc.setQueryData(queryKey, snapshot);
      toast({ title: "Erro ao salvar produto", variant: "destructive" });
    } finally {
      invalidate();
    }
  };

  const handleToggle = async (p: Produto) => {
    const snapshot = qc.getQueryData<Produto[]>(queryKey);
    qc.setQueryData(queryKey, (old: Produto[] | undefined) =>
      (old || []).map(item => item.id === p.id ? { ...item, ativo: !item.ativo } : item)
    );
    try {
      await updateMutation.mutateAsync({ barbeariaId: barbeariaId!, produtoId: p.id, data: { ativo: !p.ativo } });
    } catch {
      qc.setQueryData(queryKey, snapshot);
      toast({ title: "Erro ao alterar status", variant: "destructive" });
    } finally {
      invalidate();
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Remover produto?")) return;
    const snapshot = qc.getQueryData<Produto[]>(queryKey);
    qc.setQueryData(queryKey, (old: Produto[] | undefined) =>
      (old || []).filter(p => p.id !== id)
    );
    try {
      await deleteMutation.mutateAsync({ barbeariaId: barbeariaId!, produtoId: id });
      toast({ title: "Produto removido" });
    } catch {
      qc.setQueryData(queryKey, snapshot);
      toast({ title: "Erro ao remover produto", variant: "destructive" });
    } finally {
      invalidate();
    }
  };

  const baixoEstoque = (produtos as Produto[]).filter(p => p.ativo && p.quantidade <= p.quantidadeMinima).length;

  const isExpiringSoon = (validade: string | null | undefined) => {
    if (!validade) return false;
    const diff = new Date(validade).getTime() - Date.now();
    return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000;
  };

  const isExpired = (validade: string | null | undefined) => {
    if (!validade) return false;
    return new Date(validade).getTime() < Date.now();
  };

  const expiringCount = (produtos as Produto[]).filter(p => p.ativo && (isExpiringSoon(p.validade) || isExpired(p.validade))).length;

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

      {(baixoEstoque > 0 || expiringCount > 0) && (
        <div className="mb-6 space-y-2">
          {baixoEstoque > 0 && (
            <div className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3 text-yellow-400">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span className="text-sm font-medium">{baixoEstoque} produto(s) com estoque baixo ou zerado</span>
            </div>
          )}
          {expiringCount > 0 && (
            <div className="flex items-center gap-3 bg-orange-500/10 border border-orange-500/30 rounded-xl px-4 py-3 text-orange-400">
              <CalendarClock className="h-5 w-5 shrink-0" />
              <span className="text-sm font-medium">{expiringCount} produto(s) com validade próxima ou vencido(s)</span>
            </div>
          )}
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
            const expired = isExpired(p.validade);
            const expiring = isExpiringSoon(p.validade);
            return (
              <Card key={p.id} className={`relative overflow-hidden transition-all hover:shadow-lg ${!p.ativo ? "opacity-50" : ""}`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 overflow-hidden shrink-0">
                        {p.imagemUrl ? (
                          <img src={p.imagemUrl} alt={p.nome} className="h-full w-full object-cover" />
                        ) : (
                          <Package className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{p.nome}</h3>
                        <p className="text-2xl font-bold text-primary mt-1">{formatCurrency(p.preco)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
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
                  {p.codigoBarras && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                      <Barcode className="h-3 w-3" /> {p.codigoBarras}
                    </div>
                  )}
                  {p.validade && (
                    <div className={`flex items-center gap-1.5 text-xs mb-2 ${expired ? "text-red-400" : expiring ? "text-orange-400" : "text-muted-foreground"}`}>
                      <CalendarClock className="h-3 w-3" />
                      {expired ? "Vencido" : expiring ? "Vence em breve:" : "Val:"} {new Date(p.validade).toLocaleDateString('pt-BR')}
                    </div>
                  )}
                  {p.custo != null && <p className="text-xs text-muted-foreground mb-3">Custo: {formatCurrency(p.custo)}</p>}
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => setMovProduto(p)}>
                      <History className="h-3 w-3 mr-1" /> Estoque
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setEditing(p); setModalOpen(true); }}>
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(p.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Produto" : "Novo Produto"}</DialogTitle>
          </DialogHeader>
          <ProdutoForm initial={editing ?? {}} onSave={handleSave} onCancel={() => { setModalOpen(false); setEditing(null); }} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!movProduto} onOpenChange={v => { if (!v) setMovProduto(null); }}>
        {movProduto && barbeariaId && (
          <MovimentacaoDialog produto={movProduto} barbeariaId={barbeariaId} onClose={() => setMovProduto(null)} />
        )}
      </Dialog>
    </AppLayout>
  );
}
