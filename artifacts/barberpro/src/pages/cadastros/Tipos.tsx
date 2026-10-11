import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useApiList, useApiCreate, useApiUpdate, useApiDelete } from "@/hooks/useCrudApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, Tag, CreditCard } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type TabKey = "categoria_servico" | "categoria_profissional" | "categoria_produto" | "forma_pagamento" | "tipo_despesa" | "tipo_receita" | "bandeira";

const TABS: { key: TabKey; label: string; singular: string; queryParam: string; hint: string }[] = [
  { key: "categoria_servico", label: "Categorias de serviço", singular: "categoria de serviço", queryParam: "", hint: "Agrupe seus serviços (ex.: Cabelo, Unhas, Barba) para organizar o catálogo e a página de agendamento." },
  { key: "categoria_profissional", label: "Categorias de profissional", singular: "categoria de profissional", queryParam: "profissional", hint: "Ex.: Cabeleireira, Manicure, Barbeiro. Ajuda o cliente a filtrar quem atende." },
  { key: "categoria_produto", label: "Categorias de produto", singular: "categoria de produto", queryParam: "produto", hint: "Ex.: Shampoo, Finalizadores, Bebidas. Usado no estoque e nos relatórios." },
  { key: "forma_pagamento", label: "Formas de pagamento", singular: "forma de pagamento", queryParam: "pagamento", hint: "O que aparece na hora de fechar a comanda: Dinheiro, Pix, Cartão de crédito…" },
  { key: "bandeira", label: "Bandeiras de cartão", singular: "bandeira", queryParam: "bandeira", hint: "Visa, Master, Elo… com a taxa da maquininha e o prazo para o dinheiro cair." },
  { key: "tipo_despesa", label: "Tipos de despesa", singular: "tipo de despesa", queryParam: "despesa", hint: "Ex.: Aluguel, Luz, Produtos. Usado nas saídas do caixa." },
  { key: "tipo_receita", label: "Tipos de receita", singular: "tipo de receita", queryParam: "receita", hint: "Ex.: Venda avulsa, Aluguel de cadeira. Usado nas entradas do caixa." },
];

function tabFromSearch(): TabKey {
  const cat = new URLSearchParams(window.location.search).get("cat");
  return TABS.find(t => t.queryParam === (cat || ""))?.key ?? "categoria_servico";
}

