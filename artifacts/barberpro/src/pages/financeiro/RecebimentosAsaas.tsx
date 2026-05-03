import React, { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Receipt, ExternalLink, RefreshCcw, X as XIcon } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  RECEIVED: "bg-green-50 text-green-600",
  CONFIRMED: "bg-green-50 text-green-600",
  RECEIVED_IN_CASH: "bg-green-50 text-green-600",
  PENDING: "bg-amber-50 text-amber-600",
  OVERDUE: "bg-red-50 text-red-500",
  REFUNDED: "bg-gray-100 text-gray-600",
  DELETED: "bg-gray-100 text-gray-500",
};
const STATUS_LABELS: Record<string, string> = {
  RECEIVED: "Recebido", CONFIRMED: "Confirmado", RECEIVED_IN_CASH: "Recebido em dinheiro",
  PENDING: "Aguardando", OVERDUE: "Vencido", REFUNDED: "Estornado", DELETED: "Cancelado",
};
const TIPO_LABELS: Record<string, string> = {
  agendamento: "Sinal", comanda: "Comanda", pacote_cliente: "Pacote", saas: "Mensalidade", avulso: "Avulso",
};

const PAID_STATUSES = ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"];
const CANCELABLE_STATUSES = ["PENDING", "OVERDUE"];

