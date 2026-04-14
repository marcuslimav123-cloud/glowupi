import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Sparkles, CalendarDays, Users, BarChart3, DollarSign, Award,
  MessageSquare, Star, ChevronDown, Check, ArrowRight, Heart,
  Shield, Zap, Clock, TrendingUp, Gift, Crown, Loader2,
  ChevronRight, Percent, Timer, BadgeCheck, Flame,
} from "lucide-react";
import { apiUrl } from "@/lib/utils";

const FB_PIXEL_ID = "PIXEL_ID_AQUI";

const PROMO_MONTHLY_PRICE_ID = "price_1TMFmZ75EBjZCK7yUYlgxTIc";
const PROMO_ANNUAL_PRICE_ID = "price_1TMFmZ75EBjZCK7ytXUNXdJA";

function fbq(...args: any[]) {
  if (typeof window !== "undefined" && (window as any).fbq) {
    (window as any).fbq(...args);
  }
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

function useInView() {
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
    }, { threshold: 0.1 });
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

function CountdownBadge() {
  const [spots] = useState(() => {
    const stored = localStorage.getItem("promo_spots");
    if (stored) return parseInt(stored);
    const val = Math.floor(Math.random() * 15) + 12;
    localStorage.setItem("promo_spots", String(val));
    return val;
  });

  return (
    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/15 border border-red-500/25 text-red-400">
      <Flame className="h-4 w-4 animate-pulse" />
      <span className="text-sm font-bold">Restam apenas {spots} vagas com este valor</span>
    </div>
  );
}

const DORES = [
  {
    icon: Clock,
    title: "Perde horas respondendo WhatsApp",
    desc: "Cada mensagem de 'que horário tem?' te tira do atendimento e destrói sua produtividade.",
  },
  {
    icon: TrendingUp,
    title: "Não sabe quanto faturou no mês",
    desc: "Vive no escuro financeiro. Quando vai ver, o dinheiro sumiu entre comissões e despesas.",
  },
  {
    icon: Users,
    title: "Clientes somem sem avisar",
    desc: "Marcam e não aparecem. Você fica com o horário vago e perde dinheiro toda semana.",
  },
];

const SOLUCOES = [
  {
    icon: CalendarDays,
    title: "Agenda Online Automática",
    desc: "Sua cliente agenda sozinha, 24h por dia. Recebe confirmação e lembrete automático. Você só atende.",
    highlight: "Reduza faltas em até 60%",
  },
  {
    icon: DollarSign,
    title: "Financeiro em Tempo Real",
    desc: "Veja faturamento, comissões e contas a pagar no painel. Sem planilha, sem bagunça, sem surpresa.",
    highlight: "Controle total do seu dinheiro",
  },
  {
    icon: Award,
    title: "Clube de Fidelidade Inteligente",
    desc: "Sistema de pontos que faz sua cliente voltar mais vezes. Aumente a taxa de retorno em até 40%.",
    highlight: "Clientes que voltam sempre",
  },
  {
    icon: BarChart3,
    title: "Relatórios por Profissional",
    desc: "Saiba quem produz mais, qual serviço dá mais lucro e onde investir no seu negócio.",
    highlight: "Decisões baseadas em dados",
  },
  {
    icon: MessageSquare,
    title: "Lembretes e Campanhas",
    desc: "Notificações automáticas para clientes. Lembre aniversários, promoções e retornos com um clique.",
    highlight: "Marketing no piloto automático",
  },
  {
    icon: Heart,
    title: "App com a SUA Marca",
    desc: "Seu logo, suas cores. Suas clientes vão achar que você investiu milhares. Na verdade, custa menos que uma escova.",
    highlight: "Seu negócio, sua identidade",
  },
];

