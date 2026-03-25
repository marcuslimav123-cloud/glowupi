import React, { useState, useEffect } from "react";
import { useCreateBarbearia } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Target, Scissors, Users, ChevronRight, ChevronLeft, Check, Plus, Trash2, Loader2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiUrl, formatPhone, stripPhone } from "@/lib/utils";

const STEPS = [
  { id: 1, label: "Localização", icon: MapPin },
  { id: 2, label: "Segmentação", icon: Target },
  { id: 3, label: "Serviços", icon: Scissors },
  { id: 4, label: "Profissionais", icon: Users },
];

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

const DURACOES = [
  { value: "15", label: "15 min" },
  { value: "30", label: "30 min" },
  { value: "45", label: "45 min" },
  { value: "60", label: "1h" },
  { value: "90", label: "1h30" },
  { value: "120", label: "2h" },
];

interface ServiceItem {
  nome: string;
  preco: string;
  duracaoMinutos: number;
}

interface ProfessionalItem {
  nomeExibicao: string;
  celular: string;
}

export default function BarbeariaStep() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createMutation = useCreateBarbearia();
  const [currentStep, setCurrentStep] = useState(1);
  const [barbeariaId, setBarbeariaId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);

  const [locationData, setLocationData] = useState({
    nome: "",
    telefone: "",
    cep: "",
    logradouro: "",
    numero: "",
    bairro: "",
    cidade: "",
    uf: ""
  });

  const [segmentData, setSegmentData] = useState({
    tipoEstabelecimento: "",
    comoSoube: "",
    numProfissionais: ""
  });

  const [services, setServices] = useState<ServiceItem[]>([]);
  const [serviceForm, setServiceForm] = useState({ nome: "", preco: "", duracaoMinutos: "30" });

  const [professionals, setProfessionals] = useState<ProfessionalItem[]>([]);
  const [profForm, setProfForm] = useState({ nomeExibicao: "", celular: "" });
  const [ownerAutoAdded, setOwnerAutoAdded] = useState(false);

  useEffect(() => {
    if (currentStep === 4 && !ownerAutoAdded) {
      fetch(apiUrl("/auth/me"), { credentials: "include" })
        .then(r => r.json())
        .then(user => {
          if (user && user.nome) {
            const exists = professionals.some(p => p.nomeExibicao === user.nome);
            if (!exists) {
              setProfessionals(prev => [
                { nomeExibicao: user.nome, celular: user.telefone || "" },
                ...prev
              ]);
              setOwnerAutoAdded(true);
            }
          }
        })
        .catch(() => {});
    }
  }, [currentStep]);

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
            uf: data.uf || prev.uf
          }));
        }
      } catch (e) {}
    }
  };

  const handleStep1Submit = async () => {
    if (!locationData.nome || !locationData.telefone) {
      toast({ title: "Campos obrigatórios", description: "Nome e telefone são obrigatórios.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const result = await createMutation.mutateAsync({
        data: {
          ...locationData,
          telefone: stripPhone(locationData.telefone)
        }
      });
      setBarbeariaId(result.id);
      setCurrentStep(2);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message || "Erro ao criar estabelecimento.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleStep2Submit = async () => {
    if (!segmentData.tipoEstabelecimento) {
      toast({ title: "Campo obrigatório", description: "Selecione o tipo do estabelecimento.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/barbearias/me"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ segmentacao: segmentData, onboardingStep: 3 })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Erro ao salvar");
      }
      setCurrentStep(3);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message || "Erro ao salvar segmentação.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const addService = async () => {
    if (!serviceForm.nome) {
      toast({ title: "Campo obrigatório", description: "Informe a descrição do serviço.", variant: "destructive" });
      return;
    }
    if (!barbeariaId) return;
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/servicos`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          nome: serviceForm.nome,
          preco: serviceForm.preco ? parseFloat(serviceForm.preco) : 0,
          duracaoMinutos: parseInt(serviceForm.duracaoMinutos)
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Erro ao criar serviço");
      }
      setServices(prev => [...prev, {
        nome: serviceForm.nome,
        preco: serviceForm.preco,
        duracaoMinutos: parseInt(serviceForm.duracaoMinutos)
      }]);
      setServiceForm({ nome: "", preco: "", duracaoMinutos: "30" });
    } catch (err: any) {
      toast({ title: "Erro", description: "Erro ao adicionar serviço.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const removeService = (index: number) => {
    setServices(prev => prev.filter((_, i) => i !== index));
  };

  const createProfessionalOnServer = async (name: string) => {
    if (!barbeariaId) return false;
    const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/profissionais`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        nomeExibicao: name,
        comissaoValor: 0
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Erro ao criar profissional");
    }
    return true;
  };

  const addProfessional = async () => {
    if (!profForm.nomeExibicao || !profForm.celular) {
      toast({ title: "Campos obrigatórios", description: "Nome e celular são obrigatórios.", variant: "destructive" });
      return;
    }
    if (!barbeariaId) return;
    setLoading(true);
    try {
      await createProfessionalOnServer(profForm.nomeExibicao);
      setProfessionals(prev => [...prev, { ...profForm }]);
      setProfForm({ nomeExibicao: "", celular: "" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message || "Erro ao adicionar profissional.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const removeProfessional = (index: number) => {
    setProfessionals(prev => prev.filter((_, i) => i !== index));
  };

  const handleFinalize = async () => {
    setLoading(true);
    try {
      if (ownerAutoAdded && professionals.length > 0 && barbeariaId) {
        try {
          await createProfessionalOnServer(professionals[0].nomeExibicao);
        } catch (e) {}
      }
      const res = await fetch(apiUrl("/barbearias/me"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ onboardingStep: 5 })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Erro ao finalizar");
      }
      setCompleted(true);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message || "Erro ao finalizar configuração.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (completed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#fafafa]">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Tudo pronto!</h1>
          <p className="text-foreground/50 mb-8">
            Seu estabelecimento foi configurado com sucesso. Agora você pode começar a usar o sistema.
          </p>
          <Button
            size="lg"
            className="px-8 shadow-lg shadow-primary/20"
            onClick={() => window.location.href = "/dashboard"}
          >
            Clique aqui e comece a Usar!
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#fafafa]">
      <div className="hidden md:flex w-72 bg-white border-r border-black/[0.06] flex-col p-8">
        <h2 className="text-lg font-bold text-foreground mb-1">Configuração</h2>
        <p className="text-sm text-foreground/40 mb-8">Configure seu estabelecimento</p>
        <div className="space-y-2">
          {STEPS.map((step) => {
            const Icon = step.icon;
            const isActive = step.id === currentStep;
            const isDone = step.id < currentStep;
            return (
              <div
                key={step.id}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : isDone
                    ? "text-green-600"
                    : "text-foreground/30"
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  isActive
                    ? "bg-primary text-white"
                    : isDone
                    ? "bg-green-100 text-green-600"
                    : "bg-black/[0.04] text-foreground/30"
                }`}>
                  {isDone ? <Check className="h-4 w-4" /> : step.id}
                </div>
                <span className={`text-sm font-medium ${isActive ? "text-primary" : isDone ? "text-green-600" : ""}`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          <div className="md:hidden flex items-center gap-2 mb-6 overflow-x-auto pb-2">
            {STEPS.map((step, i) => (
              <React.Fragment key={step.id}>
                <div className={`flex items-center gap-1.5 whitespace-nowrap ${
                  step.id === currentStep ? "text-primary" : step.id < currentStep ? "text-green-600" : "text-foreground/30"
                }`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    step.id === currentStep ? "bg-primary text-white" : step.id < currentStep ? "bg-green-100 text-green-600" : "bg-black/[0.04]"
                  }`}>
                    {step.id < currentStep ? <Check className="h-3 w-3" /> : step.id}
                  </div>
                  <span className="text-xs font-medium">{step.label}</span>
                </div>
                {i < STEPS.length - 1 && <div className="w-6 h-px bg-black/10 flex-shrink-0" />}
              </React.Fragment>
            ))}
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground">
              {currentStep === 1 && "Localização do Estabelecimento"}
              {currentStep === 2 && "Segmentação do Estabelecimento"}
              {currentStep === 3 && "Serviços"}
              {currentStep === 4 && "Profissionais"}
            </h1>
            <p className="text-foreground/40 text-sm mt-1">
              {currentStep === 1 && "Informe o endereço do seu estabelecimento."}
              {currentStep === 2 && "Nos conte mais sobre seu negócio."}
              {currentStep === 3 && "Cadastre os serviços que você oferece."}
              {currentStep === 4 && "Adicione os profissionais do seu estabelecimento."}
            </p>
          </div>

          <div className="bg-white border border-black/[0.06] rounded-2xl p-6 md:p-8 shadow-xl shadow-black/[0.03]">
            {currentStep === 1 && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome do Estabelecimento *</Label>
                  <Input
                    id="nome"
                    value={locationData.nome}
                    onChange={e => setLocationData(p => ({ ...p, nome: e.target.value }))}
                    className="h-12 text-lg"
                    placeholder="Ex: Studio Glow Beauty"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone / WhatsApp *</Label>
                    <Input
                      id="telefone"
                      value={locationData.telefone}
                      onChange={e => setLocationData(p => ({ ...p, telefone: formatPhone(e.target.value) }))}
                      placeholder="(99) 99999-9999"
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>País</Label>
                    <Input value="Brasil" disabled className="h-11 bg-[#fafafa]" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="cep">CEP *</Label>
                    <Input
                      id="cep"
                      value={locationData.cep}
                      onChange={e => setLocationData(p => ({ ...p, cep: e.target.value }))}
                      onBlur={handleCepBlur}
                      className="h-11"
                      placeholder="00000-000"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="uf">Estado *</Label>
                    <Select value={locationData.uf} onValueChange={v => setLocationData(p => ({ ...p, uf: v }))}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {ESTADOS_BR.map(uf => (
                          <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="logradouro">Endereço</Label>
                  <Input
                    id="logradouro"
                    value={locationData.logradouro}
                    onChange={e => setLocationData(p => ({ ...p, logradouro: e.target.value }))}
                    className="h-11"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="bairro">Bairro</Label>
                    <Input
                      id="bairro"
                      value={locationData.bairro}
                      onChange={e => setLocationData(p => ({ ...p, bairro: e.target.value }))}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cidade">Cidade *</Label>
                    <Input
                      id="cidade"
                      value={locationData.cidade}
                      onChange={e => setLocationData(p => ({ ...p, cidade: e.target.value }))}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="numero">Número</Label>
                    <Input
                      id="numero"
                      value={locationData.numero}
                      onChange={e => setLocationData(p => ({ ...p, numero: e.target.value }))}
                      className="h-11"
                    />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Tipo do Estabelecimento *</Label>
                  <Select value={segmentData.tipoEstabelecimento} onValueChange={v => setSegmentData(p => ({ ...p, tipoEstabelecimento: v }))}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_ESTABELECIMENTO.map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Como Soube do Glow Agenda?</Label>
                  <Select value={segmentData.comoSoube} onValueChange={v => setSegmentData(p => ({ ...p, comoSoube: v }))}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Selecione (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMO_SOUBE.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label>Número de Profissionais</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {["1", "2 a 5", "6 a 15", "+ 15"].map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setSegmentData(p => ({ ...p, numProfissionais: opt }))}
                        className={`h-12 rounded-xl border-2 font-medium text-sm transition-all ${
                          segmentData.numProfissionais === opt
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-black/[0.06] text-foreground/60 hover:border-primary/30"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div className="space-y-2">
                    <Label>Descrição *</Label>
                    <Input
                      value={serviceForm.nome}
                      onChange={e => setServiceForm(p => ({ ...p, nome: e.target.value }))}
                      placeholder="Ex: Corte Feminino"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={serviceForm.preco}
                      onChange={e => setServiceForm(p => ({ ...p, preco: e.target.value }))}
                      placeholder="0,00"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Duração</Label>
                    <Select value={serviceForm.duracaoMinutos} onValueChange={v => setServiceForm(p => ({ ...p, duracaoMinutos: v }))}>
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DURACOES.map(d => (
                          <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={addService}
                  disabled={loading}
                  className="border-primary/30 text-primary hover:bg-primary/5"
                >
                  <Plus className="h-4 w-4 mr-2" /> Adicionar
                </Button>

                {services.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-foreground/60 mb-3">Serviços Cadastrados</h3>
                    <div className="border border-black/[0.06] rounded-xl overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-[#fafafa] border-b border-black/[0.06]">
                            <th className="text-left p-3 font-medium text-foreground/60">Descrição</th>
                            <th className="text-left p-3 font-medium text-foreground/60">Valor</th>
                            <th className="text-left p-3 font-medium text-foreground/60">Duração</th>
                            <th className="w-10 p-3"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {services.map((s, i) => (
                            <tr key={i} className="border-b border-black/[0.04] last:border-0">
                              <td className="p-3">{s.nome}</td>
                              <td className="p-3">R$ {parseFloat(s.preco || "0").toFixed(2)}</td>
                              <td className="p-3">{DURACOES.find(d => d.value === String(s.duracaoMinutos))?.label || `${s.duracaoMinutos}min`}</td>
                              <td className="p-3">
                                <button onClick={() => removeService(i)} className="text-red-400 hover:text-red-600 transition-colors">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {services.length === 0 && (
                  <p className="text-sm text-foreground/30 text-center py-4">
                    Nenhum serviço cadastrado ainda. Você pode prosseguir sem adicionar.
                  </p>
                )}
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                  <div className="space-y-2">
                    <Label>Nome *</Label>
                    <Input
                      value={profForm.nomeExibicao}
                      onChange={e => setProfForm(p => ({ ...p, nomeExibicao: e.target.value }))}
                      placeholder="Nome do profissional"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Celular *</Label>
                    <Input
                      value={profForm.celular}
                      onChange={e => setProfForm(p => ({ ...p, celular: formatPhone(e.target.value) }))}
                      placeholder="(99) 99999-9999"
                      className="h-11"
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={addProfessional}
                  disabled={loading}
                  className="border-primary/30 text-primary hover:bg-primary/5"
                >
                  <Plus className="h-4 w-4 mr-2" /> Adicionar
                </Button>

                {professionals.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-foreground/60 mb-3">Profissionais Cadastrados</h3>
                    <div className="border border-black/[0.06] rounded-xl overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-[#fafafa] border-b border-black/[0.06]">
                            <th className="text-left p-3 font-medium text-foreground/60">Nome</th>
                            <th className="text-left p-3 font-medium text-foreground/60">Celular</th>
                            <th className="w-10 p-3"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {professionals.map((p, i) => (
                            <tr key={i} className="border-b border-black/[0.04] last:border-0">
                              <td className="p-3">{p.nomeExibicao}</td>
                              <td className="p-3">{p.celular}</td>
                              <td className="p-3">
                                <button onClick={() => removeProfessional(i)} className="text-red-400 hover:text-red-600 transition-colors">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {professionals.length === 0 && (
                  <p className="text-sm text-foreground/30 text-center py-4">
                    Nenhum profissional cadastrado ainda.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-between mt-6">
            {currentStep > 1 ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(s => s - 1)}
                className="px-6"
              >
                <ChevronLeft className="h-4 w-4 mr-2" /> Voltar
              </Button>
            ) : (
              <div />
            )}

            {currentStep < 4 ? (
              <Button
                type="button"
                size="lg"
                className="px-8 shadow-lg shadow-primary/20"
                disabled={loading}
                onClick={() => {
                  if (currentStep === 1) handleStep1Submit();
                  else if (currentStep === 2) handleStep2Submit();
                  else setCurrentStep(s => s + 1);
                }}
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...</>
                ) : (
                  <>Continuar <ChevronRight className="h-4 w-4 ml-2" /></>
                )}
              </Button>
            ) : (
              <Button
                type="button"
                size="lg"
                className="px-8 shadow-lg shadow-primary/20"
                disabled={loading}
                onClick={handleFinalize}
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Finalizando...</>
                ) : (
                  <>Finalizar <Check className="h-4 w-4 ml-2" /></>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
