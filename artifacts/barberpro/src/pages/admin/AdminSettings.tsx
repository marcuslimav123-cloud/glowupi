import React, { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { apiUrl } from "@/lib/utils";
import { Settings, Save, ToggleLeft, ToggleRight, Info, Shield, FileText } from "lucide-react";
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
  const [lgpdTerms, setLgpdTerms] = useState("");
  const [savingLgpd, setSavingLgpd] = useState(false);

  useEffect(() => {
    fetch(apiUrl("/admin/config"), { credentials: "include" })
      .then(r => r.json())
      .then(data => {
        setConfig(data);
        setPricingMode(data.pricing_mode || "all_plans");
        setLgpdTerms(data.lgpd_terms || "");
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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

  const saveLgpdTerms = async () => {
    setSavingLgpd(true);
    try {
      const res = await fetch(apiUrl("/admin/config"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ chave: "lgpd_terms", valor: lgpdTerms }),
      });
      if (res.ok) {
        toast({ title: "Termos LGPD salvos", description: "Os termos de privacidade foram atualizados com sucesso" });
      }
    } catch {
      toast({ title: "Erro", description: "Falha ao salvar termos LGPD", variant: "destructive" });
    } finally {
      setSavingLgpd(false);
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
                <div className="h-10 w-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <h2 className="text-lg font-display text-white">Termos LGPD / Política de Privacidade</h2>
                  <p className="text-sm text-slate-400">Texto exibido no popup de consentimento para todos os usuários</p>
                </div>
              </div>

              <textarea
                value={lgpdTerms}
                onChange={(e) => setLgpdTerms(e.target.value)}
                placeholder="Digite os termos de uso e política de privacidade conforme a LGPD..."
                rows={10}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white text-sm placeholder-slate-500 resize-y focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30"
              />

              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  <FileText className="h-3 w-3 inline mr-1" />
                  Este texto será exibido no popup de consentimento LGPD para todos os usuários da plataforma
                </p>
                <Button
                  onClick={saveLgpdTerms}
                  disabled={savingLgpd}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  {savingLgpd ? "Salvando..." : "Salvar Termos"}
                </Button>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Info className="h-5 w-5 text-slate-400" />
                <h2 className="text-lg font-display text-white">Configurações Atuais</h2>
              </div>
              <div className="space-y-2">
                {Object.entries(config).length === 0 ? (
                  <p className="text-slate-500 text-sm">Nenhuma configuração salva</p>
                ) : (
                  Object.entries(config).filter(([key]) => key !== "lgpd_terms").map(([key, value]) => (
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