const ANTES_DEPOIS = [
  { antes: "Caderninho de papel e caneta", depois: "Agenda digital profissional" },
  { antes: "WhatsApp lotado de mensagens", depois: "Cliente agenda sozinha online" },
  { antes: "Não sabe quanto faturou", depois: "Dashboard financeiro em tempo real" },
  { antes: "Cliente some sem avisar", depois: "Lembretes automáticos reduzem faltas" },
  { antes: "Parece amadora com anotações", depois: "App profissional com sua marca" },
  { antes: "Perde clientes para concorrência", depois: "Fidelidade que faz clientes voltarem" },
];

const TESTIMONIALS = [
  {
    name: "Camila Rodrigues",
    role: "Dona de Salão de Beleza",
    text: "Minha agenda vivia uma bagunça, clientes ligando toda hora. Agora elas agendam sozinhas pelo app e eu consigo focar no que importa: atender bem.",
    metric: "Reduziu 70% das ligações",
  },
  {
    name: "Juliana Martins",
    role: "Esteticista e Empresária",
    text: "Eu não sabia quanto gastava por mês. O Glow Upi me mostrou que eu estava perdendo dinheiro em 3 serviços. Ajustei e meu lucro subiu 35%.",
    metric: "+35% de lucro",
  },
  {
    name: "Patrícia Almeida",
    role: "Proprietária de Clínica de Estética",
    text: "O clube de fidelidade foi um divisor de águas. Minhas clientes acumulam pontos e voltam muito mais. A taxa de retorno aumentou demais!",
    metric: "+40% taxa de retorno",
  },
  {
    name: "Fernanda Costa",
    role: "Nail Designer",
    text: "Eu atendia de casa e parecia amadora. Agora tenho meu próprio app com minha marca. Minhas clientes acham que sou uma empresa grande!",
    metric: "Imagem profissional",
  },
];

const FAQ_ITEMS = [
  {
    q: "Essa oferta é real? Por que está tão barata?",
    a: "Sim! Esta é a nossa oferta de fundadoras. Estamos selecionando as primeiras 100 profissionais que vão crescer junto com a plataforma. Depois desse grupo, o valor sobe para R$165/mês. Quem entrar agora, trava esse preço para sempre.",
  },
  {
    q: "Funciona para meu tipo de negócio?",
    a: "Sim! Salões de beleza, clínicas de estética, studios de sobrancelha, nail designers, extensão de cílios, maquiadoras, esmalterias — qualquer profissional do ramo de beleza e estética.",
  },
  {
    q: "Preciso instalar algum programa?",
    a: "Não! O Glow Upi funciona 100% online, direto no navegador do celular, tablet ou computador. Você também pode instalar como app na tela inicial do celular com um toque.",
  },
  {
    q: "Minha equipe pode usar também?",
    a: "Sim! O plano inclui até 15 profissionais. Cada um pode ter seu próprio acesso, ver sua agenda e comissões. Você gerencia tudo de um lugar só.",
  },
  {
    q: "E se eu não gostar?",
    a: "Você pode cancelar a qualquer momento, sem multa e sem burocracia. Mas com tudo o que o Glow Upi oferece, temos certeza de que você vai amar.",
  },
  {
    q: "Como funciona o onboarding guiado?",
    a: "Ao assinar, você passa por um passo a passo visual que configura tudo em menos de 10 minutos: seu perfil, serviços, horários e equipe. Sem complicação, sem tutorial longo.",
  },
  {
    q: "O que ganha na anuidade?",
    a: "Na anuidade, você paga 10 meses e ganha 12 — são 2 meses grátis! Equivale a R$81,58/mês. Além disso, recebe onboarding VIP com suporte personalizado e prioridade em novos recursos.",
  },
  {
    q: "Meus dados estão seguros?",
    a: "100%! Usamos criptografia de ponta, servidores seguros e estamos em conformidade com a LGPD. Seus dados e os de suas clientes estão protegidos.",
  },
];

const BONUS_ANUIDADE = [
  { icon: Gift, text: "2 meses grátis (pague 10, use 12)" },
  { icon: Crown, text: "Onboarding VIP com suporte personalizado" },
  { icon: BadgeCheck, text: "Selo 'Parceira Glow Upi' no perfil público" },
  { icon: Zap, text: "Acesso antecipado a novos recursos" },
];

