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
  ChevronRight,
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
  const discountColor = period === "anual" ? "bg-amber-500" : "bg-blue-500";

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary font-display font-bold text-xl tracking-wide">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            {APP_NAME}
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Funcionalidades</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Preços</a>
            <a href="#testimonials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Depoimentos</a>
            <a href="#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" className="text-sm">Entrar</Button>
            </Link>
            <Link href="/cadastro">
              <Button className="text-sm shadow-lg shadow-primary/20">
                Teste Grátis <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-amber-100/10 pointer-events-none" />
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-200/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
            <Sparkles className="h-4 w-4" />
            30 dias grátis para testar
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display text-foreground leading-tight mb-6">
            A plataforma completa para{" "}
            <span className="text-primary">profissionais de beleza</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Gerencie sua agenda, clientes, finanças e muito mais em um só lugar.
            Feito sob medida para salões de beleza, estéticas e profissionais autônomos.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/cadastro">
              <Button size="lg" className="text-base px-8 h-14 shadow-xl shadow-primary/25 w-full sm:w-auto">
                Começar Agora — É Grátis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <a href="#features">
              <Button size="lg" variant="outline" className="text-base px-8 h-14 w-full sm:w-auto">
                Ver Funcionalidades
              </Button>
            </a>
          </div>
          <div className="mt-10 flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Check className="h-4 w-4 text-green-500" /> Sem cartão de crédito</span>
            <span className="flex items-center gap-1"><Check className="h-4 w-4 text-green-500" /> Cancele quando quiser</span>
            <span className="flex items-center gap-1"><Shield className="h-4 w-4 text-green-500" /> 100% seguro</span>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 px-4 bg-card/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-display text-foreground mb-4">
              Tudo que você precisa em um só lugar
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Ferramentas poderosas para transformar a gestão do seu salão
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, i) => (
              <div
                key={i}
                className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300"
              >
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-display text-foreground mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-display text-foreground mb-4">Preços</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Escolha o plano ideal para o tamanho do seu salão
            </p>
          </div>

          {pricingMode === "single_price" ? (
            <div className="max-w-md mx-auto">
              <div className="rounded-2xl border-2 border-primary bg-card p-8 text-center shadow-xl shadow-primary/10">
                <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold mb-4">
                  <Zap className="h-3 w-3" /> PLANO ÚNICO
                </div>
                <h3 className="font-display text-2xl text-foreground mb-2">Acesso Completo</h3>
                <p className="text-muted-foreground text-sm mb-6">Todas as funcionalidades, sem limites</p>
                <div className="mb-6">
                  <span className="text-sm text-muted-foreground">R$</span>
                  <span className="text-5xl font-display text-foreground ml-1">97</span>
                  <span className="text-muted-foreground">,00/mês</span>
                </div>
                <ul className="text-left space-y-3 mb-8">
                  {["Profissionais ilimitados", "Agenda completa", "Controle financeiro", "Pacotes de serviços", "Clube de fidelidade", "Relatórios avançados", "Suporte prioritário"].map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-primary flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <Button
                  size="lg"
                  className="w-full h-14 text-base shadow-lg shadow-primary/20"
                  onClick={() => handleSubscribe("single", "mensal")}
                  disabled={isLoadingCheckout === "single-mensal"}
                >
                  {isLoadingCheckout === "single-mensal" ? "Redirecionando..." : "Assinar Agora"}
                </Button>
                <p className="text-xs text-muted-foreground mt-3">Em até 12x sem juros no cartão</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-center mb-10">
                <div className="inline-flex rounded-xl bg-card border border-border p-1 shadow-sm">
                  {(["anual", "semestral", "mensal"] as BillingPeriod[]).map((p) => (
                    <button
                      key={p}
                      className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        period === p
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      onClick={() => setPeriod(p)}
                    >
                      <div>{p === "anual" ? "Anual" : p === "semestral" ? "Semestral" : "Mensal"}</div>
                      {p === "anual" && <div className="text-xs opacity-80">30% de desconto</div>}
                      {p === "semestral" && <div className="text-xs opacity-80">15% de desconto</div>}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
                {TIERS_STATIC.map((tier) => {
                  const priceValue = tier.prices[period];
                  const originalPrice = tier.prices.mensal;
                  const isPopular = tier.popular;
                  const loadingKey = `${tier.tier}-${period}`;

                  return (
                    <div
                      key={tier.tier}
                      className={`rounded-2xl bg-card p-6 flex flex-col relative transition-all duration-300 hover:shadow-xl ${
                        isPopular
                          ? "border-2 border-primary shadow-xl shadow-primary/10 scale-[1.02]"
                          : "border border-border hover:border-primary/30"
                      }`}
                    >
                      {discountLabel && (
                        <div className={`absolute -top-3 right-4 ${discountColor} text-white text-xs font-bold px-3 py-1 rounded-full shadow-md`}>
                          {discountLabel}
                        </div>
                      )}
                      {isPopular && (
                        <div className="absolute -top-3 left-4 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full shadow-md">
                          POPULAR
                        </div>
                      )}

                      <h3 className="font-display text-lg text-foreground mt-2">{tier.label}</h3>

                      <div className="mt-4 mb-1">
                        <span className="text-sm text-muted-foreground">R$</span>
                        <span className="text-4xl font-display text-foreground ml-1">
                          {formatBRL(priceValue).split(",")[0]}
                        </span>
                        <span className="text-muted-foreground">,{formatBRL(priceValue).split(",")[1]}/mês</span>
                      </div>

                      {period !== "mensal" && (
                        <p className="text-sm text-muted-foreground line-through mb-1">
                          R$ {formatBRL(originalPrice)}/mês
                        </p>
                      )}

                      {period !== "mensal" && (
                        <p className="text-sm text-muted-foreground mb-4">
                          Valor Total: R$ {formatBRL(tier.totals[period as "semestral" | "anual"])}
                        </p>
                      )}

                      {period === "mensal" && <div className="mb-4" />}

                      <Button
                        className={`w-full mt-auto h-12 font-semibold ${
                          isPopular ? "shadow-lg shadow-primary/20" : ""
                        }`}
                        variant={isPopular ? "default" : "outline"}
                        onClick={() => handleSubscribe(tier.tier, period)}
                        disabled={isLoadingCheckout === loadingKey}
                      >
                        {isLoadingCheckout === loadingKey ? "Redirecionando..." : "Assinar"}
                      </Button>

                      <p className="text-xs text-center text-muted-foreground mt-2">
                        {period === "anual"
                          ? "Em até 12x s/ juros no cartão"
                          : period === "semestral"
                          ? "Em até 6x s/ juros no cartão"
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

      <section id="testimonials" className="py-20 px-4 bg-card/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-display text-foreground mb-4">
              O que nossas clientes dizem
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="rounded-2xl bg-card border border-border p-6">
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-muted-foreground text-sm mb-4 italic">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-display text-foreground mb-4">
              Perguntas Frequentes
            </h2>
          </div>
          <div className="space-y-3">
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
                <button
                  className="w-full px-6 py-4 flex items-center justify-between text-left"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="font-medium text-foreground text-sm">{item.q}</span>
                  <ChevronDown
                    className={`h-5 w-5 text-muted-foreground transition-transform ${
                      openFaq === i ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-4 text-sm text-muted-foreground">{item.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 pointer-events-none" />
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <h2 className="text-3xl sm:text-4xl font-display text-foreground mb-4">
            Pronta para transformar seu salão?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Comece agora com 30 dias grátis e descubra como o Glow Agenda pode simplificar sua rotina.
          </p>
          <Link href="/cadastro">
            <Button size="lg" className="text-base px-10 h-14 shadow-xl shadow-primary/25">
              Começar Teste Grátis
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-border py-12 px-4 bg-card/50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 text-primary font-display font-bold text-lg">
            <Sparkles className="h-5 w-5" />
            {APP_NAME}
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Funcionalidades</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Preços</a>
            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} {APP_NAME}. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
