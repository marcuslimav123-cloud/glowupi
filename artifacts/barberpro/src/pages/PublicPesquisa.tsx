import React, { useState, useEffect } from "react";
import { Star, CheckCircle, AlertTriangle } from "lucide-react";

export default function PublicPesquisa({ params }: { params: { barbeariaId: string; pesquisaId: string } }) {
  const [pesquisa, setPesquisa] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [nome, setNome] = useState("");
  const [nota, setNota] = useState(0);
  const [respostas, setRespostas] = useState<Record<number, string>>({});
  const BASE = import.meta.env.BASE_URL;

  useEffect(() => {
    fetchPesquisa();
  }, []);

  const fetchPesquisa = async () => {
    try {
      const res = await fetch(`${BASE}api/public/pesquisa/${params.barbeariaId}/${params.pesquisaId}`);
      if (res.ok) {
        setPesquisa(await res.json());
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Pesquisa não encontrada");
      }
    } catch {
      setError("Erro ao carregar pesquisa");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (nota === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${BASE}api/public/pesquisa/${params.barbeariaId}/${params.pesquisaId}/responder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clienteNome: nome || "Anônimo", respostas, nota }),
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Erro ao enviar resposta");
      }
    } catch {
      setError("Erro ao enviar resposta");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (error && !pesquisa) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-sm w-full text-center">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-800 mb-2">Pesquisa Indisponível</h1>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-sm w-full text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Obrigado!</h1>
          <p className="text-gray-500">Sua resposta foi registrada com sucesso.</p>
        </div>
      </div>
    );
  }

  const perguntas = (pesquisa?.perguntas || []) as { texto: string; tipo: string }[];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">{pesquisa?.titulo}</h1>
          {pesquisa?.barbeariaNome && <p className="text-gray-500 mt-1">{pesquisa.barbeariaNome}</p>}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Seu nome (opcional)</label>
            <input
              type="text"
              value={nome}
              onChange={e => setNome(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Como você quer ser identificado?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Avaliação geral</label>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNota(n)}
                  className="transition-transform hover:scale-110"
                >
                  <Star className={`h-10 w-10 ${n <= nota ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />
                </button>
              ))}
            </div>
            {nota > 0 && <p className="text-center text-sm text-gray-400 mt-1">{nota} de 5 estrelas</p>}
          </div>

          {perguntas.map((p, i) => (
            <div key={i}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{p.texto}</label>
              {p.tipo === "nota" ? (
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRespostas(prev => ({ ...prev, [i]: String(n) }))}
                      className="transition-transform hover:scale-110"
                    >
                      <Star className={`h-7 w-7 ${parseInt(respostas[i] || "0") >= n ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />
                    </button>
                  ))}
                </div>
              ) : (
                <textarea
                  value={respostas[i] || ""}
                  onChange={e => setRespostas(prev => ({ ...prev, [i]: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Sua resposta..."
                />
              )}
            </div>
          ))}

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={nota === 0 || submitting}
            className="w-full rounded-xl bg-blue-600 text-white py-3 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? "Enviando..." : "Enviar Resposta"}
          </button>
        </div>
      </div>
    </div>
  );
}
