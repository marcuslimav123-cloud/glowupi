import React, { useMemo } from "react";
import { MapPin, Phone, Star, Gift, CreditCard, ShoppingBag, X, Instagram, User, Clock, Navigation } from "lucide-react";
import { SafeLogoImage } from "@/components/SafeLogoImage";
import { defaultLogoUrl } from "@/lib/branding";

type Avaliacao = { id: number; clienteNome: string; profissionalNome: string; nota: number; comentario: string | null; createdAt: string };
type Recompensa = { id: number; nome: string; descricao: string | null; pontosNecessarios: number };
type Produto = { id: number; nome: string; preco: number };

export interface PublicProfileData {
  nome: string;
  logoUrl: string | null;
  tipoEstabelecimento?: string | null;
  descricaoPublica?: string | null;
  telefone?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  horarioFuncionamento?: any;
  fotos?: string[];
  formasPagamento?: string[];
  redesSociais?: Record<string, string>;
  profissionais?: { id: number; nomeExibicao: string; fotoUrl?: string | null; especialidade?: string | null; semPreferencia?: boolean }[];
  avaliacoes?: Avaliacao[];
  notaMedia?: number;
  totalAvaliacoes?: number;
  recompensas?: Recompensa[];
  produtos?: Produto[];
}

const PAYMENT_LABELS: Record<string, string> = {
  dinheiro: "Dinheiro",
  pix: "Pix",
  credito: "Crédito",
  debito: "Débito",
};

function StarsDisplay({ nota, size = 14 }: { nota: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={i <= Math.round(nota) ? "fill-amber-400 text-amber-400" : "text-white/20"} style={{ width: size, height: size }} />
      ))}
    </div>
  );
}

const DIAS_LABEL: Record<string, string> = { segunda: "Seg", terca: "Ter", quarta: "Qua", quinta: "Qui", sexta: "Sex", sabado: "Sáb", domingo: "Dom" };
const DIAS_ORDER = ["segunda", "terca", "quarta", "quinta", "sexta", "sabado", "domingo"];

function horariosDe(hf: any): { dia: string; aberto: boolean; inicio: string; fim: string }[] | null {
  if (!hf) return null;
  if (Array.isArray(hf)) {
    return hf.map((item: any, i: number) => ({
      dia: (item.dia && String(item.dia).substring(0, 3)) || DIAS_LABEL[DIAS_ORDER[i]] || "?",
      aberto: item.ativo ?? false,
      inicio: item.abertura || "09:00",
      fim: item.fechamento || "19:00",
    }));
  }
  return DIAS_ORDER.map((d) => ({
    dia: DIAS_LABEL[d],
    aberto: hf[d]?.aberto ?? hf[d]?.ativo ?? false,
    inicio: hf[d]?.inicio || hf[d]?.abertura || "09:00",
    fim: hf[d]?.fim || hf[d]?.fechamento || "19:00",
  }));
}

