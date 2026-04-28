import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ModeloPicker } from "./ModeloPicker";

function buildWhatsappLink(telefone?: string | null, texto?: string) {
  const digits = (telefone || "").replace(/\D/g, "");
  const body = encodeURIComponent(texto || "");
  if (!digits) return null;
  return `https://wa.me/${digits.startsWith("55") ? digits : "55" + digits}?text=${body}`;
}

export interface ComporMensagemDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clienteId?: number | null;
  agendamentoId?: number | null;
  clienteNome?: string;
  clienteTelefone?: string | null;
  categoriaSugerida?: string;
  initialText?: string;
  title?: string;
}

export function ComporMensagemDialog({
  open,
  onOpenChange,
  clienteId,
  agendamentoId,
  clienteNome,
  clienteTelefone,
  categoriaSugerida,
  initialText = "",
  title,
}: ComporMensagemDialogProps) {
  const { toast } = useToast();
  const [texto, setTexto] = useState(initialText);

  useEffect(() => {
    if (open) setTexto(initialText);
  }, [open, initialText]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(texto);
      toast({ title: "Mensagem copiada", description: clienteNome ? `Pronta para enviar para ${clienteNome}` : undefined });
    } catch {
      toast({ title: "Não foi possível copiar", variant: "destructive" });
    }
  }

  const waLink = buildWhatsappLink(clienteTelefone, texto);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="dialog-compor-mensagem">
        <DialogHeader>
          <DialogTitle>{title ?? `Mensagem${clienteNome ? ` para ${clienteNome}` : ""}`}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Revise e edite antes de enviar.</span>
            <ModeloPicker
              clienteId={clienteId ?? null}
              agendamentoId={agendamentoId ?? null}
              categoriaSugerida={categoriaSugerida}
              triggerLabel="Inserir modelo"
              onPick={(t) => setTexto(t)}
            />
          </div>
          <Textarea
            rows={8}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Escreva ou escolha um modelo..."
            data-testid="textarea-compor-mensagem"
          />
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={handleCopy} data-testid="button-copiar-mensagem">
              <Copy className="h-4 w-4 mr-1" /> Copiar
            </Button>
            {waLink ? (
              <a href={waLink} target="_blank" rel="noopener noreferrer" className="flex-1">
                <Button type="button" className="w-full bg-green-600 hover:bg-green-700 text-white" data-testid="button-whatsapp-mensagem">
                  <Send className="h-4 w-4 mr-1" /> WhatsApp
                </Button>
              </a>
            ) : (
              <Button type="button" disabled className="flex-1" title="Cliente sem telefone cadastrado">
                <Send className="h-4 w-4 mr-1" /> WhatsApp
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
