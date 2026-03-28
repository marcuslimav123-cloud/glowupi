import { useState, useEffect } from "react";
import { Crown, Check, ArrowRight, Loader2, Zap, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/utils";

type BillingPeriod = "mensal" | "semestral" | "anual";

interface PriceInfo {
  id: string;
  unit_amount: number;
  currency: string;
  recurring: any;
  metadata: Record<string, string>;
}

interface ProductInfo {
  id: string;
  name: string;
  description: string;
  metadata: Record<string, string>;
  prices: PriceInfo[];
}

const TIER_ORDER = ["1_pro", "2_5_pro", "6_15_pro", "15_plus_pro"];
const TIER_LABELS: Record<string, string> = {
  "1_pro": "1 Profissional",
  "2_5_pro": "2 a 5 Profissionais",
  "6_15_pro": "6 a 15 Profissionais",
  "15_plus_pro": "+15 Profissionais",
  "single": "Plano Único",
};

export default function Planos() {
  const { toast } = useToast();
  const [products, setProducts] = useState<ProductInfo[]>([]);
  const [pricingMode, setPricingMode] = useState("all_plans");
  const [period, setPeriod] = useState<BillingPeriod>("mensal");
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.classList.add("dark");
    return () => { document.documentElement.classList.remove("dark"); };
  }, []);

  useEffect(() => {
    fetch(apiUrl("/checkout/pricing-config"))
      .then(r => r.json())
      .then(data => {
        if (data.products) setProducts(data.products);
        if (data.pricingMode) setPricingMode(data.pricingMode);
      })
      .catch(() => toast({ title: "Erro", description: "Não foi possível carregar os planos", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, []);

  const handleSubscribe = async (product: ProductInfo, billingPeriod: BillingPeriod) => {
    const price = product.prices.find(p => p.metadata?.period === billingPeriod);
    if (!price) {
      toast({ title: "Erro", description: "Preço não disponível", variant: "destructive" });
      return;
    }

    const loadingKey = `${product.metadata?.tier}-${billingPeriod}`;
    setCheckoutLoading(loadingKey);

    try {
      const res = await fetch(apiUrl("/checkout/create-checkout-session"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ priceId: price.id, billingPeriod }),
      });
      if (res.status === 401 || res.status === 403) {
        toast({ title: "Sessão expirada", description: "Faça login novamente para continuar", variant: "destructive" });
        window.location.href = "/login";
        return;
      }
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast({ title: "Erro", description: data.error || "Não foi possível iniciar o checkout", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro", description: "Falha de conexão", variant: "destructive" });
    } finally {
      setCheckoutLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-foreground/50">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Carregando planos...</span>
        </div>
      </div>
    );
  }

  const filteredProducts = pricingMode === "single_price"
    ? products.filter(p => p.metadata?.tier === "single")
    : products.filter(p => p.metadata?.tier !== "single");

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    const ai = TIER_ORDER.indexOf(a.metadata?.tier);
    const bi = TIER_ORDER.indexOf(b.metadata?.tier);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  return (
    <div className="min-h-screen bg-background py-12 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/15 text-primary text-sm font-medium mb-4">
            <Crown className="h-4 w-4" />
            Escolha seu plano
          </div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight mb-3">
            Assine e comece a usar
          </h1>
          <p className="text-foreground/50 text-base max-w-md mx-auto">
            Escolha o plano ideal para o tamanho do seu negócio. Cancele quando quiser.
          </p>
        </div>

        {pricingMode !== "single_price" && (
          <div className="flex justify-center mb-10">
            <div className="inline-flex rounded-full p-1 bg-muted/50 border border-border">
              {(["mensal", "semestral", "anual"] as BillingPeriod[]).map((p) => (
                <button
                  key={p}
                  className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    period === p
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-foreground/50 hover:text-foreground"
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
        )}

        <div className={`grid gap-6 ${
          sortedProducts.length === 1 ? "max-w-sm mx-auto" :
          sortedProducts.length === 2 ? "md:grid-cols-2 max-w-2xl mx-auto" :
          sortedProducts.length === 3 ? "md:grid-cols-3" :
          "md:grid-cols-2 lg:grid-cols-4"
        }`}>
          {sortedProducts.map((product) => {
            const tier = product.metadata?.tier || "";
            const price = product.prices.find(p => p.metadata?.period === period);
            const isPopular = tier === "2_5_pro";
            const loadingKey = `${tier}-${period}`;

            return (
              <div
                key={product.id}
                className={`rounded-2xl p-6 border transition-all ${
                  isPopular
                    ? "bg-primary/5 border-primary/30 shadow-lg shadow-primary/10 ring-1 ring-primary/20"
                    : "bg-card border-border hover:border-primary/20"
                }`}
              >
                {isPopular && (
                  <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-semibold mb-4">
                    <Sparkles className="h-3 w-3" /> MAIS POPULAR
                  </div>
                )}

                <h3 className="text-lg font-bold text-foreground mb-1">
                  {TIER_LABELS[tier] || product.name}
                </h3>
                <p className="text-foreground/40 text-sm mb-5">{product.description}</p>

                {price && (
                  <div className="mb-6">
                    <span className="text-sm text-foreground/40">R$</span>
                    <span className="text-4xl font-extrabold text-foreground ml-1 tracking-tight">
                      {Math.floor(price.unit_amount / 100)}
                    </span>
                    <span className="text-foreground/40">,{String(price.unit_amount % 100).padStart(2, '0')}/mês</span>
                  </div>
                )}

                <Button
                  className="w-full rounded-xl h-11 text-sm font-semibold"
                  variant={isPopular ? "default" : "outline"}
                  onClick={() => handleSubscribe(product, period)}
                  disabled={checkoutLoading === loadingKey || !price}
                >
                  {checkoutLoading === loadingKey ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Redirecionando...
                    </>
                  ) : (
                    <>
                      Assinar
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>

                <p className="text-[11px] text-center text-foreground/30 mt-3">
                  {period === "anual" ? "Em até 12x s/ juros" :
                   period === "semestral" ? "Em até 6x s/ juros" :
                   "Cancele quando quiser"}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
