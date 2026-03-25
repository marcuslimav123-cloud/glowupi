import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Search, Download, FileText, Printer, ChevronLeft, ChevronRight,
  ChevronUp, ChevronDown, ChevronsUpDown,
} from "lucide-react";
import { format, subDays } from "date-fns";

export type ColumnDef = {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
};

type Props = {
  title: string;
  subtitle?: string;
  columns: ColumnDef[];
  data: any[];
  isLoading: boolean;
  dataInicio: string;
  dataFim: string;
  onDataInicioChange: (v: string) => void;
  onDataFimChange: (v: string) => void;
  onPesquisar: () => void;
  showDateFilters?: boolean;
  emptyIcon?: React.ReactNode;
  emptyMessage?: string;
};

type SortDir = "asc" | "desc" | null;

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export default function ReportTemplate({
  title, subtitle, columns, data, isLoading,
  dataInicio, dataFim, onDataInicioChange, onDataFimChange, onPesquisar,
  showDateFilters = true, emptyIcon, emptyMessage,
}: Props) {
  const [busca, setBusca] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const filtered = useMemo(() => {
    if (!busca.trim()) return data;
    const q = busca.toLowerCase();
    return data.filter(row =>
      columns.some(col => {
        const val = row[col.key];
        return val != null && String(val).toLowerCase().includes(q);
      })
    );
  }, [data, busca, columns]);

  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return filtered;
    return [...filtered].sort((a, b) => {
      let va = a[sortKey];
      let vb = b[sortKey];
      if (typeof va === "number" && typeof vb === "number") {
        return sortDir === "asc" ? va - vb : vb - va;
      }
      va = String(va ?? "").toLowerCase();
      vb = String(vb ?? "").toLowerCase();
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);
  const from = sorted.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, sorted.length);

  function toggleSort(key: string) {
    if (sortKey !== key) { setSortKey(key); setSortDir("asc"); }
    else if (sortDir === "asc") setSortDir("desc");
    else { setSortKey(null); setSortDir(null); }
  }

  function SortIcon({ col }: { col: string }) {
    if (sortKey !== col) return <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />;
    return sortDir === "asc" ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />;
  }

  function getExportData() {
    return sorted.map(row => {
      const obj: Record<string, any> = {};
      columns.forEach(col => { obj[col.label] = row[col.key] ?? "—"; });
      return obj;
    });
  }

  async function exportExcel() {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.json_to_sheet(getExportData());
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, title);
    XLSX.writeFile(wb, `${title.replace(/\s+/g, "_")}_${dataInicio}_${dataFim}.xlsx`);
  }

  async function exportPdf() {
    const { default: jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(16);
    doc.text(title, 14, 18);
    doc.setFontSize(10);
    doc.text(`Período: ${dataInicio} a ${dataFim}`, 14, 26);
    const exportData = getExportData();
    const cols = Object.keys(exportData[0] || {});
    const rows = exportData.map(r => Object.values(r));
    autoTable(doc, {
      head: [cols], body: rows, startY: 32,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [212, 175, 55] },
    });
    doc.save(`${title.replace(/\s+/g, "_")}_${dataInicio}_${dataFim}.pdf`);
  }

  function handlePrint() {
    const exportData = getExportData();
    if (exportData.length === 0) return;
    const cols = Object.keys(exportData[0]);
    const printWin = window.open("", "_blank");
    if (!printWin) return;
    printWin.document.write(`
      <html><head><title>${escapeHtml(title)}</title>
      <style>
        body { font-family: Inter, sans-serif; padding: 20px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
        th { background: #d4af37; color: white; }
        h1 { font-size: 18px; }
        p { font-size: 12px; color: #666; }
      </style></head><body>
      <h1>${escapeHtml(title)}</h1>
      <p>Período: ${escapeHtml(dataInicio)} a ${escapeHtml(dataFim)} | Total: ${exportData.length} registros</p>
      <table>
        <thead><tr>${cols.map(c => `<th>${escapeHtml(c)}</th>`).join("")}</tr></thead>
        <tbody>${exportData.map(r => `<tr>${Object.values(r).map(v => `<td>${escapeHtml(String(v))}</td>`).join("")}</tr>`).join("")}</tbody>
      </table>
      </body></html>
    `);
    printWin.document.close();
    printWin.focus();
    printWin.print();
  }

  return (
    <div>
      {showDateFilters && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-end gap-3 flex-wrap">
              <div className="space-y-1">
                <Label className="text-xs">Data Inicial</Label>
                <Input type="date" value={dataInicio} onChange={e => onDataInicioChange(e.target.value)} className="w-40" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Data Final</Label>
                <Input type="date" value={dataFim} onChange={e => onDataFimChange(e.target.value)} className="w-40" />
              </div>
              <Button onClick={onPesquisar} size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Search className="h-4 w-4 mr-1.5" /> Pesquisar
              </Button>
              <div className="flex-1" />
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar na tabela..."
                  value={busca}
                  onChange={e => { setBusca(e.target.value); setPage(1); }}
                  className="pl-9"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <CardTitle className="text-lg">{title} ({filtered.length})</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
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
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {columns.map(col => (
                        <th
                          key={col.key}
                          className={`text-left py-3 px-3 font-medium text-muted-foreground ${col.sortable !== false ? "cursor-pointer select-none" : ""}`}
                          onClick={col.sortable !== false ? () => toggleSort(col.key) : undefined}
                        >
                          <span className="inline-flex items-center gap-1">
                            {col.label}
                            {col.sortable !== false && <SortIcon col={col.key} />}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={columns.length} className="py-16 text-center">
                          {emptyIcon}
                          <p className="text-muted-foreground mt-4">{emptyMessage || "Nenhum registro encontrado."}</p>
                        </td>
                      </tr>
                    ) : (
                      paginated.map((row, rowIdx) => (
                        <tr key={row.id ?? rowIdx} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                          {columns.map(col => (
                            <td key={col.key} className="py-3 px-3">
                              {col.render ? col.render(row[col.key], row) : (row[col.key] ?? "—")}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {filtered.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Resultados por página:</span>
                    <Select value={String(pageSize)} onValueChange={v => { setPageSize(Number(v)); setPage(1); }}>
                      <SelectTrigger className="w-20 h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[10, 25, 50, 100].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    Mostrando {from} até {to} de {sorted.length} registros
                  </span>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                      <ChevronLeft className="h-4 w-4" /> Anterior
                    </Button>
                    <span className="text-sm px-3">{page} / {totalPages}</span>
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                      Próximo <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
