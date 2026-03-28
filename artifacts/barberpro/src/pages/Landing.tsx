import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
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
  Heart,
  Shield,
  Zap,
  Menu,
  X,
} from "lucide-react";
import { APP_NAME } from "@/lib/utils";
import HeroVideo from "@/components/hero-video/HeroVideo";

const PRICING_MODE_ENDPOINT = `${import.meta.env.BASE_URL}api/checkout/pricing-config`.replace(/\/\//g, '/');

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

const TIERS_STATIC = [
  {
    tier: "1_pro",
    label: "1 Profissional",
    prices: { mensal: 7990, semestral: 6780, anual: 5590 },
    totals: { semestral: 40680, anual: 67080 },
  },
  {
    tier: "2_5_pro",
    label: "2 a 5 Profissionais",
    prices: { mensal: 10990, semestral: 9330, anual: 7690 },
    totals: { semestral: 55980, anual: 92280 },
  },
  {
    tier: "6_15_pro",
    label: "6 a 15 Profissionais",
    popular: true,
    prices: { mensal: 16450, semestral: 13980, anual: 11515 },
    totals: { semestral: 83880, anual: 138180 },
  },
  {
    tier: "15_plus_pro",
    label: "+15 Profissionais",
    prices: { mensal: 21990, semestral: 18680, anual: 15390 },
    totals: { semestral: 112080, anual: 184680 },
  },
];

const FEATURES = [
  { icon: CalendarDays, title: "Agenda Inteligente", desc: "Gerencie horários, bloqueios e horários de pico com facilidade" },
  { icon: Users, title: "Gestão de Clientes", desc: "Histórico completo, preferências e programa de fidelidade" },
  { icon: DollarSign, title: "Controle Financeiro", desc: "Contas a pagar e receber, fluxo de caixa em tempo real" },
  { icon: Package, title: "Pacotes de Serviços", desc: "Crie pacotes promocionais e controle sessões utilizadas" },
  { icon: Award, title: "Clube de Fidelidade", desc: "Sistema de pontos, recompensas e ranking de clientes" },
  { icon: BarChart3, title: "Relatórios Completos", desc: "Dados de desempenho por profissional, serviço e período" },
  { icon: MessageSquare, title: "Mensagens de Retorno", desc: "Lembretes automáticos e campanhas promocionais" },
  { icon: Star, title: "Avaliações", desc: "Pesquisa de satisfação integrada com nota e comentários" },
  { icon: Heart, title: "Estoque Inteligente", desc: "Controle de produtos com alertas de validade e movimentação" },
];

const FAQ_ITEMS_TRIAL = [
  { q: "Posso testar antes de assinar?", a: "Sim! Oferecemos 30 dias grátis para você conhecer todas as funcionalidades sem compromisso." },
  { q: "Preciso instalar algum software?", a: "Não! O Glow Upi funciona 100% online, direto no navegador do computador, tablet ou celular." },
  { q: "Como funciona o pagamento?", a: "O pagamento é feito via cartão de crédito, processado de forma segura pelo Stripe. Você pode cancelar a qualquer momento." },
  { q: "Posso trocar de plano depois?", a: "Claro! Você pode fazer upgrade ou downgrade do seu plano a qualquer momento, e o valor é ajustado proporcionalmente." },
  { q: "Meus dados estão seguros?", a: "Sim! Utilizamos criptografia de ponta e servidores seguros para proteger todas as informações do seu salão e clientes." },
  { q: "Funciona para qualquer tipo de salão?", a: "Sim! Manicures, cabeleireiras, esteticistas, maquiadoras, barbeiros — qualquer profissional de beleza." },
];

const FAQ_ITEMS_NO_TRIAL = [
  { q: "Como funciona a assinatura?", a: "Escolha o plano ideal para o tamanho do seu negócio e assine diretamente. O acesso é liberado imediatamente após o pagamento." },
  { q: "Preciso instalar algum software?", a: "Não! O Glow Upi funciona 100% online, direto no navegador do computador, tablet ou celular." },
  { q: "Como funciona o pagamento?", a: "O pagamento é feito via cartão de crédito, processado de forma segura pelo Stripe. Você pode cancelar a qualquer momento." },
  { q: "Posso trocar de plano depois?", a: "Claro! Você pode fazer upgrade ou downgrade do seu plano a qualquer momento, e o valor é ajustado proporcionalmente." },
  { q: "Meus dados estão seguros?", a: "Sim! Utilizamos criptografia de ponta e servidores seguros para proteger todas as informações do seu salão e clientes." },
  { q: "Funciona para qualquer tipo de salão?", a: "Sim! Manicures, cabeleireiras, esteticistas, maquiadoras, barbeiros — qualquer profissional de beleza." },
];

const TESTIMONIALS = [
  { name: "Ana Carolina", role: "Esteticista", text: "Desde que comecei a usar o Glow Upi, minha agenda nunca mais ficou bagunçada. Minhas clientes adoram a facilidade!" },
  { name: "Fernanda Silva", role: "Cabeleireira", text: "O controle financeiro me ajudou a entender onde eu estava perdendo dinheiro. Hoje meu salão é muito mais lucrativo." },
  { name: "Patricia Mendes", role: "Proprietária de Salão", text: "Com o clube de fidelidade, minhas clientes voltam muito mais. A taxa de retorno aumentou 40% em 3 meses!" },
];

const DIFFERENTIALS = [
  "Interface intuitiva e mobile-first",
  "Suporte dedicado para você",
  "Relatórios automáticos em tempo real",
  "Segurança total com criptografia",
];

const STATS = [
  { value: "500+", label: "Profissionais ativos" },
  { value: "50k+", label: "Agendamentos realizados" },
  { value: "4.9", label: "Nota de satisfação" },
  { value: "99.9%", label: "Disponibilidade" },
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
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true);
        observer.unobserve(el);
      }
    }, { threshold: 0.1, ...options });
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

