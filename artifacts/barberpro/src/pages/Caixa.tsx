import React, { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency, apiUrl } from "@/lib/utils";
import { format } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  DollarSign, CreditCard, Smartphone, Banknote, Receipt, TrendingUp,
  Search, ChevronUp, ChevronDown, ChevronsUpDown, Plus,
  Download, FileText, Printer, Columns3, ChevronLeft, ChevronRight,
  CalendarDays,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";

const METODO_ICON: Record<string, React.ReactNode> = {
  pix: <Smartphone className="h-3.5 w-3.5" />,
  dinheiro: <Banknote className="h-3.5 w-3.5" />,
  credito: <CreditCard className="h-3.5 w-3.5" />,
  debito: <CreditCard className="h-3.5 w-3.5" />,
};
const METODO_LABEL: Record<string, string> = { pix: "PIX", dinheiro: "Dinheiro", credito: "Crédito", debito: "Débito", outros: "Outros" };

type SortKey = "id" | "clienteNome" | "profissionalNome" | "valorTotal" | "dataFechamento" | "observacao" | "cadastradoPor";
type SortDir = "asc" | "desc" | null;

const ALL_COLUMNS = [
  { key: "id", label: "Comanda" },
  { key: "pagamentos", label: "Cartão" },
  { key: "dataFechamento", label: "Data" },
  { key: "valorTotal", label: "Valor" },
  { key: "clienteNome", label: "Cliente" },
  { key: "observacao", label: "Obs" },
  { key: "cadastradoPor", label: "Cadastrou" },
  { key: "profissionalNome", label: "Profissional" },
  { key: "servicos", label: "Serviços" },
] as const;

function todayStr() {
  return format(new Date(), "yyyy-MM-dd");
}

