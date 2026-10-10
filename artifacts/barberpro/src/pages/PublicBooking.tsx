import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "wouter";
import { Calendar, Clock, Scissors, User, ChevronLeft, ChevronRight, Check, MapPin, Phone, Loader2, LogOut, MessageCircle, XCircle, CalendarDays, AlertTriangle, Download, Share, X, Copy, ExternalLink } from "lucide-react";
import ClientAuthModal from "@/components/ClientAuthModal";
import { usePWA } from "@/hooks/usePWA";
import { defaultLogoUrl } from "@/lib/branding";
import { useInstallPWA } from "@/hooks/useInstallPWA";
import { InstallAppButton } from "@/components/InstallAppButton";
import { useClientNotifications, enableClientNotifications } from "@/hooks/useClientNotifications";

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

interface FilialData {
  id: number;
  nome: string;
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  telefone: string | null;
}

interface BarbeariaData {
  id: number;
  nome: string;
  slug: string;
  telefone: string;
  corPrimaria: string;
  logoUrl: string | null;
  tipoEstabelecimento?: string | null;
  logoPadraoUrl?: string;
  descricaoPublica: string | null;
  cidade: string;
  uf: string;
  logradouro: string;
  bairro: string;
  horarioFuncionamento: any;
  servicos: any[];
  profissionais: any[];
  tipoLinkAgendamento?: "simples" | "com_login";
  permitirCancelamentoCliente?: boolean;
  toleranciaCancelamento?: number;
  whatsappEncaixeHabilitado?: boolean;
  filiais?: FilialData[];
}

interface MeuAgendamento {
  id: number;
  servicoNome: string;
  profissionalNome: string;
  data: string;
  horaInicio: string;
  horaFim: string;
  status: string;
  valor: number;
}

interface Slot {
  horaInicio: string;
  horaFim: string;
  profissionalId: number;
  profissionalNome: string;
  disponivel: boolean;
}

type Step = "filial" | "servico" | "profissional" | "data" | "horario" | "confirmar" | "sucesso";

