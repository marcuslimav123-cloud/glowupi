import React, { useState, useEffect } from "react";
import { Loader2, Copy, Check, ExternalLink } from "lucide-react";

interface Pagamento {
  asaasPaymentId: string;
  billingType?: string;
  valor: number;
  status?: string;
  pixQrCodeBase64?: string | null;
  pixCopyPaste?: string | null;
  pixExpiraEm?: string | null;
  bankSlipUrl?: string | null;
  invoiceUrl?: string | null;
}

interface Props {
  pagamento: Pagamento | null;
  statusUrl?: string;
  onPaid?: () => void;
  pollIntervalMs?: number;
  accentColor?: string;
}

export function AsaasPixQrCode({ pagamento, statusUrl, onPaid, pollIntervalMs = 3000, accentColor = "#10b981" }: Props) {
  const [copied, setCopied] = useState(false);
  const [paid, setPaid] = useState(false);
  const [statusMsg, setStatusMsg] = useState("Aguardando pagamento…");

  useEffect(() => {
    if (!statusUrl || paid) return;
    let stop = false;
    const tick = async () => {
      try {
        const res = await fetch(statusUrl, { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        if (stop) return;
        if (data?.paid) {
          setPaid(true);
          setStatusMsg("Pagamento confirmado");
          onPaid?.();
        }
      } catch {}
    };
    tick();
    const id = setInterval(tick, pollIntervalMs);
    return () => { stop = true; clearInterval(id); };
  }, [statusUrl, paid, pollIntervalMs, onPaid]);

  if (!pagamento) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const isPix = pagamento.billingType === "PIX" || pagamento.pixCopyPaste;

  if (paid) {
    return (
      <div className="text-center py-8">
        <div className="h-14 w-14 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: `${accentColor}20` }}>
          <Check className="h-7 w-7" style={{ color: accentColor }} />
        </div>
        <h3 className="font-semibold text-base mb-1">Pagamento confirmado</h3>
        <p className="text-sm opacity-70">R$ {Number(pagamento.valor).toFixed(2).replace(".", ",")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <span className="text-sm opacity-70">Valor</span>
        <span className="text-lg font-bold">R$ {Number(pagamento.valor).toFixed(2).replace(".", ",")}</span>
      </div>

      {isPix && pagamento.pixQrCodeBase64 && (
        <div className="bg-white rounded-xl p-4 flex items-center justify-center">
          <img
            src={`data:image/png;base64,${pagamento.pixQrCodeBase64}`}
            alt="QR Code Pix"
            className="w-56 h-56 object-contain"
          />
        </div>
      )}

      {isPix && pagamento.pixCopyPaste && (
        <div className="space-y-2">
          <p className="text-xs opacity-70">Pix copia e cola</p>
          <div className="flex gap-2">
            <input
              readOnly
              value={pagamento.pixCopyPaste}
              className="flex-1 text-xs px-3 py-2 rounded-lg border border-current/10 bg-current/5 truncate"
            />
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(pagamento.pixCopyPaste!);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                } catch {}
              }}
              className="px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5"
              style={{ backgroundColor: accentColor, color: "#fff" }}
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copiado" : "Copiar"}
            </button>
          </div>
        </div>
      )}

      {pagamento.bankSlipUrl && (
        <a href={pagamento.bankSlipUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-current/10 text-sm">
          <ExternalLink className="h-4 w-4" /> Abrir boleto
        </a>
      )}

      {pagamento.invoiceUrl && !isPix && (
        <a href={pagamento.invoiceUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium"
          style={{ backgroundColor: accentColor, color: "#fff" }}>
          <ExternalLink className="h-4 w-4" /> Pagar agora
        </a>
      )}

      <div className="flex items-center justify-center gap-2 text-xs opacity-60">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>{statusMsg}</span>
      </div>
    </div>
  );
}
