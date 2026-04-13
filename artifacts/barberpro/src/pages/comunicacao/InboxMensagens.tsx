import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiUrl } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Send, Clock, User, ChevronDown, ChevronUp, Inbox, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Mensagem = {
  id: number;
  agendamentoId: number;
  clienteUserId: number;
  barbeariaId: number;
  remetente: string;
  mensagem: string;
  lida: boolean;
  createdAt: string;
};

type MensagemInbox = Mensagem & {
  agendamento: {
    id: number;
    clienteNome: string;
    servicoNome: string;
    profissionalNome: string;
    data: string;
    horaInicio: string;
  } | null;
  clienteUser: {
    nome: string;
    email: string;
  } | null;
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export default function InboxMensagens() {
  const { barbeariaId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<number | null>(null);
  const [respostas, setRespostas] = useState<Record<number, string>>({});
  const [thread, setThread] = useState<Record<number, Mensagem[]>>({});
  const [threadLoading, setThreadLoading] = useState<Record<number, boolean>>({});

  const { data: mensagens = [], isLoading } = useQuery<MensagemInbox[]>({
    queryKey: ["agendamento-mensagens-inbox", barbeariaId],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/agendamento-mensagens/inbox`), {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erro ao carregar mensagens");
      return res.json();
    },
    enabled: !!barbeariaId,
    refetchInterval: 30000,
  });

  async function fetchThread(agendamentoId: number) {
    setThreadLoading(prev => ({ ...prev, [agendamentoId]: true }));
    try {
      const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/agendamento-mensagens/${agendamentoId}`), {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setThread(prev => ({ ...prev, [agendamentoId]: data }));
      }
    } catch {} finally {
      setThreadLoading(prev => ({ ...prev, [agendamentoId]: false }));
    }
  }

  function handleToggle(msg: MensagemInbox) {
    if (expanded === msg.id) {
      setExpanded(null);
    } else {
      setExpanded(msg.id);
      fetchThread(msg.agendamentoId);
    }
  }

  const responderMutation = useMutation({
    mutationFn: async ({ id, agendamentoId, mensagem }: { id: number; agendamentoId: number; mensagem: string }) => {
      const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/agendamento-mensagens/${id}/responder`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ mensagem }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao responder");
      }
      return { result: await res.json(), agendamentoId };
    },
    onSuccess: ({ agendamentoId }, variables) => {
      queryClient.invalidateQueries({ queryKey: ["agendamento-mensagens-inbox"] });
      queryClient.invalidateQueries({ queryKey: ["agendamento-mensagens-inbox-count"] });
      setRespostas(prev => {
        const next = { ...prev };
        delete next[variables.id];
        return next;
      });
      fetchThread(agendamentoId);
      toast({ title: "Resposta enviada com sucesso" });
    },
    onError: (e: any) => {
      toast({ title: e.message || "Erro ao enviar resposta", variant: "destructive" });
    },
  });

  const marcarLidaMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/agendamento-mensagens/${id}/marcar-lida`), {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erro ao marcar como lida");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agendamento-mensagens-inbox"] });
      queryClient.invalidateQueries({ queryKey: ["agendamento-mensagens-inbox-count"] });
    },
  });

  return (
    <AppLayout>
      <div className="mb-6 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Inbox className="h-6 w-6 text-primary" />
          <h1 className="text-[24px] font-bold text-foreground">Mensagens de Agendamento</h1>
        </div>
        {mensagens.length > 0 && (
          <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
            {mensagens.length}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
        </div>
      ) : mensagens.length === 0 ? (
        <div className="text-center py-20">
          <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-foreground/40 text-[14px]">Nenhuma mensagem não lida de clientes.</p>
          <p className="text-foreground/30 text-[12px] mt-1">As mensagens enviadas pelos clientes aparecerão aqui.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {mensagens.map((msg) => {
            const isExpanded = expanded === msg.id;
            const currentThread = thread[msg.agendamentoId] || [];
            const isThreadLoading = threadLoading[msg.agendamentoId] || false;
            return (
              <div
                key={msg.id}
                className="bg-card rounded-2xl border border-border overflow-hidden"
              >
                <button
                  className="w-full flex items-start gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
                  onClick={() => handleToggle(msg)}
                >
                  <div className="flex-shrink-0 w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-[14px] text-foreground">
                        {msg.clienteUser?.nome || msg.agendamento?.clienteNome || "Cliente"}
                      </span>
                      {!msg.lida && (
                        <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">NOVA</span>
                      )}
                    </div>
                    {msg.agendamento && (
                      <p className="text-[12px] text-foreground/50 mt-0.5">
                        {msg.agendamento.servicoNome} — {msg.agendamento.data} às {msg.agendamento.horaInicio}
                      </p>
                    )}
                    <p className="text-[13px] text-foreground/70 mt-1 truncate">{msg.mensagem}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Clock className="h-3 w-3 text-foreground/30" />
                      <span className="text-[11px] text-foreground/30">{formatDate(msg.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-foreground/40" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-foreground/40" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-border p-4 bg-muted/20">
                    {isThreadLoading ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                        {currentThread.map((m, i) => (
                          <div key={i} className={`flex ${m.remetente === "estabelecimento" ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[80%] px-3 py-2 rounded-xl text-[13px] ${
                              m.remetente === "estabelecimento"
                                ? "bg-primary text-primary-foreground rounded-br-none"
                                : "bg-background border border-border text-foreground rounded-bl-none"
                            }`}>
                              <p>{m.mensagem}</p>
                              <p className={`text-[10px] mt-1 ${m.remetente === "estabelecimento" ? "text-primary-foreground/60 text-right" : "text-foreground/40"}`}>
                                {m.remetente === "cliente" ? "Cliente" : "Você"} · {formatTime(m.createdAt)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <textarea
                        value={respostas[msg.id] || ""}
                        onChange={(e) => setRespostas(prev => ({ ...prev, [msg.id]: e.target.value }))}
                        placeholder="Digite sua resposta..."
                        rows={3}
                        className="flex-1 rounded-xl border border-border bg-card px-3 py-2 text-[13px] text-foreground placeholder:text-foreground/30 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            const resp = respostas[msg.id]?.trim();
                            if (!resp) return;
                            responderMutation.mutate({ id: msg.id, agendamentoId: msg.agendamentoId, mensagem: resp });
                          }}
                          disabled={!respostas[msg.id]?.trim() || responderMutation.isPending}
                          className="h-10 px-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-[12px] flex items-center gap-1"
                        >
                          <Send className="h-3.5 w-3.5" />
                          Responder
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => marcarLidaMutation.mutate(msg.id)}
                          disabled={marcarLidaMutation.isPending}
                          className="h-10 px-3 rounded-xl text-[12px] border-border"
                        >
                          Marcar lida
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}