export default function Tipos() {
  const { barbeariaId } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<TabKey>(tabFromSearch);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const [formIsCartao, setFormIsCartao] = useState(false);
  const [formMultPontos, setFormMultPontos] = useState("");
  const [formTaxaOp, setFormTaxaOp] = useState("");
  const [formTipoBandeira, setFormTipoBandeira] = useState("");
  const [formDiasReceb, setFormDiasReceb] = useState("");
  const [formDiasUteis, setFormDiasUteis] = useState(false);

  useEffect(() => { setTab(tabFromSearch()); }, [window.location.search]);

  const isFormaPagamento = tab === "forma_pagamento";
  const isBandeira = tab === "bandeira";
  const tiposPath = `/barbearias/${barbeariaId}/tipos`;

  const { data: tipos = [], isLoading } = useApiList("tipos", tiposPath, !!barbeariaId);
  const createTipo = useApiCreate("tipos", tiposPath);
  const updateTipo = useApiUpdate("tipos", tiposPath);
  const deleteTipo = useApiDelete("tipos", tiposPath);

  const current = TABS.find(t => t.key === tab)!;
  const filtered = (tipos as any[]).filter(t => t.categoria === tab);

  function resetFormExtras(item?: any) {
    setFormIsCartao(item?.isCartao ?? false);
    setFormMultPontos(item?.multiplicadorPontos ?? "");
    setFormTaxaOp(item?.taxaOperadora ?? "");
    setFormTipoBandeira(item?.tipoBandeira ?? "");
    setFormDiasReceb(item?.diasRecebimento != null ? String(item.diasRecebimento) : "");
    setFormDiasUteis(item?.diasUteis ?? false);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data: Record<string, any> = {
      categoria: tab,
      nome: String(fd.get("nome") || "").trim(),
      descricao: String(fd.get("descricao") || "").trim(),
    };
    if (!data.nome) return;
    if (isFormaPagamento) {
      data.isCartao = formIsCartao;
      data.multiplicadorPontos = formMultPontos ? Number(formMultPontos) : null;
    }
    if (isBandeira) {
      data.taxaOperadora = formTaxaOp ? Number(formTaxaOp) : null;
      data.tipoBandeira = formTipoBandeira || null;
      data.diasRecebimento = formDiasReceb ? Number(formDiasReceb) : null;
      data.diasUteis = formDiasUteis;
    }
    try {
      if (editing) {
        await updateTipo.mutateAsync({ id: editing.id, ...data });
        toast({ title: "Alterações salvas" });
      } else {
        await createTipo.mutateAsync(data);
        toast({ title: `${current.singular[0].toUpperCase()}${current.singular.slice(1)} criada` });
      }
      setDialogOpen(false);
      setEditing(null);
    } catch {
      toast({ title: "Não foi possível salvar", description: "Verifique os dados e tente de novo.", variant: "destructive" });
    }
  }

  async function handleToggle(item: any) {
    try { await updateTipo.mutateAsync({ id: item.id, ativo: !item.ativo }); }
    catch { toast({ title: "Não foi possível alterar", variant: "destructive" }); }
  }

  async function handleDelete(item: any) {
    if (!window.confirm(`Excluir "${item.nome}"? Registros antigos continuam com esse nome, mas ele não aparecerá mais para escolher.`)) return;
    try { await deleteTipo.mutateAsync(item.id); toast({ title: "Excluído" }); }
    catch { toast({ title: "Não foi possível excluir", variant: "destructive" }); }
  }

  function openNew() { setEditing(null); resetFormExtras(); setDialogOpen(true); }
  function openEdit(item: any) { setEditing(item); resetFormExtras(item); setDialogOpen(true); }

  function renderItemBadges(item: any) {
    if (isFormaPagamento) {
      return (
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {item.isCartao && <Badge variant="outline" className="text-xs gap-1"><CreditCard className="h-3 w-3" />Cartão</Badge>}
          {item.multiplicadorPontos && <Badge variant="outline" className="text-xs">Pontos ×{item.multiplicadorPontos}</Badge>}
        </div>
      );
    }
    if (isBandeira) {
      return (
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {item.tipoBandeira && <Badge variant="outline" className="text-xs">{item.tipoBandeira === "ambos" ? "Crédito e débito" : item.tipoBandeira === "credito" ? "Crédito" : "Débito"}</Badge>}
          {item.taxaOperadora != null && item.taxaOperadora !== "" && <Badge variant="outline" className="text-xs">Taxa {item.taxaOperadora}%</Badge>}
          {item.diasRecebimento != null && (
            <Badge variant="outline" className="text-xs">Recebe em {item.diasRecebimento} {item.diasUteis ? "dias úteis" : "dias"}</Badge>
          )}
        </div>
      );
    }
    return null;
  }

  return (
    <AppLayout>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">Categorias e tipos</h1>
          <p className="text-muted-foreground mt-1 text-sm">Listas usadas nos cadastros, no caixa e nos relatórios.</p>
        </div>
        <Button onClick={openNew} className="shrink-0">
          <Plus className="h-4 w-4 mr-2" /> Nova {current.singular.split(" ")[0]}
        </Button>
      </div>

      <div className="flex gap-2 mb-3 overflow-x-auto pb-1 -mx-1 px-1">
        {TABS.map(t => (
          <Button key={t.key} variant={tab === t.key ? "default" : "outline"} size="sm" className="shrink-0 rounded-full" onClick={() => setTab(t.key)}>
            {t.label}
          </Button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mb-5">{current.hint}</p>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-14 rounded-2xl border border-dashed border-border">
          <Tag className="h-8 w-8 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm font-medium">Nenhuma {current.singular} cadastrada</p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">{current.hint}</p>
          <Button size="sm" variant="outline" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Cadastrar a primeira</Button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item: any) => (
            <div key={item.id} className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border border-border bg-card ${item.ativo ? "" : "opacity-60"}`}>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                {isBandeira || isFormaPagamento ? <CreditCard className="h-5 w-5 text-primary" /> : <Tag className="h-5 w-5 text-primary" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{item.nome}</p>
                {item.descricao && <p className="text-xs text-muted-foreground truncate">{item.descricao}</p>}
                {renderItemBadges(item)}
              </div>
              <Switch checked={item.ativo} onCheckedChange={() => handleToggle(item)} title={item.ativo ? "Ativo" : "Inativo"} />
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(item)} title="Editar">
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={() => handleDelete(item)} title="Excluir">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className={isBandeira ? "max-w-lg" : ""}>
          <DialogHeader><DialogTitle>{editing ? "Editar" : "Nova"} {current.singular}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><Label>Nome</Label><Input name="nome" required autoFocus defaultValue={editing?.nome || ""} key={editing?.id || "new"} className="mt-1" /></div>
            <div><Label>Descrição <span className="text-muted-foreground font-normal">(opcional)</span></Label><Input name="descricao" defaultValue={editing?.descricao || ""} key={(editing?.id || "new") + "_desc"} className="mt-1" /></div>

            {isFormaPagamento && (
              <>
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <Label>É cartão?</Label>
                    <p className="text-xs text-muted-foreground">Pede a bandeira ao fechar a comanda.</p>
                  </div>
                  <Switch checked={formIsCartao} onCheckedChange={setFormIsCartao} />
                </div>
                <div>
                  <Label>Multiplicador de pontos de fidelidade</Label>
                  <Input type="number" step="0.01" min="0" placeholder="1 (padrão)" value={formMultPontos} onChange={e => setFormMultPontos(e.target.value)} className="mt-1" />
                  <p className="text-xs text-muted-foreground mt-1">Ex.: 2 = pontos em dobro quando o cliente paga assim.</p>
                </div>
              </>
            )}

            {isBandeira && (
              <>
                <div>
                  <Label>Tipo</Label>
                  <Select value={formTipoBandeira || "__none__"} onValueChange={v => setFormTipoBandeira(v === "__none__" ? "" : v)}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Não informar</SelectItem>
                      <SelectItem value="credito">Crédito</SelectItem>
                      <SelectItem value="debito">Débito</SelectItem>
                      <SelectItem value="ambos">Crédito e débito</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Taxa da maquininha (%)</Label>
                    <Input type="number" step="0.01" min="0" max="100" placeholder="Ex.: 2,99" value={formTaxaOp} onChange={e => setFormTaxaOp(e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label>Dias para receber</Label>
                    <Input type="number" min="0" placeholder="Ex.: 30" value={formDiasReceb} onChange={e => setFormDiasReceb(e.target.value)} className="mt-1" />
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <Label>Contar em dias úteis</Label>
                  <Switch checked={formDiasUteis} onCheckedChange={setFormDiasUteis} />
                </div>
              </>
            )}
            <Button type="submit" className="w-full" disabled={createTipo.isPending || updateTipo.isPending}>
              {editing ? "Salvar" : "Criar"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
