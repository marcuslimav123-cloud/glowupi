import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { Search, Receipt, Calendar } from "lucide-react";

export default function ComandasHistorico() {
  const { barbeariaId } = useAuth();
  const [comandas, setComandas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const [dataInicio, setDataInicio] = useState(weekAgo);
  const [dataFim, setDataFim] = useState(today);

  useEffect(() => {
    if (!barbeariaId) return;
    fetchComandas();
  }, [barbeariaId, dataInicio, dataFim]);

  const fetchComandas = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/barbearias/${barbeariaId}/comandas?dataInicio=${dataInicio}&dataFim=${dataFim}`, { credentials: "include" });
      if (res.ok) setComandas(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = comandas.filter(c =>
    c.clienteNome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.profissionalNome?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalFaturamento = filtered.reduce((s, c) => s + (parseFloat(c.valorTotal) || 0), 0);

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-[24px] font-bold text-foreground">Histórico de Comandas</h1>
        <p className="text-foreground/40 text-[14px] mt-0.5">Todas as comandas fechadas</p>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/30" />
          <Input placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 h-10 rounded-xl border-border bg-card" />
        </div>
        <Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="h-10 w-40 rounded-xl border-border bg-card" />
        <Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="h-10 w-40 rounded-xl border-border bg-card" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="bg-card border-border shadow-none">
          <CardContent className="p-4">
            <p className="text-[12px] text-foreground/40 mb-1">Total Comandas</p>
            <p className="text-[22px] font-bold">{filtered.length}</p>
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
            <p className="text-[12px] text-foreground/40 mb-1">Ticket Médio</p>
            <p className="text-[22px] font-bold">{filtered.length > 0 ? formatCurrency(totalFaturamento / filtered.length) : formatCurrency(0)}</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-card rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <Card className="bg-card border-border shadow-none">
          <CardContent className="py-16 text-center">
            <Receipt className="h-12 w-12 text-foreground/15 mx-auto mb-4" />
            <p className="text-foreground/40 text-[14px]">Nenhuma comanda encontrada</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card border-border shadow-none">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 font-medium text-foreground/50">Data</th>
                    <th className="text-left p-3 font-medium text-foreground/50">Cliente</th>
                    <th className="text-left p-3 font-medium text-foreground/50">Profissional</th>
                    <th className="text-right p-3 font-medium text-foreground/50">Valor</th>
                    <th className="text-right p-3 font-medium text-foreground/50">Comissão</th>
                    <th className="text-center p-3 font-medium text-foreground/50">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => (
                    <tr key={c.id} className="border-b border-border hover:bg-muted/50">
                      <td className="p-3">{c.dataFechamento ? new Date(c.dataFechamento).toLocaleDateString("pt-BR") : "—"}</td>
                      <td className="p-3 font-medium">{c.clienteNome}</td>
                      <td className="p-3">{c.profissionalNome}</td>
                      <td className="p-3 text-right font-semibold text-primary">{formatCurrency(parseFloat(c.valorTotal) || 0)}</td>
                      <td className="p-3 text-right">{formatCurrency(parseFloat(c.comissaoTotal) || 0)}</td>
                      <td className="p-3 text-center">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${c.status === "paga" ? "bg-green-50 text-green-600" : c.status === "cancelada" ? "bg-red-50 text-red-500" : "bg-amber-50 text-amber-600"}`}>
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </AppLayout>
  );
}
