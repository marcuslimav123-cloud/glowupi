import React, { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useListClientes, useCreateCliente, useUpdateCliente } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatPhone, stripPhone } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  Plus, Search, UserRound, Star, Crown, Phone, Mail,
  Cake, TrendingUp, Edit2, Award, MessageCircle, Eye, FileSpreadsheet
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { ImportExcelDialog } from "@/components/ImportExcelDialog";

type Cliente = {
  id: number;
  nome: string;
  telefone: string;
  email: string | null;
  aniversario: string | null;
  observacoes: string | null;
  vip: boolean;
  totalGasto: number;
  pontosFidelidade: number;
  ultimaVisita: string | null;
  ativo: boolean;
};

function ClienteForm({
  initial, onSave, onCancel, isPending
}: {
  initial?: Partial<Cliente>;
  onSave: (d: any) => void;
  onCancel: () => void;
  isPending?: boolean;
}) {
  const [nome, setNome] = useState(initial?.nome ?? "");
  const [telefone, setTelefone] = useState(formatPhone(initial?.telefone ?? ""));
  const [email, setEmail] = useState(initial?.email ?? "");
  const [aniversario, setAniversario] = useState(initial?.aniversario ?? "");
  const [observacoes, setObservacoes] = useState(initial?.observacoes ?? "");
  const [vip, setVip] = useState(initial?.vip ?? false);

  return (
    <form onSubmit={e => { e.preventDefault(); onSave({ nome, telefone: stripPhone(telefone), email: email || null, aniversario: aniversario || null, observacoes: observacoes || null, vip }); }} className="space-y-4 mt-2">
      <div className="space-y-2">
        <Label>Nome Completo *</Label>
        <Input value={nome} onChange={e => setNome(e.target.value)} required placeholder="Ex: Mariana Silva" className="bg-background" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>WhatsApp *</Label>
          <Input value={telefone} onChange={e => setTelefone(formatPhone(e.target.value))} required placeholder="(99) 91234-5678" className="bg-background" />
        </div>
        <div className="space-y-2">
          <Label>E-mail</Label>
          <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemplo.com" className="bg-background" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Data de Aniversário</Label>
        <Input type="date" value={aniversario} onChange={e => setAniversario(e.target.value)} className="bg-background" />
      </div>
      <div className="space-y-2">
        <Label>Observações</Label>
        <Textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} className="bg-background resize-none" rows={2} placeholder="Ex: Alérgica a esmalte, pele sensível..." />
      </div>
      <button
        type="button"
        onClick={() => setVip(!vip)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${vip ? "bg-amber-500/10 border-amber-500/40 text-amber-500" : "border-border text-muted-foreground hover:border-primary/30"}`}
      >
        <Crown className="h-4 w-4" />
        <span className="font-medium text-sm">{vip ? "Cliente VIP ativado" : "Marcar como VIP"}</span>
      </button>
      <div className="flex gap-3 pt-1">
        <Button type="submit" className="flex-1" disabled={isPending}>
          {isPending ? "Salvando..." : "Salvar Cliente"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
      </div>
    </form>
  );
}

export default function Clientes() {
  const { barbeariaId } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: clientes = [], isLoading } = useListClientes(barbeariaId!, {}, { query: { enabled: !!barbeariaId } });
  const createMutation = useCreateCliente();
  const updateMutation = useUpdateCliente();

  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["/api/barbearias", barbeariaId, "clientes"] });

  const filtered = useMemo(() =>
    (clientes as Cliente[]).filter(c =>
      c.nome.toLowerCase().includes(search.toLowerCase()) ||
      c.telefone.includes(search)
    ), [clientes, search]);

  const today = format(new Date(), "MM-dd");

  const handleSave = async (data: any) => {
    try {
      if (editing) {
        await updateMutation.mutateAsync({ barbeariaId: barbeariaId!, clienteId: editing.id, data });
        toast({ title: "Cliente atualizado!" });
      } else {
        await createMutation.mutateAsync({ barbeariaId: barbeariaId!, data });
        toast({ title: "Cliente cadastrado!" });
      }
      invalidate();
      setModalOpen(false);
      setEditing(null);
    } catch (err: any) {
      const msg = err?.response?.data?.error || "Erro ao salvar.";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    }
  };

  const handleToggleVip = async (c: Cliente) => {
    await updateMutation.mutateAsync({ barbeariaId: barbeariaId!, clienteId: c.id, data: { vip: !c.vip } });
    invalidate();
  };

  return (
    <AppLayout>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Clientes</h1>
          <p className="text-muted-foreground mt-1">Cadastro e histórico de clientes</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="w-fit" onClick={() => setImportOpen(true)}>
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Importar Excel
          </Button>
          <Button className="shadow-lg shadow-primary/25 w-fit" onClick={() => { setEditing(null); setModalOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Novo Cliente
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total", value: (clientes as Cliente[]).length, icon: UserRound, color: "text-primary" },
          { label: "VIPs", value: (clientes as Cliente[]).filter(c => c.vip).length, icon: Crown, color: "text-amber-500" },
          { label: "Aniversariantes", value: (clientes as Cliente[]).filter(c => c.aniversario?.slice(5) === today).length, icon: Cake, color: "text-yellow-400" },
          { label: "Gasto Total", value: formatCurrency((clientes as Cliente[]).reduce((s, c) => s + c.totalGasto, 0)), icon: TrendingUp, color: "text-green-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4">
            <Icon className={`h-5 w-5 ${color} mb-1`} />
            <p className={`text-xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou telefone..." className="pl-9" />
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-20 bg-card rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-border">
          <UserRound className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          {search ? (
            <p className="text-muted-foreground">Nenhum cliente encontrado para "{search}"</p>
          ) : (
            <>
              <p className="font-medium">Nenhum cliente cadastrado</p>
              <p className="text-muted-foreground text-sm mt-1">Comece adicionando seus clientes</p>
              <Button className="mt-4" onClick={() => setModalOpen(true)}>Cadastrar primeiro cliente</Button>
            </>
          )}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl">
          {filtered.map((c, i) => {
            const isAniversario = c.aniversario?.slice(5) === today;
            return (
              <div key={c.id} className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 hover:bg-muted/20 transition-colors ${i !== 0 ? "border-t border-border" : ""}`}>
                <Link href={`/gestao/clientes/${c.id}`} className="shrink-0">
                <div className={`h-11 w-11 rounded-full flex items-center justify-center font-bold text-lg border cursor-pointer ${c.vip ? "bg-amber-500/10 text-amber-500 border-amber-500/25" : "bg-primary/10 text-primary border-primary/20"}`}>
                  {c.nome.charAt(0).toUpperCase()}
                </div>
                </Link>

                <Link href={`/gestao/clientes/${c.id}`} className="flex-1 min-w-0 cursor-pointer">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm hover:text-primary transition-colors">{c.nome}</p>
                    {c.vip && <Badge className="text-xs bg-amber-500/10 text-amber-500 border-amber-500/20"><Crown className="h-2.5 w-2.5 mr-1" />VIP</Badge>}
                    {isAniversario && <Badge className="text-xs bg-yellow-500/10 text-yellow-400 border-yellow-500/20"><Cake className="h-2.5 w-2.5 mr-1" />Aniversário!</Badge>}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <span className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />{c.telefone}</span>
                    {c.ultimaVisita && <span className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" />Última: {c.ultimaVisita.split("-").reverse().join("/")}</span>}
                    {c.aniversario && <span className="text-xs text-muted-foreground flex items-center gap-1 hidden sm:flex"><Cake className="h-3 w-3" />{c.aniversario.slice(5).split("-").reverse().join("/")}</span>}
                  </div>
                </Link>

                <div className="text-right hidden sm:block shrink-0">
                  <p className="text-sm font-bold text-primary">{formatCurrency(c.totalGasto)}</p>
                  <div className="flex items-center gap-1 justify-end mt-0.5">
                    <Award className="h-3 w-3 text-yellow-400" />
                    <span className="text-xs text-muted-foreground">{c.pontosFidelidade} pts</span>
                  </div>
                </div>

                <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                  {c.telefone && (
                    <a href={`https://wa.me/55${c.telefone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="hidden sm:block">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50" title="WhatsApp">
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    </a>
                  )}
                  <Link href={`/gestao/clientes/${c.id}`} className="hidden sm:block">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" title="Ver Detalhes">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button variant="ghost" size="icon" className={`h-7 w-7 sm:h-8 sm:w-8 ${c.vip ? "text-amber-500" : "text-muted-foreground hover:text-amber-500"}`} title={c.vip ? "Remover VIP" : "Marcar VIP"} onClick={() => handleToggleVip(c)}>
                    <Crown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-primary" onClick={() => { setEditing(c); setModalOpen(true); }}>
                    <Edit2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={v => { setModalOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="bg-card border-border sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-display">{editing ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
          </DialogHeader>
          <ClienteForm
            initial={editing ?? {}}
            onSave={handleSave}
            onCancel={() => { setModalOpen(false); setEditing(null); }}
            isPending={createMutation.isPending || updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {barbeariaId && (
        <ImportExcelDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          barbeariaId={barbeariaId}
          onImportComplete={invalidate}
        />
      )}
    </AppLayout>
  );
}
