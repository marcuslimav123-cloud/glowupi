import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "wouter";
import { Calendar, Clock, Scissors, User, ChevronLeft, ChevronRight, Check, MapPin, Phone, Loader2, LogOut } from "lucide-react";
import ClientAuthModal from "@/components/ClientAuthModal";

const API_BASE = `${import.meta.env.BASE_URL}api`.replace(/\/+/g, "/");

interface ClientUser {
  id: number;
  nome: string;
  email: string;
  telefone: string | null;
  fotoUrl: string | null;
}

interface BarbeariaData {
  id: number;
  nome: string;
  slug: string;
  telefone: string;
  corPrimaria: string;
  logoUrl: string | null;
  descricaoPublica: string | null;
  cidade: string;
  uf: string;
  logradouro: string;
  bairro: string;
  horarioFuncionamento: any;
  servicos: any[];
  profissionais: any[];
}

interface Slot {
  horaInicio: string;
  horaFim: string;
  profissionalId: number;
  profissionalNome: string;
  disponivel: boolean;
}

type Step = "servico" | "profissional" | "data" | "horario" | "confirmar" | "sucesso";

export default function PublicBooking() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [barbearia, setBarbearia] = useState<BarbeariaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [step, setStep] = useState<Step>("servico");

  const [selectedServico, setSelectedServico] = useState<any>(null);
  const [selectedProfissional, setSelectedProfissional] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [clientUser, setClientUser] = useState<ClientUser | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [observacao, setObservacao] = useState("");

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
      const data = await res.json();
      setBarbearia(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function checkClientSession() {
    try {
      const res = await fetch(`${API_BASE}/client/me`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setClientUser(data);
      }
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
      setStep("sucesso");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBookingLoading(false);
    }
  }

  function handleDateSelect(date: string) {
    setSelectedDate(date);
    setSelectedSlot(null);
    fetchSlots(date);
  }

  function handleSelectServico(s: any) {
    setSelectedServico(s);
    setSelectedSlot(null);
    setStep("profissional");
  }

  function handleSelectProfissional(p: any | null) {
    setSelectedProfissional(p);
    setStep("data");
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

  const dates = useMemo(() => {
    const result: { date: string; label: string; dayName: string }[] = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayName = d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
      const label = d.getDate().toString();
      result.push({ date: dateStr, label, dayName });
    }
    return result;
  }, []);

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
          <h1 className="text-xl font-bold mb-2">Ops!</h1>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!barbearia) return null;

  const stepOrder: Step[] = ["servico", "profissional", "data", "horario", "confirmar"];
  const currentStepIdx = stepOrder.indexOf(step === "sucesso" ? "confirmar" : step);

  function goBack() {
    if (step === "profissional") setStep("servico");
    else if (step === "data") setStep("profissional");
    else if (step === "horario") setStep("data");
    else if (step === "confirmar") setStep("horario");
  }

  return (
    <div className="min-h-screen bg-[#111] text-white">
      <div className="max-w-lg mx-auto">
        <div className="sticky top-0 z-40 bg-[#111]/95 backdrop-blur-lg border-b border-white/5 px-4 py-4">
          <div className="flex items-center gap-3">
            {step !== "servico" && step !== "sucesso" && (
              <button onClick={goBack} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition">
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-lg truncate">{barbearia.nome}</h1>
              {barbearia.cidade && (
                <p className="text-white/30 text-xs flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {barbearia.cidade}, {barbearia.uf}
                </p>
              )}
            </div>
            {clientUser && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/40 hidden sm:block">{clientUser.nome.split(" ")[0]}</span>
                <button onClick={handleLogout} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition" title="Sair">
                  <LogOut className="h-4 w-4 text-white/40" />
                </button>
              </div>
            )}
          </div>
          {step !== "sucesso" && (
            <div className="flex gap-1.5 mt-3">
              {stepOrder.map((s, i) => (
                <div key={s} className="flex-1 h-1 rounded-full transition-all" style={{ backgroundColor: i <= currentStepIdx ? accent : "rgba(255,255,255,0.08)" }} />
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
              <p className="text-white/30 text-sm mb-5">Selecione o que deseja agendar</p>
              <div className="space-y-2">
                {barbearia.servicos.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleSelectServico(s)}
                    className="w-full p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/20 transition-all text-left group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-[15px]">{s.nome}</p>
                        <p className="text-white/30 text-xs mt-0.5">{s.duracaoMinutos} min</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold" style={{ color: accent }}>
                          R$ {s.preco.toFixed(2).replace(".", ",")}
                        </p>
                        <ChevronRight className="h-4 w-4 text-white/20 group-hover:text-white/50 ml-auto mt-1" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === "profissional" && (() => {
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
                onClick={() => {
                  setStep("servico");
                  setSelectedServico(null);
                  setSelectedProfissional(null);
                  setSelectedDate("");
                  setSelectedSlot(null);
                  setObservacao("");
                  setError("");
                }}
                className="px-6 py-2.5 rounded-xl border border-white/10 text-sm font-medium hover:bg-white/5 transition"
              >
                Agendar outro serviço
              </button>
            </div>
          )}
        </div>
      </div>

      <ClientAuthModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthenticated={handleClientAuth}
        accentColor={accent}
      />
    </div>
  );
}
