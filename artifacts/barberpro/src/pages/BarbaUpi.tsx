import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Scissors,
  CalendarDays,
  Users,
  BarChart3,
  DollarSign,
  Award,
  Package,
  MessageSquare,
  Star,
  ChevronDown,
  Check,
  ArrowRight,
  Shield,
  Zap,
  Menu,
  X,
  Loader2,
  Sparkles,
  Clock,
  TrendingUp,
  ChevronRight,
  Flame,
  Smartphone,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiUrl } from "@/lib/utils";
import { initTracking, trackLead, trackInitiateCheckout } from "@/lib/tracking";

const BARBA_UPI_SOURCE = "barba-upi";

const GLOWUPI_BASE_URL = (() => {
  const base = import.meta.env.BASE_URL || "/";
  return base.replace(/\/$/, "");
})();

const PRICING_MODE_ENDPOINT = `${import.meta.env.BASE_URL}api/checkout/pricing-config`.replace(/\/\//g, "/");

interface PriceInfo {
  id: string;
  unit_amount: number;
  currency: string;
  recurring: any;
  metadata: any;
}

interface ProductInfo {
  id: string;
  name: string;
  description: string;
  metadata: any;
  prices: PriceInfo[];
}

const TIERS_META: Record<string, { label: string; popular?: boolean }> = {
  "1_pro":       { label: "1 Barbeiro" },
  "2_5_pro":     { label: "2 a 5 Barbeiros" },
  "6_15_pro":    { label: "6 a 15 Barbeiros", popular: true },
  "15_plus_pro": { label: "+15 Barbeiros" },
};
const TIER_ORDER = ["1_pro", "2_5_pro", "6_15_pro", "15_plus_pro"];

const FEATURES = [
  { icon: CalendarDays, title: "Agenda para Barbeiro", desc: "Gerencie cortes, barbas e horários de pico com facilidade total" },
  { icon: Users, title: "Gestão de Clientes", desc: "Histórico de cortes, preferências de estilo e programa de fidelidade" },
  { icon: DollarSign, title: "Controle Financeiro", desc: "Faturamento, comissões e fluxo de caixa em tempo real" },
  { icon: Package, title: "Pacotes de Serviços", desc: "Crie pacotes promocionais: corte + barba + navalhação" },
  { icon: Award, title: "Clube de Fidelidade", desc: "Sistema de pontos que faz o cliente voltar toda semana" },
  { icon: BarChart3, title: "Relatórios por Barbeiro", desc: "Saiba quem produz mais e qual serviço dá mais lucro" },
  { icon: MessageSquare, title: "Lembretes Automáticos", desc: "Notificações de retorno e campanhas promocionais no piloto automático" },
  { icon: Star, title: "Avaliações", desc: "Colete feedback dos clientes e construa sua reputação online" },
  { icon: Smartphone, title: "App com sua Marca", desc: "Seu logo, suas cores. Clientes acham que você investiu fortunas" },
];

const FAQ_ITEMS = [
  { q: "Como funciona a assinatura?", a: "Escolha o plano ideal para o tamanho da sua barbearia e assine diretamente. O acesso é liberado imediatamente após o pagamento." },
  { q: "Preciso instalar algum software?", a: "Não! A Barba Upi funciona 100% online, direto no navegador do celular, tablet ou computador. Você também pode adicionar na tela inicial do celular." },
  { q: "Como funciona o pagamento?", a: "O pagamento é feito via cartão de crédito, processado de forma segura. Você pode cancelar a qualquer momento, sem multa." },
  { q: "Posso trocar de plano depois?", a: "Claro! Você pode fazer upgrade ou downgrade do plano a qualquer momento, e o valor é ajustado proporcionalmente." },
  { q: "Funciona para barbearia com mais de um barbeiro?", a: "Sim! Temos planos para 1, 2 a 5, 6 a 15 e mais de 15 barbeiros. Cada profissional tem seu próprio acesso e agenda." },
  { q: "Meus dados estão seguros?", a: "100%! Usamos criptografia de ponta e servidores seguros para proteger todas as informações da sua barbearia e clientes." },
];

const TESTIMONIALS = [
  { name: "Rafael Souza", role: "Dono de Barbearia", text: "Minha agenda era uma bagunça. Os caras ligavam toda hora perguntando horário. Agora eles agendam pelo app e eu só atendo. Virou outra barbearia." },
  { name: "Diego Carvalho", role: "Barbeiro Autônomo", text: "O controle financeiro me abriu o olho. Eu trabalhava muito e não sabia onde o dinheiro sumia. Hoje minha barbearia é muito mais lucrativa." },
  { name: "Marcos Alves", role: "Proprietário de Barbearia", text: "Com o clube de fidelidade, meus clientes voltam muito mais. A taxa de retorno aumentou 40% em 3 meses. Recomendo pra todo barbeiro." },
];

const ANTES_DEPOIS = [
  { antes: "Agenda no caderno ou papel", depois: "Agenda digital profissional" },
  { antes: "WhatsApp lotado de 'que horário tem?'", depois: "Cliente agenda sozinho, 24h" },
  { antes: "Não sabe quanto faturou no mês", depois: "Dashboard financeiro em tempo real" },
  { antes: "Cliente some sem avisar", depois: "Lembretes automáticos reduzem faltas" },
  { antes: "Sem controle de comissões", depois: "Comissões calculadas automaticamente" },
  { antes: "Perde clientes para o concorrente", depois: "Fidelidade que faz cliente voltar sempre" },
];

const STATS = [
  { value: "500+", label: "Barbearias ativas" },
  { value: "50k+", label: "Atendimentos realizados" },
  { value: "4.9", label: "Nota de satisfação" },
  { value: "60%", label: "Menos faltas com lembretes" },
];

type BillingPeriod = "mensal" | "semestral" | "anual";

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function useScrolled(threshold = 20) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > threshold);
    window.addEventListener("scroll", handler, { passive: true });
    handler();
    return () => window.removeEventListener("scroll", handler);
  }, [threshold]);
  return scrolled;
}

