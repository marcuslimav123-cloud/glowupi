import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Loader2, MapPin, Target, ArrowRight, ChevronLeft, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiUrl, formatPhone, stripPhone, APP_NAME } from "@/lib/utils";

const ESTADOS_BR = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
];

const TIPOS_ESTABELECIMENTO = [
  "Salão de Beleza", "Clínica de Estética", "Studio de Sobrancelhas",
  "Studio de Maquiagem", "Extensão de Cílios", "Esmalteria",
  "Barbearia", "Studio de Tatuagem", "Outro"
];

const COMO_SOUBE = ["Google", "Instagram", "Facebook", "Indicação de amigo", "Outro"];

export default function DirectSalesSuccess() {
  const { toast } = useToast();
  const [step, setStep] = useState<"verifying" | "quiz" | "location" | "done" | "error">("verifying");
  const [loading, setLoading] = useState(false);
  const [sessionData, setSessionData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const [quizData, setQuizData] = useState({
    tipoEstabelecimento: "",
    comoSoube: "",
  });

  const [locationData, setLocationData] = useState({
    nome: "",
    telefone: "",
    cep: "",
    logradouro: "",
    numero: "",
    bairro: "",
    cidade: "",
    uf: "",
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    if (!sessionId) {
      setStep("error");
      setErrorMsg("Sessão de pagamento não encontrada.");
      return;
    }
    verifySession(sessionId);
  }, []);

  const verifySession = async (sessionId: string) => {
    try {
      const res = await fetch(apiUrl("/checkout/verify-direct-session"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (!res.ok || !data.verified) {
        setStep("error");
        setErrorMsg(data.error || "Pagamento não confirmado. Tente novamente.");
        return;
      }
      setSessionData({ ...data, sessionId });
      setStep("quiz");
    } catch (err) {
      setStep("error");
      setErrorMsg("Erro ao verificar pagamento. Tente novamente.");
    }
  };

  const handleCepBlur = async () => {
    const cepClean = locationData.cep.replace(/\D/g, '');
    if (cepClean.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cepClean}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setLocationData(prev => ({
            ...prev,
            logradouro: data.logradouro || prev.logradouro,
            bairro: data.bairro || prev.bairro,
            cidade: data.localidade || prev.cidade,
            uf: data.uf || prev.uf,
          }));
        }
      } catch {}
    }
  };

  const handleQuizSubmit = () => {
    if (!quizData.tipoEstabelecimento) {
      toast({ title: "Campo obrigatório", description: "Selecione o tipo do estabelecimento.", variant: "destructive" });
      return;
    }
    setStep("location");
  };

  const handleLocationSubmit = async () => {
    if (!locationData.nome || !locationData.telefone) {
      toast({ title: "Campos obrigatórios", description: "Nome e telefone são obrigatórios.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(apiUrl("/checkout/complete-direct-onboarding"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          sessionId: sessionData.sessionId,
          ...locationData,
          telefone: stripPhone(locationData.telefone),
          ...quizData,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao finalizar cadastro.");
      }
      setStep("done");
    } catch (err: any) {
      toast({ title: "Erro", description: err.message || "Erro ao finalizar cadastro.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (step === "verifying") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-[#0f0f0f] via-[#141210] to-[#0f0f0f]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Verificando pagamento...</h2>
          <p className="text-white/50 text-sm">Aguarde enquanto confirmamos sua assinatura.</p>
        </div>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-[#0f0f0f] via-[#141210] to-[#0f0f0f]">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">!</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Ops!</h2>
          <p className="text-white/50 text-sm mb-6">{errorMsg}</p>
          <Button onClick={() => window.location.href = "/pdvd"} className="rounded-full px-8">
            Voltar para Planos
          </Button>
        </div>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-[#0f0f0f] via-[#141210] to-[#0f0f0f]">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-10 w-10 text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Tudo pronto!</h1>
          <p className="text-white/50 mb-3">
            Sua assinatura foi ativada e seu estabelecimento está configurado.
          </p>
          {sessionData?.productName && (
            <p className="text-primary text-sm font-medium mb-6">
              Plano: {sessionData.productName}
            </p>
          )}
          <Button
            size="lg"
            className="px-10 h-12 rounded-full shadow-lg shadow-primary/25 font-semibold"
            onClick={() => window.location.href = "/dashboard"}
          >
            Acessar o Sistema
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0f0f] via-[#141210] to-[#0f0f0f] flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2 mb-4">
            <img src="/logo-icon.png" alt={APP_NAME} className="h-10 w-10 object-contain" />
            <span className="text-white font-bold text-lg">{APP_NAME}</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-500/10 text-green-400 text-[13px] font-medium border border-green-500/20">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Pagamento confirmado!
          </div>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${
            step === "quiz" ? "bg-primary text-white" : "bg-green-500/20 text-green-400"
          }`}>
            {step === "location" ? <CheckCircle2 className="h-4 w-4" /> : "1"}
          </div>
          <div className="flex-1 h-px bg-white/10" />
          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${
            step === "location" ? "bg-primary text-white" : "bg-white/10 text-white/30"
          }`}>
            2
          </div>
        </div>

        <div className="bg-white/[0.06] border border-white/[0.08] rounded-2xl p-7 shadow-xl shadow-black/20 backdrop-blur-sm">
          {step === "quiz" && (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Sobre seu negócio</h2>
                  <p className="text-white/40 text-sm">Conte-nos mais sobre seu estabelecimento</p>
                </div>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-white/70">Tipo do Estabelecimento *</Label>
                  <Select value={quizData.tipoEstabelecimento} onValueChange={v => setQuizData(p => ({ ...p, tipoEstabelecimento: v }))}>
                    <SelectTrigger className="h-12 bg-white/[0.04] border-white/[0.08] text-white">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_ESTABELECIMENTO.map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-white/70">Como conheceu o {APP_NAME}?</Label>
                  <Select value={quizData.comoSoube} onValueChange={v => setQuizData(p => ({ ...p, comoSoube: v }))}>
                    <SelectTrigger className="h-12 bg-white/[0.04] border-white/[0.08] text-white">
                      <SelectValue placeholder="Selecione (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMO_SOUBE.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button className="w-full h-12 rounded-xl font-semibold text-[15px]" onClick={handleQuizSubmit}>
                  Continuar
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </>
          )}

          {step === "location" && (
            <>
              <div className="flex items-center gap-3 mb-6">
                <button
                  onClick={() => setStep("quiz")}
                  className="h-10 w-10 rounded-xl bg-white/[0.06] flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.1] transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Seu Estabelecimento</h2>
                    <p className="text-white/40 text-sm">Informe os dados do seu negócio</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-white/70">Nome do Estabelecimento *</Label>
                  <Input
                    value={locationData.nome}
                    onChange={e => setLocationData(p => ({ ...p, nome: e.target.value }))}
                    className="h-12 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20"
                    placeholder="Ex: Studio Glow Beauty"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white/70">Telefone / WhatsApp *</Label>
                  <Input
                    value={locationData.telefone}
                    onChange={e => setLocationData(p => ({ ...p, telefone: formatPhone(e.target.value) }))}
                    className="h-12 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20"
                    placeholder="(99) 91234-5678"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white/70">CEP</Label>
                    <Input
                      value={locationData.cep}
                      onChange={e => setLocationData(p => ({ ...p, cep: e.target.value }))}
                      onBlur={handleCepBlur}
                      className="h-12 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20"
                      placeholder="00000-000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/70">Estado</Label>
                    <select
                      value={locationData.uf}
                      onChange={e => setLocationData(p => ({ ...p, uf: e.target.value }))}
                      className="flex h-12 w-full items-center rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">UF</option>
                      {ESTADOS_BR.map(uf => (
                        <option key={uf} value={uf}>{uf}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-white/70">Cidade</Label>
                  <Input
                    value={locationData.cidade}
                    onChange={e => setLocationData(p => ({ ...p, cidade: e.target.value }))}
                    className="h-12 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white/70">Endereço</Label>
                  <Input
                    value={locationData.logradouro}
                    onChange={e => setLocationData(p => ({ ...p, logradouro: e.target.value }))}
                    className="h-12 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white/70">Bairro</Label>
                    <Input
                      value={locationData.bairro}
                      onChange={e => setLocationData(p => ({ ...p, bairro: e.target.value }))}
                      className="h-12 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/70">Número</Label>
                    <Input
                      value={locationData.numero}
                      onChange={e => setLocationData(p => ({ ...p, numero: e.target.value }))}
                      className="h-12 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20"
                    />
                  </div>
                </div>

                <Button
                  className="w-full h-12 rounded-xl font-semibold text-[15px]"
                  onClick={handleLocationSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" />Finalizando...</>
                  ) : (
                    <>Finalizar e Acessar o Sistema<ArrowRight className="ml-2 h-4 w-4" /></>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
