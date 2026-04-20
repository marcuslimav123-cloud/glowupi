import React from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { apiUrl } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Send, Mail, AlertCircle, TestTube, Users } from "lucide-react";

const FILTROS = [
  { value: "todos", label: "Todos os clientes" },
  { value: "ativos_90", label: "Ativos (últimos 90 dias)" },
  { value: "inativos_60", label: "Inativos (60+ dias)" },
  { value: "inativos_120", label: "Inativos (120+ dias)" },
  { value: "aniversariantes_mes", label: "Aniversariantes do mês" },
];

type Cliente = { id: number; nome: string; email: string | null; ultimaVisita: string | null; aniversario: string | null };

export default function NovaCampanha() {
  const { barbeariaId } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [assunto, setAssunto] = React.useState("");
  const [corpo, setCorpo] = React.useState("Olá, {{nome_cliente}}!\n\nEscreva aqui sua mensagem...\n\nCom carinho,\n{{nome_estabelecimento}}");
  const [filtro, setFiltro] = React.useState("todos");
  const [search, setSearch] = React.useState("");
  const [selecionados, setSelecionados] = React.useState<Set<number>>(new Set());
  const [campaignId, setCampaignId] = React.useState<number | null>(null);

  const { data: preview } = useQuery<{ total: number; items: Cliente[] }>({
    queryKey: ["em-recipients-preview", barbeariaId, filtro, search],
    queryFn: async () => {
      const params = new URLSearchParams({ filtro, ...(search ? { search } : {}) });
      const r = await fetch(apiUrl(`/barbearias/${barbeariaId}/email-marketing/recipients-preview?${params}`), { credentials: "include" });
      if (!r.ok) throw new Error("Erro ao carregar destinatários");
      return r.json();
    },
    enabled: !!barbeariaId,
  });

  React.useEffect(() => {
    if (preview?.items) {
      setSelecionados(new Set(preview.items.map(i => i.id)));
    }
  }, [preview?.items]);

  const saveDraft = useMutation({
    mutationFn: async () => {
      const r = await fetch(apiUrl(`/barbearias/${barbeariaId}/email-marketing/campanhas`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ assunto, corpo, filtros: { filtro, search } }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.error || "Erro ao salvar");
      }
      return r.json();
    },
    onSuccess: (c) => {
      setCampaignId(c.id);
      toast({ title: "Rascunho salvo" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const enviarTeste = useMutation({
    mutationFn: async () => {
      let id = campaignId;
      if (!id) {
        const created = await saveDraft.mutateAsync();
        id = created.id;
      }
      const r = await fetch(apiUrl(`/barbearias/${barbeariaId}/email-marketing/campanhas/${id}/enviar-teste`), {
        method: "POST",
        credentials: "include",
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.error || "Erro ao enviar teste");
      }
      return r.json();
    },
    onSuccess: (d) => toast({ title: "Teste enviado", description: `Verifique sua caixa de entrada (${d.sentTo})` }),
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const enviar = useMutation({
    mutationFn: async () => {
      let id = campaignId;
      if (!id) {
        const created = await saveDraft.mutateAsync();
        id = created.id;
      }
      const r = await fetch(apiUrl(`/barbearias/${barbeariaId}/email-marketing/campanhas/${id}/enviar`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ clienteIds: Array.from(selecionados) }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.error || "Erro ao enviar");
      }
      return r.json();
    },
    onSuccess: (d) => {
      toast({ title: "Envio iniciado", description: `${d.total} e-mails na fila. Acompanhe o status na lista.` });
      setLocation("/comunicacao/email-marketing");
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const toggleAll = () => {
    if (!preview?.items) return;
    if (selecionados.size === preview.items.length) setSelecionados(new Set());
    else setSelecionados(new Set(preview.items.map(i => i.id)));
  };

  const toggleOne = (id: number) => {
    const next = new Set(selecionados);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelecionados(next);
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-5">
        <button onClick={() => setLocation("/comunicacao/email-marketing")} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="h-6 w-6 text-primary" /> Nova campanha
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Crie um e-mail e envie para clientes selecionados.</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div>
            <Label>Assunto</Label>
            <Input
              value={assunto}
              onChange={(e) => setAssunto(e.target.value)}
              placeholder="Ex: Promoção especial para você, {{nome_cliente}}!"
              maxLength={150}
            />
            <div className="text-[11px] text-muted-foreground mt-1">Pode usar variáveis: {`{{nome_cliente}}`}, {`{{nome_estabelecimento}}`}</div>
          </div>
          <div>
            <Label>Mensagem</Label>
            <Textarea
              value={corpo}
              onChange={(e) => setCorpo(e.target.value)}
              rows={10}
              placeholder="Escreva sua mensagem..."
            />
            <div className="text-[11px] text-muted-foreground mt-1">
              Variáveis disponíveis: {`{{nome_cliente}}`}, {`{{nome_estabelecimento}}`}, {`{{link_agendamento}}`}, {`{{link_descadastrar}}`}.
              Um rodapé com o link "Descadastrar" será adicionado automaticamente.
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> Destinatários
            </div>
            <div className="text-xs text-muted-foreground">
              {selecionados.size} de {preview?.total || 0} selecionados
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <select
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="text-sm rounded-lg border border-input bg-background px-3 py-2"
            >
              {FILTROS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
            <Input
              placeholder="Buscar por nome ou e-mail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
            <Button variant="outline" size="sm" onClick={toggleAll} type="button">
              {preview && selecionados.size === preview.items.length ? "Desmarcar" : "Marcar"} todos
            </Button>
          </div>
          <div className="rounded-xl border border-border max-h-72 overflow-y-auto divide-y divide-border">
            {!preview?.items.length ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Nenhum cliente com e-mail válido encontrado.</div>
            ) : (
              preview.items.map(c => (
                <label key={c.id} className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/30">
                  <input
                    type="checkbox"
                    checked={selecionados.has(c.id)}
                    onChange={() => toggleOne(c.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{c.nome}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{c.email}</div>
                  </div>
                </label>
              ))
            )}
          </div>
          <div className="text-[11px] text-muted-foreground flex items-start gap-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>Clientes que descadastraram são automaticamente excluídos. Apenas e-mails válidos aparecem aqui.</span>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap justify-end">
          <Button variant="outline" type="button" onClick={() => enviarTeste.mutate()} disabled={!assunto || !corpo || enviarTeste.isPending} className="gap-2">
            <TestTube className="h-4 w-4" /> Enviar teste para mim
          </Button>
          <Button type="button" onClick={() => enviar.mutate()} disabled={!assunto || !corpo || selecionados.size === 0 || enviar.isPending} className="gap-2">
            <Send className="h-4 w-4" /> Enviar para {selecionados.size} cliente(s)
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