export default function PublicBooking() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [barbearia, setBarbearia] = useState<BarbeariaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [step, setStep] = useState<Step>("servico");

  const [selectedFilial, setSelectedFilial] = useState<FilialData | null>(null);
  const [selectedServico, setSelectedServico] = useState<any>(null);
  const [selectedProfissional, setSelectedProfissional] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [clientUser, setClientUser] = useState<ClientUser | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingStatus, setBookingStatus] = useState<string>("confirmado");
  const [sinalPagamento, setSinalPagamento] = useState<any>(null);
  const [agendamentoCriadoId, setAgendamentoCriadoId] = useState<number | null>(null);
  const [agendamentoCriadoTel, setAgendamentoCriadoTel] = useState<string | null>(null);
  const [sinalConsultaToken, setSinalConsultaToken] = useState<string | null>(null);
  const [observacao, setObservacao] = useState("");
  const [simplesNome, setSimplesNome] = useState("");
  const [simplesWhatsapp, setSimplesWhatsapp] = useState("");
  const [comLoginWhatsapp, setComLoginWhatsapp] = useState("");
  const [sinalBillingType, setSinalBillingType] = useState<"PIX" | "BOLETO" | "CREDIT_CARD">("PIX");
  const [payerCpfCnpj, setPayerCpfCnpj] = useState("");
  const [showMeusAgendamentos, setShowMeusAgendamentos] = useState(() => {
    const sp = new URLSearchParams(window.location.search);
    return sp.has("agendamentoId") || sp.has("mensagem");
  });
  const [meusAgendamentos, setMeusAgendamentos] = useState<MeuAgendamento[]>([]);
  const [meusAgendamentosLoading, setMeusAgendamentosLoading] = useState(false);
  const [cancelConfirmId, setCancelConfirmId] = useState<number | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelFeedback, setCancelFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [simplesLookupWhatsapp, setSimplesLookupWhatsapp] = useState("");
  const [simplesLookupDone, setSimplesLookupDone] = useState(false);
  const [openMessageAgendId, setOpenMessageAgendId] = useState<number | null>(() => {
    const sp = new URLSearchParams(window.location.search);
    const agendId = sp.get("agendamentoId");
    const msg = sp.get("mensagem");
    if (agendId && msg === "1") return parseInt(agendId);
    return null;
  });
  const [messageThread, setMessageThread] = useState<{ remetente: string; mensagem: string; createdAt: string }[]>([]);
  const [messageThreadLoading, setMessageThreadLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messagingEnabled, setMessagingEnabled] = useState(false);

  const accent = barbearia?.corPrimaria || "#C4943C";
  const accentText = getContrastColor(accent);

  usePWA({
    slug,
    nome: barbearia?.nome,
    logoUrl: barbearia?.logoUrl,
    corPrimaria: barbearia?.corPrimaria,
    tipoEstabelecimento: barbearia?.tipoEstabelecimento,
  });

  const { isInstalled } = useInstallPWA();

  useClientNotifications(!!clientUser);

  useEffect(() => {
    fetchBarbearia();
    checkClientSession();
    fetchGoogleClientId();
  }, [slug]);

  useEffect(() => {
    if (clientUser?.telefone && !comLoginWhatsapp) {
      const raw = clientUser.telefone.replace(/\D/g, "").slice(0, 11);
      let masked = raw;
      if (raw.length > 7) masked = `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7)}`;
      else if (raw.length > 2) masked = `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
      else if (raw.length > 0) masked = `(${raw}`;
      setComLoginWhatsapp(masked);
    }
  }, [clientUser]);

  async function fetchBarbearia() {
    try {
      const res = await fetch(`${API_BASE}/public/${slug}`, { credentials: "include" });
      if (!res.ok) throw new Error("Estabelecimento não encontrado");
      const data = await res.json();
      setBarbearia(data);
      if (data.filiais && data.filiais.length > 0) {
        setStep("filial");
      }
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
        ...(selectedFilial ? { filialId: selectedFilial.id.toString() } : {}),
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
    if (!selectedServico || !selectedSlot || !barbearia) return;

    if (isSimpleMode) {
      if (!simplesNome.trim() || !simplesWhatsapp.trim()) {
        setError("Preencha seu nome e WhatsApp para agendar");
        return;
      }
      setBookingLoading(true);
      try {
        const res = await fetch(`${API_BASE}/public/${slug}/agendar-simples`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            profissionalId: selectedSlot.profissionalId,
            servicoId: selectedServico.id,
            data: selectedDate,
            horaInicio: selectedSlot.horaInicio,
            observacao: observacao || null,
            clienteNome: simplesNome.trim(),
            clienteWhatsapp: simplesWhatsapp.trim(),
            billingType: sinalBillingType,
            payerCpfCnpj: payerCpfCnpj || undefined,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || "Erro ao agendar");
        }
        setBookingStatus(data?.status || "confirmado");
        setSinalPagamento(data?.sinalPagamento || null);
        setAgendamentoCriadoId(data?.id || null);
        setAgendamentoCriadoTel(simplesWhatsapp.replace(/\D/g, "").slice(-10));
        setSinalConsultaToken(data?.sinalPagamento?.consultaToken || null);
        setStep("sucesso");
        if (clientUser) enableClientNotifications().catch(() => {});
      if (clientUser) enableClientNotifications().catch(() => {});
      } catch (e: any) {
        setError(e.message);
      } finally {
        setBookingLoading(false);
      }
      return;
    }

    if (!clientUser) return;
    const rawWa = comLoginWhatsapp.replace(/\D/g, "");
    if (rawWa.length < 10 || rawWa.length > 11) {
      setError("Preencha seu WhatsApp para agendar");
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
          filialId: selectedFilial?.id || null,
          clienteWhatsapp: rawWa,
          billingType: sinalBillingType,
          payerCpfCnpj: payerCpfCnpj || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Erro ao agendar");
      }
      setBookingStatus(data?.status || "confirmado");
      setSinalPagamento(data?.sinalPagamento || null);
      setAgendamentoCriadoId(data?.id || null);
      setAgendamentoCriadoTel(rawWa.slice(-10));
      setSinalConsultaToken(data?.sinalPagamento?.consultaToken || null);
      setStep("sucesso");
      if (clientUser) enableClientNotifications().catch(() => {});
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

  const isSimpleMode = barbearia?.tipoLinkAgendamento === "simples";

  function handleProceedToSlots() {
    if (!isSimpleMode && !clientUser) {
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
    setShowMeusAgendamentos(false);
    setMeusAgendamentos([]);
  }

  async function fetchMeusAgendamentos() {
    if (!slug) return;
    setMeusAgendamentosLoading(true);
    setCancelFeedback(null);
    try {
      const res = await fetch(`${API_BASE}/public/${slug}/meus-agendamentos`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setMeusAgendamentos(data);
      }
    } catch {} finally {
      setMeusAgendamentosLoading(false);
    }
  }

  async function handleCancelAgendamento(agendamentoId: number) {
    if (!slug) return;
    setCancelLoading(true);
    setCancelFeedback(null);
    try {
      const res = await fetch(`${API_BASE}/public/${slug}/agendamentos/${agendamentoId}/cancelar`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao cancelar");
      setCancelFeedback({ type: "success", message: "Agendamento cancelado com sucesso!" });
      setCancelConfirmId(null);
      setMeusAgendamentos(prev => prev.filter(a => a.id !== agendamentoId));
    } catch (e: any) {
      setCancelFeedback({ type: "error", message: e.message });
      setCancelConfirmId(null);
    } finally {
      setCancelLoading(false);
    }
  }

  function handleOpenMeusAgendamentos() {
    if (!clientUser) {
      setShowAuthModal(true);
      return;
    }
    setShowMeusAgendamentos(true);
    fetchMeusAgendamentos();
  }

  async function fetchMessageThread(agendamentoId: number) {
    setMessageThreadLoading(true);
    try {
      const res = await fetch(`${API_BASE}/agendamento-mensagens/${agendamentoId}`, {
        credentials: "include",
      });
      if (res.ok) {
        setMessageThread(await res.json());
      }
    } catch {} finally {
      setMessageThreadLoading(false);
    }
  }

  async function handleOpenMessages(agendamentoId: number) {
    if (openMessageAgendId === agendamentoId) {
      setOpenMessageAgendId(null);
      return;
    }
    setOpenMessageAgendId(agendamentoId);
    await fetchMessageThread(agendamentoId);
  }

  async function handleSendMessage(agendamentoId: number) {
    if (!newMessage.trim() || !barbearia) return;
    setSendingMessage(true);
    try {
      const res = await fetch(`${API_BASE}/agendamento-mensagens/enviar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ agendamentoId, mensagem: newMessage.trim(), barbeariaId: barbearia.id }),
      });
      if (res.ok) {
        setNewMessage("");
        await fetchMessageThread(agendamentoId);
      }
    } catch {} finally {
      setSendingMessage(false);
    }
  }

  useEffect(() => {
    if (!barbearia?.id) return;
    fetch(`${API_BASE}/public/${slug}/config`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && typeof data.mensagensAgendamentoHabilitadas === "boolean") {
          setMessagingEnabled(data.mensagensAgendamentoHabilitadas);
        } else {
          setMessagingEnabled(true);
        }
      })
      .catch(() => setMessagingEnabled(true));
  }, [barbearia?.id, slug]);

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

  const hasFiliais = barbearia?.filiais && barbearia.filiais.length > 0;
  const stepOrder: Step[] = hasFiliais
    ? ["filial", "servico", "profissional", "data", "horario", "confirmar"]
    : ["servico", "profissional", "data", "horario", "confirmar"];
  const currentStepIdx = stepOrder.indexOf(step === "sucesso" ? "confirmar" : step);

  function goBack() {
    if (step === "servico" && hasFiliais) setStep("filial");
    else if (step === "profissional") setStep("servico");
    else if (step === "data") setStep("profissional");
    else if (step === "horario") setStep("data");
    else if (step === "confirmar") setStep("horario");
  }

  return (
    <div className="min-h-screen bg-[#111] text-white">
      <div className="max-w-lg mx-auto">
        <div className="sticky top-0 z-40 bg-[#111]/95 backdrop-blur-lg border-b border-white/5 px-4 py-4">
          <div className="flex items-center gap-3">
            {step !== "filial" && step !== "servico" && step !== "sucesso" && !showMeusAgendamentos && (
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
            {!isInstalled && (
              <InstallAppButton
                nome={barbearia?.nome}
                logoUrl={barbearia?.logoUrl}
                logoPadrao={defaultLogoUrl(barbearia?.tipoEstabelecimento)}
                accentColor={accent}
                variant="ghost"
                size="sm"
                iconOnly
                className="p-1.5 rounded-lg transition"
              />
            )}
            {barbearia.permitirCancelamentoCliente && (isSimpleMode || clientUser) && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (showMeusAgendamentos) {
                      setShowMeusAgendamentos(false);
                      setSimplesLookupDone(false);
                    } else if (isSimpleMode && !clientUser) {
                      setShowMeusAgendamentos(true);
                      setSimplesLookupDone(false);
                      setMeusAgendamentos([]);
                    } else {
                      handleOpenMeusAgendamentos();
                    }
                  }}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition"
                  title="Meus Agendamentos"
                  style={showMeusAgendamentos ? { backgroundColor: `${accent}20`, borderColor: accent } : {}}
                >
                  <CalendarDays className="h-4 w-4" style={showMeusAgendamentos ? { color: accent } : { color: "rgba(255,255,255,0.4)" }} />
                </button>
                {!isSimpleMode && clientUser && (
                  <>
                    <span className="text-xs text-white/40 hidden sm:block">{clientUser.nome.split(" ")[0]}</span>
                    <button onClick={handleLogout} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition" title="Sair">
                      <LogOut className="h-4 w-4 text-white/40" />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
          {step !== "sucesso" && !showMeusAgendamentos && (
            <div className="flex gap-1.5 mt-3">
              {stepOrder.map((s, i) => (
                <div key={s} className="flex-1 h-1 rounded-full transition-all" style={{ backgroundColor: i <= currentStepIdx ? accent : "rgba(255,255,255,0.08)" }} />
              ))}
            </div>
          )}
        </div>

        <div className="p-4">
          {error && step !== "sucesso" && !showMeusAgendamentos && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
              <button onClick={() => setError("")} className="ml-2 underline text-xs">fechar</button>
            </div>
          )}

          {showMeusAgendamentos && isSimpleMode && !clientUser && !simplesLookupDone && (
            <div>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-semibold">Meus Agendamentos</h2>
                  <p className="text-white/30 text-sm">Informe seu WhatsApp para consultar</p>
                </div>
                <button onClick={() => { setShowMeusAgendamentos(false); setSimplesLookupDone(false); }} className="text-sm px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition text-white/40">Voltar</button>
              </div>
              <div className="space-y-4">
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
                  <input
                    type="tel"
                    value={simplesLookupWhatsapp}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "").slice(0, 11);
                      let masked = raw;
                      if (raw.length > 2) masked = `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
                      else if (raw.length > 0) masked = `(${raw}`;
                      if (raw.length > 7) masked = `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7)}`;
                      setSimplesLookupWhatsapp(masked);
                    }}
                    maxLength={15}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/25 text-sm focus:outline-none focus:border-white/30"
                    placeholder="(11) 99999-9999"
                  />
                </div>
                <button
                  onClick={async () => {
                    const raw = simplesLookupWhatsapp.replace(/\D/g, "");
                    if (raw.length < 10) return;
                    setMeusAgendamentosLoading(true);
                    try {
                      const resp = await fetch(`${API_BASE}/public/${slug}/agendamentos-por-whatsapp`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ whatsapp: raw }),
                      });
                      if (resp.ok) {
                        const data = await resp.json();
                        setMeusAgendamentos(data);
                      }
                    } catch {} finally {
                      setMeusAgendamentosLoading(false);
                      setSimplesLookupDone(true);
                    }
                  }}
                  disabled={simplesLookupWhatsapp.replace(/\D/g, "").length < 10 || meusAgendamentosLoading}
                  className="w-full py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ backgroundColor: accent, color: accentText }}
                >
                  {meusAgendamentosLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar Agendamentos"}
                </button>
              </div>
            </div>
          )}

          {showMeusAgendamentos && isSimpleMode && !clientUser && simplesLookupDone && (
            <div>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-semibold">Meus Agendamentos</h2>
                  <p className="text-white/30 text-sm">Seus agendamentos futuros</p>
                </div>
                <button onClick={() => { setShowMeusAgendamentos(false); setSimplesLookupDone(false); }} className="text-sm px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition text-white/40">Voltar</button>
              </div>
              {cancelFeedback && (
                <div className={`mb-4 p-3 rounded-xl text-sm flex items-center gap-2 ${cancelFeedback.type === "success" ? "bg-green-500/10 border border-green-500/20 text-green-400" : "bg-red-500/10 border border-red-500/20 text-red-400"}`}>
                  {cancelFeedback.type === "success" ? <Check className="h-4 w-4 flex-shrink-0" /> : <AlertTriangle className="h-4 w-4 flex-shrink-0" />}
                  {cancelFeedback.message}
                  <button onClick={() => setCancelFeedback(null)} className="ml-auto underline text-xs">fechar</button>
                </div>
              )}
              {meusAgendamentos.length === 0 ? (
                <div className="text-center py-12 text-white/30">
                  <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhum agendamento futuro encontrado</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {meusAgendamentos.map((agend) => (
                    <div key={agend.id} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Scissors className="h-4 w-4 flex-shrink-0" style={{ color: accent }} />
                            <span className="font-medium text-sm truncate">{agend.servicoNome}</span>
                          </div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <User className="h-3.5 w-3.5 text-white/40 flex-shrink-0" />
                            <span className="text-xs text-white/50">{agend.profissionalNome}</span>
                          </div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <Calendar className="h-3.5 w-3.5 text-white/40 flex-shrink-0" />
                            <span className="text-xs text-white/50">
                              {new Date(agend.data + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5 text-white/40 flex-shrink-0" />
                            <span className="text-xs text-white/50">{agend.horaInicio} — {agend.horaFim}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 ml-3">
                          {cancelConfirmId === agend.id ? (
                            <div className="flex flex-col items-end gap-1.5">
                              <span className="text-[10px] text-white/40">Confirmar cancelamento?</span>
                              <div className="flex gap-1.5">
                                <button onClick={() => setCancelConfirmId(null)} disabled={cancelLoading} className="px-2.5 py-1 text-[11px] rounded-lg bg-white/5 hover:bg-white/10 transition text-white/50">Não</button>
                                <button
                                  onClick={async () => {
                                    setCancelLoading(true);
                                    try {
                                      const resp = await fetch(`${API_BASE}/public/${slug}/agendamentos/${agend.id}/cancelar-simples`, {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ whatsapp: simplesLookupWhatsapp }),
                                      });
                                      const data = await resp.json();
                                      if (resp.ok) {
                                        setCancelFeedback({ type: "success", message: data.message || "Cancelado!" });
                                        setMeusAgendamentos(prev => prev.filter(a => a.id !== agend.id));
                                      } else {
                                        setCancelFeedback({ type: "error", message: data.error || "Erro ao cancelar" });
                                      }
                                    } catch {
                                      setCancelFeedback({ type: "error", message: "Erro ao cancelar" });
                                    } finally {
                                      setCancelLoading(false);
                                      setCancelConfirmId(null);
                                    }
                                  }}
                                  disabled={cancelLoading}
                                  className="px-2.5 py-1 text-[11px] rounded-lg bg-red-500/20 hover:bg-red-500/30 transition text-red-400 flex items-center gap-1"
                                >
                                  {cancelLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Sim, cancelar"}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setCancelConfirmId(agend.id); setCancelFeedback(null); }}
                              className="flex items-center gap-1 px-2.5 py-1 text-[11px] rounded-lg bg-red-500/10 hover:bg-red-500/20 transition text-red-400"
                            >
                              <XCircle className="h-3 w-3" /> Cancelar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {showMeusAgendamentos && clientUser && (
            <div>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-semibold">Meus Agendamentos</h2>
                  <p className="text-white/30 text-sm">Seus agendamentos futuros</p>
                </div>
                <button
                  onClick={() => setShowMeusAgendamentos(false)}
                  className="text-sm px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition text-white/40"
                >
                  Voltar
                </button>
              </div>

              {cancelFeedback && (
                <div className={`mb-4 p-3 rounded-xl text-sm flex items-center gap-2 ${
                  cancelFeedback.type === "success"
                    ? "bg-green-500/10 border border-green-500/20 text-green-400"
                    : "bg-red-500/10 border border-red-500/20 text-red-400"
                }`}>
                  {cancelFeedback.type === "success" ? <Check className="h-4 w-4 flex-shrink-0" /> : <AlertTriangle className="h-4 w-4 flex-shrink-0" />}
                  {cancelFeedback.message}
                  <button onClick={() => setCancelFeedback(null)} className="ml-auto underline text-xs">fechar</button>
                </div>
              )}

              {meusAgendamentosLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-white/30" />
                </div>
              ) : meusAgendamentos.length === 0 ? (
                <div className="text-center py-12 text-white/30">
                  <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhum agendamento futuro encontrado</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {meusAgendamentos.map((agend) => (
                    <div key={agend.id} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Scissors className="h-4 w-4 flex-shrink-0" style={{ color: accent }} />
                            <span className="font-medium text-sm truncate">{agend.servicoNome}</span>
                          </div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <User className="h-3.5 w-3.5 text-white/40 flex-shrink-0" />
                            <span className="text-xs text-white/50">{agend.profissionalNome}</span>
                          </div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <Calendar className="h-3.5 w-3.5 text-white/40 flex-shrink-0" />
                            <span className="text-xs text-white/50">
                              {new Date(agend.data + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5 text-white/40 flex-shrink-0" />
                            <span className="text-xs text-white/50">{agend.horaInicio} — {agend.horaFim}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 ml-3">
                          <span className="text-sm font-bold" style={{ color: accent }}>
                            R$ {agend.valor.toFixed(2).replace(".", ",")}
                          </span>
                          {cancelConfirmId === agend.id ? (
                            <div className="flex flex-col items-end gap-1.5">
                              <span className="text-[10px] text-white/40">Confirmar cancelamento?</span>
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => setCancelConfirmId(null)}
                                  disabled={cancelLoading}
                                  className="px-2.5 py-1 text-[11px] rounded-lg bg-white/5 hover:bg-white/10 transition text-white/50"
                                >
                                  Não
                                </button>
                                <button
                                  onClick={() => handleCancelAgendamento(agend.id)}
                                  disabled={cancelLoading}
                                  className="px-2.5 py-1 text-[11px] rounded-lg bg-red-500/20 hover:bg-red-500/30 transition text-red-400 flex items-center gap-1"
                                >
                                  {cancelLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Sim, cancelar"}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setCancelConfirmId(agend.id); setCancelFeedback(null); }}
                              className="flex items-center gap-1 px-2.5 py-1 text-[11px] rounded-lg bg-red-500/10 hover:bg-red-500/20 transition text-red-400"
                            >
                              <XCircle className="h-3 w-3" /> Cancelar
                            </button>
                          )}
                        </div>
                      </div>

                      {messagingEnabled && (
                        <div className="mt-3 pt-3 border-t border-white/[0.06]">
                          <button
                            onClick={() => handleOpenMessages(agend.id)}
                            className="flex items-center gap-1.5 text-[11px] text-white/40 hover:text-white/70 transition-colors"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            {openMessageAgendId === agend.id ? "Fechar mensagens" : "Enviar mensagem ao estabelecimento"}
                          </button>

                          {openMessageAgendId === agend.id && (
                            <div className="mt-3">
                              {messageThreadLoading ? (
                                <div className="flex justify-center py-4">
                                  <Loader2 className="h-4 w-4 animate-spin text-white/30" />
                                </div>
                              ) : (
                                <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
                                  {messageThread.length === 0 ? (
                                    <p className="text-[11px] text-white/30 text-center py-2">Nenhuma mensagem ainda. Envie a primeira!</p>
                                  ) : (
                                    messageThread.map((msg, i) => (
                                      <div key={i} className={`flex ${msg.remetente === "cliente" ? "justify-end" : "justify-start"}`}>
                                        <div className={`max-w-[80%] px-3 py-2 rounded-xl text-[12px] ${
                                          msg.remetente === "cliente"
                                            ? "text-white rounded-br-none"
                                            : "bg-white/[0.06] text-white/70 rounded-bl-none"
                                        }`} style={msg.remetente === "cliente" ? { backgroundColor: accent + "33" } : {}}>
                                          <p>{msg.mensagem}</p>
                                          <p className={`text-[10px] mt-1 ${msg.remetente === "cliente" ? "text-white/40 text-right" : "text-white/30"}`}>
                                            {new Date(msg.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                          </p>
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              )}
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={newMessage}
                                  onChange={e => setNewMessage(e.target.value)}
                                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(agend.id); } }}
                                  placeholder="Digite sua mensagem..."
                                  className="flex-1 bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2 text-[12px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
                                />
                                <button
                                  onClick={() => handleSendMessage(agend.id)}
                                  disabled={!newMessage.trim() || sendingMessage}
                                  className="p-2.5 rounded-xl disabled:opacity-40 transition-opacity flex items-center justify-center"
                                  style={{ backgroundColor: accent }}
                                >
                                  {sendingMessage ? <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: accentText }} /> : <MessageCircle className="h-3.5 w-3.5" style={{ color: accentText }} />}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {barbearia.toleranciaCancelamento && barbearia.toleranciaCancelamento > 0 && (
                    <p className="text-white/20 text-[11px] text-center mt-2">
                      Cancelamentos não são permitidos com menos de {barbearia.toleranciaCancelamento} hora(s) de antecedência
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {!showMeusAgendamentos && step === "servico" && clientUser && barbearia.permitirCancelamentoCliente && (
            <button
              onClick={handleOpenMeusAgendamentos}
              className="mb-4 w-full p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/20 transition-all flex items-center gap-3 text-left"
            >
              <CalendarDays className="h-5 w-5" style={{ color: accent }} />
              <div>
                <p className="text-sm font-medium">Meus Agendamentos</p>
                <p className="text-white/30 text-[11px]">Veja ou cancele seus agendamentos</p>
              </div>
              <ChevronRight className="h-4 w-4 text-white/20 ml-auto" />
            </button>
          )}

          {step === "filial" && hasFiliais && (
            <div>
              <h2 className="text-lg font-semibold mb-1">Escolha a unidade</h2>
              <p className="text-white/30 text-sm mb-5">Em qual filial deseja agendar?</p>
              <div className="space-y-2">
                {barbearia.filiais!.map((f) => {
                  const addressParts = [f.logradouro, f.numero, f.bairro, f.cidade, f.uf].filter(Boolean);
                  const address = addressParts.join(", ");
                  return (
                    <button
                      key={f.id}
                      onClick={() => { setSelectedFilial(f); setStep("servico"); }}
                      className="w-full p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/20 transition-all text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full flex items-center justify-center border border-white/10" style={{ background: `${accent}20` }}>
                          <MapPin className="h-5 w-5" style={{ color: accent }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[15px]">{f.nome}</p>
                          {address && (
                            <p className="text-white/30 text-xs mt-0.5 truncate">{address}</p>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 text-white/20 group-hover:text-white/50 shrink-0" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {!showMeusAgendamentos && step === "servico" && (
            <div>
              <h2 className="text-lg font-semibold mb-1">Escolha o serviço</h2>
              <p className="text-white/30 text-sm mb-5">Selecione o que deseja agendar</p>
              <div className="space-y-2">
                {(() => {
                  let servicosFiltrados = barbearia.servicos;
                  if (selectedFilial) {
                    servicosFiltrados = servicosFiltrados.filter((s: any) => s.filialId === selectedFilial.id || s.filialId === null);
                  }
                  return servicosFiltrados.map((s: any) => (
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
                  ));
                })()}
              </div>
            </div>
          )}

          {!showMeusAgendamentos && step === "profissional" && (() => {
            const hasAnyLinks = barbearia.profissionais.some((p: any) => p.servicoIds && p.servicoIds.length > 0);
            let filtered = hasAnyLinks && selectedServico
              ? barbearia.profissionais.filter((p: any) => p.servicoIds && p.servicoIds.includes(selectedServico.id))
              : barbearia.profissionais;
            if (selectedFilial) {
              filtered = filtered.filter((p: any) => p.filialId === selectedFilial.id || p.filialId === null || p.semPreferencia);
            }
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

          {!showMeusAgendamentos && step === "data" && (
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

          {!showMeusAgendamentos && step === "horario" && (
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

              {barbearia?.whatsappEncaixeHabilitado && barbearia?.telefone && (() => {
                const digits = barbearia.telefone.replace(/\D/g, "");
                if (digits.length < 10) return null;
                const normalized = digits.length <= 11 ? `55${digits}` : digits;
                return (
                  <div className="mt-6 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
                    <p className="text-sm text-white/50 mb-3">Quer tentar um encaixe no WhatsApp?</p>
                    <a
                      href={`https://wa.me/${normalized}?text=${encodeURIComponent(`Olá! Gostaria de verificar a possibilidade de um encaixe. Obrigado(a)!`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
                      style={{ backgroundColor: "#25D366", color: "#fff" }}
                    >
                      <MessageCircle className="h-4 w-4" />
                      Falar no WhatsApp
                    </a>
                  </div>
                );
              })()}
            </div>
          )}

          {!showMeusAgendamentos && step === "confirmar" && selectedServico && selectedSlot && (isSimpleMode || clientUser) && (
            <div>
              <h2 className="text-lg font-semibold mb-5">Confirmar agendamento</h2>
              <div className="space-y-3 mb-6">
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  {selectedFilial && (
                    <div className="flex items-center gap-3 mb-3">
                      <MapPin className="h-4 w-4" style={{ color: accent }} />
                      <span className="text-sm font-medium">{selectedFilial.nome}</span>
                    </div>
                  )}
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

                {isSimpleMode ? (
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-4">
                    <p className="text-xs text-white/30 mb-1">Seus dados para agendamento</p>
                    <div>
                      <label className="text-white/40 text-xs font-medium mb-1.5 block">Nome *</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
                        <input
                          type="text"
                          value={simplesNome}
                          onChange={(e) => setSimplesNome(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/25 text-sm focus:outline-none focus:border-white/30"
                          placeholder="Seu nome completo"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-white/40 text-xs font-medium mb-1.5 block">WhatsApp *</label>
                      <div className="relative">
                        <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
                        <input
                          type="tel"
                          value={simplesWhatsapp}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\D/g, "").slice(0, 11);
                            let masked = raw;
                            if (raw.length > 2) masked = `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
                            else if (raw.length > 0) masked = `(${raw}`;
                            if (raw.length > 7) masked = `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7)}`;
                            setSimplesWhatsapp(masked);
                          }}
                          maxLength={15}
                          className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/25 text-sm focus:outline-none focus:border-white/30"
                          placeholder="(11) 99999-9999"
                          required
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {clientUser && (
                      <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                        <p className="text-xs text-white/30 mb-1">Agendando como</p>
                        <p className="text-sm font-medium">{clientUser.nome}</p>
                        <p className="text-xs text-white/40">{clientUser.email}</p>
                      </div>
                    )}
                    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <label className="text-white/40 text-xs font-medium mb-1.5 block">WhatsApp *</label>
                      <div className="relative">
                        <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
                        <input
                          type="tel"
                          value={comLoginWhatsapp}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\D/g, "").slice(0, 11);
                            let masked = raw;
                            if (raw.length > 2) masked = `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
                            else if (raw.length > 0) masked = `(${raw}`;
                            if (raw.length > 7) masked = `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7)}`;
                            setComLoginWhatsapp(masked);
                          }}
                          maxLength={15}
                          className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/25 text-sm focus:outline-none focus:border-white/30"
                          placeholder="(11) 99999-9999"
                          required
                        />
                      </div>
                    </div>
                  </>
                )}
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

              {(selectedServico as any)?.exigeSinal === true && (
                <div className="mb-6 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-3">
                  <p className="text-xs font-medium text-white/60">Forma de pagamento do sinal</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { v: "PIX", label: "PIX" },
                      { v: "BOLETO", label: "Boleto" },
                      { v: "CREDIT_CARD", label: "Cartão" },
                    ].map(opt => (
                      <button
                        key={opt.v} type="button"
                        onClick={() => setSinalBillingType(opt.v as any)}
                        className={`py-2 rounded-lg text-xs font-medium transition-all ${
                          sinalBillingType === opt.v ? "ring-2 text-white" : "bg-white/5 text-white/60 hover:bg-white/10"
                        }`}
                        style={sinalBillingType === opt.v ? { backgroundColor: accent, color: accentText } : {}}
                      >{opt.label}</button>
                    ))}
                  </div>
                  {(sinalBillingType === "BOLETO" || sinalBillingType === "CREDIT_CARD") && (
                    <input
                      type="text" value={payerCpfCnpj}
                      onChange={e => setPayerCpfCnpj(e.target.value.replace(/\D/g, "").slice(0, 14))}
                      maxLength={14} placeholder="CPF ou CNPJ (apenas números)"
                      className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-white/30"
                    />
                  )}
                </div>
              )}

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

          {!showMeusAgendamentos && step === "sucesso" && (
            <div className="text-center py-12">
              {bookingStatus === "pendente_aprovacao" ? (
                <>
                  <div className="h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-5 bg-yellow-500/20">
                    <Clock className="h-8 w-8 text-yellow-400" />
                  </div>
                  <h2 className="text-xl font-bold mb-2">Pedido Enviado!</h2>
                  <p className="text-yellow-400/90 text-sm mb-3 px-4">
                    Aguardando confirmação do estabelecimento. Você será avisado(a) assim que for aprovado.
                  </p>
                </>
              ) : (
                <>
                  <div className="h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ backgroundColor: `${accent}20` }}>
                    <Check className="h-8 w-8" style={{ color: accent }} />
                  </div>
                  <h2 className="text-xl font-bold mb-2">Agendamento Confirmado!</h2>
                </>
              )}
              <p className="text-white/40 text-sm mb-2">
                {selectedServico?.nome} com {selectedSlot?.profissionalNome}
                {selectedFilial ? ` - ${selectedFilial.nome}` : ""}
              </p>
              <p className="text-white/40 text-sm mb-6">
                {selectedDate && new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })} às {selectedSlot?.horaInicio}
              </p>

              {sinalPagamento && (
                <div className="text-left bg-white/5 rounded-xl p-4 mb-6">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-white">
                    <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                    Pague o sinal para confirmar
                  </h3>
                  <SinalBox
                    pagamento={sinalPagamento}
                    statusUrl={agendamentoCriadoId && sinalConsultaToken ? `${API_BASE}/asaas-sinal/agendamento/${agendamentoCriadoId}/status?token=${encodeURIComponent(sinalConsultaToken)}` : undefined}
                    accentColor={accent}
                  />
                </div>
              )}
              {!isInstalled && (
                <div className="mb-4">
                  <InstallAppButton
                    nome={barbearia?.nome}
                    logoUrl={barbearia?.logoUrl}
                logoPadrao={defaultLogoUrl(barbearia?.tipoEstabelecimento)}
                    accentColor={accent}
                    variant="default"
                    className="px-6 py-2.5 rounded-xl text-sm font-medium"
                  />
                </div>
              )}
              <button
                onClick={() => {
                  setStep(hasFiliais ? "filial" : "servico");
                  setSelectedFilial(null);
                  setSelectedServico(null);
                  setSelectedProfissional(null);
                  setSelectedDate("");
                  setSelectedSlot(null);
                  setObservacao("");
                  setSimplesNome("");
                  setSimplesWhatsapp("");
                  setComLoginWhatsapp("");
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

      {!isSimpleMode && (
        <ClientAuthModal
          open={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onAuthenticated={handleClientAuth}
          accentColor={accent}
        />
      )}

    </div>
  );
}

function SinalBox({ pagamento, statusUrl, accentColor }: { pagamento: any; statusUrl?: string; accentColor: string }) {
  const [copied, setCopied] = useState(false);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    if (!statusUrl || paid) return;
    let stop = false;
    const tick = async () => {
      try {
        const res = await fetch(statusUrl);
        if (!res.ok) return;
        const data = await res.json();
        if (!stop && data?.paid) setPaid(true);
      } catch {}
    };
    tick();
    const id = setInterval(tick, 3000);
    return () => { stop = true; clearInterval(id); };
  }, [statusUrl, paid]);

  if (paid) {
    return (
      <div className="text-center py-4">
        <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-2">
          <Check className="h-6 w-6 text-green-400" />
        </div>
        <p className="text-green-400 font-medium text-sm">Sinal recebido — agendamento garantido!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-white/60">Valor do sinal · {pagamento.billingType === "BOLETO" ? "Boleto" : pagamento.billingType === "CREDIT_CARD" ? "Cartão" : "Pix"}</span>
        <span className="text-lg font-bold text-white">R$ {Number(pagamento.valor).toFixed(2).replace(".", ",")}</span>
      </div>
      {pagamento.bankSlipUrl && (
        <a href={pagamento.bankSlipUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-semibold"
          style={{ backgroundColor: accentColor, color: "#000" }}>
          <ExternalLink className="h-3.5 w-3.5" /> Abrir boleto
        </a>
      )}
      {pagamento.pixQrCodeBase64 && (
        <div className="bg-white rounded-lg p-3 flex items-center justify-center">
          <img src={`data:image/png;base64,${pagamento.pixQrCodeBase64}`} alt="QR Pix" className="w-48 h-48 object-contain" />
        </div>
      )}
      {pagamento.pixCopyPaste && (
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-wide text-white/50">Pix copia e cola</p>
          <div className="flex gap-1.5">
            <input readOnly value={pagamento.pixCopyPaste}
              className="flex-1 text-[11px] px-2 py-1.5 rounded bg-black/30 border border-white/10 text-white/80 truncate" />
            <button
              onClick={async () => { try { await navigator.clipboard.writeText(pagamento.pixCopyPaste); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {} }}
              className="px-2.5 py-1.5 rounded text-[11px] font-semibold flex items-center gap-1"
              style={{ backgroundColor: accentColor, color: "#000" }}>
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copiado" : "Copiar"}
            </button>
          </div>
        </div>
      )}
      {pagamento.invoiceUrl && (
        <a href={pagamento.invoiceUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-white/10 text-xs text-white/80">
          <ExternalLink className="h-3.5 w-3.5" /> Abrir página de pagamento
        </a>
      )}
      <div className="flex items-center justify-center gap-1.5 text-[11px] text-white/50">
        <Loader2 className="h-3 w-3 animate-spin" /> Aguardando pagamento…
      </div>
    </div>
  );
}
