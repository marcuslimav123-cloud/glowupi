import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2, MapPin, Building2, Phone, Loader2 } from "lucide-react";
import { apiUrl } from "@/lib/utils";

interface Filial {
  id: number;
  barbeariaId: number;
  nome: string;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  telefone: string | null;
  ativo: boolean;
}

export default function Filiais() {
  const { barbeariaId } = useAuth();
  const { toast } = useToast();
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [eligible, setEligible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Filial | null>(null);
  const [saving, setSaving] = useState(false);

  const [nome, setNome] = useState("");
  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");
  const [cep, setCep] = useState("");
  const [telefone, setTelefone] = useState("");

  useEffect(() => {
    if (barbeariaId) fetchFiliais();
  }, [barbeariaId]);

  async function fetchFiliais() {
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/filiais`), { credentials: "include" });
      const data = await res.json();
      setEligible(data.eligible);
      setFiliais((data.filiais || []).filter((f: Filial) => f.ativo));
    } catch {
      toast({ title: "Erro ao carregar filiais", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  function openNew() {
    setEditing(null);
    setNome("");
    setLogradouro("");
    setNumero("");
    setBairro("");
    setCidade("");
    setUf("");
    setCep("");
    setTelefone("");
    setDialogOpen(true);
  }

  function openEdit(f: Filial) {
    setEditing(f);
    setNome(f.nome);
    setLogradouro(f.logradouro || "");
    setNumero(f.numero || "");
    setBairro(f.bairro || "");
    setCidade(f.cidade || "");
    setUf(f.uf || "");
    setCep(f.cep || "");
    setTelefone(f.telefone || "");
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!nome.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const body = { nome, logradouro, numero, bairro, cidade, uf, cep, telefone };
      const url = editing
        ? apiUrl(`/barbearias/${barbeariaId}/filiais/${editing.id}`)
        : apiUrl(`/barbearias/${barbeariaId}/filiais`);
      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao salvar");
      }
      toast({ title: editing ? "Filial atualizada!" : "Filial criada!" });
      setDialogOpen(false);
      fetchFiliais();
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(f: Filial) {
    if (!confirm(`Deseja remover a filial "${f.nome}"?`)) return;
    try {
      const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/filiais/${f.id}`), {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erro ao remover");
      toast({ title: "Filial removida!" });
      fetchFiliais();
    } catch {
      toast({ title: "Erro ao remover filial", variant: "destructive" });
    }
  }

  function formatAddress(f: Filial) {
    const parts = [f.logradouro, f.numero, f.bairro, f.cidade, f.uf].filter(Boolean);
    return parts.join(", ") || "Endereço não informado";
  }

  if (!barbeariaId) return null;

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto pb-20">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              Filiais
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Gerencie as unidades do seu estabelecimento</p>
          </div>
          {eligible && (
            <Button onClick={openNew} className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Filial
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !eligible ? (
          <div className="text-center py-20 bg-card border border-border rounded-2xl">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
            <h2 className="text-lg font-semibold text-foreground mb-2">Recurso indisponível no seu plano</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              O suporte a filiais está disponível nos planos "6 a 15 Profissionais" e "+15 Profissionais".
              Faça upgrade do seu plano para gerenciar múltiplas unidades.
            </p>
          </div>
        ) : filiais.length === 0 ? (
          <div className="text-center py-20 bg-card border border-border rounded-2xl">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
            <h2 className="text-lg font-semibold text-foreground mb-2">Nenhuma filial cadastrada</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Cadastre filiais para permitir que seus clientes escolham a unidade ao agendar.
            </p>
            <Button onClick={openNew} className="gap-2">
              <Plus className="h-4 w-4" />
              Criar primeira filial
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filiais.map((f) => (
              <div key={f.id} className="bg-card border border-border rounded-2xl p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-base">{f.nome}</h3>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{formatAddress(f)}</span>
                    </div>
                    {f.telefone && (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                        <Phone className="h-3.5 w-3.5 shrink-0" />
                        <span>{f.telefone}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-3">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(f)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(f)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Filial" : "Nova Filial"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome da filial *</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Unidade Centro" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>CEP</Label>
                <Input value={cep} onChange={(e) => setCep(e.target.value)} placeholder="00000-000" />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(00) 00000-0000" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Label>Logradouro</Label>
                <Input value={logradouro} onChange={(e) => setLogradouro(e.target.value)} placeholder="Rua, Av..." />
              </div>
              <div>
                <Label>Número</Label>
                <Input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="123" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Bairro</Label>
                <Input value={bairro} onChange={(e) => setBairro(e.target.value)} placeholder="Bairro" />
              </div>
              <div>
                <Label>Cidade</Label>
                <Input value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="Cidade" />
              </div>
              <div>
                <Label>UF</Label>
                <Input value={uf} onChange={(e) => setUf(e.target.value)} placeholder="SP" maxLength={2} />
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editing ? "Salvar Alterações" : "Criar Filial"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
