import React, { useRef, useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatCurrency, apiUrl } from "@/lib/utils";
import {
  Search, Receipt, User, Scissors, Check, Gift, Plus, ShoppingBag,
  CreditCard, Banknote, Smartphone, Eye, X, RotateCcw, ChevronRight,
  Package, DollarSign, Percent, Clock, QrCode, Copy, ExternalLink, Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { useWhatsappTemplates, renderWhatsappTemplate, buildWhatsappLink } from "@/lib/waTemplates";

const METODO_LABEL: Record<string, string> = { pix: "PIX", dinheiro: "Dinheiro", credito: "Crédito", debito: "Débito" };
const METODO_ICON: Record<string, React.ReactNode> = {
  pix: <Smartphone className="h-3.5 w-3.5" />,
  dinheiro: <Banknote className="h-3.5 w-3.5" />,
  credito: <CreditCard className="h-3.5 w-3.5" />,
  debito: <CreditCard className="h-3.5 w-3.5" />,
};

export default function ComandasAbertas() {
  const { barbeariaId, role } = useAuth();
  const { toast } = useToast();
  const { data: waTemplates } = useWhatsappTemplates(barbeariaId);
  const { data: barbeariaInfo } = useQuery<{ nome?: string }>({
    queryKey: ["barbearia-nome", barbeariaId],
    queryFn: async () => {
      if (!barbeariaId) return { nome: "" };
      const r = await fetch(apiUrl(`/barbearias/${barbeariaId}`), { credentials: "include" });
      if (!r.ok) return { nome: "" };
      return r.json();
    },
    enabled: !!barbeariaId,
    staleTime: 60_000,
  });
  const nomeEstabelecimento = barbeariaInfo?.nome || "";
  const [agendamentos, setAgendamentos] = useState<any[]>([]);
  const [comandasFechadas, setComandasFechadas] = useState<any[]>([]);
  const [profissionais, setProfissionais] = useState<any[]>([]);
  const [servicos, setServicos] = useState<any[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [bandeiras, setBandeiras] = useState<any[]>([]);
  const [formasPagamento, setFormasPagamento] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingHist, setLoadingHist] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchHistTerm, setSearchHistTerm] = useState("");
  const [tab, setTab] = useState("abertas");

  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const [dataInicio, setDataInicio] = useState(weekAgo);
  const [dataFim, setDataFim] = useState(today);

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedComanda, setSelectedComanda] = useState<any>(null);
  const [selected, setSelected] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  const [metodo, setMetodo] = useState("dinheiro");
  const [bandeira, setBandeira] = useState("");
  const [gorjeta, setGorjeta] = useState("");
  const [gorjetaProfId, setGorjetaProfId] = useState("");
  const [tipoComanda, setTipoComanda] = useState("cliente");
  const [desconto, setDesconto] = useState("");
  const [descontoTipo, setDescontoTipo] = useState("valor");
  const [parcelas, setParcelas] = useState("1");
  const [observacao, setObservacao] = useState("");
  const [valorCustom, setValorCustom] = useState("");

  const [produtosAdicionais, setProdutosAdicionais] = useState<{ produtoId: number; nome: string; valor: number; quantidade: number }[]>([]);
  const [servicosAdicionais, setServicosAdicionais] = useState<{ servicoId: number; nome: string; valor: number; profissionalId: number; profissionalNome: string }[]>([]);
  const [showAddProduto, setShowAddProduto] = useState(false);
  const [showAddServico, setShowAddServico] = useState(false);
  const [addProdutoId, setAddProdutoId] = useState("");
  const [addProdutoQtd, setAddProdutoQtd] = useState("1");
  const [addServicoId, setAddServicoId] = useState("");
  const [addServicoProfId, setAddServicoProfId] = useState("");
  const [editandoTotal, setEditandoTotal] = useState(false);

  const [asaasOpen, setAsaasOpen] = useState(false);
  const [asaasAg, setAsaasAg] = useState<any>(null);
  const [asaasLoading, setAsaasLoading] = useState(false);
  const [asaasPagamento, setAsaasPagamento] = useState<any>(null);
  const [asaasError, setAsaasError] = useState("");
  const [asaasCopied, setAsaasCopied] = useState(false);
  const [asaasPaid, setAsaasPaid] = useState(false);
  const [asaasComandaId, setAsaasComandaId] = useState<number | null>(null);
  const [asaasBillingType, setAsaasBillingType] = useState<"PIX" | "BOLETO" | "CREDIT_CARD">("PIX");

  async function abrirCobrancaAsaas(ag: any, billing: "PIX" | "BOLETO" | "CREDIT_CARD" = "PIX") {
    setAsaasAg(ag);
    setAsaasOpen(true);
    setAsaasLoading(true);
    setAsaasError("");
    setAsaasPagamento(null);
    setAsaasPaid(false);
    setAsaasComandaId(null);
    setAsaasBillingType(billing);
    try {
      const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/asaas-comanda/agendamento/${ag.id}/cobrar`), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ valor: Number(ag.valor), billingType: billing }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erro ao gerar cobrança");
      setAsaasPagamento(data.pagamento || data);
      setAsaasComandaId(data.comandaId || null);
    } catch (e: any) {
      setAsaasError(e.message);
    } finally {
      setAsaasLoading(false);
    }
  }

  useEffect(() => {
    if (!asaasOpen || !asaasPagamento?.asaasPaymentId || asaasPaid) return;
    let stop = false;
    const tick = async () => {
      try {
        const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/asaas-comanda/pagamento/${asaasPagamento.asaasPaymentId}/status`), { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        if (!stop && data?.paid) {
          setAsaasPaid(true);
          fetchAgendamentos();
          fetchComandasFechadas();
          toast({ title: "Pagamento confirmado", description: "Comanda paga via Pix Asaas." });
        }
      } catch {}
    };
    const id = setInterval(tick, 3000);
    tick();
    return () => { stop = true; clearInterval(id); };
  }, [asaasOpen, asaasPagamento, asaasPaid, barbeariaId]);

  useEffect(() => {
    if (!barbeariaId) return;
    fetchAgendamentos();
    fetchExtras();
  }, [barbeariaId]);

  // Vindo da Agenda com ?agendamento=ID: abre direto o checkout completo
  // (serviços, produtos, pagamento) daquele agendamento.
  const deepLinkHandled = useRef(false);
  useEffect(() => {
    if (deepLinkHandled.current || !barbeariaId || loading) return;
    const id = Number(new URLSearchParams(window.location.search).get("agendamento"));
    if (!id) return;
    deepLinkHandled.current = true;
    const local = agendamentos.find((a: any) => a.id === id);
    if (local) { openCheckout(local); return; }
    fetch(apiUrl(`/barbearias/${barbeariaId}/agendamentos/${id}`), { credentials: "include" })
      .then(r => (r.ok ? r.json() : null))
      .then(a => {
        if (a && a.status === "confirmado" && !a.pago) {
          setAgendamentos(prev => (prev.some((x: any) => x.id === a.id) ? prev : [a, ...prev]));
          openCheckout(a);
        } else {
          toast({ title: "Este agendamento não está disponível para checkout", description: a?.pago ? "Ele já foi pago." : undefined });
        }
      })
      .catch(() => {});
  }, [agendamentos, loading, barbeariaId]);

  useEffect(() => {
    if (!barbeariaId || tab !== "historico") return;
    fetchComandasFechadas();
  }, [barbeariaId, tab, dataInicio, dataFim]);

  const fetchAgendamentos = async () => {
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/agendamentos?data=${todayStr}`), { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setAgendamentos(data.filter((a: any) => a.status === "confirmado" && !a.pago));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchComandasFechadas = async () => {
    setLoadingHist(true);
    try {
      const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/comandas?dataInicio=${dataInicio}&dataFim=${dataFim}`), { credentials: "include" });
      if (res.ok) setComandasFechadas(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHist(false);
    }
  };

  const fetchExtras = async () => {
    try {
      const [profRes, tiposRes, servRes, prodRes] = await Promise.all([
        fetch(apiUrl(`/barbearias/${barbeariaId}/profissionais`), { credentials: "include" }),
        fetch(apiUrl(`/barbearias/${barbeariaId}/tipos`), { credentials: "include" }),
        fetch(apiUrl(`/barbearias/${barbeariaId}/servicos`), { credentials: "include" }),
        fetch(apiUrl(`/barbearias/${barbeariaId}/produtos`), { credentials: "include" }),
      ]);
      if (profRes.ok) setProfissionais(await profRes.json());
      if (tiposRes.ok) {
        const tipos = await tiposRes.json();
        setBandeiras(tipos.filter((t: any) => t.categoria === "bandeira" && t.ativo));
        setFormasPagamento(tipos.filter((t: any) => t.categoria === "forma_pagamento" && t.ativo));
      }
      if (servRes.ok) setServicos(await servRes.json());
      if (prodRes.ok) setProdutos(await prodRes.json());
    } catch (e) { console.error(e); }
  };

  function openCheckout(ag: any) {
    setSelected(ag);
    setMetodo("dinheiro");
    setBandeira("");
    setGorjeta("");
    setGorjetaProfId("");
    setTipoComanda("cliente");
    setDesconto("");
    setDescontoTipo("valor");
    setParcelas("1");
    setObservacao("");
    setValorCustom("");
    setProdutosAdicionais([]);
    setServicosAdicionais([]);
    setEditandoTotal(false);
    setCheckoutOpen(true);
  }

  function openDetail(comanda: any) {
    setSelectedComanda(comanda);
    setDetailOpen(true);
  }

  const valorServico = selected ? parseFloat(selected.valor) : 0;
  const valorServicosAdicionais = servicosAdicionais.reduce((s, sv) => s + sv.valor, 0);
  const valorProdutosTotal = produtosAdicionais.reduce((s, p) => s + p.valor * p.quantidade, 0);
  const subtotal = valorServico + valorServicosAdicionais + valorProdutosTotal;
  const descontoValor = descontoTipo === "percentual"
    ? subtotal * Math.min(parseFloat(desconto) || 0, 100) / 100
    : Math.min(parseFloat(desconto) || 0, subtotal);
  const gorjetaValor = parseFloat(gorjeta) || 0;
  const valorFinal = Math.max(0, subtotal - descontoValor) + gorjetaValor;

  function addProduto() {
    const prodId = parseInt(addProdutoId);
    const prod = produtos.find((p: any) => p.id === prodId);
    if (!prod) return;
    const existing = produtosAdicionais.find(p => p.produtoId === prodId);
    if (existing) {
      setProdutosAdicionais(prev => prev.map(p => p.produtoId === prodId ? { ...p, quantidade: p.quantidade + (parseInt(addProdutoQtd) || 1) } : p));
    } else {
      setProdutosAdicionais(prev => [...prev, { produtoId: prodId, nome: prod.nome, valor: parseFloat(prod.preco), quantidade: parseInt(addProdutoQtd) || 1 }]);
    }
    setAddProdutoId("");
    setAddProdutoQtd("1");
    setShowAddProduto(false);
  }

  function removeProduto(produtoId: number) {
    setProdutosAdicionais(prev => prev.filter(p => p.produtoId !== produtoId));
  }

  function addServico() {
    const servId = parseInt(addServicoId);
    const serv = servicos.find((s: any) => s.id === servId);
    if (!serv) return;
    const profId = addServicoProfId ? parseInt(addServicoProfId) : (selected?.profissionalId || 0);
    const prof = profissionais.find((p: any) => p.id === profId);
    setServicosAdicionais(prev => [...prev, {
      servicoId: servId,
      nome: serv.nome,
      valor: parseFloat(serv.preco),
      profissionalId: profId,
      profissionalNome: prof?.apelido || prof?.nomeExibicao || selected?.profissionalNome || "",
    }]);
    setAddServicoId("");
    setAddServicoProfId("");
    setShowAddServico(false);
  }

  function removeServico(index: number) {
    setServicosAdicionais(prev => prev.filter((_, i) => i !== index));
  }

  const fecharComanda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    try {
      const valorPagamento = editandoTotal
        ? Math.max(0, (parseFloat(valorCustom) || 0) - gorjetaValor)
        : (valorFinal - gorjetaValor);
      const pagamento: Record<string, any> = { metodo, valor: valorPagamento };
      if ((metodo === "credito" || metodo === "debito") && bandeira) {
        pagamento.bandeira = bandeira;
      }
      const totalFinalizado = editandoTotal ? (parseFloat(valorCustom) || 0) : undefined;
      const body: Record<string, any> = {
        pagamentos: [pagamento],
        tipoComanda,
        desconto: parseFloat(desconto) || 0,
        descontoTipo,
        parcelas: parseInt(parcelas) || 1,
        observacao: observacao || null,
        produtosAdicionais: produtosAdicionais.map(p => ({ produtoId: p.produtoId, valor: p.valor, quantidade: p.quantidade })),
        servicosAdicionais: servicosAdicionais.map(s => ({ servicoId: s.servicoId, valor: s.valor, profissionalId: s.profissionalId })),
      };
      if (totalFinalizado !== undefined) {
        body.valorTotalOverride = totalFinalizado;
      }
      if (gorjetaValor > 0) {
        body.gorjeta = {
          valor: gorjetaValor,
          profissionalId: gorjetaProfId ? parseInt(gorjetaProfId) : selected.profissionalId,
        };
      }
      const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/agendamentos/${selected.id}/checkout`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const phone = selected?.clienteTelefone || selected?.cliente?.telefone || "";
        let waUrl = "";
        if (phone) {
          const tpl = waTemplates?.whatsapp_template_posatendimento || "";
          const text = renderWhatsappTemplate(tpl, {
            cliente: selected?.clienteNome || "",
            servico: selected?.servicoNome || "",
            profissional: selected?.profissionalNome || "",
            estabelecimento: nomeEstabelecimento,
          });
          waUrl = buildWhatsappLink(phone, text);
        }
        if (waUrl) {
          toast({
            title: "Comanda fechada com sucesso!",
            description: "Quer enviar um agradecimento via WhatsApp para o cliente?",
            action: (
              <ToastAction
                altText="Enviar agradecimento via WhatsApp"
                onClick={() => { try { window.open(waUrl, "_blank", "noopener,noreferrer"); } catch {} }}
                data-testid="toast-action-wa-posatendimento"
              >
                Enviar WhatsApp
              </ToastAction>
            ),
          });
        } else {
          toast({ title: "Comanda fechada com sucesso!" });
        }
        setCheckoutOpen(false);
        setSelected(null);
        fetchAgendamentos();
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: err.error || "Erro ao fechar comanda", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Erro ao fechar comanda", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReabrir = async (comandaId: number) => {
    try {
      const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/comandas/${comandaId}/reabrir`), {
        method: "PUT",
        credentials: "include",
      });
      if (res.ok) {
        toast({ title: "Comanda reaberta com sucesso!" });
        fetchComandasFechadas();
        fetchAgendamentos();
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: err.error || "Erro ao reabrir comanda", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro ao reabrir comanda", variant: "destructive" });
    }
  };

  const filteredAbertas = agendamentos.filter(a =>
    a.clienteNome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.profissionalNome?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredHist = comandasFechadas.filter(c =>
    c.clienteNome?.toLowerCase().includes(searchHistTerm.toLowerCase()) ||
    c.profissionalNome?.toLowerCase().includes(searchHistTerm.toLowerCase())
  );

  const totalFaturamento = filteredHist.reduce((s, c) => s + (parseFloat(c.valorTotal) || 0), 0);
  const totalComissoes = filteredHist.reduce((s, c) => s + (parseFloat(c.comissaoTotal) || 0), 0);

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-[24px] font-bold text-foreground">Comandas</h1>
        <p className="text-foreground/40 text-[14px] mt-0.5">Gerencie comandas abertas e histórico</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="abertas" className="gap-1.5">
            <Receipt className="h-4 w-4" /> Abertas
            {agendamentos.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1.5 text-[11px]">{agendamentos.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="historico" className="gap-1.5">
            <Clock className="h-4 w-4" /> Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="abertas">
          <div className="mb-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/30" />
              <Input
                placeholder="Buscar por cliente ou profissional..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 h-10 rounded-xl border-border bg-card"
              />
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1,2,3].map(i => <div key={i} className="h-48 bg-card rounded-2xl border border-border animate-pulse" />)}
            </div>
          ) : filteredAbertas.length === 0 ? (
            <Card className="bg-card border-border shadow-none">
              <CardContent className="py-16 text-center">
                <Receipt className="h-12 w-12 text-foreground/15 mx-auto mb-4" />
                <p className="text-foreground/40 text-[14px]">Nenhuma comanda aberta no momento</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAbertas.map(ag => (
                <Card key={ag.id} className="bg-card border-border shadow-none hover:shadow-lg hover:shadow-black/[0.03] transition-all">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-[14px]">{ag.clienteNome || "Cliente"}</p>
                          <p className="text-[12px] text-foreground/40">{ag.horaInicio} - {ag.horaFim}</p>
                        </div>
                      </div>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium dark:bg-amber-900/30 dark:text-amber-400">Aberta</span>
                    </div>
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-[13px] text-foreground/60">
                        <Scissors className="h-3.5 w-3.5" />
                        <span>{ag.servicoNome}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[13px] text-foreground/60">
                        <User className="h-3.5 w-3.5" />
                        <span>{ag.profissionalNome}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-border gap-2">
                      <span className="text-[18px] font-bold text-primary">{formatCurrency(ag.valor)}</span>
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="outline" className="rounded-xl h-9 text-[12px] px-2.5" onClick={() => abrirCobrancaAsaas(ag)} title="Cobrar via Pix Asaas">
                          <QrCode className="h-3.5 w-3.5 mr-1" /> Pix
                        </Button>
                        <Button size="sm" className="rounded-xl h-9 text-[13px]" onClick={() => openCheckout(ag)}>
                          <Check className="h-3.5 w-3.5 mr-1.5" /> Finalizar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="historico">
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative max-w-xs flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/30" />
              <Input placeholder="Buscar..." value={searchHistTerm} onChange={e => setSearchHistTerm(e.target.value)} className="pl-9 h-10 rounded-xl border-border bg-card" />
            </div>
            <Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="h-10 w-40 rounded-xl border-border bg-card" />
            <Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="h-10 w-40 rounded-xl border-border bg-card" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <Card className="bg-card border-border shadow-none">
              <CardContent className="p-4">
                <p className="text-[12px] text-foreground/40 mb-1">Total Comandas</p>
                <p className="text-[22px] font-bold">{filteredHist.length}</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border shadow-none">
              <CardContent className="p-4">
                <p className="text-[12px] text-foreground/40 mb-1">Faturamento</p>
                <p className="text-[22px] font-bold text-primary">{formatCurrency(totalFaturamento)}</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border shadow-none">
              <CardContent className="p-4">
                <p className="text-[12px] text-foreground/40 mb-1">Comissões</p>
                <p className="text-[22px] font-bold text-green-600">{formatCurrency(totalComissoes)}</p>
              </CardContent>
            </Card>
          </div>

          {loadingHist ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-card rounded-xl animate-pulse" />)}</div>
          ) : filteredHist.length === 0 ? (
            <Card className="bg-card border-border shadow-none">
              <CardContent className="py-16 text-center">
                <Receipt className="h-12 w-12 text-foreground/15 mx-auto mb-4" />
                <p className="text-foreground/40 text-[14px]">Nenhuma comanda encontrada</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredHist.map(c => (
                <Card key={c.id} className="bg-card border-border shadow-none hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => openDetail(c)}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-[14px] truncate">{c.clienteNome}</p>
                          <div className="flex items-center gap-2 text-[12px] text-foreground/40">
                            <span>{c.profissionalNome}</span>
                            <span>·</span>
                            <span>{c.dataFechamento ? new Date(c.dataFechamento).toLocaleDateString("pt-BR") : "—"}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className="font-bold text-primary text-[15px]">{formatCurrency(parseFloat(c.valorTotal) || 0)}</p>
                          <div className="flex items-center gap-1 justify-end">
                            {(c.pagamentos as any[])?.map((p: any, i: number) => (
                              <Badge key={i} variant="outline" className="text-[10px] gap-0.5 h-5 px-1.5">
                                {METODO_ICON[p.metodo]}
                                {METODO_LABEL[p.metodo] ?? p.metodo}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        {(role === "dono" || role === "gerente") && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-foreground/30 hover:text-orange-600"
                            onClick={(e) => { e.stopPropagation(); handleReabrir(c.id); }}
                            title="Reabrir comanda"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <ChevronRight className="h-4 w-4 text-foreground/20" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={checkoutOpen} onOpenChange={v => { setCheckoutOpen(v); if (!v) setSelected(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Fechar Comanda</DialogTitle></DialogHeader>
          {selected && (
            <form onSubmit={fecharComanda} className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/30 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-[15px]">{selected.clienteNome}</p>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium dark:bg-amber-900/30 dark:text-amber-400">Aberta</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="flex items-center gap-1.5 text-foreground/60"><Scissors className="h-3.5 w-3.5" />{selected.servicoNome}</span>
                    <span className="font-medium">{formatCurrency(valorServico)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[12px] text-foreground/40">
                    <User className="h-3 w-3" />{selected.profissionalNome}
                  </div>
                </div>
              </div>

              {servicosAdicionais.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-[12px] text-foreground/50 flex items-center gap-1"><Scissors className="h-3 w-3" />Serviços Adicionais</Label>
                  {servicosAdicionais.map((sv, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-muted/20 text-[13px]">
                      <div>
                        <span>{sv.nome}</span>
                        <span className="text-[11px] text-foreground/40 ml-1">({sv.profissionalNome})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{formatCurrency(sv.valor)}</span>
                        <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-400 hover:text-red-600" onClick={() => removeServico(idx)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {produtosAdicionais.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-[12px] text-foreground/50 flex items-center gap-1"><Package className="h-3 w-3" />Produtos Adicionais</Label>
                  {produtosAdicionais.map(p => (
                    <div key={p.produtoId} className="flex items-center justify-between p-2 rounded-lg bg-muted/20 text-[13px]">
                      <span>{p.nome} x{p.quantidade}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{formatCurrency(p.valor * p.quantidade)}</span>
                        <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-400 hover:text-red-600" onClick={() => removeProduto(p.produtoId)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2 flex-wrap">
                <Button type="button" size="sm" variant="outline" className="rounded-xl text-[12px] gap-1" onClick={() => setShowAddServico(true)}>
                  <Scissors className="h-3 w-3" /> +Serviço
                </Button>
                <Button type="button" size="sm" variant="outline" className="rounded-xl text-[12px] gap-1" onClick={() => setShowAddProduto(true)}>
                  <ShoppingBag className="h-3 w-3" /> +Produto
                </Button>
                <Button type="button" size="sm" variant="outline" className="rounded-xl text-[12px] gap-1" onClick={() => setGorjeta(gorjeta || "0")}>
                  <Gift className="h-3 w-3" /> +Gorjeta
                </Button>
              </div>

              {showAddServico && (
                <div className="p-3 rounded-lg border border-border space-y-2">
                  <Label className="text-[12px]">Adicionar Serviço</Label>
                  <select
                    value={addServicoId}
                    onChange={e => setAddServicoId(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Selecione o serviço...</option>
                    {servicos.filter((s: any) => s.ativo !== false).map((s: any) => (
                      <option key={s.id} value={s.id}>{s.nome} — {formatCurrency(parseFloat(s.preco))}</option>
                    ))}
                  </select>
                  <select
                    value={addServicoProfId}
                    onChange={e => setAddServicoProfId(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Mesmo profissional ({selected?.profissionalNome})</option>
                    {profissionais.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.apelido || p.nomeExibicao}</option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" onClick={addServico} disabled={!addServicoId}>Adicionar</Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setShowAddServico(false)}>Cancelar</Button>
                  </div>
                </div>
              )}

              {showAddProduto && (
                <div className="p-3 rounded-lg border border-border space-y-2">
                  <Label className="text-[12px]">Adicionar Produto</Label>
                  <select
                    value={addProdutoId}
                    onChange={e => setAddProdutoId(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Selecione o produto...</option>
                    {produtos.filter((p: any) => p.ativo !== false && p.quantidade > 0).map((p: any) => (
                      <option key={p.id} value={p.id}>{p.nome} — {formatCurrency(parseFloat(p.preco))} (estoque: {p.quantidade})</option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <Input type="number" min="1" value={addProdutoQtd} onChange={e => setAddProdutoQtd(e.target.value)} className="w-20" placeholder="Qtd" />
                    <Button type="button" size="sm" onClick={addProduto} disabled={!addProdutoId}>Adicionar</Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setShowAddProduto(false)}>Cancelar</Button>
                  </div>
                </div>
              )}

              <div>
                <Label>Tipo de Comanda</Label>
                <select
                  value={tipoComanda}
                  onChange={e => setTipoComanda(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm mt-1"
                >
                  <option value="cliente">Cliente</option>
                  <option value="profissional">Profissional (débito)</option>
                </select>
              </div>

              <div>
                <Label>Forma de Pagamento</Label>
                <select
                  value={metodo}
                  onChange={e => { setMetodo(e.target.value); setBandeira(""); }}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm mt-1"
                >
                  <option value="pix">PIX</option>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="credito">Crédito</option>
                  <option value="debito">Débito</option>
                  {formasPagamento.filter(f => !["pix","dinheiro","credito","debito"].includes(f.nome.toLowerCase())).map((f: any) => (
                    <option key={f.id} value={f.nome.toLowerCase()}>{f.nome}</option>
                  ))}
                </select>
              </div>

              {(metodo === "credito" || metodo === "debito") && bandeiras.length > 0 && (
                <div>
                  <Label>Bandeira</Label>
                  <select
                    value={bandeira}
                    onChange={e => setBandeira(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm mt-1"
                  >
                    <option value="">Selecione a bandeira...</option>
                    {bandeiras.map((b: any) => (
                      <option key={b.id} value={b.nome}>{b.nome}{b.taxaOperadora ? ` (${b.taxaOperadora}%)` : ""}</option>
                    ))}
                  </select>
                </div>
              )}

              {(metodo === "credito") && (
                <div>
                  <Label>Parcelas</Label>
                  <select
                    value={parcelas}
                    onChange={e => setParcelas(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm mt-1"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
                      <option key={n} value={n}>{n}x {n === 1 ? "(à vista)" : `de ${formatCurrency(valorFinal / n)}`}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Desconto</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={desconto}
                    onChange={e => setDesconto(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Tipo Desconto</Label>
                  <select
                    value={descontoTipo}
                    onChange={e => setDescontoTipo(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm mt-1"
                  >
                    <option value="valor">R$ (valor)</option>
                    <option value="percentual">% (percentual)</option>
                  </select>
                </div>
              </div>

              <div>
                <Label>Gorjeta (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00 (opcional)"
                  value={gorjeta}
                  onChange={e => setGorjeta(e.target.value)}
                  className="mt-1"
                />
              </div>

              {parseFloat(gorjeta) > 0 && (
                <div>
                  <Label>Profissional que recebe a gorjeta</Label>
                  <select
                    value={gorjetaProfId}
                    onChange={e => setGorjetaProfId(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm mt-1"
                  >
                    <option value="">Mesmo do serviço ({selected.profissionalNome})</option>
                    {profissionais.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.apelido || p.nomeExibicao}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <Label>Observação</Label>
                <Input
                  placeholder="Observação (opcional)"
                  value={observacao}
                  onChange={e => setObservacao(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                <div className="space-y-1.5 text-[13px]">
                  <div className="flex justify-between text-foreground/60">
                    <span>Serviço</span>
                    <span>{formatCurrency(valorServico)}</span>
                  </div>
                  {valorServicosAdicionais > 0 && (
                    <div className="flex justify-between text-foreground/60">
                      <span>Serviços adicionais</span>
                      <span>{formatCurrency(valorServicosAdicionais)}</span>
                    </div>
                  )}
                  {valorProdutosTotal > 0 && (
                    <div className="flex justify-between text-foreground/60">
                      <span>Produtos</span>
                      <span>{formatCurrency(valorProdutosTotal)}</span>
                    </div>
                  )}
                  {descontoValor > 0 && (
                    <div className="flex justify-between text-red-500">
                      <span>Desconto</span>
                      <span>-{formatCurrency(descontoValor)}</span>
                    </div>
                  )}
                  {gorjetaValor > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Gorjeta</span>
                      <span>+{formatCurrency(gorjetaValor)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-primary/10">
                    <div className="flex items-center gap-2">
                      <span className="text-[16px] font-bold">Total</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-6 px-1.5 text-[11px] text-foreground/40"
                        onClick={() => { setEditandoTotal(!editandoTotal); if (!editandoTotal) setValorCustom(valorFinal.toFixed(2)); }}
                      >
                        {editandoTotal ? "Automático" : "Editar"}
                      </Button>
                    </div>
                    {editandoTotal ? (
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={valorCustom}
                        onChange={e => setValorCustom(e.target.value)}
                        className="w-32 h-8 text-right font-bold text-primary text-[16px]"
                      />
                    ) : (
                      <span className="text-[16px] font-bold text-primary">{formatCurrency(valorFinal)}</span>
                    )}
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full rounded-xl h-11 text-[14px] font-semibold" disabled={submitting}>
                {submitting ? "Fechando..." : `Finalizar — ${formatCurrency(editandoTotal ? (parseFloat(valorCustom) || 0) : valorFinal)}`}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={v => { setDetailOpen(v); if (!v) setSelectedComanda(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Detalhes da Comanda #{selectedComanda?.id}</DialogTitle></DialogHeader>
          {selectedComanda && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-[16px]">{selectedComanda.clienteNome}</p>
                  <p className="text-[13px] text-foreground/40">
                    {selectedComanda.dataFechamento ? new Date(selectedComanda.dataFechamento).toLocaleString("pt-BR") : "—"}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[12px] text-foreground/50">Serviços</Label>
                {(selectedComanda.servicos as any[])?.map((s: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2">
                      <Scissors className="h-4 w-4 text-primary" />
                      <div>
                        <p className="text-[13px] font-medium">{s.nome}</p>
                        <p className="text-[11px] text-foreground/40">Comissão: {formatCurrency(s.comissao || 0)}</p>
                      </div>
                    </div>
                    <span className="font-semibold text-[14px]">{formatCurrency(s.valor || 0)}</span>
                  </div>
                ))}
              </div>

              {(selectedComanda.produtos as any[])?.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-[12px] text-foreground/50">Produtos</Label>
                  {(selectedComanda.produtos as any[]).map((p: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2">
                        <ShoppingBag className="h-4 w-4 text-blue-500" />
                        <div>
                          <p className="text-[13px] font-medium">{p.nome}</p>
                          <p className="text-[11px] text-foreground/40">Qtd: {p.quantidade}</p>
                        </div>
                      </div>
                      <span className="font-semibold text-[14px]">{formatCurrency((p.valor || 0) * (p.quantidade || 1))}</span>
                    </div>
                  ))}
                </div>
              )}

              {selectedComanda.gorjeta && selectedComanda.gorjeta.valor > 0 && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                  <div className="flex items-center gap-2">
                    <Gift className="h-4 w-4 text-green-600" />
                    <span className="text-[13px] text-green-700 dark:text-green-400">Gorjeta</span>
                  </div>
                  <span className="font-semibold text-green-700 dark:text-green-400 text-[14px]">{formatCurrency(selectedComanda.gorjeta.valor)}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-[12px] text-foreground/50">Pagamentos</Label>
                {(selectedComanda.pagamentos as any[])?.map((p: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2">
                      {METODO_ICON[p.metodo] || <CreditCard className="h-4 w-4" />}
                      <span className="text-[13px]">{METODO_LABEL[p.metodo] ?? p.metodo}{p.bandeira ? ` (${p.bandeira})` : ""}</span>
                    </div>
                    <span className="font-semibold text-[14px]">{formatCurrency(p.valor || 0)}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/30 text-center">
                  <p className="text-[11px] text-foreground/40">Profissional</p>
                  <p className="text-[14px] font-medium mt-0.5">{selectedComanda.profissionalNome}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 text-center">
                  <p className="text-[11px] text-foreground/40">Comissão</p>
                  <p className="text-[14px] font-semibold text-green-600 mt-0.5">{formatCurrency(parseFloat(selectedComanda.comissaoTotal) || 0)}</p>
                </div>
              </div>

              {(selectedComanda.desconto > 0 || selectedComanda.taxaCartao > 0) && (
                <div className="grid grid-cols-2 gap-3">
                  {selectedComanda.desconto > 0 && (
                    <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-center">
                      <p className="text-[11px] text-red-500">Desconto</p>
                      <p className="text-[14px] font-semibold text-red-600 mt-0.5">-{formatCurrency(parseFloat(selectedComanda.desconto) || 0)}</p>
                    </div>
                  )}
                  {selectedComanda.taxaCartao > 0 && (
                    <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-center">
                      <p className="text-[11px] text-orange-500">Taxa Cartão</p>
                      <p className="text-[14px] font-semibold text-orange-600 mt-0.5">-{formatCurrency(parseFloat(selectedComanda.taxaCartao) || 0)}</p>
                    </div>
                  )}
                </div>
              )}

              {selectedComanda.parcelas > 1 && (
                <div className="p-3 rounded-lg bg-muted/30 text-center">
                  <p className="text-[11px] text-foreground/40">Parcelas</p>
                  <p className="text-[14px] font-medium mt-0.5">{selectedComanda.parcelas}x de {formatCurrency(parseFloat(selectedComanda.valorTotal) / selectedComanda.parcelas)}</p>
                </div>
              )}

              {selectedComanda.observacao && (
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-[11px] text-foreground/40 mb-1">Observação</p>
                  <p className="text-[13px]">{selectedComanda.observacao}</p>
                </div>
              )}

              <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                <div className="flex justify-between items-center">
                  <span className="text-[14px] font-medium">Valor Total</span>
                  <span className="text-[20px] font-bold text-primary">{formatCurrency(parseFloat(selectedComanda.valorTotal) || 0)}</span>
                </div>
                {selectedComanda.valorLiquido != null && (
                  <div className="flex justify-between items-center mt-1 text-[12px] text-foreground/50">
                    <span>Valor Líquido</span>
                    <span>{formatCurrency(parseFloat(selectedComanda.valorLiquido) || 0)}</span>
                  </div>
                )}
              </div>

              {(role === "dono" || role === "gerente") && (
                <Button
                  variant="outline"
                  className="w-full rounded-xl text-orange-600 border-orange-200 hover:bg-orange-50 gap-1.5"
                  onClick={() => { handleReabrir(selectedComanda.id); setDetailOpen(false); }}
                >
                  <RotateCcw className="h-4 w-4" /> Reabrir Comanda
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={asaasOpen} onOpenChange={(v) => { setAsaasOpen(v); if (!v) { setAsaasAg(null); setAsaasPagamento(null); setAsaasError(""); setAsaasPaid(false); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><QrCode className="h-4 w-4" /> Cobrar via Asaas</DialogTitle>
          </DialogHeader>
          {asaasAg && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/30">
                <p className="font-semibold text-[14px]">{asaasAg.clienteNome}</p>
                <p className="text-[12px] text-foreground/50">{asaasAg.servicoNome} · {asaasAg.profissionalNome}</p>
                <p className="text-[18px] font-bold text-primary mt-1">{formatCurrency(asaasAg.valor)}</p>
              </div>

              <div className="flex gap-1.5">
                {(["PIX", "BOLETO", "CREDIT_CARD"] as const).map(b => (
                  <Button
                    key={b} type="button" size="sm"
                    variant={asaasBillingType === b ? "default" : "outline"}
                    className="flex-1 h-9 text-[12px]"
                    disabled={asaasLoading}
                    onClick={() => abrirCobrancaAsaas(asaasAg, b)}
                  >
                    {b === "PIX" ? "Pix" : b === "BOLETO" ? "Boleto" : "Cartão"}
                  </Button>
                ))}
              </div>

              {asaasLoading && (
                <div className="flex items-center justify-center py-10 text-foreground/50 gap-2 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" /> Gerando cobrança…
                </div>
              )}

              {asaasError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/50">
                  {asaasError}
                </div>
              )}

              {asaasPaid && (
                <div className="text-center py-6">
                  <div className="h-14 w-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-3">
                    <Check className="h-7 w-7 text-green-600 dark:text-green-400" />
                  </div>
                  <p className="font-semibold text-green-600 dark:text-green-400">Pagamento confirmado</p>
                  <p className="text-[12px] text-foreground/50 mt-1">A comanda foi marcada como paga.</p>
                </div>
              )}

              {!asaasPaid && asaasPagamento && (
                <div className="space-y-3">
                  {asaasPagamento.pixQrCodeBase64 && (
                    <div className="bg-white p-3 rounded-lg border flex items-center justify-center">
                      <img src={`data:image/png;base64,${asaasPagamento.pixQrCodeBase64}`} alt="QR Pix" className="w-56 h-56 object-contain" />
                    </div>
                  )}
                  {asaasPagamento.pixCopyPaste && (
                    <div className="space-y-1.5">
                      <Label className="text-[11px] uppercase tracking-wide text-foreground/50">Pix copia e cola</Label>
                      <div className="flex gap-1.5">
                        <Input readOnly value={asaasPagamento.pixCopyPaste} className="text-[11px] h-9 truncate" />
                        <Button type="button" size="sm" className="h-9 px-3" onClick={async () => {
                          try { await navigator.clipboard.writeText(asaasPagamento.pixCopyPaste); setAsaasCopied(true); setTimeout(() => setAsaasCopied(false), 1500); } catch {}
                        }}>
                          {asaasCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </div>
                  )}
                  {asaasPagamento.invoiceUrl && (
                    <a href={asaasPagamento.invoiceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-xs text-foreground/70 hover:bg-muted/30">
                      <ExternalLink className="h-3.5 w-3.5" /> Abrir página de pagamento
                    </a>
                  )}
                  <div className="flex items-center justify-center gap-1.5 text-[11px] text-foreground/50">
                    <Loader2 className="h-3 w-3 animate-spin" /> Aguardando pagamento…
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
