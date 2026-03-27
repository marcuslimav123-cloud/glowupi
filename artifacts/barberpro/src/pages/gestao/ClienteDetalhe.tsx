import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiUrl, formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, Heart, ShoppingBag, CalendarDays, DollarSign,
  Award, Phone, Mail, Crown, Clock, MessageCircle,
  ChevronLeft, ChevronRight, Filter,
} from "lucide-react";
import { Link } from "wouter";

type TabKey = "resumo" | "agendamentos" | "comandas";

const STATUS_COLORS: Record<string, string> = {
  confirmado: "bg-green-50 text-green-600",
  concluido: "bg-blue-50 text-blue-600",
  cancelado: "bg-red-50 text-red-500",
  pago: "bg-emerald-50 text-emerald-600",
  agendado: "bg-yellow-50 text-yellow-600",
};

export default function ClienteDetalhe() {
  const { barbeariaId } = useAuth();
  const [, params] = useRoute("/gestao/clientes/:clienteId");
  const clienteId = params?.clienteId;
  const [tab, setTab] = useState<TabKey>("resumo");

  const [agPage, setAgPage] = useState(1);
  const [agStatus, setAgStatus] = useState("__all__");
  const [agDataInicio, setAgDataInicio] = useState("");
  const [agDataFim, setAgDataFim] = useState("");

  const [cmPage, setCmPage] = useState(1);
  const [cmDataInicio, setCmDataInicio] = useState("");
  const [cmDataFim, setCmDataFim] = useState("");

  const { data, isLoading } = useQuery<{
    cliente: Record<string, unknown>;
    servicoMaisRealizado: { nome: string; vezes: number } | null;
    produtoMaisComprado: { nome: string; vezes: number } | null;
    diasSemAgendar: number | null;
    totalGasto: number;
    pontosFidelidade: number;
    totalAgendamentos: number;
    totalComandas: number;
  }>({
    queryKey: ["cliente-dashboard", barbeariaId, clienteId],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/clientes/${clienteId}/dashboard`), { credentials: "include" });
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
    enabled: !!barbeariaId && !!clienteId,
  });

  const agQuery = useQuery<{
    items: Array<{ id: number; data: string; horaInicio: string; horaFim: string; servicoNome: string; profissionalNome: string; status: string; valor: number }>;
    total: number; page: number; totalPages: number;
  }>({
    queryKey: ["cliente-agendamentos", barbeariaId, clienteId, agPage, agStatus, agDataInicio, agDataFim],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(agPage), limit: "20" });
      if (agStatus !== "__all__") params.set("status", agStatus);
      if (agDataInicio) params.set("dataInicio", agDataInicio);
      if (agDataFim) params.set("dataFim", agDataFim);
      const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/clientes/${clienteId}/agendamentos?${params}`), { credentials: "include" });
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
    enabled: !!barbeariaId && !!clienteId && tab === "agendamentos",
  });

  const cmQuery = useQuery<{
    items: Array<{ id: number; dataFechamento: string | null; profissionalNome: string; valorTotal: number; pagamentos: unknown; servicos: unknown; produtos: unknown }>;
    total: number; page: number; totalPages: number;
  }>({
    queryKey: ["cliente-comandas", barbeariaId, clienteId, cmPage, cmDataInicio, cmDataFim],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(cmPage), limit: "20" });
      if (cmDataInicio) params.set("dataInicio", cmDataInicio);
      if (cmDataFim) params.set("dataFim", cmDataFim);
      const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/clientes/${clienteId}/comandas?${params}`), { credentials: "include" });
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
    enabled: !!barbeariaId && !!clienteId && tab === "comandas",
  });

  const resumoAgQuery = useQuery<{
    items: Array<{ id: number; data: string; horaInicio: string; servicoNome: string; profissionalNome: string; status: string; valor: number }>;
  }>({
    queryKey: ["cliente-resumo-ag", barbeariaId, clienteId],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/clientes/${clienteId}/agendamentos?page=1&limit=5`), { credentials: "include" });
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
    enabled: !!barbeariaId && !!clienteId && tab === "resumo",
  });

  const resumoCmQuery = useQuery<{
    items: Array<{ id: number; dataFechamento: string | null; profissionalNome: string; valorTotal: number; pagamentos: unknown }>;
  }>({
    queryKey: ["cliente-resumo-cm", barbeariaId, clienteId],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/clientes/${clienteId}/comandas?page=1&limit=5`), { credentials: "include" });
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
    enabled: !!barbeariaId && !!clienteId && tab === "resumo",
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

  const cliente = data.cliente as Record<string, string | number | boolean | null>;
  const { servicoMaisRealizado, produtoMaisComprado, diasSemAgendar, totalGasto, pontosFidelidade } = data;
  const whatsUrl = cliente.telefone ? `https://wa.me/55${String(cliente.telefone).replace(/\D/g, "")}` : null;

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
            {String(cliente.nome).charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[24px] font-bold text-foreground">{String(cliente.nome)}</h1>
              {cliente.vip && <Badge className="text-xs bg-amber-500/10 text-amber-500 border-amber-500/20"><Crown className="h-3 w-3 mr-1" />VIP</Badge>}
            </div>
            <div className="flex items-center gap-4 mt-1 flex-wrap">
              <span className="text-sm text-muted-foreground flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{String(cliente.telefone)}</span>
              {cliente.email && <span className="text-sm text-muted-foreground flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{String(cliente.email)}</span>}
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
              {!resumoAgQuery.data || resumoAgQuery.data.items.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhum agendamento</p>
              ) : (
                <div className="space-y-2">
                  {resumoAgQuery.data.items.map((a) => (
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
              {!resumoCmQuery.data || resumoCmQuery.data.items.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhuma comanda</p>
              ) : (
                <div className="space-y-2">
                  {resumoCmQuery.data.items.map((c) => {
                    const pags = Array.isArray(c.pagamentos) ? c.pagamentos : [];
                    const metodos = (pags as Array<{ metodo: string }>).map(p => p.metodo).join(", ");
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
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={agStatus} onValueChange={(v) => { setAgStatus(v); setAgPage(1); }}>
                <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos Status</SelectItem>
                  <SelectItem value="agendado">Agendado</SelectItem>
                  <SelectItem value="confirmado">Confirmado</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
              <Input type="date" value={agDataInicio} onChange={(e) => { setAgDataInicio(e.target.value); setAgPage(1); }} className="w-[150px] h-9" placeholder="Data início" />
              <Input type="date" value={agDataFim} onChange={(e) => { setAgDataFim(e.target.value); setAgPage(1); }} className="w-[150px] h-9" placeholder="Data fim" />
              {(agStatus !== "__all__" || agDataInicio || agDataFim) && (
                <Button variant="ghost" size="sm" onClick={() => { setAgStatus("__all__"); setAgDataInicio(""); setAgDataFim(""); setAgPage(1); }}>Limpar</Button>
              )}
            </div>
            {!agQuery.data || agQuery.data.items.length === 0 ? (
              <p className="text-center text-muted-foreground py-16">Nenhum agendamento encontrado</p>
            ) : (
              <>
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
                      {agQuery.data.items.map((a) => (
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
                <PaginationControls page={agQuery.data.page} totalPages={agQuery.data.totalPages} total={agQuery.data.total} onPageChange={setAgPage} />
              </>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "comandas" && (
        <Card className="shadow-none">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Input type="date" value={cmDataInicio} onChange={(e) => { setCmDataInicio(e.target.value); setCmPage(1); }} className="w-[150px] h-9" placeholder="Data início" />
              <Input type="date" value={cmDataFim} onChange={(e) => { setCmDataFim(e.target.value); setCmPage(1); }} className="w-[150px] h-9" placeholder="Data fim" />
              {(cmDataInicio || cmDataFim) && (
                <Button variant="ghost" size="sm" onClick={() => { setCmDataInicio(""); setCmDataFim(""); setCmPage(1); }}>Limpar</Button>
              )}
            </div>
            {!cmQuery.data || cmQuery.data.items.length === 0 ? (
              <p className="text-center text-muted-foreground py-16">Nenhuma comanda encontrada</p>
            ) : (
              <>
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
                      {cmQuery.data.items.map((c) => {
                        const pags = Array.isArray(c.pagamentos) ? c.pagamentos : [];
                        const metodos = (pags as Array<{ metodo: string }>).map(p => p.metodo).join(", ");
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
                <PaginationControls page={cmQuery.data.page} totalPages={cmQuery.data.totalPages} total={cmQuery.data.total} onPageChange={setCmPage} />
              </>
            )}
          </CardContent>
        </Card>
      )}
    </AppLayout>
  );
}

function PaginationControls({ page, totalPages, total, onPageChange }: { page: number; totalPages: number; total: number; onPageChange: (p: number) => void }) {
  return (
    <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
      <p className="text-[12px] text-muted-foreground">{total} registro{total !== 1 ? "s" : ""}</p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-[13px] text-muted-foreground">{page} / {totalPages}</span>
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