/** Painel "Sobre" da página pública: endereço, horários, equipe, avaliações, fidelidade, produtos e pagamento. */
export function PublicProfileSheet({ barbearia, accent, onClose }: { barbearia: PublicProfileData; accent: string; onClose: () => void }) {
  const horarios = useMemo(() => horariosDe(barbearia.horarioFuncionamento), [barbearia.horarioFuncionamento]);
  const endereco = [barbearia.logradouro, barbearia.numero].filter(Boolean).join(", ");
  const regiao = [barbearia.bairro, barbearia.cidade, barbearia.uf].filter(Boolean).join(", ");
  const enderecoCompleto = [endereco, regiao].filter(Boolean).join(" · ");
  const mapsUrl = enderecoCompleto ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${endereco} ${regiao}`)}` : null;
  const equipe = (barbearia.profissionais || []).filter((p) => !p.semPreferencia && p.id > 0);
  const avaliacoes = barbearia.avaliacoes || [];
  const recompensas = barbearia.recompensas || [];
  const produtos = barbearia.produtos || [];
  const fotos = barbearia.fotos || [];
  const formas = barbearia.formasPagamento || [];
  const whatsapp = barbearia.telefone ? barbearia.telefone.replace(/\D/g, "") : "";

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-[#111] text-white w-full max-w-lg max-h-[88vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-white/10" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-[#111]/95 backdrop-blur-lg border-b border-white/5 px-5 py-4 flex items-center justify-between z-10">
          <h2 className="font-bold text-lg">Sobre</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          <div className="flex items-center gap-4">
            {barbearia.logoUrl ? (
              <SafeLogoImage src={barbearia.logoUrl} alt={barbearia.nome} className="h-16 w-16 rounded-2xl object-cover border border-white/10" />
            ) : (
              <SafeLogoImage src={defaultLogoUrl(barbearia.tipoEstabelecimento)} alt={barbearia.nome} className="h-16 w-16 rounded-2xl object-contain p-2 border border-white/10" style={{ background: `${accent}25` }} />
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold">{barbearia.nome}</h3>
              {regiao && (
                <p className="text-white/40 text-sm flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{regiao}</span>
                </p>
              )}
              {(barbearia.totalAvaliacoes || 0) > 0 && (
                <div className="flex items-center gap-1.5 mt-1">
                  <StarsDisplay nota={barbearia.notaMedia || 0} size={12} />
                  <span className="text-xs text-white/50">{(barbearia.notaMedia || 0).toFixed(1)} ({barbearia.totalAvaliacoes})</span>
                </div>
              )}
            </div>
          </div>

          {barbearia.descricaoPublica && <p className="text-white/50 text-sm leading-relaxed">{barbearia.descricaoPublica}</p>}

          <div className="flex flex-wrap items-center gap-2">
            {whatsapp && (
              <a href={`https://wa.me/55${whatsapp}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] text-white/60 text-xs hover:bg-white/10 transition">
                <Phone className="h-3.5 w-3.5" /> WhatsApp
              </a>
            )}
            {barbearia.redesSociais?.instagram && (
              <a href={`https://instagram.com/${barbearia.redesSociais.instagram.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] text-white/60 text-xs hover:bg-white/10 transition">
                <Instagram className="h-3.5 w-3.5" /> Instagram
              </a>
            )}
            {mapsUrl && (
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] text-white/60 text-xs hover:bg-white/10 transition">
                <Navigation className="h-3.5 w-3.5" /> Como chegar
              </a>
            )}
          </div>

          {enderecoCompleto && (
            <section>
              <h4 className="text-sm font-bold mb-2 flex items-center gap-2"><MapPin className="h-4 w-4" style={{ color: accent }} /> Endereço</h4>
              <p className="text-white/60 text-sm">{endereco}{endereco && regiao ? " — " : ""}{regiao}</p>
            </section>
          )}

          {fotos.length > 0 && (
            <section>
              <h4 className="text-sm font-bold mb-3">Fotos</h4>
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                {fotos.map((f, i) => (
                  <img key={i} src={f} alt="" className="h-28 w-40 flex-shrink-0 rounded-xl object-cover border border-white/10" loading="lazy" />
                ))}
              </div>
            </section>
          )}

          {horarios && (
            <section>
              <h4 className="text-sm font-bold mb-3 flex items-center gap-2"><Clock className="h-4 w-4" style={{ color: accent }} /> Horários</h4>
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-1.5">
                {horarios.map((d, i) => (
                  <div key={`${d.dia}-${i}`} className="flex items-center justify-between text-sm">
                    <span className="text-white/50 w-10">{d.dia}</span>
                    {d.aberto ? <span className="text-white/70">{d.inicio} — {d.fim}</span> : <span className="text-white/20 italic">Fechado</span>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {equipe.length > 0 && (
            <section>
              <h4 className="text-sm font-bold mb-3 flex items-center gap-2"><User className="h-4 w-4" style={{ color: accent }} /> Equipe</h4>
              <div className="grid grid-cols-2 gap-3">
                {equipe.map((p) => (
                  <div key={p.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
                    <div className="h-12 w-12 rounded-full mx-auto mb-2 flex items-center justify-center border border-white/10 overflow-hidden" style={{ background: `${accent}20` }}>
                      {p.fotoUrl ? <img src={p.fotoUrl} alt={p.nomeExibicao} className="h-full w-full object-cover" /> : <User className="h-5 w-5" style={{ color: accent }} />}
                    </div>
                    <p className="font-medium text-sm">{p.nomeExibicao}</p>
                    {p.especialidade && <p className="text-white/30 text-xs mt-0.5">{p.especialidade}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {avaliacoes.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold flex items-center gap-2"><Star className="h-4 w-4" style={{ color: accent }} /> Avaliações</h4>
                <div className="flex items-center gap-1.5">
                  <StarsDisplay nota={barbearia.notaMedia || 0} size={12} />
                  <span className="text-xs font-semibold">{(barbearia.notaMedia || 0).toFixed(1)}</span>
                </div>
              </div>
              <div className="space-y-2">
                {avaliacoes.slice(0, 5).map((a) => (
                  <div key={a.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="flex items-center justify-between mb-1.5">
                      <div>
                        <p className="font-medium text-sm">{a.clienteNome}</p>
                        <p className="text-white/30 text-[11px]">com {a.profissionalNome}</p>
                      </div>
                      <StarsDisplay nota={a.nota} size={11} />
                    </div>
                    {a.comentario && <p className="text-white/50 text-sm">{a.comentario}</p>}
                    <p className="text-white/20 text-[11px] mt-1">{new Date(a.createdAt).toLocaleDateString("pt-BR")}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {recompensas.length > 0 && (
            <section>
              <h4 className="text-sm font-bold mb-3 flex items-center gap-2"><Gift className="h-4 w-4" style={{ color: accent }} /> Fidelidade</h4>
              <div className="space-y-2">
                {recompensas.map((r) => (
                  <div key={r.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: `${accent}20` }}>
                      <Gift className="h-4 w-4" style={{ color: accent }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{r.nome}</p>
                      {r.descricao && <p className="text-white/30 text-xs truncate">{r.descricao}</p>}
                    </div>
                    <span className="text-xs font-bold flex-shrink-0" style={{ color: accent }}>{r.pontosNecessarios} pts</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {produtos.length > 0 && (
            <section>
              <h4 className="text-sm font-bold mb-3 flex items-center gap-2"><ShoppingBag className="h-4 w-4" style={{ color: accent }} /> Produtos</h4>
              <div className="grid grid-cols-2 gap-3">
                {produtos.map((p) => (
                  <div key={p.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
                    <p className="font-medium text-sm">{p.nome}</p>
                    <p className="text-xs mt-1" style={{ color: accent }}>R$ {Number(p.preco).toFixed(2).replace(".", ",")}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {formas.length > 0 && (
            <section>
              <h4 className="text-sm font-bold mb-3 flex items-center gap-2"><CreditCard className="h-4 w-4" style={{ color: accent }} /> Pagamento</h4>
              <div className="flex flex-wrap gap-2">
                {formas.map((fp) => (
                  <span key={fp} className="px-3 py-1 rounded-full bg-white/[0.06] text-white/60 text-xs">{PAYMENT_LABELS[fp] || fp}</span>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
