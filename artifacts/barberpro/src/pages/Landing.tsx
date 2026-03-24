import React, { useState, useEffect } from "react";
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
  { q: "Preciso instalar algum software?", a: "Não! O Glow Agenda funciona 100% online, direto no navegador do computador, tablet ou celular." },
  { q: "Como funciona o pagamento?", a: "O pagamento é feito via cartão de crédito, processado de forma segura pelo Stripe. Você pode cancelar a qualquer momento." },
  { q: "Posso trocar de plano depois?", a: "Claro! Você pode fazer upgrade ou downgrade do seu plano a qualquer momento, e o valor é ajustado proporcionalmente." },
  { q: "Meus dados estão seguros?", a: "Sim! Utilizamos criptografia de ponta e servidores seguros para proteger todas as informações do seu salão e clientes." },
  { q: "Funciona para qualquer tipo de salão?", a: "Sim! Manicures, cabeleireiras, esteticistas, maquiadoras, barbeiros — qualquer profissional de beleza." },
];

const TESTIMONIALS = [
  { name: "Ana Carolina", role: "Esteticista", text: "Desde que comecei a usar o Glow Agenda, minha agenda nunca mais ficou bagunçada. Minhas clientes adoram a facilidade!" },
  { name: "Fernanda Silva", role: "Cabeleireira", text: "O controle financeiro me ajudou a entender onde eu estava perdendo dinheiro. Hoje meu salão é muito mais lucrativo." },
  { name: "Patricia Mendes", role: "Proprietária de Salão", text: "Com o clube de fidelidade, minhas clientes voltam muito mais. A taxa de retorno aumentou 40% em 3 meses!" },
];

