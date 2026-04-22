import { useEffect, useState } from "react";
import { useParams } from "wouter";

type Status = "loading" | "success" | "error";

export default function Unsubscribe() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [status, setStatus] = useState<Status>("loading");
  const [nomeEstab, setNomeEstab] = useState("");
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErro("Token ausente");
      return;
    }
    fetch(`/api/email-marketing/optout/${encodeURIComponent(token)}`, { method: "POST" })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (r.ok && data.ok) {
          setNomeEstab(data.nomeEstabelecimento || "");
          setStatus("success");
        } else {
          setErro(data.error || "Não foi possível processar seu pedido.");
          setStatus("error");
        }
      })
      .catch(() => {
        setErro("Erro de conexão. Tente novamente em alguns instantes.");
        setStatus("error");
      });
  }, [token]);

  return (
    <div style={{
      minHeight: "100vh", background: "#f8f7f4",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24, fontFamily: "system-ui, -apple-system, sans-serif",
    }}>
      <div style={{
        maxWidth: 480, width: "100%", background: "#fff",
        borderRadius: 16, padding: 40, textAlign: "center",
        boxShadow: "0 8px 32px rgba(0,0,0,0.06)",
      }}>
        {status === "loading" && (
          <>
            <h1 style={{ fontSize: 22, marginBottom: 12, color: "#1a1a1a" }}>Processando…</h1>
            <p style={{ color: "rgba(0,0,0,0.6)" }}>Estamos descadastrando seu e-mail.</p>
          </>
        )}
        {status === "success" && (
          <>
            <h1 style={{ fontSize: 24, marginBottom: 12, color: "#1a1a1a" }}>Você foi descadastrado</h1>
            <p style={{ color: "rgba(0,0,0,0.7)", lineHeight: 1.6 }}>
              Você não receberá mais e-mails de campanha
              {nomeEstab ? (<> de <strong>{nomeEstab}</strong></>) : null}.
              Mensagens transacionais (confirmações, lembretes) continuam normalmente.
            </p>
          </>
        )}
        {status === "error" && (
          <>
            <h1 style={{ fontSize: 22, marginBottom: 12, color: "#1a1a1a" }}>Ops</h1>
            <p style={{ color: "rgba(0,0,0,0.7)" }}>{erro}</p>
          </>
        )}
      </div>
    </div>
  );
}
