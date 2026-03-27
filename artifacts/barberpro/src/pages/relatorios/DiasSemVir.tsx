import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { apiUrl, formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Search, UserX, Phone, Mail, Crown, MessageCircle,
  Download, FileText, Printer, ChevronLeft, ChevronRight,
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export default function DiasSemVir() {
  const { barbeariaId } = useAuth();
  const [dias, setDias] = useState("30");
  const [searchDias, setSearchDias] = useState("30");
  const [busca, setBusca] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { data = [], isLoading } = useQuery<any[]>({
    queryKey: ["dias-sem-vir", barbeariaId, searchDias],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/relatorios/dias-sem-vir?dias=${searchDias}`), { credentials: "include" });
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
    enabled: !!barbeariaId,
  });

  const filtered = busca.trim()
    ? data.filter(c => c.nome.toLowerCase().includes(busca.toLowerCase()) || c.telefone.includes(busca))
    : data;

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  async function exportExcel() {
    const XLSX = await import("xlsx");
    const exportData = filtered.map(c => ({
      Nome: c.nome, Telefone: c.telefone, Email: c.email || "—",
      "Último Agendamento": c.ultimoAgendamento || "Nunca",
      "Dias sem Vir": c.diasSemVir === 9999 ? "Nunca agendou" : c.diasSemVir,
      VIP: c.vip ? "Sim" : "Não",
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dias sem Vir");
    XLSX.writeFile(wb, `Dias_sem_Vir_${searchDias}dias.xlsx`);
  }

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-[24px] font-bold text-foreground">Dias sem Vir</h1>
        <p className="text-foreground/40 text-[14px] mt-0.5">Clientes que não agendaram nos últimos X dias</p>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-end gap-3 flex-wrap">
            <div className="space-y-1">
              <Label className="text-xs">Dias sem agendar (mínimo)</Label>
              <Input type="number" value={dias} onChange={e => setDias(e.target.value)} className="w-32" min="1" />
            </div>
            <Button onClick={() => { setSearchDias(dias); setPage(1); }} size="sm" className="bg-blue-600 hover:bg-blue-700">
              <Search className="h-4 w-4 mr-1.5" /> Pesquisar
            </Button>
            <div className="flex-1" />
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Filtrar por nome ou telefone..." value={busca} onChange={e => { setBusca(e.target.value); setPage(1); }} className="pl-9" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <CardTitle className="text-lg">Clientes Inativos ({filtered.length})</CardTitle>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={exportExcel} disabled={filtered.length === 0}>
              <Download className="h-4 w-4" /> Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-12 bg-muted/30 rounded-lg animate-pulse" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <UserX className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">Nenhum cliente inativo com {searchDias}+ dias sem vir.</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {paginated.map((c: any) => {
                  const whatsUrl = c.telefone ? `https://wa.me/55${c.telefone.replace(/\D/g, "")}` : null;
                  return (
                    <div key={c.id} className="flex items-center gap-4 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="h-10 w-10 rounded-full flex items-center justify-center font-bold text-lg bg-red-50 text-red-500 border border-red-200 shrink-0">
                        {c.nome.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[13px] font-semibold">{c.nome}</p>
                          {c.vip && <Badge className="text-[10px] bg-amber-500/10 text-amber-500"><Crown className="h-2.5 w-2.5 mr-0.5" />VIP</Badge>}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />{c.telefone}</span>
                          {c.email && <span className="text-[11px] text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</span>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[11px] text-muted-foreground">Último agendamento</p>
                        <p className="text-[12px] font-medium">{c.ultimoAgendamento || "Nunca"}</p>
                      </div>
                      <Badge className={`shrink-0 ${c.diasSemVir >= 90 ? "bg-red-50 text-red-600" : c.diasSemVir >= 60 ? "bg-orange-50 text-orange-600" : "bg-yellow-50 text-yellow-600"}`}>
                        {c.diasSemVir === 9999 ? "Nunca" : `${c.diasSemVir}d`}
                      </Badge>
                      {whatsUrl && (
                        <a href={whatsUrl} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50">
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
              {filtered.length > pageSize && (
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Por página:</span>
                    <Select value={String(pageSize)} onValueChange={v => { setPageSize(Number(v)); setPage(1); }}>
                      <SelectTrigger className="w-20 h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[10, 25, 50, 100].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm px-3">{page} / {totalPages}</span>
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
