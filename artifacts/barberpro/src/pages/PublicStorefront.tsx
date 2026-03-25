import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams } from "wouter";
import {
  Calendar, Clock, Scissors, User, ChevronLeft, ChevronRight, Check,
  MapPin, Phone, Loader2, LogOut, Star, Search, Gift, CreditCard,
  ShoppingBag, X, Instagram, Wifi
} from "lucide-react";
import ClientAuthModal from "@/components/ClientAuthModal";

const API_BASE = `${import.meta.env.BASE_URL}api`.replace(/\/+/g, "/");

interface ClientUser {
  id: number;
  nome: string;
  email: string;
  telefone: string | null;
  fotoUrl: string | null;
}

interface Avaliacao {
  id: number;
  clienteNome: string;
  profissionalNome: string;
  nota: number;
  comentario: string | null;
  createdAt: string;
}

interface Recompensa {
  id: number;
  nome: string;
  descricao: string | null;
  pontosNecessarios: number;
  tipo: string;
}

interface Produto {
  id: number;
  nome: string;
  preco: number;
}

interface BarbeariaData {
  id: number;
  nome: string;
  slug: string;
  telefone: string;
  email: string;
  corPrimaria: string;
  logoUrl: string | null;
  descricaoPublica: string | null;
  cidade: string;
  uf: string;
  logradouro: string;
  numero: string;
  bairro: string;
  horarioFuncionamento: any;
  fotos: string[];
  formasPagamento: string[];
  redesSociais: Record<string, string>;
  servicos: any[];
  profissionais: any[];
  avaliacoes: Avaliacao[];
  notaMedia: number;
  totalAvaliacoes: number;
  recompensas: Recompensa[];
  produtos: Produto[];
}

interface Slot {
  horaInicio: string;
  horaFim: string;
  profissionalId: number;
  profissionalNome: string;
  disponivel: boolean;
}

type BookingStep = "profissional" | "data" | "horario" | "confirmar" | "sucesso";

function Stars({ nota, size = 14 }: { nota: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={i <= Math.round(nota) ? "fill-amber-400 text-amber-400" : "text-white/20"}
          style={{ width: size, height: size }}
        />
      ))}
    </div>
  );
}

const PAYMENT_ICONS: Record<string, string> = {
  dinheiro: "Dinheiro",
  pix: "Pix",
  credito: "Crédito",
  debito: "Débito",
};

