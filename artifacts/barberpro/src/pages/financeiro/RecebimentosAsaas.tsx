import React, { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Receipt, ExternalLink } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  RECEIVED: "bg-green-50 text-green-600",
  CONFIRMED: "bg-green-50 text-green-600",
  RECEIVED_IN_CASH: "bg-green-50 text-green-600",
  PENDING: "bg-amber-50 text-amber-600",
  OVERDUE: "bg-red-50 text-red-500",
  REFUNDED: "bg-gray-100 text-gray-600",
};
const STATUS_LABELS: Record<string, string> = {
  RECEIVED: "Recebido", CONFIRMED: "Confirmado", RECEIVED_IN_CASH: "Recebido em dinheiro",
  PENDING: "Aguardando", OVERDUE: "Vencido", REFUNDED: "Estornado", DELETED: "Removido",
};
const TIPO_LABELS: Record<string, string> = {
  agendamento: "Sinal", comanda: "Comanda", pacote_cliente: "Pacote", saas: "Mensalidade", avulso: "Avulso",
};

export default function RecebimentosAsaas() {
  const { barbeariaId } = useAuth();
  const BASE = import.meta.env.BASE_URL;
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterTipo, setFilterTipo] = useState("");

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

  const totalRecebido = rows.filter(r => ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"].includes(r.status))
    .reduce((s, r) => s + (r.valorLiquido || r.valor || 0), 0);
  const totalPendente = rows.filter(r => r.status === "PENDING").reduce((s, r) => s + (r.valor || 0), 0);

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto p-4 lg:p-6 space-y-4">
        <div>
          <h1 className="text-[20px] font-semibold text-foreground mb-1 flex items-center gap-2">
            <Receipt className="h-5 w-5" /> Recebimentos Asaas
          </h1>
          <p className="text-sm text-foreground/60">Sinais, comandas e cobranças geradas via Asaas.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Card><CardContent className="p-4">
            <div className="text-xs text-foreground/60">Recebido</div>
            <div className="text-xl font-bold text-green-600 mt-1">R$ {totalRecebido.toFixed(2).replace(".", ",")}</div>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="text-xs text-foreground/60">Aguardando</div>
            <div className="text-xl font-bold text-amber-600 mt-1">R$ {totalPendente.toFixed(2).replace(".", ",")}</div>
          </CardContent></Card>
        </div>

        <div className="flex flex-wrap gap-2">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-lg border border-foreground/10 bg-transparent">
            <option value="">Todos status</option>
            <option value="PENDING">Aguardando</option>
            <option value="CONFIRMED">Confirmados</option>
            <option value="RECEIVED">Recebidos</option>
            <option value="OVERDUE">Vencidos</option>
            <option value="REFUNDED">Estornados</option>
          </select>
          <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-lg border border-foreground/10 bg-transparent">
            <option value="">Todos tipos</option>
            <option value="agendamento">Sinais</option>
            <option value="comanda">Comandas</option>
            <option value="avulso">Avulsos</option>
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : rows.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-sm text-foreground/60">
            Nenhum recebimento encontrado.
          </CardContent></Card>
        ) : (
          <Card><CardContent className="p-0">
            <div className="divide-y divide-foreground/5">
              {rows.map(r => (
                <div key={r.id} className="p-3 flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium truncate">{r.payerNome || r.description || "—"}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-foreground/10">{TIPO_LABELS[r.tipo] || r.tipo}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-foreground/10">{r.billingType}</span>
                    </div>
                    <div className="text-xs text-foreground/50">
                      {r.createdAt ? new Date(r.createdAt).toLocaleDateString("pt-BR") : ""}
                      {r.paidAt ? ` • Pago em ${new Date(r.paidAt).toLocaleDateString("pt-BR")}` : ""}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">R$ {Number(r.valor).toFixed(2).replace(".", ",")}</div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${STATUS_COLORS[r.status] || "bg-gray-100 text-gray-600"}`}>
                      {STATUS_LABELS[r.status] || r.status}
                    </span>
                  </div>
                  {r.invoiceUrl && (
                    <a href={r.invoiceUrl} target="_blank" rel="noopener noreferrer" className="text-foreground/40 hover:text-foreground">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </CardContent></Card>
        )}
      </div>
    </AppLayout>
  );
}
