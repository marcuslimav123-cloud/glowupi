import React, { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { apiUrl, APP_NAME } from "@/lib/utils";
import { Settings, Save, ToggleLeft, ToggleRight, Info, Shield, FileText, Gift, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const DEFAULT_PRIVACY_POLICY = `1. INFORMAÇÕES GERAIS

A presente Política de Privacidade contém informações sobre coleta, uso, armazenamento, tratamento e proteção dos dados pessoais dos usuários do ${APP_NAME}, com a finalidade de demonstrar absoluta transparência quanto ao assunto e esclarecer a todos interessados sobre os tipos de dados que são coletados, os motivos da coleta e a forma como os usuários podem gerenciar ou excluir as suas informações pessoais.

Esta Política de Privacidade aplica-se a todos os usuários e visitantes do ${APP_NAME} e integra os Termos de Uso. O presente documento foi elaborado em conformidade com a Lei Geral de Proteção de Dados Pessoais (Lei 13.709/18 - LGPD), o Marco Civil da Internet (Lei 12.965/14) e o Regulamento da UE n. 2016/679 (GDPR).

2. DADOS PESSOAIS COLETADOS

Os dados pessoais coletados incluem:
- Nome completo
- Endereço de e-mail
- Número de telefone/WhatsApp
- Dados de agendamentos e serviços utilizados
- Informações de pagamento (processados via Stripe, nosso parceiro de pagamentos)
- Dados de navegação (cookies, endereço IP, tipo de navegador)
- Dados fornecidos voluntariamente pelo usuário ao utilizar nossos formulários

3. FINALIDADE DO TRATAMENTO DOS DADOS

Os dados pessoais são tratados com as seguintes finalidades:
- Prestação dos serviços de agendamento e gestão de salões
- Comunicação entre o salão e seus clientes
- Envio de notificações e lembretes de agendamentos
- Processamento de pagamentos e transações financeiras
- Melhoria da experiência do usuário na plataforma
- Geração de relatórios e análises para os proprietários dos salões
- Cumprimento de obrigações legais e regulatórias

4. BASE LEGAL PARA O TRATAMENTO

O tratamento dos dados pessoais é realizado com base nas seguintes hipóteses legais:
- Consentimento do titular (Art. 7º, I da LGPD)
- Execução de contrato (Art. 7º, V da LGPD)
- Legítimo interesse do controlador (Art. 7º, IX da LGPD)
- Cumprimento de obrigação legal (Art. 7º, II da LGPD)

5. COMPARTILHAMENTO DE DADOS

Os dados pessoais poderão ser compartilhados com:
- Stripe Inc. — para processamento de pagamentos
- Google LLC — para serviços de autenticação (quando o usuário opta por login com Google)
- Prestadores de serviços essenciais à operação da plataforma

Não vendemos, alugamos ou compartilhamos dados pessoais com terceiros para fins de marketing.

6. SEGURANÇA DOS DADOS

Empregamos medidas técnicas e organizacionais adequadas para proteger os dados pessoais, incluindo:
- Criptografia de dados em trânsito (HTTPS/TLS)
- Armazenamento seguro de senhas com hash criptográfico (bcrypt)
- Controle de acesso baseado em autenticação
- Monitoramento contínuo de segurança

7. COOKIES E TECNOLOGIAS SIMILARES

Utilizamos cookies para:
- Cookies essenciais: manter sua sessão de login ativa
- Cookies de preferências: salvar suas configurações e consentimento LGPD
- Cookies de análise: entender como você utiliza a plataforma

Você pode gerenciar suas preferências de cookies a qualquer momento nas configurações do seu navegador.

8. DIREITOS DO TITULAR DOS DADOS

Em conformidade com a LGPD, você tem direito a:
- Confirmação da existência de tratamento
- Acesso aos dados pessoais
- Correção de dados incompletos, inexatos ou desatualizados
- Anonimização, bloqueio ou eliminação de dados desnecessários
- Portabilidade dos dados
- Eliminação dos dados tratados com consentimento
- Informação sobre compartilhamento de dados
- Revogação do consentimento

Para exercer seus direitos, entre em contato conosco.

9. RETENÇÃO DE DADOS

Os dados pessoais são mantidos pelo período necessário para a prestação dos serviços contratados e cumprimento de obrigações legais. Após o encerramento da conta, os dados serão eliminados em até 30 dias, exceto quando houver obrigação legal de retenção.

10. ALTERAÇÕES NA POLÍTICA

Esta política pode ser atualizada a qualquer momento. Recomendamos que consulte esta página periodicamente. Alterações significativas serão comunicadas por e-mail ou aviso na plataforma.`;

const DEFAULT_TERMS_OF_USE = `1. TERMOS GERAIS

Ao acessar e utilizar o ${APP_NAME}, você concorda com estes Termos de Uso. Por favor, leia-os atentamente antes de utilizar nossos serviços.

O ${APP_NAME} é uma plataforma SaaS (Software como Serviço) de gestão para profissionais e salões de beleza, estética e bem-estar, oferecendo ferramentas de agendamento, gestão financeira, controle de clientes e demais funcionalidades descritas na plataforma.

2. CADASTRO E CONTA

Para utilizar os serviços, é necessário criar uma conta fornecendo informações verdadeiras, completas e atualizadas. Você é responsável por manter a confidencialidade de suas credenciais de acesso e por todas as atividades realizadas em sua conta.

3. PLANOS E PAGAMENTOS

O ${APP_NAME} oferece diferentes planos de assinatura com período de teste gratuito. Após o período de teste, é necessário escolher um plano pago para continuar utilizando os serviços.

Os pagamentos são processados pela Stripe, nosso parceiro de pagamentos. As cobranças são realizadas conforme o plano e período escolhidos (mensal, semestral ou anual).

4. USO ADEQUADO DA PLATAFORMA

Ao utilizar o ${APP_NAME}, você se compromete a:
- Não utilizar a plataforma para fins ilegais ou não autorizados
- Não tentar acessar áreas restritas do sistema sem autorização
- Não transmitir vírus, malware ou qualquer código malicioso
- Não sobrecarregar intencionalmente os servidores da plataforma
- Manter seus dados cadastrais atualizados
- Respeitar a privacidade dos dados de seus clientes

5. RESPONSABILIDADES DO USUÁRIO

O proprietário do salão/estúdio é responsável por:
- Garantir o consentimento de seus clientes para coleta e tratamento de dados
- Manter os dados de seus clientes seguros e atualizados
- Utilizar a plataforma em conformidade com a LGPD e demais legislações aplicáveis
- Realizar backups de informações críticas para seu negócio

6. PROPRIEDADE INTELECTUAL

Todo o conteúdo, design, código-fonte, marcas e logos do ${APP_NAME} são de propriedade exclusiva da empresa e estão protegidos por leis de propriedade intelectual.

7. DISPONIBILIDADE DOS SERVIÇOS

Nos esforçamos para manter a plataforma disponível 24/7, mas não garantimos disponibilidade ininterrupta. Manutenções programadas serão comunicadas com antecedência sempre que possível.

8. LIMITAÇÃO DE RESPONSABILIDADE

O ${APP_NAME} não se responsabiliza por:
- Perdas ou danos decorrentes de uso inadequado da plataforma
- Interrupções causadas por fatores externos (internet, energia, etc.)
- Conteúdo inserido pelos usuários na plataforma
- Decisões de negócio tomadas com base nos dados da plataforma

9. CANCELAMENTO

Você pode cancelar sua assinatura a qualquer momento. Após o cancelamento:
- O acesso será mantido até o final do período já pago
- Seus dados serão preservados por 30 dias após o encerramento
- Após esse período, os dados serão permanentemente excluídos

10. ALTERAÇÕES NOS TERMOS

Reservamo-nos o direito de modificar estes Termos a qualquer momento. Alterações significativas serão comunicadas por e-mail ou aviso na plataforma. O uso continuado após as alterações constitui aceitação dos novos termos.

11. LEGISLAÇÃO APLICÁVEL

Estes Termos são regidos pela legislação brasileira. Quaisquer disputas serão resolvidas no foro da comarca da sede da empresa.`;

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
  const [trialDays, setTrialDays] = useState("7");
  const [savingTrialDays, setSavingTrialDays] = useState(false);
  const [fbPixelId, setFbPixelId] = useState("");
  const [savingFbPixel, setSavingFbPixel] = useState(false);
  const [gaMeasurementId, setGaMeasurementId] = useState("");
  const [savingGa, setSavingGa] = useState(false);
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
        setTrialDays(data.trial_days || "7");
        setFbPixelId(data.fb_pixel_id || "");
        setGaMeasurementId(data.ga_measurement_id || "");
        setPrivacyPolicy(data.lgpd_privacy_policy || DEFAULT_PRIVACY_POLICY);
        setTermsOfUse(data.lgpd_terms_of_use || DEFAULT_TERMS_OF_USE);
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
                  <p className="text-xs text-slate-400">Novos cadastros ganham período de teste grátis (configurável abaixo). A landing page exibe CTAs de "Teste Grátis".</p>
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

              {freeTrialEnabled && (
                <div className="border-t border-white/10 pt-4 mt-4">
                  <label className="block text-sm font-medium text-white mb-2">Duração do Período de Teste (dias)</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="1"
                      max="90"
                      value={trialDays}
                      onChange={(e) => setTrialDays(e.target.value)}
                      className="w-24 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <Button
                      onClick={() => saveConfig("trial_days", trialDays, setSavingTrialDays, "Dias de teste")}
                      disabled={savingTrialDays}
                      size="sm"
                      className="gap-2"
                    >
                      <Save className="h-4 w-4" />
                      {savingTrialDays ? "Salvando..." : "Salvar"}
                    </Button>
                    <span className="text-xs text-slate-400">Padrão: 7 dias</span>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Megaphone className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-display text-white">Pixels e Tracking</h2>
                  <p className="text-sm text-slate-400">Configure os IDs de tracking para a landing page (instalados automaticamente em /pdvd e /)</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Facebook Pixel ID</label>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={fbPixelId}
                    onChange={(e) => setFbPixelId(e.target.value.trim())}
                    placeholder="ex: 1234567890123456"
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <Button
                    onClick={() => saveConfig("fb_pixel_id", fbPixelId, setSavingFbPixel, "Facebook Pixel")}
                    disabled={savingFbPixel}
                    size="sm"
                    className="gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {savingFbPixel ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
                <p className="text-xs text-slate-500 mt-2">Encontrado no Gerenciador de Eventos do Facebook. Eventos rastreados: PageView, Lead, InitiateCheckout, Purchase.</p>
              </div>

              <div className="border-t border-white/10 pt-5">
                <label className="block text-sm font-medium text-white mb-2">Google Analytics Measurement ID</label>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={gaMeasurementId}
                    onChange={(e) => setGaMeasurementId(e.target.value.trim())}
                    placeholder="ex: G-XXXXXXXXXX"
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <Button
                    onClick={() => saveConfig("ga_measurement_id", gaMeasurementId, setSavingGa, "Google Analytics")}
                    disabled={savingGa}
                    size="sm"
                    className="gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {savingGa ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
                <p className="text-xs text-slate-500 mt-2">Opcional. Configure se quiser análise complementar via Google Analytics 4.</p>
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
