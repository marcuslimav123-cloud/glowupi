import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useListComandas } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { DollarSign, CreditCard, Smartphone, Banknote, Receipt, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const METODO_ICON: Record<string, React.ReactNode> = {
  pix: <Smartphone className="h-3.5 w-3.5" />,
  dinheiro: <Banknote className="h-3.5 w-3.5" />,
  credito: <CreditCard className="h-3.5 w-3.5" />,
  debito: <CreditCard className="h-3.5 w-3.5" />,
};
const METODO_LABEL: Record<string, string> = { pix: "PIX", dinheiro: "Dinheiro", credito: "Crédito", debito: "Débito", outros: "Outros" };

export default function Caixa() {
  const { barbeariaId } = useAuth();
  const [mes, setMes] = useState(format(new Date(), "yyyy-MM"));

  const { data: comandas = [], isLoading } = useListComandas(barbeariaId!, { mes }, { query: { enabled: !!barbeariaId } });

  const totalBruto = (comandas as any[]).reduce((s, c) => s + c.valorTotal, 0);
  const totalComissoes = (comandas as any[]).reduce((s, c) => s + c.comissaoTotal, 0);
  const pagTotals: Record<string, number> = {};
  (comandas as any[]).forEach(c => (c.pagamentos as any[]).forEach((p: any) => { pagTotals[p.metodo] = (pagTotals[p.metodo] || 0) + p.valor; }));

  return (
    <AppLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Caixa</h1>
          <p className="text-muted-foreground mt-1">Histórico de comandas e recebimentos</p>
        </div>
        <div className="space-y-1">
          <Label>Mês</Label>
          <Input type="month" value={mes} onChange={e => setMes(e.target.value)} className="w-44" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center"><DollarSign className="h-5 w-5 text-primary" /></div>
              <span className="text-sm text-muted-foreground">Faturamento</span>
            </div>
            <p className="text-2xl font-bold text-primary">{formatCurrency(totalBruto)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-9 w-9 rounded-lg bg-green-500/10 flex items-center justify-center"><TrendingUp className="h-5 w-5 text-green-400" /></div>
              <span className="text-sm text-muted-foreground">Líquido</span>
            </div>
            <p className="text-2xl font-bold text-green-400">{formatCurrency(totalBruto - totalComissoes)}</p>
          </CardContent>
        </Card>
        {Object.entries(pagTotals).slice(0, 2).map(([metodo, valor]) => (
          <Card key={metodo}>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">{METODO_ICON[metodo] || <CreditCard className="h-4 w-4" />}</div>
                <span className="text-sm text-muted-foreground">{METODO_LABEL[metodo] ?? metodo}</span>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(valor)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-20 bg-card rounded-xl animate-pulse" />)}</div>
      ) : (comandas as any[]).length === 0 ? (
        <Card className="text-center py-16">
          <CardContent>
            <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhuma comanda neste período.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader><CardTitle>Comandas do Mês ({(comandas as any[]).length})</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(comandas as any[]).slice().reverse().map((c: any) => (
                <div key={c.id} className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border border-border hover:bg-muted/50 transition-colors">
                  <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20">
                    <Receipt className="h-5 w-5 text-green-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{c.clienteNome}</p>
                      <Badge variant="secondary" className="text-xs">{c.profissionalNome}</Badge>
                    </div>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {(c.servicos as any[]).map((s: any, i: number) => (
                        <span key={i} className="text-xs text-muted-foreground">{s.nome}</span>
                      ))}
                      {(c.produtos as any[]).map((p: any, i: number) => (
                        <span key={i} className="text-xs text-muted-foreground">• {p.nome}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex gap-1 flex-wrap justify-end">
                      {(c.pagamentos as any[]).map((p: any, i: number) => (
                        <Badge key={i} variant="outline" className="text-xs gap-1">
                          {METODO_ICON[p.metodo]} {METODO_LABEL[p.metodo] ?? p.metodo}
                        </Badge>
                      ))}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">{formatCurrency(c.valorTotal)}</p>
                      <p className="text-xs text-muted-foreground">com. {formatCurrency(c.comissaoTotal)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </AppLayout>
  );
}
