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

const FAQ_ITEMS = [
  { q: "Posso testar antes de assinar?", a: "Sim! Oferecemos 30 dias grátis para você conhecer todas as funcionalidades sem compromisso." },
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

function GoldParticleCanvas({ width, height }: { width: number; height: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width === 0 || height === 0) return;

    canvas.width = width * 2;
    canvas.height = height * 2;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(2, 2);

    const colors = ['#c4a46a', '#d4b882', '#a38550', '#e8d5a8'];
    const particleCount = Math.min(Math.floor((width * height) / 600), 400);

    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      size: Math.random() * 2.5 + 0.5,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: Math.random() * 0.6 + 0.3,
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: Math.random() * 0.02 + 0.005,
    }));

    let animId: number;
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.pulse += p.pulseSpeed;

        if (p.x < -5) p.x = width + 5;
        if (p.x > width + 5) p.x = -5;
        if (p.y < -5) p.y = height + 5;
        if (p.y > height + 5) p.y = -5;

        const alphaModulated = p.alpha * (0.6 + Math.sin(p.pulse) * 0.4);

        ctx.globalAlpha = alphaModulated;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();

        if (p.size > 1.8 && Math.sin(p.pulse) > 0.8) {
          ctx.globalAlpha = alphaModulated * 0.3;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.fill();
        }
      });

      ctx.globalAlpha = 1;
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height }}
      className="absolute inset-0 pointer-events-none"
    />
  );
}

