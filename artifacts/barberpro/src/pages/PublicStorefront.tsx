import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "wouter";
import {
  Calendar, Clock, Scissors, User, ChevronLeft, ChevronRight, Check,
  MapPin, Phone, Loader2, LogOut, Star, Search, Gift, CreditCard,
  ShoppingBag, X, Instagram, Info, Download, Share, MessageCircle
} from "lucide-react";
import ClientAuthModal from "@/components/ClientAuthModal";
import { usePWA } from "@/hooks/usePWA";
import { useInstallPWA } from "@/hooks/useInstallPWA";
import { InstallAppButton } from "@/components/InstallAppButton";

const API_BASE = `${import.meta.env.BASE_URL}api`.replace(/\/+/g, "/");

function getContrastColor(hex: string): string {
  let c = hex.replace("#", "");
  if (c.length === 3) c = c[0]+c[0]+c[1]+c[1]+c[2]+c[2];
  if (c.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(c)) return "#ffffff";
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;
  const toLinear = (v: number) => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  const L = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return L > 0.4 ? "#000000" : "#ffffff";
}

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

type Step = "servico" | "profissional" | "data" | "horario" | "confirmar" | "sucesso";

function StarsDisplay({ nota, size = 14 }: { nota: number; size?: number }) {
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

  const [step, setStep] = useState<Step>("servico");
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
  const [clienteWhatsapp, setClienteWhatsapp] = useState("");
  const [showProfile, setShowProfile] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const accent = barbearia?.corPrimaria || "#C4943C";
  const accentText = getContrastColor(accent);

  usePWA({
    slug,
    nome: barbearia?.nome,
    logoUrl: barbearia?.logoUrl,
    corPrimaria: barbearia?.corPrimaria,
  });

  const { isInstalled } = useInstallPWA();

  useEffect(() => {
    fetchBarbearia();
    checkClientSession();
    fetchGoogleClientId();
  }, [slug]);

  useEffect(() => {
    if (clientUser?.telefone && !clienteWhatsapp) {
      const raw = clientUser.telefone.replace(/\D/g, "").slice(0, 11);
      let masked = raw;
      if (raw.length > 2) masked = `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
      if (raw.length > 7) masked = `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7)}`;
      setClienteWhatsapp(masked);
    }
  }, [clientUser]);

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
      const p = new URLSearchParams({
        data: date,
        servicoId: selectedServico.id.toString(),
        ...(selectedProfissional ? { profissionalId: selectedProfissional.id.toString() } : {}),
      });
      const res = await fetch(`${API_BASE}/public/${slug}/slots?${p}`, { credentials: "include" });
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
    const rawWa = clienteWhatsapp.replace(/\D/g, "");
    if (!rawWa || rawWa.length < 10 || rawWa.length > 11) {
      setError("WhatsApp é obrigatório (10 ou 11 dígitos)");
      return;
    }
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
          clienteWhatsapp: rawWa,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao agendar");
      }
      setStep("sucesso");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBookingLoading(false);
    }
  }

  function handleSelectServico(s: any) {
    setSelectedServico(s);
    setSelectedProfissional(null);
    setSelectedDate("");
    setSelectedSlot(null);
    setSlots([]);
    setObservacao("");
    setError("");
    setStep("profissional");
  }

  function handleSelectProfissional(p: any | null) {
    setSelectedProfissional(p);
    setStep("data");
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
    setStep("horario");
  }

  function handleSelectSlot(slot: Slot) {
    setSelectedSlot(slot);
    setStep("confirmar");
  }

  function handleClientAuth(user: ClientUser) {
    setClientUser(user);
    setShowAuthModal(false);
    if (selectedDate) {
      fetchSlots(selectedDate);
      setStep("horario");
    }
  }

  async function handleLogout() {
    await fetch(`${API_BASE}/client/logout`, { method: "POST", credentials: "include" });
    setClientUser(null);
  }

  function goBack() {
    if (step === "profissional") setStep("servico");
    else if (step === "data") setStep("profissional");
    else if (step === "horario") setStep("data");
    else if (step === "confirmar") setStep("horario");
  }

  function resetBooking() {
    setStep("servico");
    setSelectedServico(null);
    setSelectedProfissional(null);
    setSelectedDate("");
    setSelectedSlot(null);
    setObservacao("");
    setError("");
  }

  const dates = useMemo(() => {
    const result: { date: string; label: string; dayName: string }[] = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      result.push({
        date: d.toISOString().slice(0, 10),
        label: d.getDate().toString(),
        dayName: d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
      });
    }
    return result;
  }, []);

  const filteredServicos = useMemo(() => {
    if (!barbearia) return [];
    if (!searchQuery.trim()) return barbearia.servicos;
    const q = searchQuery.toLowerCase();
    return barbearia.servicos.filter((s) => s.nome.toLowerCase().includes(q));
  }, [barbearia, searchQuery]);

  const horarioDisplay = useMemo(() => {
    if (!barbearia?.horarioFuncionamento) return null;
    const hf = barbearia.horarioFuncionamento;
    if (Array.isArray(hf)) {
      return hf.map((item: any) => ({
        dia: item.dia?.substring(0, 3) || "?",
        aberto: item.ativo ?? false,
        inicio: item.abertura || "09:00",
        fim: item.fechamento || "19:00",
      }));
    }
    const DIAS_LABEL: Record<string, string> = {
      segunda: "Seg", terca: "Ter", quarta: "Qua", quinta: "Qui",
      sexta: "Sex", sabado: "Sáb", domingo: "Dom"
    };
    const DIAS_ORDER = ["segunda", "terca", "quarta", "quinta", "sexta", "sabado", "domingo"];
    return DIAS_ORDER.map((d) => ({
      dia: DIAS_LABEL[d],
      aberto: hf[d]?.aberto ?? false,
      inicio: hf[d]?.inicio || "09:00",
      fim: hf[d]?.fim || "19:00",
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

  const stepOrder: Step[] = ["servico", "profissional", "data", "horario", "confirmar"];
  const currentStepIdx = stepOrder.indexOf(step === "sucesso" ? "confirmar" : step);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-lg mx-auto">
        <div className="sticky top-0 z-40 bg-[#0a0a0a]/95 backdrop-blur-lg border-b border-white/5 px-4 py-3">
          <div className="flex items-center gap-3">
            {step !== "servico" && step !== "sucesso" && (
              <button onClick={goBack} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition">
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            <button
              onClick={() => setShowProfile(true)}
              className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-80 transition"
            >
              {barbearia.logoUrl ? (
                <img src={barbearia.logoUrl} alt={barbearia.nome} className="h-9 w-9 rounded-xl object-cover border border-white/10 flex-shrink-0" />
              ) : (
                <div className="h-9 w-9 rounded-xl flex items-center justify-center border border-white/10 flex-shrink-0" style={{ background: `${accent}25` }}>
                  <Scissors className="h-4 w-4" style={{ color: accent }} />
                </div>
              )}
              <div className="min-w-0">
                <h1 className="font-bold text-[15px] truncate">{barbearia.nome}</h1>
                {barbearia.cidade && (
                  <p className="text-white/30 text-[11px] flex items-center gap-1">
                    <MapPin className="h-2.5 w-2.5" /> {barbearia.cidade}, {barbearia.uf}
                  </p>
                )}
              </div>
            </button>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {!isInstalled && (
                <InstallAppButton
                  nome={barbearia?.nome}
                  logoUrl={barbearia?.logoUrl}
                  accentColor={accent}
                  variant="ghost"
                  size="sm"
                  iconOnly
                  className="p-1.5 rounded-lg transition"
                />
              )}
              <button onClick={() => setShowProfile(true)} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition" title="Info">
                <Info className="h-4 w-4 text-white/40" />
              </button>
              {clientUser ? (
                <>
                  <span className="text-[11px] text-white/40 hidden sm:block">{clientUser.nome.split(" ")[0]}</span>
                  <button onClick={handleLogout} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition" title="Sair">
                    <LogOut className="h-4 w-4 text-white/40" />
                  </button>
                </>
              ) : null}
            </div>
          </div>
          {step !== "sucesso" && (
            <div className="flex gap-1 mt-2.5">
              {stepOrder.map((_, i) => (
                <div key={i} className="flex-1 h-1 rounded-full transition-all" style={{ backgroundColor: i <= currentStepIdx ? accent : "rgba(255,255,255,0.08)" }} />
              ))}
            </div>
          )}
        </div>

        <div className="p-4">
          {error && step !== "sucesso" && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
              <button onClick={() => setError("")} className="ml-2 underline text-xs">fechar</button>
            </div>
          )}

          {step === "servico" && (
            <div>
              <h2 className="text-lg font-semibold mb-1">Escolha o serviço</h2>
              <p className="text-white/30 text-sm mb-4">Selecione o que deseja agendar</p>
              {barbearia.servicos.length > 5 && (
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
              )}
              <div className="space-y-2">
                {filteredServicos.length === 0 ? (
                  <p className="text-center py-8 text-white/30 text-sm">Nenhum serviço encontrado</p>
                ) : (
                  filteredServicos.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => handleSelectServico(s)}
                      className="w-full p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/20 transition-all text-left group"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-[15px]">{s.nome}</p>
                          <p className="text-white/30 text-xs mt-0.5">
                            <Clock className="h-3 w-3 inline mr-1" />{s.duracaoMinutos} min
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold" style={{ color: accent }}>
                            R$ {s.preco.toFixed(2).replace(".", ",")}
                          </p>
                          <ChevronRight className="h-4 w-4 text-white/20 group-hover:text-white/50 ml-auto mt-1" />
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {step === "profissional" && (() => {
            const hasAnyLinks = barbearia.profissionais.some((p: any) => p.servicoIds && p.servicoIds.length > 0);
            const filtered = hasAnyLinks && selectedServico
              ? barbearia.profissionais.filter((p: any) => p.servicoIds && p.servicoIds.includes(selectedServico.id))
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

          {step === "data" && (
            <div>
              <h2 className="text-lg font-semibold mb-1">Escolha a data</h2>
              <p className="text-white/30 text-sm mb-5">Selecione o dia</p>
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

          {step === "horario" && (
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
                  <button onClick={() => setStep("data")} className="mt-3 text-sm underline" style={{ color: accent }}>Escolher outra data</button>
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

          {step === "confirmar" && selectedServico && selectedSlot && clientUser && (
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

                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <label className="text-white/40 text-xs font-medium mb-1.5 block">WhatsApp *</label>
                  <div className="relative">
                    <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
                    <input
                      type="tel"
                      value={clienteWhatsapp}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, "").slice(0, 11);
                        let masked = raw;
                        if (raw.length > 2) masked = `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
                        else if (raw.length > 0) masked = `(${raw}`;
                        if (raw.length > 7) masked = `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7)}`;
                        setClienteWhatsapp(masked);
                      }}
                      maxLength={15}
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/25 text-sm focus:outline-none focus:border-white/30"
                      placeholder="(11) 99999-9999"
                      required
                    />
                  </div>
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
                className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ backgroundColor: accent, color: accentText }}
              >
                {bookingLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar Agendamento"}
              </button>
            </div>
          )}

          {step === "sucesso" && (
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
              <button
                onClick={resetBooking}
                className="px-6 py-2.5 rounded-xl text-sm font-medium transition"
                style={{ backgroundColor: accent, color: accentText }}
              >
                Agendar outro serviço
              </button>
            </div>
          )}
        </div>
      </div>

      {showProfile && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={() => setShowProfile(false)}>
          <div
            className="bg-[#111] w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-[#111]/95 backdrop-blur-lg border-b border-white/5 px-5 py-4 flex items-center justify-between z-10">
              <h2 className="font-bold text-lg">Sobre</h2>
              <button onClick={() => setShowProfile(false)} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-6">
              <div className="flex items-center gap-4">
                {barbearia.logoUrl ? (
                  <img src={barbearia.logoUrl} alt={barbearia.nome} className="h-16 w-16 rounded-2xl object-cover border border-white/10" />
                ) : (
                  <div className="h-16 w-16 rounded-2xl flex items-center justify-center border border-white/10" style={{ background: `${accent}25` }}>
                    <Scissors className="h-7 w-7" style={{ color: accent }} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-bold">{barbearia.nome}</h3>
                  {(barbearia.cidade || barbearia.bairro) && (
                    <p className="text-white/40 text-sm flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">{[barbearia.bairro, barbearia.cidade, barbearia.uf].filter(Boolean).join(", ")}</span>
                    </p>
                  )}
                  {barbearia.totalAvaliacoes > 0 && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <StarsDisplay nota={barbearia.notaMedia} size={12} />
                      <span className="text-xs text-white/50">{barbearia.notaMedia.toFixed(1)} ({barbearia.totalAvaliacoes})</span>
                    </div>
                  )}
                </div>
              </div>

              {barbearia.descricaoPublica && (
                <p className="text-white/50 text-sm leading-relaxed">{barbearia.descricaoPublica}</p>
              )}

              <div className="flex items-center gap-3">
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

              <section>
                <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" style={{ color: accent }} /> Equipe
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {barbearia.profissionais.map((p) => (
                    <div key={p.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
                      <div className="h-12 w-12 rounded-full mx-auto mb-2 flex items-center justify-center border border-white/10" style={{ background: `${accent}20` }}>
                        {p.fotoUrl ? (
                          <img src={p.fotoUrl} alt={p.nomeExibicao} className="h-full w-full rounded-full object-cover" />
                        ) : (
                          <User className="h-5 w-5" style={{ color: accent }} />
                        )}
                      </div>
                      <p className="font-medium text-sm">{p.nomeExibicao}</p>
                      {p.especialidade && <p className="text-white/30 text-xs mt-0.5">{p.especialidade}</p>}
                    </div>
                  ))}
                </div>
              </section>

              {barbearia.totalAvaliacoes > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold flex items-center gap-2">
                      <Star className="h-4 w-4" style={{ color: accent }} /> Avaliações
                    </h4>
                    <div className="flex items-center gap-1.5">
                      <StarsDisplay nota={barbearia.notaMedia} size={12} />
                      <span className="text-xs font-semibold">{barbearia.notaMedia.toFixed(1)}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {barbearia.avaliacoes.slice(0, 5).map((a) => (
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

              {barbearia.recompensas.length > 0 && (
                <section>
                  <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
                    <Gift className="h-4 w-4" style={{ color: accent }} /> Fidelidade
                  </h4>
                  <div className="space-y-2">
                    {barbearia.recompensas.map((r) => (
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

              {barbearia.produtos.length > 0 && (
                <section>
                  <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4" style={{ color: accent }} /> Produtos
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {barbearia.produtos.map((p) => (
                      <div key={p.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
                        <p className="font-medium text-sm">{p.nome}</p>
                        <p className="text-xs mt-1" style={{ color: accent }}>R$ {p.preco.toFixed(2).replace(".", ",")}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {horarioDisplay && (
                <section>
                  <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4" style={{ color: accent }} /> Horários
                  </h4>
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-1.5">
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
                </section>
              )}

              {barbearia.formasPagamento.length > 0 && (
                <section>
                  <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
                    <CreditCard className="h-4 w-4" style={{ color: accent }} /> Pagamento
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {barbearia.formasPagamento.map((fp) => (
                      <span key={fp} className="px-3 py-1 rounded-full bg-white/[0.06] text-white/60 text-xs">
                        {PAYMENT_ICONS[fp] || fp}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {(barbearia.logradouro || barbearia.bairro) && (
                <section>
                  <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4" style={{ color: accent }} /> Endereço
                  </h4>
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <p className="text-white/50 text-sm">
                      {[barbearia.logradouro, barbearia.numero].filter(Boolean).join(", ")}
                      {barbearia.bairro && ` — ${barbearia.bairro}`}
                    </p>
                    <p className="text-white/30 text-sm">
                      {[barbearia.cidade, barbearia.uf].filter(Boolean).join(" — ")}
                    </p>
                  </div>
                </section>
              )}

              <div className="h-4" />
            </div>
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