export default function Landing() {
  const [period, setPeriod] = useState<BillingPeriod>("anual");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [pricingMode, setPricingMode] = useState<string>("all_plans");
  const [freeTrialEnabled, setFreeTrialEnabled] = useState(true);
  const [stripeProducts, setStripeProducts] = useState<ProductInfo[]>([]);
  const [isLoadingCheckout, setIsLoadingCheckout] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const scrolled = useScrolled();

  useEffect(() => {
    fetch(PRICING_MODE_ENDPOINT)
      .then(r => r.json())
      .then(data => {
        if (data.pricingMode) setPricingMode(data.pricingMode);
        if (data.products) setStripeProducts(data.products);
        if (data.freeTrialEnabled !== undefined) setFreeTrialEnabled(data.freeTrialEnabled);
      })
      .catch(() => {});
  }, []);

  const getFallbackUrl = () => {
    if (freeTrialEnabled) {
      return `${import.meta.env.BASE_URL}cadastro`.replace(/\/\//g, '/');
    }
    const pricingEl = document.getElementById("pricing");
    if (pricingEl) {
      pricingEl.scrollIntoView({ behavior: "smooth", block: "start" });
      return null;
    }
    return `${import.meta.env.BASE_URL}cadastro`.replace(/\/\//g, '/');
  };

  const handleSubscribe = async (tier: string, billingPeriod: BillingPeriod) => {
    const product = stripeProducts.find(p => p.metadata?.tier === tier);
    if (!product) {
      const url = getFallbackUrl();
      if (url) window.location.href = url;
      return;
    }

    const price = product.prices.find(p => p.metadata?.period === billingPeriod);
    if (!price) {
      const url = getFallbackUrl();
      if (url) window.location.href = url;
      return;
    }

    setIsLoadingCheckout(`${tier}-${billingPeriod}`);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/checkout/create-checkout-session`.replace(/\/\//g, '/'), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ priceId: price.id, billingPeriod }),
      });
      if (res.status === 401 || res.status === 403) {
        const cadastroUrl = `${import.meta.env.BASE_URL}cadastro?plan=${tier}&period=${billingPeriod}`.replace(/\/\//g, '/');
        window.location.href = cadastroUrl;
        return;
      }
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        const url = getFallbackUrl();
        if (url) window.location.href = url;
      }
    } catch {
      const url = getFallbackUrl();
      if (url) window.location.href = url;
    } finally {
      setIsLoadingCheckout(null);
    }
  };

  const smoothScroll = useCallback((e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const discountLabel = period === "anual" ? "30% OFF" : period === "semestral" ? "15% OFF" : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0f0f] via-[#141210] to-[#0f0f0f] overflow-x-hidden text-white">
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#1a1510]/80 backdrop-blur-xl border-b border-white/[0.06] shadow-lg shadow-black/30"
          : "bg-transparent"
      }`}>
        <div className="max-w-[1200px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3 font-semibold text-[18px] tracking-tight text-white">
            <img src="/logo-icon.png" alt="Glow Upi" className="h-10 w-10 object-contain" />
            {APP_NAME}
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" onClick={(e) => smoothScroll(e, "features")} className="text-[13px] text-white/50 hover:text-white transition-colors font-medium">Funcionalidades</a>
            <a href="#pricing" onClick={(e) => smoothScroll(e, "pricing")} className="text-[13px] text-white/50 hover:text-white transition-colors font-medium">Preços</a>
            <a href="#testimonials" onClick={(e) => smoothScroll(e, "testimonials")} className="text-[13px] text-white/50 hover:text-white transition-colors font-medium">Depoimentos</a>
            <a href="#faq" onClick={(e) => smoothScroll(e, "faq")} className="text-[13px] text-white/50 hover:text-white transition-colors font-medium">FAQ</a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-[13px] h-9 px-4 text-white/60 hover:text-white hover:bg-white/10 font-medium">
                Entrar
              </Button>
            </Link>
            {freeTrialEnabled ? (
              <Link href="/cadastro">
                <Button size="sm" className="text-[13px] h-9 px-5 rounded-full font-medium shadow-md shadow-primary/15">
                  Teste Grátis
                </Button>
              </Link>
            ) : (
              <a href="#pricing" onClick={(e) => smoothScroll(e, "pricing")}>
                <Button size="sm" className="text-[13px] h-9 px-5 rounded-full font-medium shadow-md shadow-primary/15">
                  Assinar Agora
                </Button>
              </a>
            )}
          </div>

          <button className="md:hidden p-2 -mr-2 text-white/70" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <>
            <div className="fixed inset-0 top-14 bg-black/50 backdrop-blur-sm z-40 md:hidden" onClick={() => setMobileMenuOpen(false)} />
            <div className="fixed top-14 left-0 right-0 z-50 md:hidden bg-[#1a1510] border-b border-white/[0.06] px-6 pb-6 pt-2 space-y-1 shadow-xl">
              <a href="#features" onClick={(e) => smoothScroll(e, "features")} className="block py-3 text-[15px] text-white/70 font-medium border-b border-white/[0.06]">Funcionalidades</a>
              <a href="#pricing" onClick={(e) => smoothScroll(e, "pricing")} className="block py-3 text-[15px] text-white/70 font-medium border-b border-white/[0.06]">Preços</a>
              <a href="#testimonials" onClick={(e) => smoothScroll(e, "testimonials")} className="block py-3 text-[15px] text-white/70 font-medium border-b border-white/[0.06]">Depoimentos</a>
              <a href="#faq" onClick={(e) => smoothScroll(e, "faq")} className="block py-3 text-[15px] text-white/70 font-medium border-b border-white/[0.06]">FAQ</a>
              <div className="flex gap-3 pt-4">
                <Link href="/login" className="flex-1">
                  <Button variant="outline" className="w-full h-11 rounded-full text-[14px] border-white/10 text-white/70 hover:bg-white/10">Entrar</Button>
                </Link>
                {freeTrialEnabled ? (
                  <Link href="/cadastro" className="flex-1">
                    <Button className="w-full h-11 rounded-full text-[14px]">Teste Grátis</Button>
                  </Link>
                ) : (
                  <a href="#pricing" onClick={(e) => smoothScroll(e, "pricing")} className="flex-1">
                    <Button className="w-full h-11 rounded-full text-[14px]">Assinar Agora</Button>
                  </a>
                )}
              </div>
            </div>
          </>
        )}
      </nav>

      <section className="pt-24 md:pt-32 pb-16 md:pb-24 px-6">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <AnimatedSection>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/15 text-primary text-[13px] font-medium mb-8 border border-primary/20">
                <Sparkles className="h-3.5 w-3.5" />
                {freeTrialEnabled ? "30 dias grátis para testar" : "A plataforma ideal para seu salão"}
              </div>
              <h1 className="text-[36px] sm:text-[44px] lg:text-[52px] xl:text-[58px] font-extrabold text-white leading-[1.08] mb-6 tracking-tight">
                A plataforma completa para{" "}
                <span className="bg-gradient-to-r from-primary via-amber-400 to-primary bg-clip-text text-transparent">profissionais de beleza</span>
              </h1>
              <p className="text-[16px] sm:text-[18px] text-white/50 leading-relaxed max-w-[480px] mb-10">
                Gerencie sua agenda, clientes, finanças e muito mais em um só lugar. Feito sob medida para salões de beleza e estéticas.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 mb-8">
                {freeTrialEnabled ? (
                  <Link href="/cadastro">
                    <Button size="lg" className="text-[14px] px-8 h-12 rounded-full shadow-lg shadow-primary/25 font-semibold w-full sm:w-auto">
                      Começar Agora — É Grátis
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                ) : (
                  <a href="#pricing" onClick={(e) => smoothScroll(e, "pricing")}>
                    <Button size="lg" className="text-[14px] px-8 h-12 rounded-full shadow-lg shadow-primary/25 font-semibold w-full sm:w-auto">
                      Assinar Agora
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </a>
                )}
                <a href="#features" onClick={(e) => smoothScroll(e, "features")}>
                  <Button size="lg" variant="outline" className="text-[14px] px-8 h-12 rounded-full w-full sm:w-auto border-white/[0.12] text-white/60 hover:text-white hover:border-white/[0.25] hover:bg-white/[0.05]">
                    Ver Funcionalidades
                  </Button>
                </a>
              </div>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-white/40">
                {freeTrialEnabled && (
                  <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-green-400" /> Sem cartão de crédito</span>
                )}
                <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-green-400" /> Cancele quando quiser</span>
                <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-green-400" /> 100% seguro</span>
              </div>
            </AnimatedSection>

            <AnimatedSection delay={200} className="mt-8 lg:mt-0">
              <HeroVideo />
            </AnimatedSection>
          </div>
        </div>
      </section>

      <section className="py-12 px-6 border-y border-white/[0.06] bg-white/[0.03]">
        <div className="max-w-[1000px] mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((stat, i) => (
              <AnimatedSection key={i} delay={i * 80} className="text-center">
                <p className="text-[28px] sm:text-[32px] font-extrabold text-white tracking-tight">{stat.value}</p>
                <p className="text-[13px] text-white/40 font-medium mt-1">{stat.label}</p>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="py-24 md:py-32 px-6">
        <div className="max-w-[1100px] mx-auto">
          <AnimatedSection className="text-center mb-16">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/15 text-primary text-[12px] font-semibold mb-4 uppercase tracking-wider border border-primary/20">
              Funcionalidades
            </div>
            <h2 className="text-[28px] sm:text-[36px] lg:text-[42px] font-extrabold text-white leading-tight mb-4 tracking-tight">
              Tudo que você precisa em um só lugar
            </h2>
            <p className="text-white/45 text-[16px] sm:text-[18px] max-w-[520px] mx-auto">
              Ferramentas poderosas para transformar a gestão do seu salão
            </p>
          </AnimatedSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((feature, i) => (
              <AnimatedSection key={i} delay={i * 60}>
                <div className="group p-6 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/[0.12] hover:shadow-xl hover:shadow-black/20 transition-all duration-300 h-full">
                  <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-300">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-[15px] font-bold text-white mb-2">{feature.title}</h3>
                  <p className="text-white/45 text-[14px] leading-relaxed">{feature.desc}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 md:py-32 px-6 bg-white/[0.02] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] via-transparent to-primary/[0.02]" />
        <div className="max-w-[1100px] mx-auto relative">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <AnimatedSection>
              <div className="relative w-full max-w-[440px] mx-auto lg:mx-0">
                <div className="absolute -inset-8 bg-gradient-to-br from-primary/10 to-transparent rounded-[40px] blur-3xl" />
                <div className="relative rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm p-8 space-y-4">
                  <div className="flex items-center gap-3 pb-4 border-b border-white/[0.06]">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/25 to-primary/5 flex items-center justify-center">
                      <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-white">{APP_NAME}</p>
                      <p className="text-[11px] text-white/40">Painel do Profissional</p>
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    {[
                      { label: "Agendamentos hoje", value: "12", color: "text-primary" },
                      { label: "Clientes ativos", value: "234", color: "text-white" },
                      { label: "Faturamento mensal", value: "R$ 12.450", color: "text-green-400" },
                      { label: "Taxa de retorno", value: "87%", color: "text-white" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.04] border border-white/[0.05]">
                        <span className="text-[13px] text-white/50">{item.label}</span>
                        <span className={`text-[15px] font-bold ${item.color}`}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </AnimatedSection>

            <AnimatedSection delay={150}>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/15 text-primary text-[12px] font-semibold mb-5 uppercase tracking-wider border border-primary/20">
                Por que escolher
              </div>
              <h2 className="text-[28px] sm:text-[36px] font-extrabold text-white leading-tight mb-6 tracking-tight">
                Feito para quem faz<br />
                <span className="bg-gradient-to-r from-primary to-amber-400 bg-clip-text text-transparent">a beleza acontecer</span>
              </h2>
              <p className="text-white/45 text-[16px] leading-relaxed mb-8 max-w-[420px]">
                Desenvolvido por quem entende a rotina de profissionais de beleza. Cada funcionalidade foi pensada para simplificar seu dia.
              </p>
              <div className="space-y-4">
                {DIFFERENTIALS.map((text, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                      <Check className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-[15px] text-white/70 font-medium">{text}</span>
                  </div>
                ))}
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {pricingMode !== "hidden" && (
        <section id="pricing" className="py-24 md:py-32 px-6">
          <div className="max-w-[1100px] mx-auto">
            <AnimatedSection className="text-center mb-14">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/15 text-primary text-[12px] font-semibold mb-4 uppercase tracking-wider border border-primary/20">
                Preços
              </div>
              <h2 className="text-[28px] sm:text-[36px] lg:text-[42px] font-extrabold text-white leading-tight mb-4 tracking-tight">
                Escolha o plano ideal
              </h2>
              <p className="text-white/45 text-[16px] sm:text-[18px] max-w-[480px] mx-auto">
                Planos flexíveis para o tamanho do seu negócio
              </p>
            </AnimatedSection>

            {pricingMode === "single_price" ? (
              <AnimatedSection className="max-w-sm mx-auto">
                <div className="rounded-3xl bg-white/[0.05] border border-white/[0.08] p-8 text-center shadow-xl shadow-black/20 backdrop-blur-sm">
                  <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-semibold mb-5">
                    <Zap className="h-3 w-3" /> PLANO ÚNICO
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1.5">Acesso Completo</h3>
                  <p className="text-white/45 text-sm mb-6">Todas as funcionalidades, sem limites</p>
                  <div className="mb-8">
                    <span className="text-sm text-white/40">R$</span>
                    <span className="text-5xl font-extrabold text-white ml-1 tracking-tight">97</span>
                    <span className="text-white/40">,00/mês</span>
                  </div>
                  <ul className="text-left space-y-3 mb-8">
                    {["Profissionais ilimitados", "Agenda completa", "Controle financeiro", "Pacotes de serviços", "Clube de fidelidade", "Relatórios avançados", "Suporte prioritário"].map(f => (
                      <li key={f} className="flex items-center gap-2.5 text-sm text-white/60">
                        <Check className="h-4 w-4 text-primary flex-shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full h-12 text-[14px] font-semibold rounded-full shadow-lg shadow-primary/20"
                    onClick={() => handleSubscribe("single", "mensal")}
                    disabled={isLoadingCheckout === "single-mensal"}
                  >
                    {isLoadingCheckout === "single-mensal" ? "Redirecionando..." : "Começar Agora"}
                    {isLoadingCheckout !== "single-mensal" && <ArrowRight className="ml-2 h-4 w-4" />}
                  </Button>
                  <p className="text-[11px] text-white/30 mt-3">{freeTrialEnabled ? "30 dias grátis • " : ""}Cancele a qualquer momento</p>
                </div>
              </AnimatedSection>
            ) : (
              <>
                <div className="flex justify-center mb-10">
                  <div className="inline-flex rounded-full p-1 bg-white/[0.06] border border-white/[0.08]">
                    {(["mensal", "semestral", "anual"] as BillingPeriod[]).map((p) => (
                      <button
                        key={p}
                        className={`px-5 py-2 rounded-full text-[13px] font-medium transition-all duration-200 ${
                          period === p
                            ? "bg-primary text-white shadow-md"
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
                  {TIERS_STATIC.map((tier, idx) => {
                    const priceValue = tier.prices[period];
                    const originalPrice = tier.prices.mensal;
                    const isPopular = tier.popular;
                    const loadingKey = `${tier.tier}-${period}`;

                    return (
                      <AnimatedSection key={tier.tier} delay={idx * 80}>
                        <div
                          className={`rounded-2xl p-6 flex flex-col relative transition-all duration-300 h-full ${
                            isPopular
                              ? "bg-white/[0.08] border-2 border-primary shadow-xl shadow-primary/10 ring-1 ring-primary/10"
                              : "bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.06] hover:shadow-xl hover:shadow-black/20"
                          }`}
                        >
                          {discountLabel && (
                            <div className="absolute -top-2.5 right-4 bg-white text-[#0f0f0f] text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                              {discountLabel}
                            </div>
                          )}
                          {isPopular && (
                            <div className="absolute -top-2.5 left-4 bg-primary text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                              POPULAR
                            </div>
                          )}

                          <h3 className="font-bold text-[15px] text-white mt-2">{tier.label}</h3>

                          <div className="mt-4 mb-1">
                            <span className="text-xs text-white/40">R$</span>
                            <span className="text-[32px] font-extrabold text-white ml-0.5 tracking-tight">
                              {formatBRL(priceValue).split(",")[0]}
                            </span>
                            <span className="text-white/40 text-sm">,{formatBRL(priceValue).split(",")[1]}/mês</span>
                          </div>

                          {period !== "mensal" && (
                            <p className="text-xs text-white/30 line-through mb-0.5">
                              R$ {formatBRL(originalPrice)}/mês
                            </p>
                          )}

                          {period !== "mensal" && (
                            <p className="text-xs text-white/40 mb-4">
                              Total: R$ {formatBRL(tier.totals[period as "semestral" | "anual"])}
                            </p>
                          )}

                          {period === "mensal" && <div className="mb-4" />}

                          <Button
                            className={`w-full mt-auto h-11 text-[13px] font-semibold rounded-full ${
                              isPopular ? "shadow-md shadow-primary/15" : "border-white/[0.15] text-white/80 hover:bg-white/[0.08] hover:text-white"
                            }`}
                            variant={isPopular ? "default" : "outline"}
                            onClick={() => handleSubscribe(tier.tier, period)}
                            disabled={isLoadingCheckout === loadingKey}
                          >
                            {isLoadingCheckout === loadingKey ? "Redirecionando..." : "Assinar"}
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
          </div>
        </section>
      )}

      <section id="testimonials" className="py-24 md:py-32 px-6 bg-white/[0.02]">
        <div className="max-w-[1100px] mx-auto">
          <AnimatedSection className="text-center mb-14">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/15 text-primary text-[12px] font-semibold mb-4 uppercase tracking-wider border border-primary/20">
              Depoimentos
            </div>
            <h2 className="text-[28px] sm:text-[36px] lg:text-[42px] font-extrabold text-white leading-tight tracking-tight">
              O que nossas clientes dizem
            </h2>
          </AnimatedSection>

          <div className="grid md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <AnimatedSection key={i} delay={i * 100}>
                <div className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-7 h-full flex flex-col hover:bg-white/[0.07] hover:shadow-lg hover:shadow-black/20 transition-all duration-300">
                  <div className="flex gap-0.5 mb-5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="h-4 w-4 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-white/55 text-[14px] leading-relaxed mb-6 flex-1">"{t.text}"</p>
                  <div className="flex items-center gap-3 pt-4 border-t border-white/[0.06]">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/25 to-primary/5 flex items-center justify-center text-primary font-bold text-[14px]">
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

      <section id="faq" className="py-24 md:py-32 px-6">
        <div className="max-w-[640px] mx-auto">
          <AnimatedSection className="text-center mb-14">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/15 text-primary text-[12px] font-semibold mb-4 uppercase tracking-wider border border-primary/20">
              FAQ
            </div>
            <h2 className="text-[28px] sm:text-[36px] lg:text-[42px] font-extrabold text-white leading-tight tracking-tight">
              Perguntas Frequentes
            </h2>
          </AnimatedSection>

          <div className="space-y-2.5">
            {(freeTrialEnabled ? FAQ_ITEMS_TRIAL : FAQ_ITEMS_NO_TRIAL).map((item, i) => (
              <AnimatedSection key={i} delay={i * 50}>
                <div className="rounded-2xl bg-white/[0.04] border border-white/[0.06] overflow-hidden hover:border-white/[0.12] transition-colors">
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
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-primary/[0.02] to-transparent" />
        <AnimatedSection className="max-w-[640px] mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/15 text-primary text-[13px] font-semibold mb-6 border border-primary/20">
            <Sparkles className="h-3.5 w-3.5" />
            Comece hoje mesmo
          </div>
          <h2 className="text-[28px] sm:text-[36px] lg:text-[42px] font-extrabold text-white leading-tight mb-5 tracking-tight">
            Pronta para transformar<br className="hidden sm:block" /> seu salão?
          </h2>
          <p className="text-[16px] sm:text-[18px] text-white/45 mb-10 max-w-[480px] mx-auto">
            {freeTrialEnabled
              ? `Comece agora com 30 dias grátis e descubra como o ${APP_NAME} pode simplificar sua rotina.`
              : `Descubra como o ${APP_NAME} pode simplificar sua rotina e transformar seu salão.`}
          </p>
          {freeTrialEnabled ? (
            <Link href="/cadastro">
              <Button size="lg" className="text-[14px] px-10 h-[52px] rounded-full shadow-lg shadow-primary/25 font-semibold">
                Começar Teste Grátis
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          ) : (
            <a href="#pricing" onClick={(e) => smoothScroll(e, "pricing")}>
              <Button size="lg" className="text-[14px] px-10 h-[52px] rounded-full shadow-lg shadow-primary/25 font-semibold">
                Assinar Agora
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </a>
          )}
          <p className="text-[13px] text-white/30 mt-6">{freeTrialEnabled ? "Sem cartão de crédito. " : ""}Cancele a qualquer momento.</p>
        </AnimatedSection>
      </section>

      <footer className="border-t border-white/[0.06] bg-white/[0.02]">
        <div className="max-w-[1100px] mx-auto px-6 py-16">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-14">
            <div>
              <div className="flex items-center gap-2.5 font-semibold text-[15px] text-white mb-4">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary/25 to-primary/5 flex items-center justify-center">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                </div>
                {APP_NAME}
              </div>
              <p className="text-[13px] text-white/40 leading-relaxed max-w-[240px]">
                Organize sua agenda e fidelize suas clientes com a plataforma mais completa do mercado.
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
              <h4 className="text-[13px] font-bold text-white/70 mb-4 uppercase tracking-wider">Empresa</h4>
              <div className="space-y-3">
                <Link href="/login" className="block text-[13px] text-white/40 hover:text-white transition-colors">Entrar</Link>
                <Link href="/cadastro" className="block text-[13px] text-white/40 hover:text-white transition-colors">Criar Conta</Link>
              </div>
            </div>

            <div>
              <h4 className="text-[13px] font-bold text-white/70 mb-4 uppercase tracking-wider">Legal</h4>
              <div className="space-y-3">
                <Link href="/politica-de-privacidade" className="block text-[13px] text-white/40 hover:text-white transition-colors">Política de Privacidade</Link>
                <Link href="/termos-de-uso" className="block text-[13px] text-white/40 hover:text-white transition-colors">Termos de Uso</Link>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[12px] text-white/30">
              &copy; {new Date().getFullYear()} {APP_NAME}. Todos os direitos reservados.
            </p>
            <p className="text-[12px] text-white/25">
              Feito com carinho para profissionais de beleza
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