function HeroVisual() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setDims({ w: Math.round(width), h: Math.round(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="relative w-full max-w-[540px] mx-auto lg:mx-0">
      <div className="absolute -inset-6 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent rounded-[32px] blur-3xl" />
      <div
        ref={containerRef}
        className="relative rounded-2xl overflow-hidden shadow-2xl shadow-black/20 border border-white/[0.06]"
        style={{
          aspectRatio: '16/10',
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1510 100%)',
        }}
      >
        <GoldParticleCanvas width={dims.w} height={dims.h} />

        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center">
          <img
            src="/logo-icon.png"
            alt="Glow Upi"
            className="w-12 h-12 sm:w-16 sm:h-16 object-contain mb-3 drop-shadow-[0_0_20px_rgba(196,164,106,0.4)]"
          />
          <h3
            className="text-white font-bold tracking-tight leading-tight mb-2"
            style={{ fontFamily: "'DM Serif Display', serif", fontSize: 'clamp(20px, 4vw, 36px)' }}
          >
            {APP_NAME}
          </h3>
          <p
            className="text-[#d4b882]/80 font-medium tracking-widest uppercase"
            style={{ fontSize: 'clamp(8px, 1.5vw, 12px)', letterSpacing: '0.25em' }}
          >
            O Futuro da Beleza
          </p>

          <div className="mt-5 w-full max-w-[280px] space-y-1.5">
            {[
              { label: 'Agendamentos hoje', value: '12', accent: true },
              { label: 'Clientes ativos', value: '234', accent: false },
              { label: 'Faturamento', value: 'R$ 5.2k', accent: false },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-3 py-1.5 rounded-lg"
                style={{
                  background: 'rgba(196, 164, 106, 0.06)',
                  border: '1px solid rgba(196, 164, 106, 0.1)',
                }}
              >
                <span className="text-white/50" style={{ fontSize: 'clamp(9px, 1.3vw, 12px)' }}>{item.label}</span>
                <span
                  className={item.accent ? 'text-[#c4a46a] font-bold' : 'text-white/80 font-semibold'}
                  style={{ fontSize: 'clamp(10px, 1.5vw, 14px)' }}
                >
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div
          className="absolute inset-0 pointer-events-none z-20"
          style={{
            background: 'radial-gradient(ellipse at 50% 30%, rgba(196, 164, 106, 0.08) 0%, transparent 60%)',
          }}
        />
      </div>
    </div>
  );
}

export default function Landing() {
  const [period, setPeriod] = useState<BillingPeriod>("anual");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [pricingMode, setPricingMode] = useState<string>("all_plans");
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
      })
      .catch(() => {});
  }, []);

  const handleSubscribe = async (tier: string, billingPeriod: BillingPeriod) => {
    const product = stripeProducts.find(p => p.metadata?.tier === tier);
    if (!product) {
      window.location.href = `${import.meta.env.BASE_URL}cadastro`.replace(/\/\//g, '/');
      return;
    }

    const price = product.prices.find(p => p.metadata?.period === billingPeriod);
    if (!price) {
      window.location.href = `${import.meta.env.BASE_URL}cadastro`.replace(/\/\//g, '/');
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
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        window.location.href = `${import.meta.env.BASE_URL}cadastro`.replace(/\/\//g, '/');
      }
    } catch {
      window.location.href = `${import.meta.env.BASE_URL}cadastro`.replace(/\/\//g, '/');
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
    <div className="min-h-screen bg-[#fafafa] overflow-x-hidden">
      {/* ── NAV ── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/80 backdrop-blur-xl border-b border-black/[0.06] shadow-sm shadow-black/[0.02]"
          : "bg-transparent"
      }`}>
        <div className="max-w-[1200px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5 font-semibold text-[16px] tracking-tight text-foreground">
            <img src="/logo-icon.png" alt="Glow Upi" className="h-8 w-8 object-contain" />
            {APP_NAME}
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" onClick={(e) => smoothScroll(e, "features")} className="text-[13px] text-foreground/50 hover:text-foreground transition-colors font-medium">Funcionalidades</a>
            <a href="#pricing" onClick={(e) => smoothScroll(e, "pricing")} className="text-[13px] text-foreground/50 hover:text-foreground transition-colors font-medium">Preços</a>
            <a href="#testimonials" onClick={(e) => smoothScroll(e, "testimonials")} className="text-[13px] text-foreground/50 hover:text-foreground transition-colors font-medium">Depoimentos</a>
            <a href="#faq" onClick={(e) => smoothScroll(e, "faq")} className="text-[13px] text-foreground/50 hover:text-foreground transition-colors font-medium">FAQ</a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-[13px] h-9 px-4 text-foreground/60 hover:text-foreground font-medium">
                Entrar
              </Button>
            </Link>
            <Link href="/cadastro">
              <Button size="sm" className="text-[13px] h-9 px-5 rounded-full font-medium shadow-md shadow-primary/15">
                Teste Grátis
              </Button>
            </Link>
          </div>

          <button className="md:hidden p-2 -mr-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <>
            <div className="fixed inset-0 top-14 bg-black/30 backdrop-blur-sm z-40 md:hidden" onClick={() => setMobileMenuOpen(false)} />
            <div className="fixed top-14 left-0 right-0 z-50 md:hidden bg-white border-b border-black/[0.06] px-6 pb-6 pt-2 space-y-1 shadow-xl">
              <a href="#features" onClick={(e) => smoothScroll(e, "features")} className="block py-3 text-[15px] text-foreground/70 font-medium border-b border-black/[0.04]">Funcionalidades</a>
              <a href="#pricing" onClick={(e) => smoothScroll(e, "pricing")} className="block py-3 text-[15px] text-foreground/70 font-medium border-b border-black/[0.04]">Preços</a>
              <a href="#testimonials" onClick={(e) => smoothScroll(e, "testimonials")} className="block py-3 text-[15px] text-foreground/70 font-medium border-b border-black/[0.04]">Depoimentos</a>
              <a href="#faq" onClick={(e) => smoothScroll(e, "faq")} className="block py-3 text-[15px] text-foreground/70 font-medium border-b border-black/[0.04]">FAQ</a>
              <div className="flex gap-3 pt-4">
                <Link href="/login" className="flex-1">
                  <Button variant="outline" className="w-full h-11 rounded-full text-[14px]">Entrar</Button>
                </Link>
                <Link href="/cadastro" className="flex-1">
                  <Button className="w-full h-11 rounded-full text-[14px]">Teste Grátis</Button>
                </Link>
              </div>
            </div>
          </>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="pt-24 md:pt-32 pb-16 md:pb-24 px-6">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <AnimatedSection>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/8 text-primary text-[13px] font-medium mb-8 border border-primary/10">
                <Sparkles className="h-3.5 w-3.5" />
                30 dias grátis para testar
              </div>
              <h1 className="text-[36px] sm:text-[44px] lg:text-[52px] xl:text-[58px] font-extrabold text-foreground leading-[1.08] mb-6 tracking-tight">
                A plataforma completa para{" "}
                <span className="bg-gradient-to-r from-primary via-amber-500 to-primary bg-clip-text text-transparent">profissionais de beleza</span>
              </h1>
              <p className="text-[16px] sm:text-[18px] text-foreground/50 leading-relaxed max-w-[480px] mb-10">
                Gerencie sua agenda, clientes, finanças e muito mais em um só lugar. Feito sob medida para salões de beleza e estéticas.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 mb-8">
                <Link href="/cadastro">
                  <Button size="lg" className="text-[14px] px-8 h-12 rounded-full shadow-lg shadow-primary/20 font-semibold w-full sm:w-auto">
                    Começar Agora — É Grátis
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <a href="#features" onClick={(e) => smoothScroll(e, "features")}>
                  <Button size="lg" variant="outline" className="text-[14px] px-8 h-12 rounded-full w-full sm:w-auto border-black/[0.08] text-foreground/60 hover:text-foreground hover:border-black/[0.15]">
                    Ver Funcionalidades
                  </Button>
                </a>
              </div>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-foreground/40">
                <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-green-500" /> Sem cartão de crédito</span>
                <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-green-500" /> Cancele quando quiser</span>
                <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-green-500" /> 100% seguro</span>
              </div>
            </AnimatedSection>

            <AnimatedSection delay={200} className="mt-8 lg:mt-0">
              <HeroVisual />
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF / STATS ── */}
      <section className="py-12 px-6 border-y border-black/[0.04] bg-white">
        <div className="max-w-[1000px] mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((stat, i) => (
              <AnimatedSection key={i} delay={i * 80} className="text-center">
                <p className="text-[28px] sm:text-[32px] font-extrabold text-foreground tracking-tight">{stat.value}</p>
                <p className="text-[13px] text-foreground/40 font-medium mt-1">{stat.label}</p>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-24 md:py-32 px-6">
        <div className="max-w-[1100px] mx-auto">
          <AnimatedSection className="text-center mb-16">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/8 text-primary text-[12px] font-semibold mb-4 uppercase tracking-wider border border-primary/10">
              Funcionalidades
            </div>
            <h2 className="text-[28px] sm:text-[36px] lg:text-[42px] font-extrabold text-foreground leading-tight mb-4 tracking-tight">
              Tudo que você precisa em um só lugar
            </h2>
            <p className="text-foreground/45 text-[16px] sm:text-[18px] max-w-[520px] mx-auto">
              Ferramentas poderosas para transformar a gestão do seu salão
            </p>
          </AnimatedSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((feature, i) => (
              <AnimatedSection key={i} delay={i * 60}>
                <div className="group p-6 rounded-2xl bg-white hover:bg-white border border-black/[0.04] hover:border-black/[0.08] hover:shadow-xl hover:shadow-black/[0.04] transition-all duration-300 h-full">
                  <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary/12 to-primary/4 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-300">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-[15px] font-bold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-foreground/45 text-[14px] leading-relaxed">{feature.desc}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── DIFFERENTIAL ── */}
      <section className="py-24 md:py-32 px-6 bg-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] via-transparent to-primary/[0.02]" />
        <div className="max-w-[1100px] mx-auto relative">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <AnimatedSection>
              <div className="relative w-full max-w-[440px] mx-auto lg:mx-0">
                <div className="absolute -inset-8 bg-gradient-to-br from-primary/8 to-transparent rounded-[40px] blur-3xl" />
                <div className="relative rounded-2xl border border-black/[0.06] bg-[#fafafa] p-8 space-y-4">
                  <div className="flex items-center gap-3 pb-4 border-b border-black/[0.04]">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-foreground">{APP_NAME}</p>
                      <p className="text-[11px] text-foreground/40">Painel do Profissional</p>
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    {[
                      { label: "Agendamentos hoje", value: "12", color: "text-primary" },
                      { label: "Clientes ativos", value: "234", color: "text-foreground" },
                      { label: "Faturamento mensal", value: "R$ 12.450", color: "text-green-600" },
                      { label: "Taxa de retorno", value: "87%", color: "text-foreground" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white border border-black/[0.03]">
                        <span className="text-[13px] text-foreground/50">{item.label}</span>
                        <span className={`text-[15px] font-bold ${item.color}`}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </AnimatedSection>

            <AnimatedSection delay={150}>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/8 text-primary text-[12px] font-semibold mb-5 uppercase tracking-wider border border-primary/10">
                Por que escolher
              </div>
              <h2 className="text-[28px] sm:text-[36px] font-extrabold text-foreground leading-tight mb-6 tracking-tight">
                Feito para quem faz<br />
                <span className="bg-gradient-to-r from-primary to-amber-500 bg-clip-text text-transparent">a beleza acontecer</span>
              </h2>
              <p className="text-foreground/45 text-[16px] leading-relaxed mb-8 max-w-[420px]">
                Desenvolvido por quem entende a rotina de profissionais de beleza. Cada funcionalidade foi pensada para simplificar seu dia.
              </p>
              <div className="space-y-4">
                {DIFFERENTIALS.map((text, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Check className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-[15px] text-foreground/70 font-medium">{text}</span>
                  </div>
                ))}
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      {pricingMode !== "hidden" && (
        <section id="pricing" className="py-24 md:py-32 px-6">
          <div className="max-w-[1100px] mx-auto">
            <AnimatedSection className="text-center mb-14">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/8 text-primary text-[12px] font-semibold mb-4 uppercase tracking-wider border border-primary/10">
                Preços
              </div>
              <h2 className="text-[28px] sm:text-[36px] lg:text-[42px] font-extrabold text-foreground leading-tight mb-4 tracking-tight">
                Escolha o plano ideal
              </h2>
              <p className="text-foreground/45 text-[16px] sm:text-[18px] max-w-[480px] mx-auto">
                Planos flexíveis para o tamanho do seu negócio
              </p>
            </AnimatedSection>

            {pricingMode === "single_price" ? (
              <AnimatedSection className="max-w-sm mx-auto">
                <div className="rounded-3xl bg-white border border-black/[0.06] p-8 text-center shadow-xl shadow-black/[0.04]">
                  <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/8 text-primary text-xs font-semibold mb-5">
                    <Zap className="h-3 w-3" /> PLANO ÚNICO
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-1.5">Acesso Completo</h3>
                  <p className="text-foreground/45 text-sm mb-6">Todas as funcionalidades, sem limites</p>
                  <div className="mb-8">
                    <span className="text-sm text-foreground/40">R$</span>
                    <span className="text-5xl font-extrabold text-foreground ml-1 tracking-tight">97</span>
                    <span className="text-foreground/40">,00/mês</span>
                  </div>
                  <ul className="text-left space-y-3 mb-8">
                    {["Profissionais ilimitados", "Agenda completa", "Controle financeiro", "Pacotes de serviços", "Clube de fidelidade", "Relatórios avançados", "Suporte prioritário"].map(f => (
                      <li key={f} className="flex items-center gap-2.5 text-sm text-foreground/60">
                        <Check className="h-4 w-4 text-primary flex-shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    size="lg"
                    className="w-full h-12 text-sm rounded-full font-semibold shadow-md shadow-primary/15"
                    onClick={() => handleSubscribe("single", "mensal")}
                    disabled={isLoadingCheckout === "single-mensal"}
                  >
                    {isLoadingCheckout === "single-mensal" ? "Redirecionando..." : "Assinar Agora"}
                  </Button>
                  <p className="text-xs text-foreground/35 mt-3">Em até 12x sem juros no cartão</p>
                </div>
              </AnimatedSection>
            ) : (
              <>
                <div className="flex justify-center mb-10">
                  <div className="inline-flex rounded-full bg-white border border-black/[0.06] p-1 shadow-sm">
                    {(["anual", "semestral", "mensal"] as BillingPeriod[]).map((p) => (
                      <button
                        key={p}
                        className={`px-5 py-2.5 rounded-full text-[13px] font-semibold transition-all duration-200 ${
                          period === p
                            ? "bg-foreground text-white shadow-md"
                            : "text-foreground/50 hover:text-foreground"
                        }`}
                        onClick={() => setPeriod(p)}
                      >
                        <div>{p === "anual" ? "Anual" : p === "semestral" ? "Semestral" : "Mensal"}</div>
                        {p === "anual" && <div className="text-[10px] opacity-70 mt-0.5">Economize 30%</div>}
                        {p === "semestral" && <div className="text-[10px] opacity-70 mt-0.5">Economize 15%</div>}
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
                          className={`rounded-2xl bg-white p-6 flex flex-col relative transition-all duration-300 h-full ${
                            isPopular
                              ? "border-2 border-primary shadow-xl shadow-primary/8 ring-1 ring-primary/5"
                              : "border border-black/[0.06] hover:border-black/[0.1] hover:shadow-xl hover:shadow-black/[0.04]"
                          }`}
                        >
                          {discountLabel && (
                            <div className="absolute -top-2.5 right-4 bg-foreground text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                              {discountLabel}
                            </div>
                          )}
                          {isPopular && (
                            <div className="absolute -top-2.5 left-4 bg-primary text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                              POPULAR
                            </div>
                          )}

                          <h3 className="font-bold text-[15px] text-foreground mt-2">{tier.label}</h3>

                          <div className="mt-4 mb-1">
                            <span className="text-xs text-foreground/40">R$</span>
                            <span className="text-[32px] font-extrabold text-foreground ml-0.5 tracking-tight">
                              {formatBRL(priceValue).split(",")[0]}
                            </span>
                            <span className="text-foreground/40 text-sm">,{formatBRL(priceValue).split(",")[1]}/mês</span>
                          </div>

                          {period !== "mensal" && (
                            <p className="text-xs text-foreground/35 line-through mb-0.5">
                              R$ {formatBRL(originalPrice)}/mês
                            </p>
                          )}

                          {period !== "mensal" && (
                            <p className="text-xs text-foreground/40 mb-4">
                              Total: R$ {formatBRL(tier.totals[period as "semestral" | "anual"])}
                            </p>
                          )}

                          {period === "mensal" && <div className="mb-4" />}

                          <Button
                            className={`w-full mt-auto h-11 text-[13px] font-semibold rounded-full ${
                              isPopular ? "shadow-md shadow-primary/15" : ""
                            }`}
                            variant={isPopular ? "default" : "outline"}
                            onClick={() => handleSubscribe(tier.tier, period)}
                            disabled={isLoadingCheckout === loadingKey}
                          >
                            {isLoadingCheckout === loadingKey ? "Redirecionando..." : "Assinar"}
                          </Button>

                          <p className="text-[11px] text-center text-foreground/35 mt-2">
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

      {/* ── TESTIMONIALS ── */}
      <section id="testimonials" className="py-24 md:py-32 px-6 bg-white">
        <div className="max-w-[1100px] mx-auto">
          <AnimatedSection className="text-center mb-14">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/8 text-primary text-[12px] font-semibold mb-4 uppercase tracking-wider border border-primary/10">
              Depoimentos
            </div>
            <h2 className="text-[28px] sm:text-[36px] lg:text-[42px] font-extrabold text-foreground leading-tight tracking-tight">
              O que nossas clientes dizem
            </h2>
          </AnimatedSection>

          <div className="grid md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <AnimatedSection key={i} delay={i * 100}>
                <div className="rounded-2xl bg-[#fafafa] border border-black/[0.04] p-7 h-full flex flex-col hover:shadow-lg hover:shadow-black/[0.03] transition-all duration-300">
                  <div className="flex gap-0.5 mb-5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="h-4 w-4 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-foreground/55 text-[14px] leading-relaxed mb-6 flex-1">"{t.text}"</p>
                  <div className="flex items-center gap-3 pt-4 border-t border-black/[0.04]">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-bold text-[14px]">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-foreground">{t.name}</p>
                      <p className="text-[12px] text-foreground/40">{t.role}</p>
                    </div>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-24 md:py-32 px-6">
        <div className="max-w-[640px] mx-auto">
          <AnimatedSection className="text-center mb-14">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/8 text-primary text-[12px] font-semibold mb-4 uppercase tracking-wider border border-primary/10">
              FAQ
            </div>
            <h2 className="text-[28px] sm:text-[36px] lg:text-[42px] font-extrabold text-foreground leading-tight tracking-tight">
              Perguntas Frequentes
            </h2>
          </AnimatedSection>

          <div className="space-y-2.5">
            {FAQ_ITEMS.map((item, i) => (
              <AnimatedSection key={i} delay={i * 50}>
                <div className="rounded-2xl bg-white border border-black/[0.04] overflow-hidden hover:border-black/[0.08] transition-colors">
                  <button
                    className="w-full px-6 py-5 flex items-center justify-between text-left"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  >
                    <span className="font-semibold text-foreground text-[14px] pr-4">{item.q}</span>
                    <ChevronDown
                      className={`h-4 w-4 text-foreground/30 transition-transform duration-300 shrink-0 ${
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
                    <div className="px-6 pb-5 text-[14px] text-foreground/50 leading-relaxed">{item.a}</div>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="py-24 md:py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] via-primary/[0.02] to-transparent" />
        <AnimatedSection className="max-w-[640px] mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/8 text-primary text-[13px] font-semibold mb-6 border border-primary/10">
            <Sparkles className="h-3.5 w-3.5" />
            Comece hoje mesmo
          </div>
          <h2 className="text-[28px] sm:text-[36px] lg:text-[42px] font-extrabold text-foreground leading-tight mb-5 tracking-tight">
            Pronta para transformar<br className="hidden sm:block" /> seu salão?
          </h2>
          <p className="text-[16px] sm:text-[18px] text-foreground/45 mb-10 max-w-[480px] mx-auto">
            Comece agora com 30 dias grátis e descubra como o {APP_NAME} pode simplificar sua rotina.
          </p>
          <Link href="/cadastro">
            <Button size="lg" className="text-[14px] px-10 h-[52px] rounded-full shadow-lg shadow-primary/20 font-semibold">
              Começar Teste Grátis
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <p className="text-[13px] text-foreground/35 mt-6">Sem cartão de crédito. Cancele a qualquer momento.</p>
        </AnimatedSection>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-black/[0.06] bg-white">
        <div className="max-w-[1100px] mx-auto px-6 py-16">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-14">
            <div>
              <div className="flex items-center gap-2.5 font-semibold text-[15px] text-foreground mb-4">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                </div>
                {APP_NAME}
              </div>
              <p className="text-[13px] text-foreground/40 leading-relaxed max-w-[240px]">
                Organize sua agenda e fidelize suas clientes com a plataforma mais completa do mercado.
              </p>
            </div>

            <div>
              <h4 className="text-[13px] font-bold text-foreground mb-4 uppercase tracking-wider">Produto</h4>
              <div className="space-y-3">
                <a href="#features" onClick={(e) => smoothScroll(e, "features")} className="block text-[13px] text-foreground/40 hover:text-foreground transition-colors">Funcionalidades</a>
                <a href="#pricing" onClick={(e) => smoothScroll(e, "pricing")} className="block text-[13px] text-foreground/40 hover:text-foreground transition-colors">Preços</a>
                <a href="#testimonials" onClick={(e) => smoothScroll(e, "testimonials")} className="block text-[13px] text-foreground/40 hover:text-foreground transition-colors">Depoimentos</a>
                <a href="#faq" onClick={(e) => smoothScroll(e, "faq")} className="block text-[13px] text-foreground/40 hover:text-foreground transition-colors">FAQ</a>
              </div>
            </div>

            <div>
              <h4 className="text-[13px] font-bold text-foreground mb-4 uppercase tracking-wider">Empresa</h4>
              <div className="space-y-3">
                <Link href="/login" className="block text-[13px] text-foreground/40 hover:text-foreground transition-colors">Entrar</Link>
                <Link href="/cadastro" className="block text-[13px] text-foreground/40 hover:text-foreground transition-colors">Criar Conta</Link>
              </div>
            </div>

            <div>
              <h4 className="text-[13px] font-bold text-foreground mb-4 uppercase tracking-wider">Legal</h4>
              <div className="space-y-3">
                <Link href="/politica-de-privacidade" className="block text-[13px] text-foreground/40 hover:text-foreground transition-colors">Política de Privacidade</Link>
                <Link href="/termos-de-uso" className="block text-[13px] text-foreground/40 hover:text-foreground transition-colors">Termos de Uso</Link>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-black/[0.04] flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[12px] text-foreground/30">
              &copy; {new Date().getFullYear()} {APP_NAME}. Todos os direitos reservados.
            </p>
            <p className="text-[12px] text-foreground/25">
              Feito com carinho para profissionais de beleza
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
