import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useListClientes } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Star, Crown, Gift, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function Clube() {
  const { barbeariaId } = useAuth();
  const { data: clientes = [], isLoading } = useListClientes(barbeariaId!, {}, { query: { enabled: !!barbeariaId } });

  const sorted = [...(clientes as any[])].sort((a, b) => b.pontosFidelidade - a.pontosFidelidade);
  const top = sorted.slice(0, 10);
  const vips = (clientes as any[]).filter(c => c.vip);
  const totalPontos = (clientes as any[]).reduce((s, c) => s + c.pontosFidelidade, 0);

  const RANK_ICON = [
    <Crown className="h-5 w-5 text-yellow-400" key={0} />,
    <Trophy className="h-5 w-5 text-slate-400" key={1} />,
    <Trophy className="h-5 w-5 text-amber-600" key={2} />,
  ];

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground">Clube do Assinante</h1>
        <p className="text-muted-foreground mt-1">Programa de fidelidade e recompensas</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-9 w-9 rounded-lg bg-yellow-500/10 flex items-center justify-center"><Trophy className="h-5 w-5 text-yellow-400" /></div>
              <span className="text-sm text-muted-foreground">Total de Pontos</span>
            </div>
            <p className="text-3xl font-bold text-yellow-400">{totalPontos.toLocaleString("pt-BR")}</p>
            <p className="text-xs text-muted-foreground mt-1">distribuídos entre clientes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-9 w-9 rounded-lg bg-purple-500/10 flex items-center justify-center"><Crown className="h-5 w-5 text-purple-400" /></div>
              <span className="text-sm text-muted-foreground">Clientes VIP</span>
            </div>
            <p className="text-3xl font-bold text-purple-400">{vips.length}</p>
            <p className="text-xs text-muted-foreground mt-1">de {(clientes as any[]).length} total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-9 w-9 rounded-lg bg-green-500/10 flex items-center justify-center"><TrendingUp className="h-5 w-5 text-green-400" /></div>
              <span className="text-sm text-muted-foreground">Receita VIPs</span>
            </div>
            <p className="text-3xl font-bold text-green-400">{formatCurrency(vips.reduce((s, c) => s + c.totalGasto, 0))}</p>
            <p className="text-xs text-muted-foreground mt-1">gasto total acumulado</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-yellow-400" /> Ranking de Fidelidade</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}</div>
              ) : top.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">Nenhum cliente cadastrado ainda.</p>
              ) : (
                <div className="space-y-3">
                  {top.map((c: any, i: number) => (
                    <div key={c.id} className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${i === 0 ? "bg-yellow-500/5 border-yellow-500/20" : i === 1 ? "bg-slate-500/5 border-slate-500/20" : i === 2 ? "bg-amber-700/5 border-amber-700/20" : "bg-muted/30 border-border"}`}>
                      <div className="w-8 flex justify-center">
                        {i < 3 ? RANK_ICON[i] : <span className="text-muted-foreground font-bold text-sm">{i + 1}</span>}
                      </div>
                      <div className="h-10 w-10 rounded-full bg-card border border-border flex items-center justify-center font-bold text-primary">
                        {c.nome.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm">{c.nome}</p>
                          {c.vip && <Badge className="text-xs bg-purple-500/10 text-purple-400 border-purple-500/20"><Crown className="h-2.5 w-2.5 mr-1" />VIP</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">{c.telefone}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
                          <span className="font-bold text-yellow-400">{c.pontosFidelidade}</span>
                          <span className="text-xs text-muted-foreground">pts</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{formatCurrency(c.totalGasto)} total</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Gift className="h-4 w-4 text-primary" /> Como Funciona</CardTitle></CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="p-3 rounded-lg bg-muted/40 border border-border">
                <p className="font-medium mb-1">🎯 Acúmulo de Pontos</p>
                <p className="text-muted-foreground">A cada R$ 10 gastos, o cliente ganha 1 ponto automaticamente ao finalizar a comanda.</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/40 border border-border">
                <p className="font-medium mb-1">👑 Status VIP</p>
                <p className="text-muted-foreground">Clientes marcados como VIP recebem tratamento especial e aparecem com destaque na agenda.</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/40 border border-border">
                <p className="font-medium mb-1">🎁 Recompensas</p>
                <p className="text-muted-foreground">Em breve: configure recompensas automáticas por faixa de pontos.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Clientes VIP</CardTitle></CardHeader>
            <CardContent>
              {vips.length === 0 ? (
                <p className="text-sm text-muted-foreground">Marque clientes como VIP na gestão de clientes.</p>
              ) : (
                <div className="space-y-2">
                  {vips.slice(0, 5).map((c: any) => (
                    <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg bg-purple-500/5 border border-purple-500/15">
                      <div className="h-8 w-8 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400 font-bold text-sm border border-purple-500/20">
                        {c.nome.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.nome}</p>
                        <p className="text-xs text-muted-foreground">{c.pontosFidelidade} pts</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
