import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useGetRelatorioFaturamento, useGetRelatorioComissoes, useListContasFinanceiras, useCreateContaFinanceira, useDeleteContaFinanceira } from "@workspace/api-client-react";
import { useApiList } from "@/hooks/useCrudApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, apiUrl } from "@/lib/utils";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { format, subDays, subMonths } from "date-fns";
import { TrendingUp, TrendingDown, DollarSign, Award, Plus, Trash2, Check, AlertCircle, Receipt } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getListContasFinanceirasQueryKey } from "@workspace/api-client-react";

type TabKey = "resumo" | "pagar" | "receber";

export default function Financeiro() {
  const { barbeariaId } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabKey>("resumo");
  const [dataInicio] = useState(format(subDays(new Date(), 29), "yyyy-MM-dd"));
  const [dataFim] = useState(format(new Date(), "yyyy-MM-dd"));
  const [mes] = useState(format(new Date(), "yyyy-MM"));
  const [mesPrev] = useState(format(subMonths(new Date(), 1), "yyyy-MM"));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [baixaOpen, setBaixaOpen] = useState(false);
  const [baixaConta, setBaixaConta] = useState<any>(null);
  const [baixaData, setBaixaData] = useState(format(new Date(), "yyyy-MM-dd"));
  const [baixaForma, setBaixaForma] = useState("dinheiro");
  const [submitting, setSubmitting] = useState(false);
  const [formTipo, setFormTipo] = useState<"pagar" | "receber">("pagar");
  const [formCategoria, setFormCategoria] = useState("");

  const tiposPath = `/barbearias/${barbeariaId}/tipos`;
  const { data: tipos = [] } = useApiList("tipos", tiposPath, !!barbeariaId);
  const tiposArr = tipos as any[];
  const categoriasOptions = tiposArr
    .filter(t => t.ativo && (formTipo === "pagar" ? t.categoria === "tipo_despesa" : t.categoria === "tipo_receita"))
    .map(t => t.nome);

  const { data: fat } = useGetRelatorioFaturamento(barbeariaId!, { dataInicio, dataFim }, { query: { enabled: !!barbeariaId } });
  const { data: com } = useGetRelatorioComissoes(barbeariaId!, { mes }, { query: { enabled: !!barbeariaId } });
  const { data: comPrev } = useGetRelatorioComissoes(barbeariaId!, { mes: mesPrev }, { query: { enabled: !!barbeariaId } });
  const { data: contas = [] } = useListContasFinanceiras(barbeariaId!, { query: { enabled: !!barbeariaId } });
  const createConta = useCreateContaFinanceira();
  const deleteConta = useDeleteContaFinanceira();

  const totalComAtual = Array.isArray(com) ? com.reduce((s: number, p: any) => s + p.comissaoTotal, 0) : 0;
  const totalComPrev = Array.isArray(comPrev) ? comPrev.reduce((s: number, p: any) => s + p.comissaoTotal, 0) : 0;
  const variacao = totalComPrev > 0 ? ((totalComAtual - totalComPrev) / totalComPrev) * 100 : 0;

  const contasPagar = (contas as any[]).filter(c => c.tipo === "pagar");
  const contasReceber = (contas as any[]).filter(c => c.tipo === "receber");
  const totalPagar = contasPagar.filter(c => c.status === "pendente").reduce((s, c) => s + c.valor, 0);
  const totalReceber = contasReceber.filter(c => c.status === "pendente").reduce((s, c) => s + c.valor, 0);

  async function handleCreateConta(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await createConta.mutateAsync({
        barbeariaId: barbeariaId!,
        data: {
          tipo: formTipo,
          descricao: fd.get("descricao") as string,
          categoria: formCategoria || (fd.get("categoriaText") as string) || "",
          valor: parseFloat(fd.get("valor") as string),
          dataVencimento: fd.get("dataVencimento") as string,
          status: "pendente",
        }
      });
      qc.invalidateQueries({ queryKey: getListContasFinanceirasQueryKey(barbeariaId!) });
      setDialogOpen(false);
      toast({ title: "Conta criada com sucesso" });
    } catch { toast({ title: "Erro ao criar conta", variant: "destructive" }); }
  }

  function openBaixa(conta: any) {
    setBaixaConta(conta);
    setBaixaData(format(new Date(), "yyyy-MM-dd"));
    setBaixaForma("dinheiro");
    setBaixaOpen(true);
  }

  async function handleBaixa() {
    if (!baixaConta) return;
    setSubmitting(true);
    try {
      const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/financeiro/${baixaConta.id}/baixa`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ dataPagamento: baixaData, formaPagamento: baixaForma }),
      });
      if (res.ok) {
        qc.invalidateQueries({ queryKey: getListContasFinanceirasQueryKey(barbeariaId!) });
        setBaixaOpen(false);
        setBaixaConta(null);
        toast({ title: "Baixa realizada com sucesso!" });
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: err.error || "Erro ao dar baixa", variant: "destructive" });
      }
    } catch { toast({ title: "Erro ao dar baixa", variant: "destructive" }); }
    finally { setSubmitting(false); }
  }

  async function handleDeleteConta(contaId: number) {
    try {
      await deleteConta.mutateAsync({ barbeariaId: barbeariaId!, contaId });
      qc.invalidateQueries({ queryKey: getListContasFinanceirasQueryKey(barbeariaId!) });
      toast({ title: "Conta removida" });
    } catch { toast({ title: "Erro", variant: "destructive" }); }
  }

  function renderContasList(list: any[], tipo: string) {
    if (list.length === 0) return <p className="text-muted-foreground text-sm text-center py-8">Nenhuma conta a {tipo} cadastrada.</p>;
    return (
      <div className="space-y-3">
        {list.map((c: any) => (
          <div key={c.id} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card">
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${c.tipo === "pagar" ? "bg-red-500/10" : "bg-green-500/10"}`}>
              <Receipt className={`h-5 w-5 ${c.tipo === "pagar" ? "text-red-400" : "text-green-400"}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{c.descricao}</p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-xs text-muted-foreground">{c.categoria || "Geral"}</span>
                {c.dataVencimento && <span className="text-xs text-muted-foreground">Venc: {c.dataVencimento}</span>}
                {c.dataPagamento && <span className="text-xs text-green-500">Pago: {c.dataPagamento}</span>}
                {c.formaPagamento && c.status === "paga" && <span className="text-xs text-muted-foreground">({c.formaPagamento})</span>}
              </div>
            </div>
            <div className="text-right">
              <p className={`font-bold ${c.tipo === "pagar" ? "text-red-400" : "text-green-400"}`}>{formatCurrency(c.valor)}</p>
              <Badge variant={c.status === "paga" ? "default" : "secondary"} className="text-xs mt-1">
                {c.status === "paga" ? "Paga" : "Pendente"}
              </Badge>
            </div>
            <div className="flex gap-1">
              {c.status === "pendente" && (
                <Button size="sm" variant="outline" className="h-8 text-[12px] text-green-600 border-green-200 hover:bg-green-50" onClick={() => openBaixa(c)}>
                  <Check className="h-3.5 w-3.5 mr-1" />Dar Baixa
                </Button>
              )}
              <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:text-red-300" onClick={() => handleDeleteConta(c.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const TABS: { key: TabKey; label: string }[] = [
    { key: "resumo", label: "Resumo" },
    { key: "pagar", label: `A Pagar (${contasPagar.length})` },
    { key: "receber", label: `A Receber (${contasReceber.length})` },
  ];

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Financeiro</h1>
          <p className="text-muted-foreground mt-1">Gestão financeira completa</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Nova Conta</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova Conta</DialogTitle></DialogHeader>
            <form onSubmit={handleCreateConta} className="space-y-4">
              <div className="flex gap-2">
                <Button type="button" variant={formTipo === "pagar" ? "default" : "outline"} onClick={() => setFormTipo("pagar")} className="flex-1">A Pagar</Button>
                <Button type="button" variant={formTipo === "receber" ? "default" : "outline"} onClick={() => setFormTipo("receber")} className="flex-1">A Receber</Button>
              </div>
              <div><Label>Descrição</Label><Input name="descricao" required /></div>
              <div>
                <Label>Categoria</Label>
                {categoriasOptions.length > 0 ? (
                  <Select value={formCategoria} onValueChange={setFormCategoria}>
                    <SelectTrigger><SelectValue placeholder="Selecione a categoria" /></SelectTrigger>
                    <SelectContent>
                      {categoriasOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input name="categoriaText" placeholder="Ex: Aluguel, Material..." />
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Valor (R$)</Label><Input name="valor" type="number" step="0.01" required /></div>
                <div><Label>Vencimento</Label><Input name="dataVencimento" type="date" /></div>
              </div>
              <Button type="submit" className="w-full" disabled={createConta.isPending}>Criar Conta</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2 mb-6">
        {TABS.map(t => (
          <Button key={t.key} variant={tab === t.key ? "default" : "outline"} size="sm" onClick={() => setTab(t.key)}>{t.label}</Button>
        ))}
      </div>

      {tab === "resumo" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center"><DollarSign className="h-5 w-5 text-primary" /></div>
                  <span className="text-sm text-muted-foreground">Faturamento</span>
                </div>
                <p className="text-2xl font-bold text-primary">{fat ? formatCurrency(fat.totalBruto) : "—"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-9 w-9 rounded-lg bg-green-500/10 flex items-center justify-center"><TrendingUp className="h-5 w-5 text-green-400" /></div>
                  <span className="text-sm text-muted-foreground">A Receber</span>
                </div>
                <p className="text-2xl font-bold text-green-400">{formatCurrency(totalReceber)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-9 w-9 rounded-lg bg-red-500/10 flex items-center justify-center"><AlertCircle className="h-5 w-5 text-red-400" /></div>
                  <span className="text-sm text-muted-foreground">A Pagar</span>
                </div>
                <p className="text-2xl font-bold text-red-400">{formatCurrency(totalPagar)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-9 w-9 rounded-lg bg-yellow-500/10 flex items-center justify-center"><Award className="h-5 w-5 text-yellow-400" /></div>
                  <span className="text-sm text-muted-foreground">Comissões</span>
                </div>
                <p className="text-2xl font-bold text-yellow-400">{formatCurrency(totalComAtual)}</p>
                <div className="flex items-center gap-1 mt-1">
                  {variacao >= 0 ? <TrendingUp className="h-3 w-3 text-green-400" /> : <TrendingDown className="h-3 w-3 text-red-400" />}
                  <span className={`text-xs ${variacao >= 0 ? "text-green-400" : "text-red-400"}`}>{Math.abs(variacao).toFixed(1)}%</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader><CardTitle>Evolução do Faturamento</CardTitle></CardHeader>
              <CardContent>
                {fat?.porDia && fat.porDia.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={fat.porDia}>
                      <defs>
                        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="data" tickFormatter={d => format(new Date(d + "T00:00:00"), "dd/MM")} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                      <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickFormatter={v => `R$${v}`} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} labelFormatter={l => format(new Date(l + "T00:00:00"), "dd/MM/yyyy")} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                      <Area type="monotone" dataKey="valor" stroke="hsl(var(--primary))" fill="url(#areaGrad)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Sem dados</div>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Comissões por Profissional</CardTitle></CardHeader>
              <CardContent>
                {Array.isArray(com) && com.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={com} layout="vertical">
                      <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickFormatter={v => `R$${v}`} />
                      <YAxis type="category" dataKey="nome" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} width={90} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                      <Bar dataKey="comissaoTotal" fill="hsl(var(--primary))" radius={[0,4,4,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Sem dados</div>}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {tab === "pagar" && renderContasList(contasPagar, "pagar")}
      {tab === "receber" && renderContasList(contasReceber, "receber")}

      <Dialog open={baixaOpen} onOpenChange={v => { setBaixaOpen(v); if (!v) setBaixaConta(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Dar Baixa</DialogTitle></DialogHeader>
          {baixaConta && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/30 text-sm">
                <p className="font-semibold">{baixaConta.descricao}</p>
                <p className="text-muted-foreground">{baixaConta.categoria} · Venc: {baixaConta.dataVencimento}</p>
                <p className={`font-bold mt-1 ${baixaConta.tipo === "pagar" ? "text-red-500" : "text-green-500"}`}>{formatCurrency(baixaConta.valor)}</p>
              </div>
              <div>
                <Label>Data de Pagamento</Label>
                <Input type="date" value={baixaData} onChange={e => setBaixaData(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Forma de Pagamento</Label>
                <Select value={baixaForma} onValueChange={setBaixaForma}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="credito">Crédito</SelectItem>
                    <SelectItem value="debito">Débito</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleBaixa} className="w-full" disabled={submitting}>
                {submitting ? "Processando..." : "Confirmar Baixa"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