function useInView(options?: IntersectionObserverInit) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.1, ...options }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, inView };
}

function AnimatedSection({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(32px)",
        transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

function SpotsCounter() {
  const [spots] = useState(() => {
    try {
      const stored = localStorage.getItem("barba_upi_spots");
      if (stored) return parseInt(stored);
      const val = Math.floor(Math.random() * 12) + 8;
      localStorage.setItem("barba_upi_spots", String(val));
      return val;
    } catch {
      return 12;
    }
  });
  return (
    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-400">
      <Flame className="h-4 w-4 animate-pulse" />
      <span className="text-sm font-bold">Apenas {spots} vagas com desconto nesta semana</span>
    </div>
  );
}

export default function BarbaUpi() {
  const [period, setPeriod] = useState<BillingPeriod>("anual");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [pricingMode, setPricingMode] = useState<string>("all_plans");
  const [stripeProducts, setStripeProducts] = useState<ProductInfo[]>([]);
  const [isLoadingCheckout, setIsLoadingCheckout] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [authenticating, setAuthenticating] = useState(false);
  const scrolled = useScrolled();

  useEffect(() => {
    fetch(PRICING_MODE_ENDPOINT)
      .then((r) => r.json())
      .then((data) => {
        if (data.pricingMode) setPricingMode(data.pricingMode);
        if (data.products) setStripeProducts(data.products);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get("token");
    if (tokenFromUrl) {
      setAuthToken(tokenFromUrl);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (!authToken) {
      fetch(apiUrl("/auth/me"), { credentials: "include" })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.id) setAuthToken("session-active");
        })
        .catch(() => {});
    }
  }, [authToken]);

  useEffect(() => {
    if (!authToken) return;
    if (stripeProducts.length === 0) return;
    const pendingRaw = sessionStorage.getItem("barba_upi_pending_plan");
    if (!pendingRaw) return;
    let pending: { tier?: string; period?: BillingPeriod };
    try {
      pending = JSON.parse(pendingRaw);
    } catch {
      sessionStorage.removeItem("barba_upi_pending_plan");
      return;
    }
    if (!pending.tier || !pending.period) {
      sessionStorage.removeItem("barba_upi_pending_plan");
      return;
    }
    proceedToCheckout(pending.tier, pending.period).then((started) => {
      if (started) sessionStorage.removeItem("barba_upi_pending_plan");
    });
  }, [authToken, stripeProducts]);

  useEffect(() => {
    const utm = new URLSearchParams(window.location.search);
    if (!utm.get("utm_source")) {
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set("utm_source", BARBA_UPI_SOURCE);
      newUrl.searchParams.set("utm_medium", "landing");
      window.history.replaceState({}, "", newUrl.toString());
    }
    initTracking();

    const prevTitle = document.title;
    document.title = "Barba Upi — Sistema de Gestão para Barbearias";

    const setMeta = (name: string, content: string, attr = "name") => {
      let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.content = content;
      return el;
    };

    const metaDescription = setMeta("description", "Sistema completo para barbearias: agenda online, controle financeiro, clube de fidelidade e relatórios. Mais de 500 barbearias já usam a Barba Upi.");
    const ogTitle = setMeta("og:title", "Barba Upi — Sistema de Gestão para Barbearias", "property");
    const ogDesc = setMeta("og:description", "Agenda online, controle financeiro, clube de fidelidade — tudo que sua barbearia precisa em um só lugar.", "property");
    const ogType = setMeta("og:type", "website", "property");
    const ogUrl = setMeta("og:url", window.location.href, "property");

    return () => {
      document.title = prevTitle;
      [metaDescription, ogTitle, ogDesc, ogType, ogUrl].forEach(el => el?.remove());
    };
  }, []);

  const redirectToGoogleAuth = (tier: string, billingPeriod: BillingPeriod) => {
    sessionStorage.setItem("barba_upi_pending_plan", JSON.stringify({ tier, period: billingPeriod }));
    setAuthenticating(true);
    const returnUrl = encodeURIComponent(window.location.origin + GLOWUPI_BASE_URL + "/barba-upi");
    window.location.href = apiUrl(`/auth/google/signin-popup?return_url=${returnUrl}`);
  };

  const proceedToCheckout = async (tier: string, billingPeriod: BillingPeriod): Promise<boolean> => {
    const product = stripeProducts.find((p) => p.metadata?.tier === tier);
    if (!product) return false;
    const price = product.prices.find((p) => p.metadata?.period === billingPeriod);
    if (!price) return false;

    setIsLoadingCheckout(`${tier}-${billingPeriod}`);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (authToken && authToken !== "session-active") headers["Authorization"] = `Bearer ${authToken}`;

      const res = await fetch(apiUrl("/checkout/create-direct-session"), {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({
          priceId: price.id,
          billingPeriod,
          utmSource: BARBA_UPI_SOURCE,
          utmMedium: "landing",
          utmCampaign: "barba-upi",
        }),
      });
      const data = await res.json();
      if (data.url) {
        trackInitiateCheckout({
          valueCents: price.unit_amount || 0,
          currency: (price.currency || "brl").toUpperCase(),
          fbParams: { content_name: `barba_upi_${tier}_${billingPeriod}` },
        });
        window.location.href = data.url;
        return true;
      } else {
        alert("Erro ao iniciar pagamento: " + (data.error || "Tente novamente"));
        return false;
      }
    } catch {
      alert("Erro de conexão. Tente novamente.");
      return false;
    } finally {
      setIsLoadingCheckout(null);
    }
  };

  const handleSubscribe = async (tier: string, billingPeriod: BillingPeriod) => {
    trackLead({ fbParams: { content_name: `barba_upi_${tier}_${billingPeriod}` } });
    if (!authToken) {
      redirectToGoogleAuth(tier, billingPeriod);
      return;
    }
    await proceedToCheckout(tier, billingPeriod);
  };

  const handleLogin = () => {
    window.location.href = `${GLOWUPI_BASE_URL}/login`;
  };

  const smoothScroll = useCallback((e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const discountLabel = period === "anual" ? "30% OFF" : period === "semestral" ? "15% OFF" : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0c0f] via-[#0f1318] to-[#0a0c0f] overflow-x-hidden text-white">

      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-[#0d1117]/85 backdrop-blur-xl border-b border-white/[0.06] shadow-lg shadow-black/40"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-[1200px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3 font-bold text-[18px] tracking-tight text-white">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-500/30 to-amber-600/10 flex items-center justify-center border border-amber-500/20">
              <Scissors className="h-4.5 w-4.5 text-amber-400" style={{ width: 18, height: 18 }} />
            </div>
            <span>Barba <span className="text-amber-400">Upi</span></span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" onClick={(e) => smoothScroll(e, "features")} className="text-[13px] text-white/50 hover:text-white transition-colors font-medium">Funcionalidades</a>
            <a href="#pricing" onClick={(e) => smoothScroll(e, "pricing")} className="text-[13px] text-white/50 hover:text-white transition-colors font-medium">Preços</a>
            <a href="#testimonials" onClick={(e) => smoothScroll(e, "testimonials")} className="text-[13px] text-white/50 hover:text-white transition-colors font-medium">Depoimentos</a>
            <a href="#faq" onClick={(e) => smoothScroll(e, "faq")} className="text-[13px] text-white/50 hover:text-white transition-colors font-medium">FAQ</a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={handleLogin} className="text-[13px] h-9 px-4 text-white/60 hover:text-white hover:bg-white/10 font-medium">
              Entrar
            </Button>
            <a href="#pricing" onClick={(e) => smoothScroll(e, "pricing")}>
              <Button size="sm" className="text-[13px] h-9 px-5 rounded-full font-semibold shadow-md bg-amber-500 hover:bg-amber-400 text-black border-0">
                Assinar Agora
              </Button>
            </a>
          </div>

          <button className="md:hidden p-2 -mr-2 text-white/70" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <>
            <div className="fixed inset-0 top-14 bg-black/60 backdrop-blur-sm z-40 md:hidden" onClick={() => setMobileMenuOpen(false)} />
            <div className="fixed top-14 left-0 right-0 z-50 md:hidden bg-[#0d1117] border-b border-white/[0.06] px-6 pb-6 pt-2 space-y-1 shadow-xl">
              <a href="#features" onClick={(e) => smoothScroll(e, "features")} className="block py-3 text-[15px] text-white/70 font-medium border-b border-white/[0.06]">Funcionalidades</a>
              <a href="#pricing" onClick={(e) => smoothScroll(e, "pricing")} className="block py-3 text-[15px] text-white/70 font-medium border-b border-white/[0.06]">Preços</a>
              <a href="#testimonials" onClick={(e) => smoothScroll(e, "testimonials")} className="block py-3 text-[15px] text-white/70 font-medium border-b border-white/[0.06]">Depoimentos</a>
              <a href="#faq" onClick={(e) => smoothScroll(e, "faq")} className="block py-3 text-[15px] text-white/70 font-medium border-b border-white/[0.06]">FAQ</a>
              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={handleLogin} className="flex-1 h-11 rounded-full text-[14px] border-white/10 text-white/70 hover:bg-white/10">Entrar</Button>
                <a href="#pricing" onClick={(e) => smoothScroll(e, "pricing")} className="flex-1">
                  <Button className="w-full h-11 rounded-full text-[14px] bg-amber-500 hover:bg-amber-400 text-black border-0">Assinar Agora</Button>
                </a>
              </div>
            </div>
          </>
        )}
      </nav>

      <section className="pt-28 md:pt-36 pb-16 md:pb-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.06] via-transparent to-amber-600/[0.03]" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/[0.04] rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-[900px] mx-auto text-center relative">
          <AnimatedSection>
            <SpotsCounter />
          </AnimatedSection>

          <AnimatedSection delay={80}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/15 text-amber-400 text-[13px] font-semibold mt-6 mb-6 border border-amber-500/20">
              <Scissors className="h-3.5 w-3.5" />
              Sistema de gestão para barbearias
            </div>
          </AnimatedSection>

          <AnimatedSection delay={120}>
            <h1 className="text-[34px] sm:text-[46px] lg:text-[58px] font-extrabold text-white leading-[1.06] mb-6 tracking-tight">
              Sua barbearia no{" "}
              <span className="bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 bg-clip-text text-transparent">
                próximo nível
              </span>
            </h1>
          </AnimatedSection>

          <AnimatedSection delay={180}>
            <p className="text-[16px] sm:text-[19px] text-white/55 leading-relaxed max-w-[600px] mx-auto mb-10">
              Agenda online, controle financeiro, clube de fidelidade e muito mais —
              tudo em um sistema feito para <strong className="text-white font-semibold">barbeiros e barbearias</strong>.
            </p>
          </AnimatedSection>

          <AnimatedSection delay={240}>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
              <a href="#pricing" onClick={(e) => smoothScroll(e, "pricing")}>
                <Button size="lg" className="text-[15px] px-8 h-13 rounded-full shadow-lg shadow-amber-500/20 font-bold w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-black border-0" style={{ height: 52 }}>
                  Quero minha barbearia organizada
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </a>
              <a href="#features" onClick={(e) => smoothScroll(e, "features")}>
                <Button size="lg" variant="outline" className="text-[15px] px-8 rounded-full w-full sm:w-auto border-white/[0.12] text-white/60 hover:text-white hover:border-white/[0.25] hover:bg-white/[0.05]" style={{ height: 52 }}>
                  Ver Funcionalidades
                </Button>
              </a>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px] text-white/40">
              <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-amber-400" /> Cancele quando quiser</span>
              <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-amber-400" /> 100% seguro</span>
              <span className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-amber-400" /> Acesso imediato</span>
            </div>
          </AnimatedSection>
        </div>
      </section>

      <section className="py-12 px-6 border-y border-white/[0.05] bg-white/[0.02]">
        <div className="max-w-[900px] mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((stat, i) => (
              <AnimatedSection key={i} delay={i * 70} className="text-center">
                <p className="text-[28px] sm:text-[34px] font-extrabold text-amber-400 tracking-tight">{stat.value}</p>
                <p className="text-[13px] text-white/40 font-medium mt-1">{stat.label}</p>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28 px-6">
        <div className="max-w-[900px] mx-auto">
          <AnimatedSection className="text-center mb-12">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/15 text-red-400 text-[12px] font-semibold mb-4 uppercase tracking-wider border border-red-500/20">
              O problema
            </div>
            <h2 className="text-[26px] sm:text-[34px] lg:text-[40px] font-extrabold text-white leading-tight tracking-tight">
              Você se identifica com alguma dessas situações?
            </h2>
          </AnimatedSection>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { icon: Clock, title: "WhatsApp cheio de 'que horário tem?'", desc: "Cada mensagem te tira do cliente. Você responde, o cara não vem e você ainda perdeu o tempo de outro." },
              { icon: TrendingUp, title: "Não sabe quanto faturou no mês", desc: "Trabalha feito louco e quando olha o dinheiro, não sobrou nada. Sem controle de comissões e despesas." },
              { icon: Users, title: "Cliente marca e não aparece", desc: "Fura sem avisar. Você fica esperando com o posto vazio, perdendo dinheiro toda semana." },
            ].map((dor, i) => (
              <AnimatedSection key={i} delay={i * 80}>
                <div className="p-6 rounded-2xl bg-red-500/[0.04] border border-red-500/[0.08] hover:border-red-500/[0.15] transition-all h-full">
                  <div className="h-10 w-10 rounded-xl bg-red-500/10 flex items-center justify-center mb-4">
                    <dor.icon className="h-5 w-5 text-red-400" />
                  </div>
                  <h3 className="text-[15px] font-bold text-white mb-2">{dor.title}</h3>
                  <p className="text-white/40 text-[14px] leading-relaxed">{dor.desc}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="py-24 md:py-32 px-6 bg-white/[0.02]">
        <div className="max-w-[1100px] mx-auto">
          <AnimatedSection className="text-center mb-16">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-400 text-[12px] font-semibold mb-4 uppercase tracking-wider border border-amber-500/20">
              Funcionalidades
            </div>
            <h2 className="text-[28px] sm:text-[36px] lg:text-[42px] font-extrabold text-white leading-tight mb-4 tracking-tight">
              Tudo que sua barbearia precisa
            </h2>
            <p className="text-white/45 text-[16px] sm:text-[18px] max-w-[520px] mx-auto">
              Ferramentas pensadas para a rotina do barbeiro e do dono de barbearia
            </p>
          </AnimatedSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((feature, i) => (
              <AnimatedSection key={i} delay={i * 55}>
                <div className="group p-6 rounded-2xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.06] hover:border-amber-500/[0.15] hover:shadow-xl hover:shadow-amber-500/5 transition-all duration-300 h-full">
                  <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/5 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-300">
                    <feature.icon className="h-5 w-5 text-amber-400" />
                  </div>
                  <h3 className="text-[15px] font-bold text-white mb-2">{feature.title}</h3>
                  <p className="text-white/45 text-[14px] leading-relaxed">{feature.desc}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 md:py-32 px-6">
        <div className="max-w-[800px] mx-auto">
          <AnimatedSection className="text-center mb-14">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-400 text-[12px] font-semibold mb-4 uppercase tracking-wider border border-amber-500/20">
              Transformação
            </div>
            <h2 className="text-[26px] sm:text-[34px] lg:text-[40px] font-extrabold text-white leading-tight tracking-tight">
              Antes vs. Depois da Barba Upi
            </h2>
          </AnimatedSection>

          <div className="space-y-3">
            {ANTES_DEPOIS.map((item, i) => (
              <AnimatedSection key={i} delay={i * 50}>
                <div className="grid grid-cols-[1fr,auto,1fr] items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-red-500/15 flex items-center justify-center flex-shrink-0">
                      <span className="text-red-400 text-[10px] sm:text-xs font-bold">✕</span>
                    </div>
                    <span className="text-[12px] sm:text-[14px] text-white/40 line-through">{item.antes}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-amber-400 flex-shrink-0" />
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                      <Check className="h-3 w-3 text-amber-400" />
                    </div>
                    <span className="text-[12px] sm:text-[14px] text-white/80 font-medium">{item.depois}</span>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      <section id="testimonials" className="py-24 md:py-32 px-6 bg-white/[0.02]">
        <div className="max-w-[1100px] mx-auto">
          <AnimatedSection className="text-center mb-14">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-400 text-[12px] font-semibold mb-4 uppercase tracking-wider border border-amber-500/20">
              Depoimentos
            </div>
            <h2 className="text-[28px] sm:text-[36px] lg:text-[42px] font-extrabold text-white leading-tight tracking-tight">
              O que os barbeiros dizem
            </h2>
          </AnimatedSection>

          <div className="grid md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <AnimatedSection key={i} delay={i * 100}>
                <div className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-7 h-full flex flex-col hover:bg-white/[0.07] hover:border-amber-500/[0.12] hover:shadow-lg hover:shadow-amber-500/5 transition-all duration-300">
                  <div className="flex gap-0.5 mb-5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-white/55 text-[14px] leading-relaxed mb-6 flex-1">"{t.text}"</p>
                  <div className="flex items-center gap-3 pt-4 border-t border-white/[0.06]">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-500/25 to-amber-600/5 flex items-center justify-center text-amber-400 font-bold text-[14px]">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-white">{t.name}</p>
                      <p className="text-[12px] text-white/40">{t.role}</p>
                    </div>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {pricingMode !== "hidden" && (
        <section id="pricing" className="py-24 md:py-32 px-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.04] via-transparent to-amber-600/[0.02]" />
          <div className="max-w-[1100px] mx-auto relative">
            <AnimatedSection className="text-center mb-14">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-400 text-[12px] font-semibold mb-4 uppercase tracking-wider border border-amber-500/20">
                Preços
              </div>
              <h2 className="text-[28px] sm:text-[36px] lg:text-[42px] font-extrabold text-white leading-tight mb-4 tracking-tight">
                Escolha o plano da sua barbearia
              </h2>
              <p className="text-white/45 text-[16px] sm:text-[18px] max-w-[500px] mx-auto">
                Planos flexíveis para barbearias de todos os tamanhos
              </p>
            </AnimatedSection>

            {authenticating && (
              <div className="flex items-center justify-center gap-3 mb-8 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 max-w-md mx-auto">
                <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
                <span className="text-[14px] text-white/70">Autenticando com Google...</span>
              </div>
            )}

            {pricingMode === "single_price" ? (
              (() => {
                const singleProduct = stripeProducts[0];
                const singlePrice = singleProduct?.prices.find((p) => p.metadata?.period === "mensal");
                const singleAmount = singlePrice?.unit_amount ?? 9700;
                return (
                  <AnimatedSection className="max-w-sm mx-auto">
                    <div className="rounded-3xl bg-white/[0.05] border border-amber-500/20 p-8 text-center shadow-xl shadow-black/20 backdrop-blur-sm">
                      <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/15 text-amber-400 text-xs font-semibold mb-5">
                        <Zap className="h-3 w-3" /> PLANO ÚNICO
                      </div>
                      <h3 className="text-lg font-bold text-white mb-1.5">Acesso Completo</h3>
                      <p className="text-white/45 text-sm mb-6">Todas as funcionalidades, sem limites</p>
                      <div className="mb-8">
                        <span className="text-sm text-white/40">R$</span>
                        <span className="text-5xl font-extrabold text-white ml-1 tracking-tight">
                          {formatBRL(singleAmount).split(",")[0]}
                        </span>
                        <span className="text-white/40">,{formatBRL(singleAmount).split(",")[1]}/mês</span>
                      </div>
                      <ul className="text-left space-y-3 mb-8">
                        {["Barbeiros ilimitados", "Agenda completa", "Controle financeiro", "Pacotes de serviços", "Clube de fidelidade", "Relatórios avançados", "Suporte prioritário"].map(f => (
                          <li key={f} className="flex items-center gap-2.5 text-sm text-white/60">
                            <Check className="h-4 w-4 text-amber-400 flex-shrink-0" /> {f}
                          </li>
                        ))}
                      </ul>
                      <Button
                        className="w-full h-12 text-[14px] font-semibold rounded-full shadow-lg bg-amber-500 hover:bg-amber-400 text-black border-0 shadow-amber-500/20"
                        onClick={() => handleSubscribe("single", "mensal")}
                        disabled={isLoadingCheckout === "single-mensal" || authenticating}
                      >
                        {isLoadingCheckout === "single-mensal" ? (
                          <><Loader2 className="h-4 w-4 animate-spin mr-2" />Redirecionando...</>
                        ) : (
                          <>Assinar Agora <ArrowRight className="ml-2 h-4 w-4" /></>
                        )}
                      </Button>
                      <p className="text-[11px] text-white/30 mt-3">Cancele a qualquer momento</p>
                    </div>
                  </AnimatedSection>
                );
              })()
            ) : (
              <>
                <div className="flex justify-center mb-10">
                  <div className="inline-flex rounded-full p-1 bg-white/[0.06] border border-white/[0.08]">
                    {(["mensal", "semestral", "anual"] as BillingPeriod[]).map((p) => (
                      <button
                        key={p}
                        className={`px-5 py-2 rounded-full text-[13px] font-medium transition-all duration-200 ${
                          period === p
                            ? "bg-amber-500 text-black shadow-md"
                            : "text-white/50 hover:text-white"
                        }`}
                        onClick={() => setPeriod(p)}
                      >
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                        {p === "anual" && <span className="ml-1.5 text-[10px] font-bold opacity-80">-30%</span>}
                        {p === "semestral" && <span className="ml-1.5 text-[10px] font-bold opacity-80">-15%</span>}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-[1050px] mx-auto">
                  {TIER_ORDER.map((tierKey, idx) => {
                    const meta = TIERS_META[tierKey];
                    if (!meta) return null;
                    const product = stripeProducts.find((p) => p.metadata?.tier === tierKey);
                    const priceObj = product?.prices.find((p) => p.metadata?.period === period);
                    const mensalObj = product?.prices.find((p) => p.metadata?.period === "mensal");
                    const priceValue = priceObj?.unit_amount;
                    const originalPrice = mensalObj?.unit_amount;
                    if (priceValue === undefined || priceValue === null) return null;
                    const isPopular = !!meta.popular;
                    const loadingKey = `${tierKey}-${period}`;

                    const totalUnits = priceObj?.metadata?.total_amount
                      ? parseInt(priceObj.metadata.total_amount, 10)
                      : undefined;

                    return (
                      <AnimatedSection key={tierKey} delay={idx * 80}>
                        <div
                          className={`rounded-2xl p-6 flex flex-col relative transition-all duration-300 h-full ${
                            isPopular
                              ? "bg-amber-500/[0.08] border-2 border-amber-500/50 shadow-xl shadow-amber-500/10"
                              : "bg-white/[0.04] border border-white/[0.08] hover:border-amber-500/[0.2] hover:bg-white/[0.06] hover:shadow-xl hover:shadow-black/20"
                          }`}
                        >
                          {discountLabel && (
                            <div className="absolute -top-2.5 right-4 bg-amber-400 text-black text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                              {discountLabel}
                            </div>
                          )}
                          {isPopular && (
                            <div className="absolute -top-2.5 left-4 bg-amber-500 text-black text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                              POPULAR
                            </div>
                          )}

                          <h3 className="font-bold text-[15px] text-white mt-2">{meta.label}</h3>

                          <div className="mt-4 mb-1">
                            <span className="text-xs text-white/40">R$</span>
                            <span className="text-[32px] font-extrabold text-white ml-0.5 tracking-tight">
                              {formatBRL(priceValue).split(",")[0]}
                            </span>
                            <span className="text-white/40 text-sm">,{formatBRL(priceValue).split(",")[1]}/mês</span>
                          </div>

                          {period !== "mensal" && originalPrice !== undefined && (
                            <p className="text-xs text-white/30 line-through mb-0.5">
                              R$ {formatBRL(originalPrice)}/mês
                            </p>
                          )}

                          {period !== "mensal" && totalUnits !== undefined && (
                            <p className="text-xs text-white/40 mb-4">
                              Total: R$ {formatBRL(totalUnits)}
                            </p>
                          )}

                          {(period === "mensal" || totalUnits === undefined) && <div className="mb-4" />}

                          <Button
                            className={`w-full mt-auto h-11 text-[13px] font-semibold rounded-full ${
                              isPopular
                                ? "bg-amber-500 hover:bg-amber-400 text-black border-0 shadow-md shadow-amber-500/20"
                                : "border-white/[0.15] text-white/80 hover:bg-white/[0.08] hover:text-white"
                            }`}
                            variant={isPopular ? "default" : "outline"}
                            onClick={() => handleSubscribe(tierKey, period)}
                            disabled={isLoadingCheckout === loadingKey || authenticating}
                          >
                            {isLoadingCheckout === loadingKey ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Redirecionando...
                              </>
                            ) : (
                              "Assinar"
                            )}
                          </Button>

                          <p className="text-[11px] text-center text-white/30 mt-2">
                            {period === "anual"
                              ? "Em até 12x s/ juros"
                              : period === "semestral"
                              ? "Em até 6x s/ juros"
                              : "Renovação automática mensal • Cancele quando quiser"}
                          </p>
                        </div>
                      </AnimatedSection>
                    );
                  })}
                </div>
              </>
            )}

            <AnimatedSection className="mt-10 text-center">
              <p className="text-[13px] text-white/30">
                Todos os planos incluem agenda completa, controle financeiro, clube de fidelidade e suporte dedicado.
              </p>
            </AnimatedSection>
          </div>
        </section>
      )}

      <section id="faq" className="py-24 md:py-32 px-6">
        <div className="max-w-[640px] mx-auto">
          <AnimatedSection className="text-center mb-14">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-400 text-[12px] font-semibold mb-4 uppercase tracking-wider border border-amber-500/20">
              FAQ
            </div>
            <h2 className="text-[28px] sm:text-[36px] lg:text-[42px] font-extrabold text-white leading-tight tracking-tight">
              Perguntas Frequentes
            </h2>
          </AnimatedSection>

          <div className="space-y-2.5">
            {FAQ_ITEMS.map((item, i) => (
              <AnimatedSection key={i} delay={i * 50}>
                <div className="rounded-2xl bg-white/[0.04] border border-white/[0.06] overflow-hidden hover:border-amber-500/[0.15] transition-colors">
                  <button
                    className="w-full px-6 py-5 flex items-center justify-between text-left"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  >
                    <span className="font-semibold text-white text-[14px] pr-4">{item.q}</span>
                    <ChevronDown
                      className={`h-4 w-4 text-white/30 transition-transform duration-300 shrink-0 ${
                        openFaq === i ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  <div
                    className="overflow-hidden transition-all duration-300"
                    style={{
                      maxHeight: openFaq === i ? "500px" : "0px",
                      opacity: openFaq === i ? 1 : 0,
                    }}
                  >
                    <div className="px-6 pb-5 text-[14px] text-white/50 leading-relaxed">{item.a}</div>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 md:py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.06] via-amber-500/[0.02] to-transparent" />
        <AnimatedSection className="max-w-[640px] mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/15 text-amber-400 text-[13px] font-semibold mb-6 border border-amber-500/20">
            <Scissors className="h-3.5 w-3.5" />
            Comece hoje mesmo
          </div>
          <h2 className="text-[28px] sm:text-[36px] lg:text-[44px] font-extrabold text-white leading-tight mb-5 tracking-tight">
            Pronto para organizar<br className="hidden sm:block" /> sua barbearia?
          </h2>
          <p className="text-[16px] sm:text-[18px] text-white/45 mb-10 max-w-[480px] mx-auto">
            Mais de 500 barbearias já transformaram sua gestão com a Barba Upi. É a sua vez.
          </p>
          <a href="#pricing" onClick={(e) => smoothScroll(e, "pricing")}>
            <Button size="lg" className="text-[15px] px-10 rounded-full shadow-lg shadow-amber-500/20 font-bold bg-amber-500 hover:bg-amber-400 text-black border-0" style={{ height: 52 }}>
              Assinar Agora
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </a>
          <p className="text-[13px] text-white/30 mt-6">Cancele a qualquer momento. Sem burocracia.</p>
        </AnimatedSection>
      </section>

      <footer className="border-t border-white/[0.06] bg-white/[0.02]">
        <div className="max-w-[1100px] mx-auto px-6 py-16">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-14">
            <div>
              <div className="flex items-center gap-2.5 font-bold text-[16px] text-white mb-4">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-amber-500/25 to-amber-600/5 flex items-center justify-center border border-amber-500/20">
                  <Scissors className="h-4 w-4 text-amber-400" />
                </div>
                Barba <span className="text-amber-400 ml-1">Upi</span>
              </div>
              <p className="text-[13px] text-white/40 leading-relaxed max-w-[240px]">
                A plataforma de gestão feita para barbeiros e barbearias que querem crescer de verdade.
              </p>
            </div>

            <div>
              <h4 className="text-[13px] font-bold text-white/70 mb-4 uppercase tracking-wider">Produto</h4>
              <div className="space-y-3">
                <a href="#features" onClick={(e) => smoothScroll(e, "features")} className="block text-[13px] text-white/40 hover:text-white transition-colors">Funcionalidades</a>
                <a href="#pricing" onClick={(e) => smoothScroll(e, "pricing")} className="block text-[13px] text-white/40 hover:text-white transition-colors">Preços</a>
                <a href="#testimonials" onClick={(e) => smoothScroll(e, "testimonials")} className="block text-[13px] text-white/40 hover:text-white transition-colors">Depoimentos</a>
                <a href="#faq" onClick={(e) => smoothScroll(e, "faq")} className="block text-[13px] text-white/40 hover:text-white transition-colors">FAQ</a>
              </div>
            </div>

            <div>
              <h4 className="text-[13px] font-bold text-white/70 mb-4 uppercase tracking-wider">Conta</h4>
              <div className="space-y-3">
                <button onClick={handleLogin} className="block text-[13px] text-white/40 hover:text-white transition-colors">Entrar</button>
                <a href="#pricing" onClick={(e) => smoothScroll(e, "pricing")} className="block text-[13px] text-white/40 hover:text-white transition-colors">Assinar</a>
              </div>
            </div>

            <div>
              <h4 className="text-[13px] font-bold text-white/70 mb-4 uppercase tracking-wider">Legal</h4>
              <div className="space-y-3">
                <a href={`${GLOWUPI_BASE_URL}/politica-de-privacidade`} className="block text-[13px] text-white/40 hover:text-white transition-colors">Política de Privacidade</a>
                <a href={`${GLOWUPI_BASE_URL}/termos-de-uso`} className="block text-[13px] text-white/40 hover:text-white transition-colors">Termos de Uso</a>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-white/[0.06] space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-[12px] text-white/30">
                &copy; {new Date().getFullYear()} Barba Upi. Todos os direitos reservados.
              </p>
              <a
                href={`${GLOWUPI_BASE_URL}/suporte`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[13px] font-medium hover:bg-amber-500/15 transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
                Falar com Suporte
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