export default function RecebimentosAsaas() {
  const { barbeariaId } = useAuth();
  const { toast } = useToast();
  const BASE = import.meta.env.BASE_URL;
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterTipo, setFilterTipo] = useState("");
  const [filterPeriodo, setFilterPeriodo] = useState<"todos" | "hoje" | "7d" | "30d" | "mes">("30d");
  const [actingId, setActingId] = useState<string | null>(null);

  async function load() {
    if (!barbeariaId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.append("status", filterStatus);
      if (filterTipo) params.append("tipo", filterTipo);
      const res = await fetch(`${BASE}api/barbearias/${barbeariaId}/asaas/recebimentos?${params}`, { credentials: "include" });
      if (res.ok) setRows(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [barbeariaId, filterStatus, filterTipo]);

  const filteredByPeriod = useMemo(() => {
    if (filterPeriodo === "todos") return rows;
    const now = new Date();
    const cutoff = new Date(now);
    if (filterPeriodo === "hoje") cutoff.setHours(0, 0, 0, 0);
    else if (filterPeriodo === "7d") cutoff.setDate(now.getDate() - 7);
    else if (filterPeriodo === "30d") cutoff.setDate(now.getDate() - 30);
    else if (filterPeriodo === "mes") { cutoff.setDate(1); cutoff.setHours(0, 0, 0, 0); }
    return rows.filter(r => r.createdAt && new Date(r.createdAt) >= cutoff);
  }, [rows, filterPeriodo]);

  const totalRecebido = filteredByPeriod.filter(r => PAID_STATUSES.includes(r.status))
    .reduce((s, r) => s + (r.valorLiquido || r.valor || 0), 0);
  const totalPendente = filteredByPeriod.filter(r => r.status === "PENDING").reduce((s, r) => s + (r.valor || 0), 0);

  async function cancelar(asaasPaymentId: string) {
    if (!confirm("Cancelar esta cobrança? Esta ação não pode ser desfeita.")) return;
    setActingId(asaasPaymentId);
    try {
      const res = await fetch(`${BASE}api/barbearias/${barbeariaId}/asaas/recebimentos/${asaasPaymentId}/cancelar`, {
        method: "POST", credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro");
      toast({ title: "Cobrança cancelada" });
      await load();
    } catch (e: any) { toast({ title: e.message, variant: "destructive" }); }
    finally { setActingId(null); }
  }

  async function reemitir(asaasPaymentId: string, billingType?: string) {
    setActingId(asaasPaymentId);
    try {
      const res = await fetch(`${BASE}api/barbearias/${barbeariaId}/asaas/recebimentos/${asaasPaymentId}/reemitir`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify(billingType ? { billingType } : {}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro");
      toast({ title: "Cobrança reemitida com sucesso" });
      await load();
    } catch (e: any) { toast({ title: e.message, variant: "destructive" }); }
    finally { setActingId(null); }
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto p-4 lg:p-6 space-y-4">
        <div>
          <h1 className="text-[20px] font-semibold text-foreground mb-1 flex items-center gap-2">
            <Receipt className="h-5 w-5" /> Recebimentos Asaas
          </h1>
          <p className="text-sm text-foreground/60">Sinais, comandas, pacotes e mensalidades cobrados via Asaas.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Card><CardContent className="p-4">
            <div className="text-xs text-foreground/60">Recebido no período</div>
            <div className="text-xl font-bold text-green-600 mt-1">R$ {totalRecebido.toFixed(2).replace(".", ",")}</div>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="text-xs text-foreground/60">Aguardando</div>
            <div className="text-xl font-bold text-amber-600 mt-1">R$ {totalPendente.toFixed(2).replace(".", ",")}</div>
          </CardContent></Card>
        </div>

        <div className="flex flex-wrap gap-2">
          <select value={filterPeriodo} onChange={e => setFilterPeriodo(e.target.value as any)}
            className="px-3 py-1.5 text-sm rounded-lg border border-foreground/10 bg-transparent">
            <option value="hoje">Hoje</option>
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="mes">Mês atual</option>
            <option value="todos">Todos</option>
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-lg border border-foreground/10 bg-transparent">
            <option value="">Todos status</option>
            <option value="PENDING">Aguardando</option>
            <option value="CONFIRMED">Confirmados</option>
            <option value="RECEIVED">Recebidos</option>
            <option value="OVERDUE">Vencidos</option>
            <option value="REFUNDED">Estornados</option>
            <option value="DELETED">Cancelados</option>
          </select>
          <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-lg border border-foreground/10 bg-transparent">
            <option value="">Todos tipos</option>
            <option value="agendamento">Sinais</option>
            <option value="comanda">Comandas</option>
            <option value="pacote_cliente">Pacotes</option>
            <option value="saas">Mensalidades</option>
            <option value="avulso">Avulsos</option>
          </select>
          <Button size="sm" variant="ghost" onClick={load}>
            <RefreshCcw className="h-3.5 w-3.5 mr-1.5" /> Atualizar
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : filteredByPeriod.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-sm text-foreground/60">
            Nenhum recebimento encontrado neste período.
          </CardContent></Card>
        ) : (
          <Card><CardContent className="p-0">
            <div className="divide-y divide-foreground/5">
              {filteredByPeriod.map(r => {
                const canCancel = CANCELABLE_STATUSES.includes(r.status);
                const canReemit = ["OVERDUE", "DELETED"].includes(r.status);
                return (
                  <div key={r.id} className="p-3 flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="font-medium truncate">{r.payerNome || r.description || "—"}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-foreground/10">{TIPO_LABELS[r.tipo] || r.tipo}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-foreground/10">{r.billingType}</span>
                      </div>
                      <div className="text-xs text-foreground/50">
                        {r.createdAt ? new Date(r.createdAt).toLocaleDateString("pt-BR") : ""}
                        {r.paidAt ? ` · Pago em ${new Date(r.paidAt).toLocaleDateString("pt-BR")}` : ""}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">R$ {Number(r.valor).toFixed(2).replace(".", ",")}</div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${STATUS_COLORS[r.status] || "bg-gray-100 text-gray-600"}`}>
                        {STATUS_LABELS[r.status] || r.status}
                      </span>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {r.invoiceUrl && (
                        <a href={r.invoiceUrl} target="_blank" rel="noopener noreferrer"
                          className="p-1.5 text-foreground/40 hover:text-foreground" title="Abrir fatura">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                      {canReemit && (
                        <button
                          disabled={actingId === r.asaasPaymentId}
                          onClick={() => reemitir(r.asaasPaymentId)}
                          className="p-1.5 text-blue-500 hover:text-blue-700 disabled:opacity-40"
                          title="Reemitir cobrança"
                        >
                          <RefreshCcw className="h-4 w-4" />
                        </button>
                      )}
                      {canCancel && (
                        <button
                          disabled={actingId === r.asaasPaymentId}
                          onClick={() => cancelar(r.asaasPaymentId)}
                          className="p-1.5 text-red-500 hover:text-red-700 disabled:opacity-40"
                          title="Cancelar cobrança"
                        >
                          <XIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent></Card>
        )}
      </div>
    </AppLayout>
  );
}