type BillingPeriod = "mensal" | "semestral" | "anual";

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Landing() {
  const [period, setPeriod] = useState<BillingPeriod>("anual");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [pricingMode, setPricingMode] = useState<string>("all_plans");
  const [stripeProducts, setStripeProducts] = useState<ProductInfo[]>([]);
  const [isLoadingCheckout, setIsLoadingCheckout] = useState<string | null>(null);

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
        body: JSON.stringify({ priceId: price.id }),
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

  const discountLabel = period === "anual" ? "30% OFF" : period === "semestral" ? "15% OFF" : null;

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#fafafa]/80 backdrop-blur-xl border-b border-black/[0.04]">
        <div className="max-w-[1200px] mx-auto px-6 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-[15px] tracking-tight text-foreground">
            <Sparkles className="h-[18px] w-[18px] text-primary" />
            {APP_NAME}
          </div>
          <div className="hidden md:flex items-center gap-7">
            <a href="#features" className="text-xs text-foreground/60 hover:text-foreground transition-colors">Funcionalidades</a>
            <a href="#pricing" className="text-xs text-foreground/60 hover:text-foreground transition-colors">Preços</a>
            <a href="#testimonials" className="text-xs text-foreground/60 hover:text-foreground transition-colors">Depoimentos</a>
            <a href="#faq" className="text-xs text-foreground/60 hover:text-foreground transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-xs h-8 px-3 text-foreground/60 hover:text-foreground">
                Entrar
              </Button>
            </Link>
            <Link href="/cadastro">
              <Button size="sm" className="text-xs h-8 px-4 rounded-full">
                Teste Grátis
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <section className="pt-28 pb-24 px-6">
        <div className="max-w-[680px] mx-auto text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/8 text-primary text-xs font-medium mb-8 border border-primary/10">
            <Sparkles className="h-3 w-3" />
            30 dias grátis para testar
          </div>
          <h1 className="text-[44px] sm:text-[56px] lg:text-[64px] font-bold text-foreground leading-[1.05] mb-6">
            A plataforma completa para{" "}
            <span className="bg-gradient-to-r from-primary to-amber-500 bg-clip-text text-transparent">profissionais de beleza</span>
          </h1>
          <p className="text-[17px] sm:text-[19px] text-foreground/50 leading-relaxed max-w-[520px] mx-auto mb-10">
            Gerencie sua agenda, clientes, finanças e muito mais em um só lugar. Feito sob medida para salões de beleza e estéticas.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/cadastro">
              <Button size="lg" className="text-sm px-8 h-12 rounded-full shadow-lg shadow-primary/15 font-medium w-full sm:w-auto">
                Começar Agora — É Grátis
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <a href="#features">
              <Button size="lg" variant="outline" className="text-sm px-8 h-12 rounded-full w-full sm:w-auto border-black/10 text-foreground/70 hover:text-foreground">
                Ver Funcionalidades
              </Button>
            </a>
          </div>
          <div className="mt-10 flex items-center justify-center gap-6 text-[13px] text-foreground/40">
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-green-500" /> Sem cartão de crédito</span>
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-green-500" /> Cancele quando quiser</span>
            <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-green-500" /> 100% seguro</span>
          </div>
        </div>
      </section>

      <section id="features" className="py-24 px-6 bg-white">
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center mb-16">
            <p className="text-primary text-sm font-medium mb-3">Funcionalidades</p>
            <h2 className="text-[32px] sm:text-[40px] font-bold text-foreground leading-tight mb-4">
              Tudo que você precisa em um só lugar
            </h2>
            <p className="text-foreground/50 text-[17px] max-w-[480px] mx-auto">
              Ferramentas poderosas para transformar a gestão do seu salão
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((feature, i) => (
              <div
                key={i}
                className="group p-6 rounded-2xl bg-[#fafafa] hover:bg-white border border-transparent hover:border-black/[0.04] hover:shadow-lg hover:shadow-black/[0.03] transition-all duration-300"
              >
                <div className="h-10 w-10 rounded-xl bg-primary/8 flex items-center justify-center mb-4">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-[15px] font-semibold text-foreground mb-1.5">{feature.title}</h3>
                <p className="text-foreground/45 text-[14px] leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {pricingMode !== "hidden" && (
        <section id="pricing" className="py-24 px-6">
          <div className="max-w-[1100px] mx-auto">
            <div className="text-center mb-14">
              <p className="text-primary text-sm font-medium mb-3">Preços</p>
              <h2 className="text-[32px] sm:text-[40px] font-bold text-foreground leading-tight mb-4">
                Escolha o plano ideal
              </h2>
              <p className="text-foreground/50 text-[17px] max-w-[440px] mx-auto">
                Planos flexíveis para o tamanho do seu negócio
              </p>
            </div>

            {pricingMode === "single_price" ? (
              <div className="max-w-sm mx-auto">
                <div className="rounded-3xl bg-white border border-black/[0.06] p-8 text-center shadow-xl shadow-black/[0.03]">
                  <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/8 text-primary text-xs font-semibold mb-5">
                    <Zap className="h-3 w-3" /> PLANO ÚNICO
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-1.5">Acesso Completo</h3>
                  <p className="text-foreground/45 text-sm mb-6">Todas as funcionalidades, sem limites</p>
                  <div className="mb-8">
                    <span className="text-sm text-foreground/40">R$</span>
                    <span className="text-5xl font-bold text-foreground ml-1 tracking-tight">97</span>
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
                    className="w-full h-12 text-sm rounded-full font-medium"
                    onClick={() => handleSubscribe("single", "mensal")}
                    disabled={isLoadingCheckout === "single-mensal"}
                  >
                    {isLoadingCheckout === "single-mensal" ? "Redirecionando..." : "Assinar Agora"}
                  </Button>
                  <p className="text-xs text-foreground/35 mt-3">Em até 12x sem juros no cartão</p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-center mb-10">
                  <div className="inline-flex rounded-full bg-white border border-black/[0.06] p-1 shadow-sm">
                    {(["anual", "semestral", "mensal"] as BillingPeriod[]).map((p) => (
                      <button
                        key={p}
                        className={`px-5 py-2 rounded-full text-[13px] font-medium transition-all duration-200 ${
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

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-[1000px] mx-auto">
                  {TIERS_STATIC.map((tier) => {
                    const priceValue = tier.prices[period];
                    const originalPrice = tier.prices.mensal;
                    const isPopular = tier.popular;
                    const loadingKey = `${tier.tier}-${period}`;

                    return (
                      <div
                        key={tier.tier}
                        className={`rounded-2xl bg-white p-6 flex flex-col relative transition-all duration-300 ${
                          isPopular
                            ? "border-2 border-primary shadow-xl shadow-primary/8 ring-1 ring-primary/5"
                            : "border border-black/[0.06] hover:border-black/[0.1] hover:shadow-lg hover:shadow-black/[0.03]"
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

                        <h3 className="font-semibold text-[15px] text-foreground mt-2">{tier.label}</h3>

                        <div className="mt-4 mb-1">
                          <span className="text-xs text-foreground/40">R$</span>
                          <span className="text-[32px] font-bold text-foreground ml-0.5 tracking-tight">
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
                          className={`w-full mt-auto h-11 text-[13px] font-medium rounded-full ${
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
                            : "Cobrança mensal"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </section>
      )}

      <section id="testimonials" className="py-24 px-6 bg-white">
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center mb-14">
            <p className="text-primary text-sm font-medium mb-3">Depoimentos</p>
            <h2 className="text-[32px] sm:text-[40px] font-bold text-foreground leading-tight">
              O que nossas clientes dizem
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="rounded-2xl bg-[#fafafa] border border-transparent p-7">
                <div className="flex gap-0.5 mb-5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-foreground/60 text-[14px] leading-relaxed mb-6">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-semibold text-sm">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{t.name}</p>
                    <p className="text-xs text-foreground/40">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="py-24 px-6">
        <div className="max-w-[640px] mx-auto">
          <div className="text-center mb-14">
            <p className="text-primary text-sm font-medium mb-3">FAQ</p>
            <h2 className="text-[32px] sm:text-[40px] font-bold text-foreground leading-tight">
              Perguntas Frequentes
            </h2>
          </div>
          <div className="space-y-2">
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} className="rounded-2xl bg-white border border-black/[0.04] overflow-hidden">
                <button
                  className="w-full px-6 py-4.5 flex items-center justify-between text-left"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="font-medium text-foreground text-[14px]">{item.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 text-foreground/30 transition-transform duration-200 ${
                      openFaq === i ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5 text-[14px] text-foreground/50 leading-relaxed">{item.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-6">
        <div className="max-w-[640px] mx-auto text-center">
          <h2 className="text-[32px] sm:text-[40px] font-bold text-foreground leading-tight mb-4">
            Pronta para transformar seu salão?
          </h2>
          <p className="text-[17px] text-foreground/50 mb-10">
            Comece agora com 30 dias grátis e descubra como o {APP_NAME} pode simplificar sua rotina.
          </p>
          <Link href="/cadastro">
            <Button size="lg" className="text-sm px-10 h-12 rounded-full shadow-lg shadow-primary/15 font-medium">
              Começar Teste Grátis
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-black/[0.04] py-10 px-6 bg-white">
        <div className="max-w-[1100px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 font-semibold text-[14px] text-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            {APP_NAME}
          </div>
          <div className="flex gap-6 text-[13px] text-foreground/40">
            <a href="#features" className="hover:text-foreground transition-colors">Funcionalidades</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Preços</a>
            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="flex gap-4 text-[12px] text-foreground/35">
              <Link href="/politica-de-privacidade" className="hover:text-foreground transition-colors">Política de Privacidade</Link>
              <Link href="/termos-de-uso" className="hover:text-foreground transition-colors">Termos de Uso</Link>
            </div>
            <p className="text-[12px] text-foreground/30">
              &copy; {new Date().getFullYear()} {APP_NAME}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
