import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { User, Search, Receipt } from "lucide-react";

export default function ContaCliente() {
  const { barbeariaId } = useAuth();
  const [clientes, setClientes] = useState<any[]>([]);
  const [comandas, setComandas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCliente, setSelectedCliente] = useState<any>(null);
  const BASE = import.meta.env.BASE_URL;

  useEffect(() => { if (barbeariaId) fetchData(); }, [barbeariaId]);

  const fetchData = async () => {
    try {
      const [cRes, comRes] = await Promise.all([
        fetch(`${BASE}api/barbearias/${barbeariaId}/clientes`, { credentials: "include" }),
        fetch(`${BASE}api/barbearias/${barbeariaId}/comandas`, { credentials: "include" }),
      ]);
      if (cRes.ok) setClientes(await cRes.json());
      if (comRes.ok) setComandas(await comRes.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const filtered = clientes.filter(c =>
    (c.nome ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.email ?? "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getClienteTotal = (nome: string) => {
    return comandas.filter(c => c.clienteNome === nome).reduce((s, c) => s + c.valorTotal, 0);
  };

  const getClienteComandas = (nome: string) => {
    return comandas.filter(c => c.clienteNome === nome);
  };

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-[24px] font-bold text-foreground">Conta do Cliente</h1>
        <p className="text-foreground/40 text-[14px] mt-0.5">Histórico financeiro por cliente</p>
      </div>
      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/30" />
        <Input placeholder="Buscar cliente..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 rounded-xl" />
      </div>

      {selectedCliente ? (
        <div>
          <button onClick={() => setSelectedCliente(null)} className="text-sm text-primary mb-4 hover:underline">← Voltar</button>
          <Card className="bg-white border-black/[0.04] shadow-none mb-4">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center"><User className="h-6 w-6 text-primary" /></div>
                <div>
                  <p className="text-[16px] font-bold">{selectedCliente.nome}</p>
                  <p className="text-[13px] text-foreground/40">{selectedCliente.email} · {selectedCliente.telefone}</p>
                </div>
              </div>
              <p className="text-[14px]">Total gasto: <span className="font-bold text-primary">{formatCurrency(getClienteTotal(selectedCliente.nome))}</span></p>
            </CardContent>
          </Card>
          <div className="space-y-2">
            {getClienteComandas(selectedCliente.nome).map((c: any) => (
              <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-white border border-black/[0.04]">
                <div>
                  <p className="text-[13px] font-medium">{c.servicos?.map((s: any) => s.nome).join(", ") || "Serviço"}</p>
                  <p className="text-[12px] text-foreground/40">{c.profissionalNome} · {c.dataFechamento ? new Date(c.dataFechamento).toLocaleDateString("pt-BR") : "—"}</p>
                </div>
                <span className="text-[14px] font-semibold">{formatCurrency(c.valorTotal)}</span>
              </div>
            ))}
            {getClienteComandas(selectedCliente.nome).length === 0 && <p className="text-center text-foreground/40 py-8">Nenhuma comanda encontrada</p>}
          </div>
        </div>
      ) : loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <Card className="bg-white border-black/[0.04] shadow-none"><CardContent className="py-16 text-center">
          <User className="h-12 w-12 text-foreground/15 mx-auto mb-4" />
          <p className="text-foreground/40 text-[14px]">Nenhum cliente encontrado</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(c => (
            <div key={c.id} onClick={() => setSelectedCliente(c)} className="flex items-center justify-between p-4 rounded-xl bg-white border border-black/[0.04] cursor-pointer hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center"><User className="h-4 w-4 text-primary" /></div>
                <div>
                  <p className="text-[14px] font-medium">{c.nome}</p>
                  <p className="text-[12px] text-foreground/40">{c.telefone || c.email || "—"}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[14px] font-semibold">{formatCurrency(getClienteTotal(c.nome))}</p>
                <p className="text-[11px] text-foreground/40">{getClienteComandas(c.nome).length} comandas</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
