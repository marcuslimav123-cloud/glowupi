import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiUrl, formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Heart, ShoppingBag, CalendarDays, DollarSign,
  Award, Phone, Mail, Crown, Clock, MessageCircle,
} from "lucide-react";
import { Link } from "wouter";

type TabKey = "resumo" | "agendamentos" | "comandas";

export default function ClienteDetalhe() {
  const { barbeariaId } = useAuth();
  const [, params] = useRoute("/gestao/clientes/:clienteId");
  const clienteId = params?.clienteId;
  const [tab, setTab] = useState<TabKey>("resumo");

  const { data, isLoading } = useQuery<any>({
    queryKey: ["cliente-dashboard", barbeariaId, clienteId],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/clientes/${clienteId}/dashboard`), { credentials: "include" });
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
    enabled: !!barbeariaId && !!clienteId,
  });

  if (isLoading || !data) {
    return (
      <AppLayout>
        <div className="space-y-4">
          <div className="h-8 w-48 bg-muted/30 rounded-lg animate-pulse" />
          <div className="grid grid-cols-2 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-24 bg-muted/30 rounded-xl animate-pulse" />)}</div>
        </div>
      </AppLayout>
    );
  }

  const { cliente, servicoMaisRealizado, produtoMaisComprado, diasSemAgendar, totalGasto, pontosFidelidade, agendamentos, comandas } = data;
  const whatsUrl = cliente.telefone ? `https://wa.me/55${cliente.telefone.replace(/\D/g, "")}` : null;

  const STATUS_COLORS: Record<string, string> = {
    confirmado: "bg-green-50 text-green-600",
    concluido: "bg-blue-50 text-blue-600",
    cancelado: "bg-red-50 text-red-500",
    pago: "bg-emerald-50 text-emerald-600",
  };

  return (
    <AppLayout>
      <div className="mb-6">
        <Link href="/gestao/clientes">
          <Button variant="ghost" size="sm" className="mb-3 gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Voltar para Clientes
          </Button>
        </Link>
        <div className="flex items-center gap-4">
          <div className={`h-14 w-14 rounded-full flex items-center justify-center font-bold text-2xl border shrink-0 ${cliente.vip ? "bg-amber-500/10 text-amber-500 border-amber-500/25" : "bg-primary/10 text-primary border-primary/20"}`}>
            {cliente.nome.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[24px] font-bold text-foreground">{cliente.nome}</h1>
              {cliente.vip && <Badge className="text-xs bg-amber-500/10 text-amber-500 border-amber-500/20"><Crown className="h-3 w-3 mr-1" />VIP</Badge>}
            </div>
            <div className="flex items-center gap-4 mt-1 flex-wrap">
              <span className="text-sm text-muted-foreground flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{cliente.telefone}</span>
              {cliente.email && <span className="text-sm text-muted-foreground flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{cliente.email}</span>}
            </div>
          </div>
          {whatsUrl && (
            <a href={whatsUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="gap-2 text-green-600 border-green-200 hover:bg-green-50">
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </Button>
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <Card className="bg-primary/5 border-primary/10 shadow-none"><CardContent className="p-4">
          <Heart className="h-4 w-4 text-primary mb-1" />
          <p className="text-[12px] text-muted-foreground">Serviço Favorito</p>
          <p className="text-[14px] font-bold text-foreground mt-0.5">{servicoMaisRealizado ? `${servicoMaisRealizado.nome} (${servicoMaisRealizado.vezes}x)` : "—"}</p>
        </CardContent></Card>
        <Card className="bg-purple-50 border-purple-100 shadow-none"><CardContent className="p-4">
          <ShoppingBag className="h-4 w-4 text-purple-600 mb-1" />
          <p className="text-[12px] text-muted-foreground">Produto Favorito</p>
          <p className="text-[14px] font-bold text-foreground mt-0.5">{produtoMaisComprado ? `${produtoMaisComprado.nome} (${produtoMaisComprado.vezes}x)` : "—"}</p>
        </CardContent></Card>
        <Card className="bg-orange-50 border-orange-100 shadow-none"><CardContent className="p-4">
          <Clock className="h-4 w-4 text-orange-600 mb-1" />
          <p className="text-[12px] text-muted-foreground">Dias sem Agendar</p>
          <p className="text-[14px] font-bold text-foreground mt-0.5">{diasSemAgendar != null ? `${diasSemAgendar} dias` : "Nunca agendou"}</p>
        </CardContent></Card>
        <Card className="bg-green-50 border-green-100 shadow-none"><CardContent className="p-4">
          <DollarSign className="h-4 w-4 text-green-600 mb-1" />
          <p className="text-[12px] text-muted-foreground">Total Gasto</p>
          <p className="text-[14px] font-bold text-green-700 mt-0.5">{formatCurrency(totalGasto)}</p>
        </CardContent></Card>
        <Card className="bg-yellow-50 border-yellow-100 shadow-none"><CardContent className="p-4">
          <Award className="h-4 w-4 text-yellow-600 mb-1" />
          <p className="text-[12px] text-muted-foreground">Pontos Fidelidade</p>
          <p className="text-[14px] font-bold text-foreground mt-0.5">{pontosFidelidade} pts</p>
        </CardContent></Card>
      </div>

      <div className="flex gap-2 mb-6">
        {([
          { key: "resumo" as TabKey, label: "Resumo" },
          { key: "agendamentos" as TabKey, label: `Agendamentos (${data.totalAgendamentos})` },
          { key: "comandas" as TabKey, label: `Comandas (${data.totalComandas})` },
        ]).map(t => (
          <Button key={t.key} variant={tab === t.key ? "default" : "outline"} size="sm" onClick={() => setTab(t.key)} className="rounded-xl">
            {t.label}
          </Button>
        ))}
      </div>

      {tab === "resumo" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="shadow-none">
            <CardHeader><CardTitle className="text-[16px]">Últimos Agendamentos</CardTitle></CardHeader>
            <CardContent>
              {agendamentos.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhum agendamento</p>
              ) : (
                <div className="space-y-2">
                  {agendamentos.slice(0, 5).map((a: any) => (
                    <div key={a.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                      <div>
                        <p className="text-[13px] font-medium">{a.servicoNome}</p>
                        <p className="text-[11px] text-muted-foreground">{a.data} às {a.horaInicio} • {a.profissionalNome}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`text-[10px] ${STATUS_COLORS[a.status] || "bg-gray-50 text-gray-600"}`}>{a.status}</Badge>
                        <span className="text-[13px] font-semibold">{formatCurrency(a.valor)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="shadow-none">
            <CardHeader><CardTitle className="text-[16px]">Últimas Comandas</CardTitle></CardHeader>
            <CardContent>
              {comandas.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhuma comanda</p>
              ) : (
                <div className="space-y-2">
                  {comandas.slice(0, 5).map((c: any) => {
                    const pags = Array.isArray(c.pagamentos) ? c.pagamentos : [];
                    const metodos = pags.map((p: any) => p.metodo).join(", ");
                    return (
                      <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                        <div>
                          <p className="text-[13px] font-medium">Comanda #{c.id}</p>
                          <p className="text-[11px] text-muted-foreground">{c.dataFechamento ? new Date(c.dataFechamento).toLocaleDateString("pt-BR") : "—"} • {c.profissionalNome}</p>
                          {metodos && <p className="text-[10px] text-muted-foreground mt-0.5">{metodos}</p>}
                        </div>
                        <span className="text-[13px] font-semibold text-green-600">{formatCurrency(c.valorTotal)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "agendamentos" && (
        <Card className="shadow-none">
          <CardContent className="p-0">
            {agendamentos.length === 0 ? (
              <p className="text-center text-muted-foreground py-16">Nenhum agendamento encontrado</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Data</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Hora</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Serviço</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Profissional</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agendamentos.map((a: any) => (
                      <tr key={a.id} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="py-3 px-4">{a.data}</td>
                        <td className="py-3 px-4">{a.horaInicio}</td>
                        <td className="py-3 px-4">{a.servicoNome}</td>
                        <td className="py-3 px-4">{a.profissionalNome}</td>
                        <td className="py-3 px-4"><Badge className={`text-[10px] ${STATUS_COLORS[a.status] || "bg-gray-50 text-gray-600"}`}>{a.status}</Badge></td>
                        <td className="py-3 px-4 text-right font-medium">{formatCurrency(a.valor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "comandas" && (
        <Card className="shadow-none">
          <CardContent className="p-0">
            {comandas.length === 0 ? (
              <p className="text-center text-muted-foreground py-16">Nenhuma comanda encontrada</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">#</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Data</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Profissional</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Pagamento</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comandas.map((c: any) => {
                      const pags = Array.isArray(c.pagamentos) ? c.pagamentos : [];
                      const metodos = pags.map((p: any) => p.metodo).join(", ");
                      return (
                        <tr key={c.id} className="border-b border-border/50 hover:bg-muted/20">
                          <td className="py-3 px-4">#{c.id}</td>
                          <td className="py-3 px-4">{c.dataFechamento ? new Date(c.dataFechamento).toLocaleDateString("pt-BR") : "—"}</td>
                          <td className="py-3 px-4">{c.profissionalNome}</td>
                          <td className="py-3 px-4">{metodos || "—"}</td>
                          <td className="py-3 px-4 text-right font-medium text-green-600">{formatCurrency(c.valorTotal)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </AppLayout>
  );
}
