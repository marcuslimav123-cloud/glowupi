import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { Plus, Search, Receipt, Clock, User, Scissors, CreditCard, X, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ComandasAbertas() {
  const { barbeariaId } = useAuth();
  const { toast } = useToast();
  const [agendamentos, setAgendamentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!barbeariaId) return;
    fetchAgendamentos();
  }, [barbeariaId]);

  const fetchAgendamentos = async () => {
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const res = await fetch(`${import.meta.env.BASE_URL}api/barbearias/${barbeariaId}/agendamentos?data=${todayStr}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        const abertos = data.filter((a: any) => a.status === "confirmado" && !a.pago);
        setAgendamentos(abertos);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fecharComanda = async (agendamento: any) => {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/barbearias/${barbeariaId}/comandas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          agendamentoId: agendamento.id,
          clienteNome: agendamento.clienteNome,
          profissionalId: agendamento.profissionalId,
          profissionalNome: agendamento.profissionalNome,
          servicos: [{ id: agendamento.servicoId, nome: agendamento.servicoNome, valor: agendamento.valor }],
          produtos: [],
          pagamentos: [{ metodo: "dinheiro", valor: agendamento.valor }],
          valorTotal: agendamento.valor,
          comissaoTotal: 0,
        }),
      });
      if (res.ok) {
        toast({ title: "Comanda fechada com sucesso!" });
        fetchAgendamentos();
      }
    } catch (e) {
      toast({ title: "Erro ao fechar comanda", variant: "destructive" });
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
            className="pl-9 h-10 rounded-xl border-black/[0.08] bg-white"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-48 bg-white rounded-2xl border border-black/[0.04] animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="bg-white border-black/[0.04] shadow-none">
          <CardContent className="py-16 text-center">
            <Receipt className="h-12 w-12 text-foreground/15 mx-auto mb-4" />
            <p className="text-foreground/40 text-[14px]">Nenhuma comanda aberta no momento</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(ag => (
            <Card key={ag.id} className="bg-white border-black/[0.04] shadow-none hover:shadow-lg hover:shadow-black/[0.03] transition-all">
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
                <div className="flex items-center justify-between pt-3 border-t border-black/[0.04]">
                  <span className="text-[18px] font-bold text-primary">{formatCurrency(ag.valor)}</span>
                  <Button size="sm" className="rounded-xl h-9 text-[13px]" onClick={() => fecharComanda(ag)}>
                    <Check className="h-3.5 w-3.5 mr-1.5" /> Fechar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
