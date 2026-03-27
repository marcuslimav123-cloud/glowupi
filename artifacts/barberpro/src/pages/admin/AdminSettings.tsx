import React, { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { apiUrl } from "@/lib/utils";
import { Settings, Save, ToggleLeft, ToggleRight, Info, Shield, FileText, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const PRICING_MODES = [
  { value: "all_plans", label: "Todos os Planos", description: "Exibe todos os 4 planos com toggle mensal/semestral/anual" },
  { value: "single_price", label: "Preço Único", description: "Exibe apenas o plano único R$97/mês na landing page" },
  { value: "hidden", label: "Oculto", description: "Esconde a seção de preços da landing page" },
];

export default function AdminSettings() {
  const { toast } = useToast();
  const [config, setConfig] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pricingMode, setPricingMode] = useState("all_plans");
  const [freeTrialEnabled, setFreeTrialEnabled] = useState(true);
  const [savingTrial, setSavingTrial] = useState(false);
  const [privacyPolicy, setPrivacyPolicy] = useState("");
  const [termsOfUse, setTermsOfUse] = useState("");
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [savingTerms, setSavingTerms] = useState(false);
  const [activeTab, setActiveTab] = useState<"privacy" | "terms">("privacy");

  useEffect(() => {
    fetch(apiUrl("/admin/config"), { credentials: "include" })
      .then(r => r.json())
      .then(data => {
        setConfig(data);
        setPricingMode(data.pricing_mode || "all_plans");
        setFreeTrialEnabled(data.free_trial_enabled !== "false");
        setPrivacyPolicy(data.lgpd_privacy_policy || "");
        setTermsOfUse(data.lgpd_terms_of_use || "");
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const saveTrialMode = async (enabled: boolean) => {
    setSavingTrial(true);
    try {
      const res = await fetch(apiUrl("/admin/config"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ chave: "free_trial_enabled", valor: enabled ? "true" : "false" }),
      });
      if (res.ok) {
        setFreeTrialEnabled(enabled);
        toast({ title: "Configuração salva", description: `Teste grátis: ${enabled ? "Ativado" : "Desativado"}` });
      }
    } catch {
      toast({ title: "Erro", description: "Falha ao salvar configuração", variant: "destructive" });
    } finally {
      setSavingTrial(false);
    }
  };

  const savePricingMode = async (mode: string) => {
    setSaving(true);
    try {
      const res = await fetch(apiUrl("/admin/config"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ chave: "pricing_mode", valor: mode }),
      });
      if (res.ok) {
        setPricingMode(mode);
        toast({ title: "Configuração salva", description: `Modo de preços: ${PRICING_MODES.find(m => m.value === mode)?.label}` });
      }
    } catch {
      toast({ title: "Erro", description: "Falha ao salvar configuração", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const saveConfig = async (chave: string, valor: string, setLoading: (v: boolean) => void, label: string) => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/admin/config"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ chave, valor }),
      });
      if (res.ok) {
        toast({ title: `${label} salvo(a)`, description: "As alterações já estão visíveis na plataforma" });
      }
    } catch {
      toast({ title: "Erro", description: "Falha ao salvar", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-display text-white mb-1">Configurações</h1>
          <p className="text-slate-400">Configurações da plataforma</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Settings className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-display text-white">Modo de Exibição de Preços</h2>
                  <p className="text-sm text-slate-400">Controla como os planos são exibidos na landing page</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {PRICING_MODES.map(mode => (
                  <button
                    key={mode.value}
                    onClick={() => savePricingMode(mode.value)}
                    disabled={saving}
                    className={`p-4 rounded-xl border text-left transition-all duration-200 ${
                      pricingMode === mode.value
                        ? "bg-primary/10 border-primary/30 ring-1 ring-primary/20"
                        : "bg-white/5 border-white/10 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-medium ${pricingMode === mode.value ? "text-primary" : "text-white"}`}>
                        {mode.label}
                      </span>
                      {pricingMode === mode.value ? (
                        <ToggleRight className="h-5 w-5 text-primary" />
                      ) : (
                        <ToggleLeft className="h-5 w-5 text-slate-500" />
                      )}
                    </div>
                    <p className="text-xs text-slate-400">{mode.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <Gift className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-lg font-display text-white">Modo de Teste Grátis</h2>
                  <p className="text-sm text-slate-400">Controla a oferta de 30 dias grátis na landing page e novos cadastros</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => saveTrialMode(true)}
                  disabled={savingTrial}
                  className={`p-4 rounded-xl border text-left transition-all duration-200 ${
                    freeTrialEnabled
                      ? "bg-primary/10 border-primary/30 ring-1 ring-primary/20"
                      : "bg-white/5 border-white/10 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-medium ${freeTrialEnabled ? "text-primary" : "text-white"}`}>
                      Ativado
                    </span>
                    {freeTrialEnabled ? (
                      <ToggleRight className="h-5 w-5 text-primary" />
                    ) : (
                      <ToggleLeft className="h-5 w-5 text-slate-500" />
                    )}
                  </div>
                  <p className="text-xs text-slate-400">Novos cadastros ganham 30 dias grátis. A landing page exibe CTAs de "Teste Grátis".</p>
                </button>
                <button
                  onClick={() => saveTrialMode(false)}
                  disabled={savingTrial}
                  className={`p-4 rounded-xl border text-left transition-all duration-200 ${
                    !freeTrialEnabled
                      ? "bg-primary/10 border-primary/30 ring-1 ring-primary/20"
                      : "bg-white/5 border-white/10 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-medium ${!freeTrialEnabled ? "text-primary" : "text-white"}`}>
                      Desativado
                    </span>
                    {!freeTrialEnabled ? (
                      <ToggleRight className="h-5 w-5 text-primary" />
                    ) : (
                      <ToggleLeft className="h-5 w-5 text-slate-500" />
                    )}
                  </div>
                  <p className="text-xs text-slate-400">Sem trial grátis. Landing page mostra CTAs de compra direta ("Assinar Agora"). Novos cadastros precisam pagar.</p>
                </button>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <h2 className="text-lg font-display text-white">LGPD — Documentos Legais</h2>
                  <p className="text-sm text-slate-400">Edite a Política de Privacidade e os Termos de Uso exibidos na plataforma</p>
                </div>
              </div>

              <div className="flex gap-2 border-b border-white/10 pb-0">
                <button
                  onClick={() => setActiveTab("privacy")}
                  className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
                    activeTab === "privacy"
                      ? "bg-white/10 text-primary border-b-2 border-primary"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Shield className="h-4 w-4 inline mr-2" />
                  Política de Privacidade
                </button>
                <button
                  onClick={() => setActiveTab("terms")}
                  className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
                    activeTab === "terms"
                      ? "bg-white/10 text-primary border-b-2 border-primary"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <FileText className="h-4 w-4 inline mr-2" />
                  Termos de Uso
                </button>
              </div>

              {activeTab === "privacy" && (
                <div className="space-y-4">
                  <textarea
                    value={privacyPolicy}
                    onChange={(e) => setPrivacyPolicy(e.target.value)}
                    placeholder="Cole ou edite aqui a Política de Privacidade da plataforma. Deixe vazio para usar o texto padrão."
                    rows={14}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white text-sm placeholder-slate-500 resize-y focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 font-mono"
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500">
                      Visível em /politica-de-privacidade e no banner de cookies
                    </p>
                    <Button
                      onClick={() => saveConfig("lgpd_privacy_policy", privacyPolicy, setSavingPrivacy, "Política de Privacidade")}
                      disabled={savingPrivacy}
                      className="gap-2"
                    >
                      <Save className="h-4 w-4" />
                      {savingPrivacy ? "Salvando..." : "Salvar Política"}
                    </Button>
                  </div>
                </div>
              )}

              {activeTab === "terms" && (
                <div className="space-y-4">
                  <textarea
                    value={termsOfUse}
                    onChange={(e) => setTermsOfUse(e.target.value)}
                    placeholder="Cole ou edite aqui os Termos de Uso da plataforma. Deixe vazio para usar o texto padrão."
                    rows={14}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white text-sm placeholder-slate-500 resize-y focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 font-mono"
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500">
                      Visível em /termos-de-uso e no banner de cookies
                    </p>
                    <Button
                      onClick={() => saveConfig("lgpd_terms_of_use", termsOfUse, setSavingTerms, "Termos de Uso")}
                      disabled={savingTerms}
                      className="gap-2"
                    >
                      <Save className="h-4 w-4" />
                      {savingTerms ? "Salvando..." : "Salvar Termos"}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Info className="h-5 w-5 text-slate-400" />
                <h2 className="text-lg font-display text-white">Configurações Atuais</h2>
              </div>
              <div className="space-y-2">
                {Object.entries(config).filter(([key]) => !key.startsWith("lgpd_")).length === 0 ? (
                  <p className="text-slate-500 text-sm">Nenhuma configuração salva</p>
                ) : (
                  Object.entries(config).filter(([key]) => !key.startsWith("lgpd_")).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                      <span className="text-sm text-slate-300 font-mono">{key}</span>
                      <span className="text-sm text-slate-400">{value}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