export default function PublicStorefront() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [barbearia, setBarbearia] = useState<BarbeariaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState("servicos");

  const [showBooking, setShowBooking] = useState(false);
  const [bookingStep, setBookingStep] = useState<BookingStep>("profissional");
  const [selectedServico, setSelectedServico] = useState<any>(null);
  const [selectedProfissional, setSelectedProfissional] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [clientUser, setClientUser] = useState<ClientUser | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [observacao, setObservacao] = useState("");

  const servicosRef = useRef<HTMLDivElement>(null);
  const profissionaisRef = useRef<HTMLDivElement>(null);
  const avaliacoesRef = useRef<HTMLDivElement>(null);

  const accent = barbearia?.corPrimaria || "#C4943C";

  useEffect(() => {
    fetchBarbearia();
    checkClientSession();
    fetchGoogleClientId();
  }, [slug]);

  async function fetchBarbearia() {
    try {
      const res = await fetch(`${API_BASE}/public/${slug}`, { credentials: "include" });
      if (!res.ok) throw new Error("Estabelecimento não encontrado");
      setBarbearia(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function checkClientSession() {
    try {
      const res = await fetch(`${API_BASE}/client/me`, { credentials: "include" });
      if (res.ok) setClientUser(await res.json());
    } catch {}
  }

  async function fetchGoogleClientId() {
    try {
      const res = await fetch(`${API_BASE}/lgpd/google-client-id`);
      if (res.ok) {
        const data = await res.json();
        if (data.clientId) sessionStorage.setItem("googleClientId", data.clientId);
      }
    } catch {}
  }

  async function fetchSlots(date: string) {
    if (!barbearia || !selectedServico) return;
    setSlotsLoading(true);
    try {
      const params = new URLSearchParams({
        data: date,
        servicoId: selectedServico.id.toString(),
        ...(selectedProfissional ? { profissionalId: selectedProfissional.id.toString() } : {}),
      });
      const res = await fetch(`${API_BASE}/public/${slug}/slots?${params}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setSlots(data.filter((s: Slot) => s.disponivel));
      }
    } catch {} finally {
      setSlotsLoading(false);
    }
  }

  async function handleBooking() {
    if (!selectedServico || !selectedSlot || !clientUser || !barbearia) return;
    setBookingLoading(true);
    try {
      const res = await fetch(`${API_BASE}/public/${slug}/agendar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          profissionalId: selectedSlot.profissionalId,
          servicoId: selectedServico.id,
          data: selectedDate,
          horaInicio: selectedSlot.horaInicio,
          observacao: observacao || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao agendar");
      }
      setBookingStep("sucesso");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBookingLoading(false);
    }
  }

  function startBooking(servico: any) {
    setSelectedServico(servico);
    setSelectedProfissional(null);
    setSelectedDate("");
    setSelectedSlot(null);
    setObservacao("");
    setError("");
    setBookingStep("profissional");
    setShowBooking(true);
  }

  function handleSelectProfissional(p: any | null) {
    setSelectedProfissional(p);
    setBookingStep("data");
  }

  function handleDateSelect(date: string) {
    setSelectedDate(date);
    setSelectedSlot(null);
    fetchSlots(date);
  }

  function handleProceedToSlots() {
    if (!clientUser) {
      setShowAuthModal(true);
      return;
    }
    setBookingStep("horario");
  }

  function handleSelectSlot(slot: Slot) {
    setSelectedSlot(slot);
    setBookingStep("confirmar");
  }

  function handleClientAuth(user: ClientUser) {
    setClientUser(user);
    setShowAuthModal(false);
    if (selectedDate) {
      fetchSlots(selectedDate);
      setBookingStep("horario");
    }
  }

  async function handleLogout() {
    await fetch(`${API_BASE}/client/logout`, { method: "POST", credentials: "include" });
    setClientUser(null);
  }

  function bookingGoBack() {
    if (bookingStep === "profissional") setShowBooking(false);
    else if (bookingStep === "data") setBookingStep("profissional");
    else if (bookingStep === "horario") setBookingStep("data");
    else if (bookingStep === "confirmar") setBookingStep("horario");
  }

  const dates = useMemo(() => {
    const result: { date: string; label: string; dayName: string; monthName: string }[] = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      result.push({
        date: d.toISOString().slice(0, 10),
        label: d.getDate().toString(),
        dayName: d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
        monthName: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
      });
    }
    return result;
  }, []);

  const filteredServicos = useMemo(() => {
    if (!barbearia) return [];
    if (!searchQuery.trim()) return barbearia.servicos;
    const q = searchQuery.toLowerCase();
    return barbearia.servicos.filter(
      (s) => s.nome.toLowerCase().includes(q)
    );
  }, [barbearia, searchQuery]);

  const horarioDisplay = useMemo(() => {
    if (!barbearia?.horarioFuncionamento) return null;
    const h = barbearia.horarioFuncionamento;
    const DIAS_LABEL: Record<string, string> = {
      segunda: "Seg", terca: "Ter", quarta: "Qua", quinta: "Qui",
      sexta: "Sex", sabado: "Sáb", domingo: "Dom"
    };
    const DIAS_ORDER = ["segunda", "terca", "quarta", "quinta", "sexta", "sabado", "domingo"];
    return DIAS_ORDER.map((d) => ({
      dia: DIAS_LABEL[d],
      aberto: h[d]?.aberto ?? false,
      inicio: h[d]?.inicio || "09:00",
      fim: h[d]?.fim || "19:00",
    }));
  }, [barbearia]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#111] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white/40" />
      </div>
    );
  }

  if (error && !barbearia) {
    return (
      <div className="min-h-screen bg-[#111] flex items-center justify-center text-white/60 text-center p-8">
        <div>
          <h1 className="text-xl font-bold mb-2 text-white">Ops!</h1>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!barbearia) return null;

  const stepOrder: BookingStep[] = ["profissional", "data", "horario", "confirmar"];
  const currentStepIdx = stepOrder.indexOf(bookingStep === "sucesso" ? "confirmar" : bookingStep);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {!showBooking ? (
        <>
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/20 to-[#0a0a0a]" />
            <div
              className="absolute inset-0 opacity-20"
              style={{ background: `radial-gradient(ellipse at 50% 0%, ${accent}40, transparent 70%)` }}
            />
            <div className="relative max-w-lg mx-auto px-5 pt-12 pb-8">
              <div className="flex items-center gap-4 mb-4">
                {barbearia.logoUrl ? (
                  <img src={barbearia.logoUrl} alt={barbearia.nome} className="h-16 w-16 rounded-2xl object-cover border border-white/10" />
                ) : (
                  <div className="h-16 w-16 rounded-2xl flex items-center justify-center border border-white/10" style={{ background: `${accent}25` }}>
                    <Scissors className="h-7 w-7" style={{ color: accent }} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl font-bold tracking-tight">{barbearia.nome}</h1>
                  {(barbearia.cidade || barbearia.bairro) && (
                    <p className="text-white/40 text-sm flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">
                        {[barbearia.bairro, barbearia.cidade, barbearia.uf].filter(Boolean).join(", ")}
                      </span>
                    </p>
                  )}
                  {barbearia.totalAvaliacoes > 0 && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <Stars nota={barbearia.notaMedia} size={12} />
                      <span className="text-xs text-white/50">{barbearia.notaMedia.toFixed(1)} ({barbearia.totalAvaliacoes})</span>
                    </div>
                  )}
                </div>
              </div>
              {barbearia.descricaoPublica && (
                <p className="text-white/50 text-sm leading-relaxed">{barbearia.descricaoPublica}</p>
              )}

              {clientUser && (
                <div className="mt-4 flex items-center justify-between p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: `${accent}30`, color: accent }}>
                      {clientUser.nome.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{clientUser.nome}</p>
                      <p className="text-[11px] text-white/30">{clientUser.email}</p>
                    </div>
                  </div>
                  <button onClick={handleLogout} className="p-1.5 rounded-lg hover:bg-white/5 transition" title="Sair">
                    <LogOut className="h-4 w-4 text-white/30" />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-3 mt-4">
                {barbearia.telefone && (
                  <a href={`https://wa.me/55${barbearia.telefone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] text-white/60 text-xs hover:bg-white/10 transition">
                    <Phone className="h-3.5 w-3.5" /> WhatsApp
                  </a>
                )}
                {barbearia.redesSociais?.instagram && (
                  <a href={`https://instagram.com/${barbearia.redesSociais.instagram}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] text-white/60 text-xs hover:bg-white/10 transition">
                    <Instagram className="h-3.5 w-3.5" /> Instagram
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="max-w-lg mx-auto px-5">
            <div className="flex gap-2 overflow-x-auto pb-3 mb-6 no-scrollbar">
              {[
                { id: "servicos", label: "Serviços", count: barbearia.servicos.length },
                { id: "profissionais", label: "Equipe", count: barbearia.profissionais.length },
                ...(barbearia.totalAvaliacoes > 0 ? [{ id: "avaliacoes", label: "Avaliações", count: barbearia.totalAvaliacoes }] : []),
                ...(barbearia.recompensas.length > 0 ? [{ id: "fidelidade", label: "Fidelidade", count: barbearia.recompensas.length }] : []),
                ...(barbearia.produtos.length > 0 ? [{ id: "produtos", label: "Produtos", count: barbearia.produtos.length }] : []),
                ...(barbearia.formasPagamento.length > 0 || horarioDisplay ? [{ id: "info", label: "Comodidades" }] : []),
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveSection(tab.id);
                    const el = document.getElementById(`section-${tab.id}`);
                    el?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    activeSection === tab.id
                      ? "text-white"
                      : "text-white/40 hover:text-white/60 bg-white/[0.03]"
                  }`}
                  style={activeSection === tab.id ? { backgroundColor: accent } : {}}
                >
                  {tab.label} {"count" in tab && <span className="ml-1 opacity-70">{tab.count}</span>}
                </button>
              ))}
            </div>

            <section id="section-servicos" ref={servicosRef} className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Serviços</h2>
              </div>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar serviço..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-sm placeholder-white/20 focus:outline-none focus:border-white/15 transition"
                />
              </div>
              <div className="space-y-2">
                {filteredServicos.length === 0 ? (
                  <p className="text-center py-8 text-white/30 text-sm">Nenhum serviço encontrado</p>
                ) : (
                  filteredServicos.map((s) => (
                    <div key={s.id} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] group">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[15px]">{s.nome}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-white/30 text-xs flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {s.duracaoMinutos} min
                            </span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-sm" style={{ color: accent }}>
                            R$ {s.preco.toFixed(2).replace(".", ",")}
                          </p>
                          <button
                            onClick={() => startBooking(s)}
                            className="mt-2 px-4 py-1.5 rounded-lg text-white text-xs font-semibold transition-all hover:opacity-90"
                            style={{ backgroundColor: accent }}
                          >
                            Agendar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section id="section-profissionais" ref={profissionaisRef} className="mb-10">
              <h2 className="text-lg font-bold mb-4">Equipe</h2>
              <div className="grid grid-cols-2 gap-3">
                {barbearia.profissionais.map((p) => (
                  <div key={p.id} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
                    <div className="h-14 w-14 rounded-full mx-auto mb-2 flex items-center justify-center border border-white/10" style={{ background: `${accent}20` }}>
                      {p.fotoUrl ? (
                        <img src={p.fotoUrl} alt={p.nomeExibicao} className="h-full w-full rounded-full object-cover" />
                      ) : (
                        <User className="h-6 w-6" style={{ color: accent }} />
                      )}
                    </div>
                    <p className="font-medium text-sm">{p.nomeExibicao}</p>
                    {p.especialidade && <p className="text-white/30 text-xs mt-0.5">{p.especialidade}</p>}
                  </div>
                ))}
              </div>
            </section>

            {barbearia.totalAvaliacoes > 0 && (
              <section id="section-avaliacoes" ref={avaliacoesRef} className="mb-10">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold">Avaliações</h2>
                  <div className="flex items-center gap-1.5">
                    <Stars nota={barbearia.notaMedia} size={14} />
                    <span className="text-sm font-semibold">{barbearia.notaMedia.toFixed(1)}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  {barbearia.avaliacoes.slice(0, 5).map((a) => (
                    <div key={a.id} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium text-sm">{a.clienteNome}</p>
                          <p className="text-white/30 text-[11px]">com {a.profissionalNome}</p>
                        </div>
                        <Stars nota={a.nota} size={12} />
                      </div>
                      {a.comentario && (
                        <p className="text-white/50 text-sm leading-relaxed">{a.comentario}</p>
                      )}
                      <p className="text-white/20 text-[11px] mt-2">
                        {new Date(a.createdAt).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {barbearia.recompensas.length > 0 && (
              <section id="section-fidelidade" className="mb-10">
                <h2 className="text-lg font-bold mb-1">Programa de Fidelidade</h2>
                <p className="text-white/30 text-sm mb-4">Acumule pontos e resgate recompensas</p>
                <div className="space-y-2">
                  {barbearia.recompensas.map((r) => (
                    <div key={r.id} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: `${accent}20` }}>
                        <Gift className="h-5 w-5" style={{ color: accent }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{r.nome}</p>
                        {r.descricao && <p className="text-white/30 text-xs mt-0.5 truncate">{r.descricao}</p>}
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-xs font-bold" style={{ color: accent }}>{r.pontosNecessarios} pts</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {barbearia.produtos.length > 0 && (
              <section id="section-produtos" className="mb-10">
                <h2 className="text-lg font-bold mb-4">Produtos</h2>
                <div className="grid grid-cols-2 gap-3">
                  {barbearia.produtos.map((p) => (
                    <div key={p.id} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
                      <div className="h-10 w-10 mx-auto rounded-xl flex items-center justify-center mb-2" style={{ background: `${accent}15` }}>
                        <ShoppingBag className="h-5 w-5" style={{ color: accent }} />
                      </div>
                      <p className="font-medium text-sm">{p.nome}</p>
                      <p className="text-xs mt-1" style={{ color: accent }}>R$ {p.preco.toFixed(2).replace(".", ",")}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {(barbearia.formasPagamento.length > 0 || horarioDisplay) && (
              <section id="section-info" className="mb-10">
                <h2 className="text-lg font-bold mb-4">Comodidades</h2>

                {horarioDisplay && (
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] mb-3">
                    <p className="font-medium text-sm mb-3 flex items-center gap-2">
                      <Clock className="h-4 w-4" style={{ color: accent }} /> Horário de Funcionamento
                    </p>
                    <div className="space-y-1.5">
                      {horarioDisplay.map((d) => (
                        <div key={d.dia} className="flex items-center justify-between text-sm">
                          <span className="text-white/50 w-10">{d.dia}</span>
                          {d.aberto ? (
                            <span className="text-white/70">{d.inicio} — {d.fim}</span>
                          ) : (
                            <span className="text-white/20 italic">Fechado</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {barbearia.formasPagamento.length > 0 && (
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] mb-3">
                    <p className="font-medium text-sm mb-3 flex items-center gap-2">
                      <CreditCard className="h-4 w-4" style={{ color: accent }} /> Formas de Pagamento
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {barbearia.formasPagamento.map((fp) => (
                        <span key={fp} className="px-3 py-1 rounded-full bg-white/[0.06] text-white/60 text-xs">
                          {PAYMENT_ICONS[fp] || fp}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {(barbearia.logradouro || barbearia.bairro) && (
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <p className="font-medium text-sm mb-2 flex items-center gap-2">
                      <MapPin className="h-4 w-4" style={{ color: accent }} /> Endereço
                    </p>
                    <p className="text-white/50 text-sm">
                      {[barbearia.logradouro, barbearia.numero].filter(Boolean).join(", ")}
                      {barbearia.bairro && ` — ${barbearia.bairro}`}
                    </p>
                    <p className="text-white/30 text-sm">
                      {[barbearia.cidade, barbearia.uf].filter(Boolean).join(" — ")}
                    </p>
                  </div>
                )}
              </section>
            )}

            <div className="h-20" />
          </div>
        </>
      ) : (
        <div className="max-w-lg mx-auto">
          <div className="sticky top-0 z-40 bg-[#0a0a0a]/95 backdrop-blur-lg border-b border-white/5 px-4 py-4">
            <div className="flex items-center gap-3">
              <button onClick={bookingGoBack} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="flex-1 min-w-0">
                <h1 className="font-bold text-lg truncate">{selectedServico?.nome}</h1>
                <p className="text-white/30 text-xs">
                  R$ {selectedServico?.preco.toFixed(2).replace(".", ",")} — {selectedServico?.duracaoMinutos} min
                </p>
              </div>
              {clientUser && (
                <span className="text-xs text-white/40 hidden sm:block">{clientUser.nome.split(" ")[0]}</span>
              )}
              <button onClick={() => { setShowBooking(false); setError(""); }} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition">
                <X className="h-5 w-5" />
              </button>
            </div>
            {bookingStep !== "sucesso" && (
              <div className="flex gap-1.5 mt-3">
                {stepOrder.map((_, i) => (
                  <div key={i} className="flex-1 h-1 rounded-full transition-all" style={{ backgroundColor: i <= currentStepIdx ? accent : "rgba(255,255,255,0.08)" }} />
                ))}
              </div>
            )}
          </div>

          <div className="p-4">
            {error && bookingStep !== "sucesso" && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
                <button onClick={() => setError("")} className="ml-2 underline text-xs">fechar</button>
              </div>
            )}

            {bookingStep === "profissional" && (() => {
              const hasAnyLinks = barbearia.profissionais.some((p: any) => p.servicoIds && p.servicoIds.length > 0);
              const filtered = hasAnyLinks && selectedServico
                ? barbearia.profissionais.filter((p: any) => !p.servicoIds || p.servicoIds.length === 0 || p.servicoIds.includes(selectedServico.id))
                : barbearia.profissionais;
              return (
              <div>
                <h2 className="text-lg font-semibold mb-1">Escolha o profissional</h2>
                <p className="text-white/30 text-sm mb-5">Quem vai te atender?</p>
                <button
                  onClick={() => handleSelectProfissional(null)}
                  className="w-full p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/20 transition-all text-left mb-2"
                >
                  <p className="font-medium">Sem preferência</p>
                  <p className="text-white/30 text-xs mt-0.5">Qualquer profissional disponível</p>
                </button>
                {filtered.map((p: any) => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectProfissional(p)}
                    className="w-full p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/20 transition-all text-left mb-2 flex items-center gap-3"
                  >
                    <div className="h-10 w-10 rounded-full flex items-center justify-center border border-white/10 overflow-hidden" style={{ background: `${accent}20` }}>
                      {p.fotoUrl ? (
                        <img src={p.fotoUrl} alt={p.nomeExibicao} className="h-full w-full rounded-full object-cover" />
                      ) : (
                        <User className="h-5 w-5" style={{ color: accent }} />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{p.nomeExibicao}</p>
                      {p.especialidade && <p className="text-white/30 text-xs mt-0.5">{p.especialidade}</p>}
                    </div>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <p className="text-center py-8 text-white/30 text-sm">Nenhum profissional disponível para este serviço</p>
                )}
              </div>
              );
            })()}

            {bookingStep === "data" && (
              <div>
                <h2 className="text-lg font-semibold mb-1">Escolha a data</h2>
                <p className="text-white/30 text-sm mb-5">A partir de hoje</p>
                <div className="grid grid-cols-7 gap-2">
                  {dates.map((d) => (
                    <button
                      key={d.date}
                      onClick={() => { handleDateSelect(d.date); handleProceedToSlots(); }}
                      className={`flex flex-col items-center py-3 rounded-xl border transition-all text-center ${
                        selectedDate === d.date
                          ? "border-white/30 bg-white/10"
                          : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05]"
                      }`}
                      style={selectedDate === d.date ? { borderColor: accent, backgroundColor: `${accent}20` } : {}}
                    >
                      <span className="text-[10px] text-white/30 uppercase">{d.dayName}</span>
                      <span className="text-lg font-semibold mt-0.5">{d.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {bookingStep === "horario" && (
              <div>
                <h2 className="text-lg font-semibold mb-1">Escolha o horário</h2>
                <p className="text-white/30 text-sm mb-5">
                  {new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
                </p>
                {slotsLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-white/30" />
                  </div>
                ) : slots.length === 0 ? (
                  <div className="text-center py-12 text-white/30">
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Nenhum horário disponível nesta data</p>
                    <button onClick={() => setBookingStep("data")} className="mt-3 text-sm underline" style={{ color: accent }}>Escolher outra data</button>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {slots.map((slot, i) => (
                      <button
                        key={i}
                        onClick={() => handleSelectSlot(slot)}
                        className={`py-3 px-2 rounded-xl border text-center transition-all ${
                          selectedSlot?.horaInicio === slot.horaInicio && selectedSlot?.profissionalId === slot.profissionalId
                            ? "border-white/30"
                            : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05]"
                        }`}
                        style={
                          selectedSlot?.horaInicio === slot.horaInicio && selectedSlot?.profissionalId === slot.profissionalId
                            ? { borderColor: accent, backgroundColor: `${accent}20` }
                            : {}
                        }
                      >
                        <p className="font-medium text-sm">{slot.horaInicio}</p>
                        {!selectedProfissional && (
                          <p className="text-[10px] text-white/30 mt-0.5 truncate">{slot.profissionalNome}</p>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {bookingStep === "confirmar" && selectedServico && selectedSlot && clientUser && (
              <div>
                <h2 className="text-lg font-semibold mb-5">Confirmar agendamento</h2>
                <div className="space-y-3 mb-6">
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="flex items-center gap-3 mb-3">
                      <Scissors className="h-4 w-4" style={{ color: accent }} />
                      <span className="text-sm font-medium">{selectedServico.nome}</span>
                      <span className="ml-auto font-bold text-sm" style={{ color: accent }}>
                        R$ {selectedServico.preco.toFixed(2).replace(".", ",")}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mb-3">
                      <User className="h-4 w-4 text-white/40" />
                      <span className="text-sm text-white/60">{selectedSlot.profissionalNome}</span>
                    </div>
                    <div className="flex items-center gap-3 mb-3">
                      <Calendar className="h-4 w-4 text-white/40" />
                      <span className="text-sm text-white/60">
                        {new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-white/40" />
                      <span className="text-sm text-white/60">{selectedSlot.horaInicio} — {selectedSlot.horaFim}</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <p className="text-xs text-white/30 mb-1">Agendando como</p>
                    <p className="text-sm font-medium">{clientUser.nome}</p>
                    <p className="text-xs text-white/40">{clientUser.email}</p>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="text-white/40 text-xs font-medium mb-1.5 block">Observação (opcional)</label>
                  <textarea
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white placeholder-white/20 text-sm focus:outline-none focus:border-white/20 resize-none"
                    placeholder="Alguma observação?"
                    rows={2}
                  />
                </div>

                <button
                  onClick={handleBooking}
                  disabled={bookingLoading}
                  className="w-full py-3.5 rounded-xl text-white font-semibold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ backgroundColor: accent }}
                >
                  {bookingLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar Agendamento"}
                </button>
              </div>
            )}

            {bookingStep === "sucesso" && (
              <div className="text-center py-12">
                <div className="h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ backgroundColor: `${accent}20` }}>
                  <Check className="h-8 w-8" style={{ color: accent }} />
                </div>
                <h2 className="text-xl font-bold mb-2">Agendamento Confirmado!</h2>
                <p className="text-white/40 text-sm mb-2">
                  {selectedServico?.nome} com {selectedSlot?.profissionalNome}
                </p>
                <p className="text-white/40 text-sm mb-8">
                  {selectedDate && new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })} às {selectedSlot?.horaInicio}
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => setShowBooking(false)}
                    className="px-5 py-2.5 rounded-xl border border-white/10 text-sm font-medium hover:bg-white/5 transition"
                  >
                    Voltar à página
                  </button>
                  <button
                    onClick={() => {
                      setBookingStep("profissional");
                      setSelectedServico(null);
                      setSelectedProfissional(null);
                      setSelectedDate("");
                      setSelectedSlot(null);
                      setObservacao("");
                      setError("");
                      setShowBooking(false);
                    }}
                    className="px-5 py-2.5 rounded-xl text-sm font-medium transition"
                    style={{ backgroundColor: accent }}
                  >
                    Agendar outro
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <ClientAuthModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthenticated={handleClientAuth}
        accentColor={accent}
      />
    </div>
  );
}
