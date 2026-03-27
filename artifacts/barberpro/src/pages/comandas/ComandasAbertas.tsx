import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, apiUrl } from "@/lib/utils";
import { Search, Receipt, User, Scissors, Check, Gift } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function ComandasAbertas() {
  const { barbeariaId } = useAuth();
  const { toast } = useToast();
  const [agendamentos, setAgendamentos] = useState<any[]>([]);
  const [profissionais, setProfissionais] = useState<any[]>([]);
  const [bandeiras, setBandeiras] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [metodo, setMetodo] = useState("dinheiro");
  const [bandeira, setBandeira] = useState("");
  const [gorjeta, setGorjeta] = useState("");
  const [gorjetaProfId, setGorjetaProfId] = useState("");
  const [tipoComanda, setTipoComanda] = useState("cliente");

  useEffect(() => {
    if (!barbeariaId) return;
    fetchAgendamentos();
    fetchExtras();
  }, [barbeariaId]);

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

  const fetchExtras = async () => {
    try {
      const [profRes, tiposRes] = await Promise.all([
        fetch(apiUrl(`/barbearias/${barbeariaId}/profissionais`), { credentials: "include" }),
        fetch(apiUrl(`/barbearias/${barbeariaId}/tipos`), { credentials: "include" }),
      ]);
      if (profRes.ok) setProfissionais(await profRes.json());
      if (tiposRes.ok) {
        const tipos = await tiposRes.json();
        setBandeiras(tipos.filter((t: any) => t.categoria === "bandeira" && t.ativo));
      }
    } catch (e) { console.error(e); }
  };

  function openCheckout(ag: any) {
    setSelected(ag);
    setMetodo("dinheiro");
    setBandeira("");
    setGorjeta("");
    setGorjetaProfId("");
    setTipoComanda("cliente");
    setCheckoutOpen(true);
  }

  const fecharComanda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    try {
      const pagamento: Record<string, any> = { metodo, valor: selected.valor };
      if ((metodo === "credito" || metodo === "debito") && bandeira) {
        pagamento.bandeira = bandeira;
      }
      const gorjetaValor = parseFloat(gorjeta) || 0;
      const body: Record<string, any> = {
        pagamentos: [pagamento],
        tipoComanda,
      };
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
        toast({ title: "Comanda fechada com sucesso!" });
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

  const filtered = agendamentos.filter(a =>
    a.clienteNome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.profissionalNome?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-bold text-foreground">Comandas Abertas</h1>
          <p className="text-foreground/40 text-[14px] mt-0.5">Agendamentos pendentes de pagamento</p>
        </div>
      </div>

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
      ) : filtered.length === 0 ? (
        <Card className="bg-card border-border shadow-none">
          <CardContent className="py-16 text-center">
            <Receipt className="h-12 w-12 text-foreground/15 mx-auto mb-4" />
            <p className="text-foreground/40 text-[14px]">Nenhuma comanda aberta no momento</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(ag => (
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
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium">Aberta</span>
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
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <span className="text-[18px] font-bold text-primary">{formatCurrency(ag.valor)}</span>
                  <Button size="sm" className="rounded-xl h-9 text-[13px]" onClick={() => openCheckout(ag)}>
                    <Check className="h-3.5 w-3.5 mr-1.5" /> Fechar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={checkoutOpen} onOpenChange={v => { setCheckoutOpen(v); if (!v) setSelected(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Fechar Comanda</DialogTitle></DialogHeader>
          {selected && (
            <form onSubmit={fecharComanda} className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/30 text-sm space-y-1">
                <p><strong>{selected.clienteNome}</strong></p>
                <p className="text-muted-foreground">{selected.servicoNome} — {selected.profissionalNome}</p>
                <p className="text-primary font-semibold">{formatCurrency(selected.valor)}</p>
              </div>
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
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Fechando..." : "Fechar Comanda"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