export default function Caixa() {
  const { barbeariaId } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [dataInicio, setDataInicio] = useState(todayStr());
  const [dataFim, setDataFim] = useState(todayStr());
  const [searchDataInicio, setSearchDataInicio] = useState(todayStr());
  const [searchDataFim, setSearchDataFim] = useState(todayStr());
  const [busca, setBusca] = useState("");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [visibleCols, setVisibleCols] = useState<Set<string>>(new Set(ALL_COLUMNS.map(c => c.key)));
  const [novaComandaOpen, setNovaComandaOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { data: profissionais = [] } = useQuery<any[]>({
    queryKey: ["profissionais-caixa", barbeariaId],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/profissionais`), { credentials: "include" });
      return res.ok ? res.json() : [];
    },
    enabled: !!barbeariaId,
  });

  const { data: servicos = [] } = useQuery<any[]>({
    queryKey: ["servicos-caixa", barbeariaId],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/servicos`), { credentials: "include" });
      return res.ok ? res.json() : [];
    },
    enabled: !!barbeariaId,
  });

  const { data: comandas = [], isLoading } = useQuery<any[]>({
    queryKey: ["comandas", barbeariaId, searchDataInicio, searchDataFim],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchDataInicio) params.set("dataInicio", searchDataInicio);
      if (searchDataFim) params.set("dataFim", searchDataFim);
      const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/comandas?${params}`), { credentials: "include" });
      if (!res.ok) throw new Error("Erro ao carregar comandas");
      return res.json();
    },
    enabled: !!barbeariaId,
  });

  function handlePesquisar() {
    setSearchDataInicio(dataInicio);
    setSearchDataFim(dataFim);
    setPage(1);
  }

  function handleHoje() {
    const h = todayStr();
    setDataInicio(h);
    setDataFim(h);
    setSearchDataInicio(h);
    setSearchDataFim(h);
    setPage(1);
  }

  const filtered = useMemo(() => {
    if (!busca.trim()) return comandas;
    const q = busca.toLowerCase();
    return comandas.filter((c: any) =>
      c.clienteNome?.toLowerCase().includes(q) ||
      c.profissionalNome?.toLowerCase().includes(q) ||
      (c.servicos as any[])?.some((s: any) => s.nome?.toLowerCase().includes(q)) ||
      (c.produtos as any[])?.some((p: any) => p.nome?.toLowerCase().includes(q))
    );
  }, [comandas, busca]);

  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return filtered;
    return [...filtered].sort((a: any, b: any) => {
      let va = a[sortKey];
      let vb = b[sortKey];
      if (sortKey === "valorTotal") { va = Number(va); vb = Number(vb); }
      if (sortKey === "dataFechamento") { va = new Date(va).getTime(); vb = new Date(vb).getTime(); }
      if (typeof va === "string") { va = va.toLowerCase(); vb = (vb || "").toLowerCase(); }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  const totalBruto = filtered.reduce((s: number, c: any) => s + c.valorTotal, 0);
  const totalComissoes = filtered.reduce((s: number, c: any) => s + c.comissaoTotal, 0);
  const pagTotals: Record<string, number> = {};
  filtered.forEach((c: any) => (c.pagamentos as any[])?.forEach((p: any) => { pagTotals[p.metodo] = (pagTotals[p.metodo] || 0) + p.valor; }));

  function toggleSort(key: SortKey) {
    if (sortKey !== key) { setSortKey(key); setSortDir("asc"); }
    else if (sortDir === "asc") setSortDir("desc");
    else { setSortKey(null); setSortDir(null); }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />;
    return sortDir === "asc" ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />;
  }

  function toggleCol(key: string) {
    setVisibleCols(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function getPaymentBadge(c: any) {
    const pags = (c.pagamentos as any[]) || [];
    if (pags.length === 0) return "—";
    return pags.map((p: any) => METODO_LABEL[p.metodo] ?? p.metodo).join(", ");
  }

  function getTableData() {
    return sorted.map((c: any) => ({
      Comanda: `#${c.id}`,
      Cartão: getPaymentBadge(c),
      Data: c.dataFechamento ? format(new Date(c.dataFechamento), "dd/MM/yyyy HH:mm") : "—",
      Valor: formatCurrency(c.valorTotal),
      Cliente: c.clienteNome,
      Obs: c.observacao || "—",
      Cadastrou: c.cadastradoPor || "—",
      Profissional: c.profissionalNome,
      Serviços: (c.servicos as any[])?.map((s: any) => s.nome).join(", ") || "—",
    }));
  }

  async function exportExcel() {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.json_to_sheet(getTableData());
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Comandas");
    XLSX.writeFile(wb, `comandas_${searchDataInicio}_${searchDataFim}.xlsx`);
  }

  async function exportPdf() {
    const { default: jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(16);
    doc.text("Comandas", 14, 18);
    doc.setFontSize(10);
    doc.text(`Período: ${dataInicio} a ${dataFim}`, 14, 26);
    const tableData = getTableData();
    const columns = Object.keys(tableData[0] || {});
    const rows = tableData.map(r => Object.values(r));
    autoTable(doc, {
      head: [columns],
      body: rows,
      startY: 32,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [212, 175, 55] },
    });
    doc.save(`comandas_${searchDataInicio}_${searchDataFim}.pdf`);
  }

  async function handleNovaComanda(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fd = new FormData(e.currentTarget);
      const profissionalId = parseInt(fd.get("profissionalId") as string);
      const servicoId = parseInt(fd.get("servicoId") as string);
      const clienteNome = fd.get("clienteNome") as string;
      const clienteTelefone = fd.get("clienteTelefone") as string;
      const metodo = fd.get("metodo") as string;
      const agendRes = await fetch(apiUrl(`/barbearias/${barbeariaId}/agendamentos`), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clienteNome,
          clienteTelefone: clienteTelefone || "00000000000",
          profissionalId,
          servicoId,
          data: todayStr(),
          horaInicio: format(new Date(), "HH:mm"),
          encaixe: true,
        }),
      });
      if (!agendRes.ok) throw new Error("Erro ao criar agendamento");
      const agend = await agendRes.json();
      const servico = servicos.find((s: any) => s.id === servicoId);
      const valor = servico ? parseFloat(servico.preco) : 0;
      const checkoutRes = await fetch(apiUrl(`/barbearias/${barbeariaId}/agendamentos/${agend.id}/checkout`), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pagamentos: [{ metodo, valor }],
          observacao: fd.get("observacao") as string || null,
        }),
      });
      if (!checkoutRes.ok) throw new Error("Erro ao fechar comanda");
      toast({ title: "Comanda criada com sucesso" });
      setNovaComandaOpen(false);
      qc.invalidateQueries({ queryKey: ["comandas"] });
    } catch (err: any) {
      toast({ title: err.message || "Erro", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  function escapeHtml(str: string): string {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function handlePrint() {
    const tableData = getTableData();
    if (tableData.length === 0) return;
    const columns = Object.keys(tableData[0]);
    const printWin = window.open("", "_blank");
    if (!printWin) return;
    printWin.document.write(`
      <html><head><title>Comandas</title>
      <style>
        body { font-family: Inter, sans-serif; padding: 20px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
        th { background: #d4af37; color: white; }
        h1 { font-size: 18px; }
        p { font-size: 12px; color: #666; }
      </style></head><body>
      <h1>Comandas</h1>
      <p>Período: ${escapeHtml(dataInicio)} a ${escapeHtml(dataFim)} | Total: ${tableData.length} registros</p>
      <table>
        <thead><tr>${columns.map(c => `<th>${escapeHtml(c)}</th>`).join("")}</tr></thead>
        <tbody>${tableData.map(r => `<tr>${Object.values(r).map(v => `<td>${escapeHtml(String(v))}</td>`).join("")}</tr>`).join("")}</tbody>
      </table>
      </body></html>
    `);
    printWin.document.close();
    printWin.focus();
    printWin.print();
  }

  return (
    <AppLayout>
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Caixa</h1>
          <p className="text-muted-foreground mt-1">Comandas e recebimentos</p>
        </div>
        <Button onClick={() => setNovaComandaOpen(true)} className="bg-green-600 hover:bg-green-700 gap-1.5">
          <Plus className="h-4 w-4" /> Comanda
        </Button>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-end gap-3 flex-wrap">
            <div className="space-y-1">
              <Label className="text-xs">Data Inicial*</Label>
              <Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Data Final*</Label>
              <Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="w-40" />
            </div>
            <Button onClick={handleHoje} variant="outline" size="sm" className="gap-1.5">
              <CalendarDays className="h-4 w-4" /> Hoje
            </Button>
            <Button onClick={handlePesquisar} size="sm">
              <Search className="h-4 w-4 mr-1.5" /> Pesquisar
            </Button>
            <div className="flex-1" />
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente, profissional, serviço..."
                value={busca}
                onChange={e => { setBusca(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <CardTitle className="text-lg">Comandas ({filtered.length})</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Columns3 className="h-4 w-4" /> Colunas
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {ALL_COLUMNS.map(col => (
                    <DropdownMenuCheckboxItem
                      key={col.key}
                      checked={visibleCols.has(col.key)}
                      onCheckedChange={() => toggleCol(col.key)}
                    >
                      {col.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={exportExcel} disabled={filtered.length === 0}>
                <Download className="h-4 w-4" /> Excel
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={exportPdf} disabled={filtered.length === 0}>
                <FileText className="h-4 w-4" /> PDF
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handlePrint} disabled={filtered.length === 0}>
                <Printer className="h-4 w-4" /> Imprimir
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-12 bg-muted/30 rounded-lg animate-pulse" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhuma comanda neste período.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {visibleCols.has("id") && (
                        <th className="text-left py-3 px-3 font-medium text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort("id")}>
                          <span className="inline-flex items-center gap-1"># <SortIcon col="id" /></span>
                        </th>
                      )}
                      {visibleCols.has("pagamentos") && (
                        <th className="text-left py-3 px-3 font-medium text-muted-foreground">Cartão</th>
                      )}
                      {visibleCols.has("dataFechamento") && (
                        <th className="text-left py-3 px-3 font-medium text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort("dataFechamento")}>
                          <span className="inline-flex items-center gap-1">Data <SortIcon col="dataFechamento" /></span>
                        </th>
                      )}
                      {visibleCols.has("valorTotal") && (
                        <th className="text-left py-3 px-3 font-medium text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort("valorTotal")}>
                          <span className="inline-flex items-center gap-1">Valor <SortIcon col="valorTotal" /></span>
                        </th>
                      )}
                      {visibleCols.has("clienteNome") && (
                        <th className="text-left py-3 px-3 font-medium text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort("clienteNome")}>
                          <span className="inline-flex items-center gap-1">Cliente <SortIcon col="clienteNome" /></span>
                        </th>
                      )}
                      {visibleCols.has("observacao") && (
                        <th className="text-left py-3 px-3 font-medium text-muted-foreground">Obs</th>
                      )}
                      {visibleCols.has("cadastradoPor") && (
                        <th className="text-left py-3 px-3 font-medium text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort("cadastradoPor")}>
                          <span className="inline-flex items-center gap-1">Cadastrou <SortIcon col="cadastradoPor" /></span>
                        </th>
                      )}
                      {visibleCols.has("profissionalNome") && (
                        <th className="text-left py-3 px-3 font-medium text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort("profissionalNome")}>
                          <span className="inline-flex items-center gap-1">Profissional <SortIcon col="profissionalNome" /></span>
                        </th>
                      )}
                      {visibleCols.has("servicos") && (
                        <th className="text-left py-3 px-3 font-medium text-muted-foreground">Serviços</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((c: any) => (
                      <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        {visibleCols.has("id") && (
                          <td className="py-3 px-3 font-mono text-xs">#{c.id}</td>
                        )}
                        {visibleCols.has("pagamentos") && (
                          <td className="py-3 px-3">
                            <div className="flex gap-1 flex-wrap">
                              {(c.pagamentos as any[])?.map((p: any, i: number) => (
                                <Badge key={i} variant="outline" className="text-xs gap-1">
                                  {METODO_ICON[p.metodo]} {METODO_LABEL[p.metodo] ?? p.metodo}
                                </Badge>
                              ))}
                            </div>
                          </td>
                        )}
                        {visibleCols.has("dataFechamento") && (
                          <td className="py-3 px-3 text-xs whitespace-nowrap">
                            {c.dataFechamento ? format(new Date(c.dataFechamento), "dd/MM/yyyy HH:mm") : "—"}
                          </td>
                        )}
                        {visibleCols.has("valorTotal") && (
                          <td className="py-3 px-3 font-semibold text-primary">{formatCurrency(c.valorTotal)}</td>
                        )}
                        {visibleCols.has("clienteNome") && (
                          <td className="py-3 px-3">{c.clienteNome}</td>
                        )}
                        {visibleCols.has("observacao") && (
                          <td className="py-3 px-3 text-xs text-muted-foreground max-w-[150px] truncate">{c.observacao || "—"}</td>
                        )}
                        {visibleCols.has("cadastradoPor") && (
                          <td className="py-3 px-3 text-xs">{c.cadastradoPor || "—"}</td>
                        )}
                        {visibleCols.has("profissionalNome") && (
                          <td className="py-3 px-3">
                            <Badge variant="secondary" className="text-xs">{c.profissionalNome}</Badge>
                          </td>
                        )}
                        {visibleCols.has("servicos") && (
                          <td className="py-3 px-3 text-xs text-muted-foreground max-w-[200px] truncate">
                            {(c.servicos as any[])?.map((s: any) => s.nome).join(", ")}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t border-border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Mostrando {Math.min((page - 1) * pageSize + 1, sorted.length)} até {Math.min(page * pageSize, sorted.length)} de {sorted.length} registros</span>
                  <Select value={String(pageSize)} onValueChange={v => { setPageSize(Number(v)); setPage(1); }}>
                    <SelectTrigger className="w-20 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-xs">por página</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                    <ChevronLeft className="h-4 w-4" /> Anterior
                  </Button>
                  <span className="px-3 text-sm text-muted-foreground">
                    {page} / {totalPages}
                  </span>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                    Próximo <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={novaComandaOpen} onOpenChange={setNovaComandaOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nova Comanda</DialogTitle></DialogHeader>
          <form onSubmit={handleNovaComanda} className="space-y-4">
            <div>
              <Label>Cliente *</Label>
              <Input name="clienteNome" required placeholder="Nome do cliente" />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input name="clienteTelefone" placeholder="(00) 00000-0000" />
            </div>
            <div>
              <Label>Profissional *</Label>
              <select name="profissionalId" required className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
                <option value="">Selecione...</option>
                {profissionais.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.nomeExibicao}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Serviço *</Label>
              <select name="servicoId" required className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
                <option value="">Selecione...</option>
                {servicos.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.nome} — {formatCurrency(parseFloat(s.preco))}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Forma de Pagamento *</Label>
              <select name="metodo" required className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
                <option value="pix">PIX</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="credito">Crédito</option>
                <option value="debito">Débito</option>
              </select>
            </div>
            <div>
              <Label>Observação</Label>
              <Input name="observacao" placeholder="Observação (opcional)" />
            </div>
            <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={submitting}>
              {submitting ? "Criando..." : "Criar Comanda"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
