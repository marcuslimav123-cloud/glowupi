import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useGetModoHumano, useUpdateModoHumano, getGetModoHumanoQueryKey } from "@workspace/api-client-react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { ShieldOff, Inbox, MessageSquare } from "lucide-react";
import { Link } from "wouter";

export default function ConfiguracoesComunicacao() {
  const { barbeariaId } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: modoHumanoData } = useGetModoHumano(barbeariaId!, { query: { enabled: !!barbeariaId } } as any);
  const updateModoHumano = useUpdateModoHumano();
  const modoHumanoAtivo = !!(modoHumanoData as any)?.modoHumano;

  async function handleToggle(checked: boolean) {
    try {
      await updateModoHumano.mutateAsync({ barbeariaId: barbeariaId!, data: { modoHumano: checked } });
      qc.invalidateQueries({ queryKey: getGetModoHumanoQueryKey(barbeariaId!) });
      toast({
        title: checked ? "Modo Humano ativado" : "Modo Humano desativado",
        description: checked
          ? "Confirmações, lembretes e aniversários virão para a aba Sugeridas em vez de e-mail/push automáticos."
          : "Os envios automáticos foram restaurados.",
      });
    } catch (err: any) {
      toast({ title: "Erro", description: err?.data?.error || err?.message || "Falha ao atualizar", variant: "destructive" });
    }
  }

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-display font-bold text-foreground">Comunicação</h1>
        <p className="text-muted-foreground mt-1">Como e quando o sistema fala com seus clientes</p>
      </div>

      <div className={`rounded-2xl border p-5 mb-4 ${modoHumanoAtivo ? "border-yellow-500/40 bg-yellow-500/5" : "border-border bg-card"}`} data-testid="card-modo-humano-config">
        <div className="flex items-start gap-4">
          <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${modoHumanoAtivo ? "bg-yellow-500/20 text-yellow-600" : "bg-muted text-muted-foreground"}`}>
            <ShieldOff className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <p className="font-semibold text-base">Modo Humano (anti-automação)</p>
              <Switch
                checked={modoHumanoAtivo}
                onCheckedChange={handleToggle}
                disabled={updateModoHumano.isPending || !modoHumanoData}
                data-testid="switch-modo-humano"
              />
              {modoHumanoAtivo && <Badge variant="secondary" className="text-[10px] bg-yellow-500/20 text-yellow-700">Ativo</Badge>}
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Quando ativo, confirmações de agendamento, lembretes e aniversários <strong>não são enviados automaticamente</strong>. Em vez disso, aparecem na aba <strong>Sugeridas</strong> da Inbox para você revisar e enviar manualmente — sem soar como bot.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href="/comunicacao/inbox" className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-muted">
                <Inbox className="h-3.5 w-3.5" /> Abrir Sugeridas
              </Link>
              <Link href="/mensagens" className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-muted">
                <MessageSquare className="h-3.5 w-3.5" /> Banco de Modelos
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">
        <p className="font-semibold text-foreground mb-1">O que muda ao ativar?</p>
        <ul className="list-disc pl-4 space-y-1">
          <li>Confirmação de novo agendamento por e-mail/push deixa de sair sozinha.</li>
          <li>Lembretes 1 dia / 2 horas / 30 minutos antes ficam pendentes para envio manual.</li>
          <li>Aniversariantes do dia aparecem como sugestões prontas para você responder.</li>
          <li>Você ainda pode disparar campanhas e mensagens diretas normalmente.</li>
        </ul>
      </div>
    </AppLayout>
  );
}