type BillingPeriod = "mensal" | "anual";

export default function Landing() {
  const [period, setPeriod] = useState<BillingPeriod>("anual");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isLoadingCheckout, setIsLoadingCheckout] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const scrolled = useScrolled();

  useEffect(() => {
    if (FB_PIXEL_ID !== "PIXEL_ID_AQUI") {
      const script = document.createElement("script");
      script.innerHTML = `
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${FB_PIXEL_ID}');
        fbq('track', 'PageView');
      `;
      document.head.appendChild(script);

      const noscript = document.createElement("noscript");
      noscript.innerHTML = `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${FB_PIXEL_ID}&ev=PageView&noscript=1"/>`;
      document.body.appendChild(noscript);
    }
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
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.id) setAuthToken("session-active");
        })
        .catch(() => {});
    }
  }, [authToken]);

  useEffect(() => {
    if (!authToken) return;
    const pendingRaw = sessionStorage.getItem("pdvd_pending_promo");
    if (!pendingRaw) return;
    sessionStorage.removeItem("pdvd_pending_promo");
    try {
      const pending = JSON.parse(pendingRaw);
      if (pending.period) {
        proceedToCheckout(pending.period as BillingPeriod);
      }
    } catch {}
  }, [authToken]);

  const redirectToGoogleAuth = (billingPeriod: BillingPeriod) => {
    sessionStorage.setItem("pdvd_pending_promo", JSON.stringify({ period: billingPeriod }));
    const returnUrl = encodeURIComponent(window.location.origin + "/pdvd");
    window.location.href = apiUrl(`/auth/google/signin-popup?return_url=${returnUrl}`);
  };

  const proceedToCheckout = async (billingPeriod: BillingPeriod) => {
    const priceId = billingPeriod === "anual" ? PROMO_ANNUAL_PRICE_ID : PROMO_MONTHLY_PRICE_ID;
    setIsLoadingCheckout(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (authToken && authToken !== "session-active") headers["Authorization"] = `Bearer ${authToken}`;

      const res = await fetch(apiUrl("/checkout/create-direct-session"), {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({ priceId, billingPeriod }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        alert("Erro ao iniciar pagamento: " + (errData.error || "Tente novamente"));
        return;
      }
      const data = await res.json();
      if (data.url) {
        fbq("track", "InitiateCheckout", { value: billingPeriod === "anual" ? 979 : 97.9, currency: "BRL" });
        window.location.href = data.url;
      } else {
        alert("Erro ao iniciar pagamento: " + (data.error || "Tente novamente"));
      }
    } catch {
      alert("Erro de conexão. Tente novamente.");
    } finally {
      setIsLoadingCheckout(false);
    }
  };

  const handleSubscribe = (billingPeriod: BillingPeriod) => {
    fbq("track", "Lead", { content_name: `promo_fundadoras_${billingPeriod}` });
    if (!authToken) {
      redirectToGoogleAuth(billingPeriod);
      return;
    }
    proceedToCheckout(billingPeriod);
  };

  const smoothScroll = useCallback((e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0f0f] via-[#141210] to-[#0f0f0f] overflow-x-hidden text-white">
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-[#1a1510]/90 backdrop-blur-xl border-b border-white/[0.06]" : "bg-transparent"
      }`}>
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-[16px] sm:text-[18px] text-white">
            <img src="/logo-icon.png" alt="Glow Upi" className="h-10 w-10 sm:h-12 sm:w-12 object-contain" />
            Glow Upi
          </div>
          <a href="#oferta" onClick={e => smoothScroll(e, "oferta")}>
            <Button size="sm" className="text-[12px] sm:text-[13px] h-9 px-4 sm:px-5 rounded-full font-semibold shadow-md shadow-primary/15">
              Quero minha vaga
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </a>
        </div>
      </nav>

      <section className="pt-20 sm:pt-28 pb-12 sm:pb-20 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-transparent to-primary/[0.03]" />
        <div className="max-w-[900px] mx-auto text-center relative">
          <AnimatedSection>
            <CountdownBadge />
          </AnimatedSection>

          <AnimatedSection delay={100}>
            <h1 className="text-[28px] sm:text-[40px] lg:text-[52px] font-extrabold text-white leading-[1.1] mt-6 mb-5 tracking-tight">
              Cansada de perder clientes que{" "}
              <span className="bg-gradient-to-r from-red-400 to-red-500 bg-clip-text text-transparent">marcam e não aparecem?</span>
            </h1>
          </AnimatedSection>

          <AnimatedSection delay={200}>
            <p className="text-[15px] sm:text-[18px] text-white/50 leading-relaxed max-w-[640px] mx-auto mb-8">
              O <strong className="text-white">Glow Upi</strong> é o sistema completo que automatiza sua agenda, reduz faltas em até 60% e coloca seu negócio de beleza no piloto automático.
              <span className="block mt-2 text-primary font-semibold">Oferta exclusiva para as primeiras 100 fundadoras.</span>
            </p>
          </AnimatedSection>

          <AnimatedSection delay={300}>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
              <a href="#oferta" onClick={e => smoothScroll(e, "oferta")}>
                <Button size="lg" className="text-[14px] px-8 h-13 rounded-full shadow-lg shadow-primary/25 font-bold w-full sm:w-auto">
                  Garantir minha vaga por R$97,90/mês
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </a>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12px] sm:text-[13px] text-white/40">
              <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-green-400" /> Cancele quando quiser</span>
              <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-green-400" /> 100% seguro</span>
              <span className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-green-400" /> Pronta em 10 minutos</span>
            </div>
          </AnimatedSection>
        </div>
      </section>

      <section className="py-6 sm:py-8 px-4 sm:px-6 border-y border-white/[0.06] bg-white/[0.03]">
        <div className="max-w-[900px] mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8">
            {[
              { value: "500+", label: "Profissionais ativas" },
              { value: "50k+", label: "Agendamentos realizados" },
              { value: "60%", label: "Menos faltas" },
              { value: "4.9", label: "Nota de satisfação" },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <p className="text-[24px] sm:text-[28px] font-extrabold text-white tracking-tight">{stat.value}</p>
                <p className="text-[11px] sm:text-[13px] text-white/40 font-medium mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-[900px] mx-auto">
          <AnimatedSection className="text-center mb-10 sm:mb-14">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/15 text-red-400 text-[11px] sm:text-[12px] font-semibold mb-4 uppercase tracking-wider border border-red-500/20">
              O problema
            </div>
            <h2 className="text-[24px] sm:text-[32px] lg:text-[38px] font-extrabold text-white leading-tight tracking-tight">
              Você se identifica com alguma dessas situações?
            </h2>
          </AnimatedSection>

          <div className="grid gap-4 sm:grid-cols-3">
            {DORES.map((dor, i) => (
              <AnimatedSection key={i} delay={i * 80}>
                <div className="p-5 sm:p-6 rounded-2xl bg-red-500/[0.04] border border-red-500/[0.08] hover:border-red-500/[0.15] transition-all h-full">
                  <div className="h-10 w-10 rounded-xl bg-red-500/10 flex items-center justify-center mb-4">
                    <dor.icon className="h-5 w-5 text-red-400" />
                  </div>
                  <h3 className="text-[14px] sm:text-[15px] font-bold text-white mb-2">{dor.title}</h3>
                  <p className="text-white/40 text-[13px] sm:text-[14px] leading-relaxed">{dor.desc}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      <section id="solucao" className="py-16 sm:py-24 px-4 sm:px-6 bg-white/[0.02]">
        <div className="max-w-[1000px] mx-auto">
          <AnimatedSection className="text-center mb-10 sm:mb-14">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/15 text-primary text-[11px] sm:text-[12px] font-semibold mb-4 uppercase tracking-wider border border-primary/20">
              A solução
            </div>
            <h2 className="text-[24px] sm:text-[32px] lg:text-[38px] font-extrabold text-white leading-tight mb-4 tracking-tight">
              Tudo que você precisa para{" "}
              <span className="bg-gradient-to-r from-primary to-amber-400 bg-clip-text text-transparent">profissionalizar seu negócio</span>
            </h2>
            <p className="text-white/45 text-[14px] sm:text-[16px] max-w-[520px] mx-auto">
              Um sistema completo feito sob medida para profissionais de beleza e estética
            </p>
          </AnimatedSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SOLUCOES.map((sol, i) => (
              <AnimatedSection key={i} delay={i * 60}>
                <div className="group p-5 sm:p-6 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/[0.12] transition-all duration-300 h-full">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                    <sol.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-[14px] sm:text-[15px] font-bold text-white mb-2">{sol.title}</h3>
                  <p className="text-white/40 text-[13px] sm:text-[14px] leading-relaxed mb-3">{sol.desc}</p>
                  <span className="inline-flex items-center gap-1 text-primary text-[12px] font-semibold">
                    <Check className="h-3.5 w-3.5" /> {sol.highlight}
                  </span>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-[800px] mx-auto">
          <AnimatedSection className="text-center mb-10 sm:mb-14">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/15 text-primary text-[11px] sm:text-[12px] font-semibold mb-4 uppercase tracking-wider border border-primary/20">
              Transformação
            </div>
            <h2 className="text-[24px] sm:text-[32px] lg:text-[38px] font-extrabold text-white leading-tight tracking-tight">
              Antes vs. Depois do Glow Upi
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
                  <ChevronRight className="h-4 w-4 text-primary flex-shrink-0" />
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-green-500/15 flex items-center justify-center flex-shrink-0">
                      <Check className="h-3 w-3 text-green-400" />
                    </div>
                    <span className="text-[12px] sm:text-[14px] text-white/80 font-medium">{item.depois}</span>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      <section id="oferta" className="py-16 sm:py-24 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-primary/[0.03] to-transparent" />
        <div className="max-w-[900px] mx-auto relative">
          <AnimatedSection className="text-center mb-10 sm:mb-12">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/15 text-primary text-[11px] sm:text-[12px] font-semibold mb-4 uppercase tracking-wider border border-primary/20">
              <Percent className="h-3.5 w-3.5" /> Oferta exclusiva
            </div>
            <h2 className="text-[24px] sm:text-[32px] lg:text-[42px] font-extrabold text-white leading-tight mb-3 tracking-tight">
              Plano Completo — 15 Profissionais
            </h2>
            <p className="text-white/45 text-[14px] sm:text-[16px] max-w-[500px] mx-auto">
              Tudo que seu negócio precisa, por um valor que cabe no bolso
            </p>
          </AnimatedSection>

          <div className="flex justify-center mb-8">
            <div className="inline-flex rounded-full p-1 bg-white/[0.06] border border-white/[0.08]">
              <button
                className={`px-5 sm:px-6 py-2.5 rounded-full text-[13px] font-medium transition-all duration-200 ${
                  period === "mensal" ? "bg-primary text-white shadow-md" : "text-white/50 hover:text-white"
                }`}
                onClick={() => setPeriod("mensal")}
              >
                Mensal
              </button>
              <button
                className={`px-5 sm:px-6 py-2.5 rounded-full text-[13px] font-medium transition-all duration-200 flex items-center gap-1.5 ${
                  period === "anual" ? "bg-primary text-white shadow-md" : "text-white/50 hover:text-white"
                }`}
                onClick={() => setPeriod("anual")}
              >
                Anual
                <span className="text-[10px] font-bold bg-white/20 px-1.5 py-0.5 rounded-full">2 MESES GRÁTIS</span>
              </button>
            </div>
          </div>

          <AnimatedSection>
            <div className="max-w-[520px] mx-auto">
              <div className="rounded-3xl bg-white/[0.06] border-2 border-primary shadow-2xl shadow-primary/10 p-6 sm:p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-primary text-white text-[10px] font-bold px-4 py-1.5 rounded-bl-xl">
                  OFERTA FUNDADORAS
                </div>

                <div className="text-center mb-6">
                  <p className="text-[13px] text-white/40 mb-1">De <span className="line-through">R$ 165,00/mês</span></p>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-[14px] text-white/50">R$</span>
                    <span className="text-[56px] sm:text-[64px] font-extrabold text-white tracking-tight leading-none">
                      {period === "anual" ? "81" : "97"}
                    </span>
                    <div className="text-left">
                      <span className="text-[20px] sm:text-[24px] font-bold text-white">
                        ,{period === "anual" ? "58" : "90"}
                      </span>
                      <span className="block text-[12px] text-white/40">/mês</span>
                    </div>
                  </div>
                  {period === "anual" && (
                    <p className="text-[13px] text-primary font-medium mt-1">
                      Total: R$ 979,00/ano (2 meses grátis!)
                    </p>
                  )}
                  <div className="inline-flex items-center gap-1 mt-2 px-3 py-1 rounded-full bg-green-500/15 text-green-400 text-[12px] font-semibold">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Economia de {period === "anual" ? "R$ 1.001" : "R$ 67"}/
                    {period === "anual" ? "ano" : "mês"} vs. preço normal
                  </div>
                </div>

                <div className="space-y-2.5 mb-6">
                  {[
                    "Até 15 profissionais",
                    "Agenda online automática",
                    "Lembretes e confirmações",
                    "Controle financeiro completo",
                    "Clube de fidelidade",
                    "Relatórios por profissional",
                    "App com sua marca",
                    "Gestão de estoque",
                    "Campanhas e marketing",
                    "Onboarding guiado em 10 min",
                    "Suporte prioritário",
                  ].map((feat, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="text-[13px] sm:text-[14px] text-white/70">{feat}</span>
                    </div>
                  ))}
                </div>

                <Button
                  className="w-full h-13 sm:h-14 text-[15px] font-bold rounded-full shadow-lg shadow-primary/20"
                  onClick={() => handleSubscribe(period)}
                  disabled={isLoadingCheckout}
                >
                  {isLoadingCheckout ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Redirecionando...</>
                  ) : (
                    <>
                      Garantir minha vaga agora
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>

                <div className="flex items-center justify-center gap-4 mt-4 text-[11px] text-white/30">
                  <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> Pagamento seguro</span>
                  <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> Acesso imediato</span>
                </div>
              </div>
            </div>
          </AnimatedSection>

          {period === "anual" && (
            <AnimatedSection delay={100} className="mt-8">
              <div className="max-w-[520px] mx-auto">
                <h3 className="text-center text-[14px] font-bold text-white mb-4">
                  <Gift className="inline h-4 w-4 text-primary mr-1.5" />
                  Bônus exclusivos da anuidade
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {BONUS_ANUIDADE.map((bonus, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                      <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
                        <bonus.icon className="h-4 w-4 text-primary" />
                      </div>
                      <span className="text-[13px] text-white/60">{bonus.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </AnimatedSection>
          )}
        </div>
      </section>

      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-white/[0.02]">
        <div className="max-w-[1000px] mx-auto">
          <AnimatedSection className="text-center mb-10 sm:mb-14">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/15 text-primary text-[11px] sm:text-[12px] font-semibold mb-4 uppercase tracking-wider border border-primary/20">
              Depoimentos
            </div>
            <h2 className="text-[24px] sm:text-[32px] lg:text-[38px] font-extrabold text-white leading-tight tracking-tight">
              Profissionais que já transformaram seus negócios
            </h2>
          </AnimatedSection>

          <div className="grid sm:grid-cols-2 gap-4">
            {TESTIMONIALS.map((t, i) => (
              <AnimatedSection key={i} delay={i * 80}>
                <div className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-5 sm:p-6 h-full flex flex-col hover:bg-white/[0.07] transition-all">
                  <div className="flex gap-0.5 mb-4">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} className="h-3.5 w-3.5 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-white/50 text-[13px] sm:text-[14px] leading-relaxed mb-4 flex-1">"{t.text}"</p>
                  <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/25 to-primary/5 flex items-center justify-center text-primary font-bold text-[13px]">
                        {t.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-[13px] font-bold text-white">{t.name}</p>
                        <p className="text-[11px] text-white/40">{t.role}</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-green-400 bg-green-400/10 px-2 py-1 rounded-full">
                      {t.metric}
                    </span>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-[640px] mx-auto">
          <AnimatedSection className="text-center mb-10 sm:mb-14">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/15 text-primary text-[11px] sm:text-[12px] font-semibold mb-4 uppercase tracking-wider border border-primary/20">
              FAQ
            </div>
            <h2 className="text-[24px] sm:text-[32px] lg:text-[38px] font-extrabold text-white leading-tight tracking-tight">
              Perguntas Frequentes
            </h2>
          </AnimatedSection>

          <div className="space-y-2.5">
            {FAQ_ITEMS.map((item, i) => (
              <AnimatedSection key={i} delay={i * 40}>
                <div className="rounded-2xl bg-white/[0.04] border border-white/[0.06] overflow-hidden hover:border-white/[0.12] transition-colors">
                  <button
                    className="w-full px-5 sm:px-6 py-4 sm:py-5 flex items-center justify-between text-left"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  >
                    <span className="font-semibold text-white text-[13px] sm:text-[14px] pr-4">{item.q}</span>
                    <ChevronDown className={`h-4 w-4 text-white/30 transition-transform duration-300 shrink-0 ${openFaq === i ? "rotate-180" : ""}`} />
                  </button>
                  <div
                    className="overflow-hidden transition-all duration-300"
                    style={{ maxHeight: openFaq === i ? "500px" : "0px", opacity: openFaq === i ? 1 : 0 }}
                  >
                    <div className="px-5 sm:px-6 pb-4 sm:pb-5 text-[13px] sm:text-[14px] text-white/50 leading-relaxed">{item.a}</div>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.08] via-primary/[0.03] to-transparent" />
        <div className="max-w-[640px] mx-auto text-center relative">
          <AnimatedSection>
            <h2 className="text-[24px] sm:text-[32px] lg:text-[38px] font-extrabold text-white leading-tight mb-4 tracking-tight">
              Não deixe sua concorrente<br />
              <span className="bg-gradient-to-r from-primary to-amber-400 bg-clip-text text-transparent">sair na frente</span>
            </h2>
            <p className="text-white/45 text-[14px] sm:text-[16px] mb-8 max-w-[480px] mx-auto">
              As primeiras 100 fundadoras vão travar o menor preço da história do Glow Upi. Depois, volta ao normal.
            </p>
            <Button
              size="lg"
              className="text-[14px] px-10 h-13 sm:h-14 rounded-full shadow-xl shadow-primary/25 font-bold"
              onClick={() => handleSubscribe(period)}
              disabled={isLoadingCheckout}
            >
              {isLoadingCheckout ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Redirecionando...</>
              ) : (
                <>
                  Quero ser fundadora — R${period === "anual" ? "81,58" : "97,90"}/mês
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
            <p className="text-[11px] text-white/30 mt-4">Pagamento seguro via Stripe · Cancele quando quiser · Acesso imediato</p>
          </AnimatedSection>
        </div>
      </section>

      <footer className="py-8 px-4 sm:px-6 border-t border-white/[0.06]">
        <div className="max-w-[900px] mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <img src="/logo-icon.png" alt="Glow Upi" className="h-8 w-8 object-contain" />
            <span className="font-semibold text-white/60">Glow Upi</span>
          </div>
          <p className="text-[12px] text-white/30">
            &copy; {new Date().getFullYear()} Glow Upi. Todos os direitos reservados.
          </p>
          <div className="flex items-center justify-center gap-4 mt-3">
            <a href="/politica-de-privacidade" className="text-[11px] text-white/25 hover:text-white/50 transition-colors">Política de Privacidade</a>
            <a href="/termos-de-uso" className="text-[11px] text-white/25 hover:text-white/50 transition-colors">Termos de Uso</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
