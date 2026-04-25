import React, { useState, useEffect, useCallback, useRef } from "react";
import { useCreateBarbearia } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Store, Clock, Users, ChevronRight, ChevronLeft, Check,
  Plus, Trash2, Loader2, Sparkles, Star, Share2, Download, ArrowRight, PartyPopper
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiUrl, formatPhone, stripPhone } from "@/lib/utils";

const STEPS = [
  { id: 1, label: "Seu Negócio", icon: Store, subtitle: "Informações básicas" },
  { id: 2, label: "Serviços", icon: Sparkles, subtitle: "O que você oferece" },
  { id: 3, label: "Horários", icon: Clock, subtitle: "Quando funciona" },
  { id: 4, label: "Equipe", icon: Users, subtitle: "Quem trabalha" },
];

const ESTADOS_BR = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
];

const TIPOS_ESTABELECIMENTO = [
  "Barbearia", "Salão de Beleza", "Clínica de Estética", "Studio de Sobrancelhas",
  "Studio de Maquiagem", "Extensão de Cílios", "Esmalteria",
  "Studio de Tatuagem", "Outro"
];

const COMO_SOUBE = ["Google", "Instagram", "Facebook", "Indicação de amigo", "Outro"];

const DURACOES = [
  { value: "15", label: "15 min" },
  { value: "20", label: "20 min" },
  { value: "30", label: "30 min" },
  { value: "45", label: "45 min" },
  { value: "60", label: "1h" },
  { value: "90", label: "1h30" },
  { value: "120", label: "2h" },
  { value: "150", label: "2h30" },
  { value: "180", label: "3h" },
  { value: "240", label: "4h" },
  { value: "300", label: "5h" },
  { value: "360", label: "6h" },
  { value: "420", label: "7h" },
  { value: "480", label: "8h" },
  { value: "600", label: "10h" },
  { value: "720", label: "12h" },
];

const SERVICOS_SUGERIDOS: Record<string, { nome: string; preco: string; duracao: string }[]> = {
  "Barbearia": [
    { nome: "Corte Masculino", preco: "35", duracao: "30" },
    { nome: "Barba", preco: "25", duracao: "20" },
    { nome: "Corte + Barba", preco: "55", duracao: "45" },
    { nome: "Pigmentação", preco: "80", duracao: "60" },
    { nome: "Sobrancelha", preco: "15", duracao: "15" },
    { nome: "Hidratação Capilar", preco: "40", duracao: "30" },
  ],
  "Salão de Beleza": [
    { nome: "Corte Feminino", preco: "60", duracao: "45" },
    { nome: "Escova", preco: "40", duracao: "30" },
    { nome: "Coloração", preco: "120", duracao: "90" },
    { nome: "Hidratação", preco: "50", duracao: "45" },
    { nome: "Manicure", preco: "30", duracao: "30" },
    { nome: "Pedicure", preco: "35", duracao: "30" },
  ],
  "Clínica de Estética": [
    { nome: "Limpeza de Pele", preco: "120", duracao: "60" },
    { nome: "Peeling", preco: "150", duracao: "45" },
    { nome: "Drenagem Linfática", preco: "100", duracao: "60" },
    { nome: "Massagem Modeladora", preco: "120", duracao: "60" },
    { nome: "Radiofrequência", preco: "200", duracao: "45" },
  ],
  "Studio de Sobrancelhas": [
    { nome: "Design de Sobrancelhas", preco: "40", duracao: "30" },
    { nome: "Henna", preco: "50", duracao: "30" },
    { nome: "Micropigmentação", preco: "350", duracao: "120" },
    { nome: "Laminação", preco: "80", duracao: "45" },
  ],
  "Studio de Maquiagem": [
    { nome: "Maquiagem Social", preco: "100", duracao: "60" },
    { nome: "Maquiagem Noiva", preco: "250", duracao: "90" },
    { nome: "Automaquiagem (Aula)", preco: "150", duracao: "90" },
  ],
  "Extensão de Cílios": [
    { nome: "Fio a Fio Clássico", preco: "150", duracao: "90" },
    { nome: "Volume Russo", preco: "200", duracao: "120" },
    { nome: "Manutenção", preco: "80", duracao: "60" },
    { nome: "Remoção", preco: "50", duracao: "30" },
  ],
  "Esmalteria": [
    { nome: "Manicure", preco: "30", duracao: "30" },
    { nome: "Pedicure", preco: "35", duracao: "30" },
    { nome: "Mani + Pedi", preco: "55", duracao: "60" },
    { nome: "Esmaltação em Gel", preco: "60", duracao: "45" },
    { nome: "Nail Art", preco: "20", duracao: "15" },
  ],
  "Studio de Tatuagem": [
    { nome: "Tatuagem Pequena", preco: "150", duracao: "60" },
    { nome: "Tatuagem Média", preco: "350", duracao: "120" },
    { nome: "Cover Up", preco: "400", duracao: "120" },
    { nome: "Orçamento/Consulta", preco: "0", duracao: "30" },
  ],
};

const DIAS_SEMANA = [
  { key: "segunda", label: "Segunda", short: "Seg" },
  { key: "terca", label: "Terça", short: "Ter" },
  { key: "quarta", label: "Quarta", short: "Qua" },
  { key: "quinta", label: "Quinta", short: "Qui" },
  { key: "sexta", label: "Sexta", short: "Sex" },
  { key: "sabado", label: "Sábado", short: "Sáb" },
  { key: "domingo", label: "Domingo", short: "Dom" },
];

interface DaySchedule {
  dia: string;
  ativo: boolean;
  abertura: string;
  fechamento: string;
  intervaloInicio: string;
  intervaloFim: string;
}

interface ServiceItem {
  id?: number;
  nome: string;
  preco: string;
  duracaoMinutos: number;
}

interface ProfessionalItem {
  id?: number;
  nomeExibicao: string;
  celular: string;
}

function ConfettiCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ["#C4943C", "#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#FF9FF3"];
    const particles: {
      x: number; y: number; w: number; h: number;
      color: string; vx: number; vy: number; rot: number; rotSpeed: number;
      opacity: number;
    }[] = [];

    for (let i = 0; i < 150; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        w: Math.random() * 10 + 4,
        h: Math.random() * 6 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 3,
        vy: Math.random() * 3 + 2,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.2,
        opacity: 1,
      });
    }

    let frame = 0;
    let animId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.rotSpeed;
        p.vy += 0.03;
        p.vx *= 0.999;

        if (frame > 120) {
          p.opacity = Math.max(0, p.opacity - 0.005);
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }

      if (frame < 300 && particles.some(p => p.opacity > 0)) {
        animId = requestAnimationFrame(animate);
      }
    };

    animId = requestAnimationFrame(animate);
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
    />
  );
}

export default function BarbeariaStep() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createMutation = useCreateBarbearia();
  const [currentStep, setCurrentStep] = useState(1);
  const [barbeariaId, setBarbeariaId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [barbeariaSlug, setBarbeariaSlug] = useState("");

  const [locationData, setLocationData] = useState({
    nome: "", telefone: "", cep: "", logradouro: "",
    numero: "", bairro: "", cidade: "", uf: ""
  });

  const [segmentData, setSegmentData] = useState({
    tipoEstabelecimento: "", comoSoube: "", numProfissionais: ""
  });

  const [services, setServices] = useState<ServiceItem[]>([]);
  const [serviceForm, setServiceForm] = useState({ nome: "", preco: "", duracaoMinutos: "30" });
  const [suggestedServices, setSuggestedServices] = useState<typeof SERVICOS_SUGERIDOS["Barbearia"]>([]);

  const [horarios, setHorarios] = useState<DaySchedule[]>(
    DIAS_SEMANA.map(d => ({
      dia: d.label,
      ativo: d.key !== "domingo",
      abertura: "08:00",
      fechamento: "18:00",
      intervaloInicio: "",
      intervaloFim: "",
    }))
  );

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
        .catch(() => {
          toast({ title: "Aviso", description: "Não foi possível carregar seus dados automaticamente.", variant: "destructive" });
        });
    }
  }, [currentStep]);

  useEffect(() => {
    const tipo = segmentData.tipoEstabelecimento;
    if (tipo && SERVICOS_SUGERIDOS[tipo]) {
      const existing = new Set(services.map(s => s.nome.toLowerCase()));
      setSuggestedServices(
        SERVICOS_SUGERIDOS[tipo].filter(s => !existing.has(s.nome.toLowerCase()))
      );
    } else {
      setSuggestedServices([]);
    }
  }, [segmentData.tipoEstabelecimento, services]);

  const handleCepBlur = async () => {
    const cepClean = locationData.cep.replace(/\D/g, "");
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
      } catch {
        toast({ title: "Erro ao buscar CEP", description: "Preencha manualmente.", variant: "destructive" });
      }
    }
  };

  const handleStep1Submit = async () => {
    if (!locationData.nome || !locationData.telefone) {
      toast({ title: "Campos obrigatórios", description: "Nome e telefone são obrigatórios.", variant: "destructive" });
      return;
    }
    if (!segmentData.tipoEstabelecimento) {
      toast({ title: "Campo obrigatório", description: "Selecione o tipo do estabelecimento.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      if (barbeariaId) {
        const res = await fetch(apiUrl("/barbearias/me"), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            ...locationData,
            telefone: stripPhone(locationData.telefone),
            segmentacao: segmentData,
            onboardingStep: 3,
          })
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Erro ao atualizar.");
        }
      } else {
        const result = await createMutation.mutateAsync({
          data: {
            ...locationData,
            telefone: stripPhone(locationData.telefone),
          }
        });
        setBarbeariaId(result.id);
        if (result.slug) setBarbeariaSlug(result.slug);

        const segRes = await fetch(apiUrl("/barbearias/me"), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ segmentacao: segmentData, onboardingStep: 3 })
        });
        if (!segRes.ok) {
          const err = await segRes.json().catch(() => ({}));
          throw new Error(err.error || "Erro ao salvar segmentação.");
        }
      }
      setCurrentStep(2);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message || "Erro ao salvar.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const addSuggestedService = async (suggestion: { nome: string; preco: string; duracao: string }) => {
    if (!barbeariaId) return;
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/servicos`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          nome: suggestion.nome,
          preco: parseFloat(suggestion.preco) || 0,
          duracaoMinutos: parseInt(suggestion.duracao)
        })
      });
      if (!res.ok) throw new Error("Erro ao criar serviço");
      const created = await res.json();
      setServices(prev => [...prev, {
        id: created.id,
        nome: suggestion.nome,
        preco: suggestion.preco,
        duracaoMinutos: parseInt(suggestion.duracao)
      }]);
    } catch {
      toast({ title: "Erro", description: "Erro ao adicionar serviço.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const addAllSuggested = async () => {
    if (!barbeariaId || suggestedServices.length === 0) return;
    setLoading(true);
    let failCount = 0;
    const added: typeof suggestedServices = [];
    try {
      for (const s of suggestedServices) {
        try {
          const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/servicos`), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              nome: s.nome,
              preco: parseFloat(s.preco) || 0,
              duracaoMinutos: parseInt(s.duracao)
            })
          });
          if (res.ok) {
            const created = await res.json();
            setServices(prev => [...prev, {
              id: created.id,
              nome: s.nome,
              preco: s.preco,
              duracaoMinutos: parseInt(s.duracao)
            }]);
            added.push(s);
          } else {
            failCount++;
          }
        } catch {
          failCount++;
        }
      }
      setSuggestedServices(prev => prev.filter(s => !added.includes(s)));
      if (failCount > 0) {
        toast({ title: "Aviso", description: `${failCount} serviço(s) não puderam ser adicionados.`, variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro", description: "Erro ao adicionar serviços.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const addService = async () => {
    if (!serviceForm.nome) {
      toast({ title: "Campo obrigatório", description: "Informe o nome do serviço.", variant: "destructive" });
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
      if (!res.ok) throw new Error("Erro ao criar serviço");
      const created = await res.json();
      setServices(prev => [...prev, {
        id: created.id,
        nome: serviceForm.nome,
        preco: serviceForm.preco,
        duracaoMinutos: parseInt(serviceForm.duracaoMinutos)
      }]);
      setServiceForm({ nome: "", preco: "", duracaoMinutos: "30" });
    } catch {
      toast({ title: "Erro", description: "Erro ao adicionar serviço.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const removeService = async (index: number) => {
    const svc = services[index];
    if (svc.id && barbeariaId) {
      try {
        await fetch(apiUrl(`/barbearias/${barbeariaId}/servicos/${svc.id}`), {
          method: "DELETE", credentials: "include"
        });
      } catch {
        toast({ title: "Aviso", description: "Serviço removido localmente, mas houve erro no servidor.", variant: "destructive" });
      }
    }
    setServices(prev => prev.filter((_, i) => i !== index));
  };

  const handleHorariosSubmit = async () => {
    setLoading(true);
    try {
      const horariosData = horarios.map(h => ({
        dia: h.dia,
        ativo: h.ativo,
        abertura: h.abertura,
        fechamento: h.fechamento,
        intervaloInicio: h.intervaloInicio || null,
        intervaloFim: h.intervaloFim || null,
      }));
      const res = await fetch(apiUrl("/barbearias/me"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ horarioFuncionamento: horariosData })
      });
      if (!res.ok) throw new Error("Erro ao salvar horários");
      setCurrentStep(4);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message || "Erro ao salvar horários.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const createProfessionalOnServer = async (name: string, celular?: string): Promise<number | null> => {
    if (!barbeariaId) return null;
    const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/profissionais`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ nomeExibicao: name, comissaoValor: 0, celular: celular || null })
    });
    if (!res.ok) throw new Error("Erro ao criar profissional");
    const created = await res.json();
    return created.id;
  };

  const addProfessional = async () => {
    if (!profForm.nomeExibicao) {
      toast({ title: "Campo obrigatório", description: "Nome é obrigatório.", variant: "destructive" });
      return;
    }
    if (!barbeariaId) return;
    setLoading(true);
    try {
      const profId = await createProfessionalOnServer(profForm.nomeExibicao, profForm.celular);
      setProfessionals(prev => [...prev, { id: profId || undefined, ...profForm }]);
      setProfForm({ nomeExibicao: "", celular: "" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message || "Erro ao adicionar.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const removeProfessional = async (index: number) => {
    const prof = professionals[index];
    if (prof.id && barbeariaId) {
      try {
        await fetch(apiUrl(`/barbearias/${barbeariaId}/profissionais/${prof.id}`), {
          method: "DELETE", credentials: "include"
        });
      } catch {
        toast({ title: "Aviso", description: "Profissional removido localmente, mas houve erro no servidor.", variant: "destructive" });
      }
    }
    setProfessionals(prev => prev.filter((_, i) => i !== index));
  };

  const handleFinalize = async () => {
    setLoading(true);
    try {
      if (ownerAutoAdded && professionals.length > 0 && !professionals[0].id && barbeariaId) {
        try {
          const profId = await createProfessionalOnServer(professionals[0].nomeExibicao, professionals[0].celular);
          if (profId) {
            setProfessionals(prev => {
              const copy = [...prev];
              copy[0] = { ...copy[0], id: profId };
              return copy;
            });
          }
        } catch {}
      }

      const res = await fetch(apiUrl("/barbearias/me"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ onboardingStep: 5 })
      });
      if (!res.ok) throw new Error("Erro ao finalizar");

      if (!barbeariaSlug) {
        try {
          const meRes = await fetch(apiUrl("/auth/me"), { credentials: "include" });
          const me = await meRes.json();
          if (me.barbearia?.slug) setBarbeariaSlug(me.barbearia.slug);
        } catch {}
      }

      setShowConfetti(true);
      setCompleted(true);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message || "Erro ao finalizar.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const progressPercent = (currentStep / STEPS.length) * 100;

  if (completed) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4 relative overflow-hidden">
        {showConfetti && <ConfettiCanvas />}

        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#C4943C]/10 rounded-full blur-[100px]" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#C4943C]/5 rounded-full blur-[80px]" />
        </div>

        <div className="relative z-10 w-full max-w-lg text-center px-4">
          <div className="mb-6 animate-[bounce_1s_ease-in-out_2]">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-[#C4943C] to-[#D4A94C] flex items-center justify-center mx-auto shadow-2xl shadow-[#C4943C]/30">
              <PartyPopper className="h-12 w-12 sm:h-14 sm:w-14 text-white" />
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            Tudo Pronto!
          </h1>
          <div className="flex items-center justify-center gap-2 mb-3">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-5 w-5 text-[#C4943C] fill-[#C4943C]" />
            ))}
          </div>
          <p className="text-white/60 text-base sm:text-lg mb-2">
            Seu sistema <span className="text-[#C4943C] font-semibold">{locationData.nome || "Glow Upi"}</span> está configurado!
          </p>
          <p className="text-white/40 text-sm mb-8">
            {services.length > 0 && `${services.length} serviço${services.length > 1 ? "s" : ""} cadastrado${services.length > 1 ? "s" : ""}`}
            {services.length > 0 && professionals.length > 0 && " · "}
            {professionals.length > 0 && `${professionals.length} profissional${professionals.length > 1 ? "is" : ""}`}
          </p>

          <div className="space-y-3 mb-8">
            <button
              onClick={() => {
                const basePath = import.meta.env.BASE_URL || "/";
                const link = `${window.location.origin}${basePath}s/${barbeariaSlug}`;
                if (navigator.share) {
                  navigator.share({ title: locationData.nome, text: "Agende seu horário!", url: link });
                } else {
                  navigator.clipboard.writeText(link);
                  toast({ title: "Link copiado!", description: "Compartilhe com seus clientes." });
                }
              }}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-[#C4943C] to-[#D4A94C] text-white hover:brightness-110 transition-all active:scale-[0.98]"
            >
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <Share2 className="h-6 w-6" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <div className="font-semibold text-sm sm:text-base">Compartilhe seu link de agendamento</div>
                <div className="text-white/70 text-xs sm:text-sm truncate">Seus clientes já podem agendar</div>
              </div>
              <ArrowRight className="h-5 w-5 flex-shrink-0" />
            </button>

            <button
              onClick={() => {
                const prompt = (window as any).__pwaInstallPrompt;
                if (prompt) {
                  prompt.prompt();
                } else {
                  toast({
                    title: "Instalar o App",
                    description: 'Toque nos 3 pontinhos do navegador e selecione "Adicionar à tela inicial"'
                  });
                }
              }}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/[0.06] border border-white/[0.08] text-white hover:bg-white/[0.1] transition-all active:scale-[0.98]"
            >
              <div className="w-12 h-12 rounded-xl bg-[#C4943C]/20 flex items-center justify-center flex-shrink-0">
                <Download className="h-6 w-6 text-[#C4943C]" />
              </div>
              <div className="text-left flex-1">
                <div className="font-semibold text-sm sm:text-base">Instale o app no celular</div>
                <div className="text-white/50 text-xs sm:text-sm">Acesse rápido direto da tela inicial</div>
              </div>
              <ArrowRight className="h-5 w-5 text-white/30 flex-shrink-0" />
            </button>
          </div>

          <Button
            size="lg"
            onClick={() => window.location.href = "/dashboard"}
            className="w-full h-14 text-base font-semibold bg-white text-[#0A0A0A] hover:bg-white/90 rounded-2xl shadow-2xl"
          >
            <Sparkles className="h-5 w-5 mr-2" />
            Explorar meu Painel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
      <div className="sticky top-0 z-20 bg-[#0A0A0A]/95 backdrop-blur-sm border-b border-white/[0.06] px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#C4943C]" />
              <span className="text-sm font-medium text-white/80">Configuração</span>
            </div>
            <span className="text-xs text-white/40">{currentStep} de {STEPS.length}</span>
          </div>
          <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#C4943C] to-[#D4A94C] rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex mt-2 gap-1">
            {STEPS.map((step) => {
              const isActive = step.id === currentStep;
              const isDone = step.id < currentStep;
              return (
                <div key={step.id} className="flex-1 flex items-center justify-center">
                  <div className={`flex items-center gap-1 ${isActive ? "text-[#C4943C]" : isDone ? "text-green-400" : "text-white/20"}`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isActive ? "bg-[#C4943C] text-white" : isDone ? "bg-green-400/20 text-green-400" : "bg-white/[0.06] text-white/20"
                    }`}>
                      {isDone ? <Check className="h-3 w-3" /> : step.id}
                    </div>
                    <span className="text-[10px] sm:text-xs font-medium hidden sm:inline">{step.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center p-4 pt-6 pb-32">
        <div className="w-full max-w-2xl">
          <div className="mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              {currentStep === 1 && "Sobre seu negócio"}
              {currentStep === 2 && "Seus serviços"}
              {currentStep === 3 && "Horários de funcionamento"}
              {currentStep === 4 && "Sua equipe"}
            </h1>
            <p className="text-white/40 text-sm mt-1">
              {currentStep === 1 && "Informações básicas do seu estabelecimento."}
              {currentStep === 2 && "Cadastre os serviços que você oferece. Ajuste os preços e durações."}
              {currentStep === 3 && "Defina os dias e horários que você atende."}
              {currentStep === 4 && "Adicione os profissionais. Você pode pular e adicionar depois."}
            </p>
          </div>

          <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4 sm:p-6">
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-white/70 text-sm">Nome do Estabelecimento *</Label>
                  <Input
                    value={locationData.nome}
                    onChange={e => setLocationData(p => ({ ...p, nome: e.target.value }))}
                    className="h-12 text-base sm:text-lg bg-white/[0.06] border-white/[0.08] text-white placeholder:text-white/20 rounded-xl"
                    placeholder="Ex: Studio Glow Beauty"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-white/70 text-sm">Tipo do Estabelecimento *</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {TIPOS_ESTABELECIMENTO.map(tipo => (
                      <button
                        key={tipo}
                        type="button"
                        onClick={() => setSegmentData(p => ({ ...p, tipoEstabelecimento: tipo }))}
                        className={`p-2.5 sm:p-3 rounded-xl border text-xs sm:text-sm font-medium transition-all text-left ${
                          segmentData.tipoEstabelecimento === tipo
                            ? "border-[#C4943C] bg-[#C4943C]/10 text-[#C4943C]"
                            : "border-white/[0.08] text-white/50 hover:border-white/20"
                        }`}
                      >
                        {tipo}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-white/70 text-sm">Telefone / WhatsApp *</Label>
                    <Input
                      value={locationData.telefone}
                      onChange={e => setLocationData(p => ({ ...p, telefone: formatPhone(e.target.value) }))}
                      placeholder="(99) 91234-5678"
                      className="h-11 bg-white/[0.06] border-white/[0.08] text-white placeholder:text-white/20 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-white/70 text-sm">CEP</Label>
                    <Input
                      value={locationData.cep}
                      onChange={e => setLocationData(p => ({ ...p, cep: e.target.value }))}
                      onBlur={handleCepBlur}
                      placeholder="00000-000"
                      className="h-11 bg-white/[0.06] border-white/[0.08] text-white placeholder:text-white/20 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-white/70 text-sm">Cidade</Label>
                    <Input
                      value={locationData.cidade}
                      onChange={e => setLocationData(p => ({ ...p, cidade: e.target.value }))}
                      className="h-11 bg-white/[0.06] border-white/[0.08] text-white placeholder:text-white/20 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-white/70 text-sm">Estado</Label>
                    <select
                      value={locationData.uf}
                      onChange={e => setLocationData(p => ({ ...p, uf: e.target.value }))}
                      className="flex h-11 w-full items-center rounded-xl border border-white/[0.08] bg-white/[0.06] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#C4943C]"
                    >
                      <option value="" className="bg-[#1A1A1A]">Selecione</option>
                      {ESTADOS_BR.map(uf => (
                        <option key={uf} value={uf} className="bg-[#1A1A1A]">{uf}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-white/70 text-sm">Endereço</Label>
                  <Input
                    value={locationData.logradouro}
                    onChange={e => setLocationData(p => ({ ...p, logradouro: e.target.value }))}
                    className="h-11 bg-white/[0.06] border-white/[0.08] text-white placeholder:text-white/20 rounded-xl"
                    placeholder="Rua, Avenida..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-white/70 text-sm">Bairro</Label>
                    <Input
                      value={locationData.bairro}
                      onChange={e => setLocationData(p => ({ ...p, bairro: e.target.value }))}
                      className="h-11 bg-white/[0.06] border-white/[0.08] text-white placeholder:text-white/20 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-white/70 text-sm">Número</Label>
                    <Input
                      value={locationData.numero}
                      onChange={e => setLocationData(p => ({ ...p, numero: e.target.value }))}
                      className="h-11 bg-white/[0.06] border-white/[0.08] text-white placeholder:text-white/20 rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-white/70 text-sm">Como soube do Glow Upi?</Label>
                  <div className="flex flex-wrap gap-2">
                    {COMO_SOUBE.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setSegmentData(p => ({ ...p, comoSoube: c }))}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                          segmentData.comoSoube === c
                            ? "bg-[#C4943C]/20 text-[#C4943C] border border-[#C4943C]/40"
                            : "bg-white/[0.06] text-white/40 border border-white/[0.08] hover:border-white/20"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-5">
                {suggestedServices.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-[#C4943C]">
                        Sugestões para {segmentData.tipoEstabelecimento}
                      </h3>
                      <button
                        onClick={addAllSuggested}
                        disabled={loading}
                        className="text-xs font-medium text-[#C4943C] hover:text-[#D4A94C] transition-colors"
                      >
                        Adicionar todos
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {suggestedServices.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => addSuggestedService(s)}
                          disabled={loading}
                          className="flex items-center justify-between p-3 rounded-xl bg-[#C4943C]/5 border border-[#C4943C]/20 hover:bg-[#C4943C]/10 transition-all text-left group active:scale-[0.98]"
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-white/80 truncate">{s.nome}</div>
                            <div className="text-xs text-white/40">
                              R$ {parseFloat(s.preco).toFixed(2)} · {DURACOES.find(d => d.value === s.duracao)?.label || s.duracao + "min"}
                            </div>
                          </div>
                          <Plus className="h-4 w-4 text-[#C4943C] flex-shrink-0 ml-2 group-hover:scale-110 transition-transform" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {services.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-white/50 mb-3">
                      Cadastrados ({services.length})
                    </h3>
                    <div className="space-y-2">
                      {services.map((s, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-white/80 truncate">{s.nome}</div>
                            <div className="text-xs text-white/40">
                              R$ {parseFloat(s.preco || "0").toFixed(2)} · {DURACOES.find(d => d.value === String(s.duracaoMinutos))?.label || `${s.duracaoMinutos}min`}
                            </div>
                          </div>
                          <button onClick={() => removeService(i)} className="text-red-400/60 hover:text-red-400 transition-colors p-1 flex-shrink-0">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t border-white/[0.06] pt-4">
                  <h3 className="text-sm font-semibold text-white/50 mb-3">Adicionar manualmente</h3>
                  <div className="space-y-3">
                    <Input
                      value={serviceForm.nome}
                      onChange={e => setServiceForm(p => ({ ...p, nome: e.target.value }))}
                      placeholder="Nome do serviço"
                      className="h-11 bg-white/[0.06] border-white/[0.08] text-white placeholder:text-white/20 rounded-xl"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        type="number"
                        step="0.01"
                        value={serviceForm.preco}
                        onChange={e => setServiceForm(p => ({ ...p, preco: e.target.value }))}
                        placeholder="Valor (R$)"
                        className="h-11 bg-white/[0.06] border-white/[0.08] text-white placeholder:text-white/20 rounded-xl"
                      />
                      <select
                        value={serviceForm.duracaoMinutos}
                        onChange={e => setServiceForm(p => ({ ...p, duracaoMinutos: e.target.value }))}
                        className="flex h-11 w-full items-center rounded-xl border border-white/[0.08] bg-white/[0.06] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#C4943C]"
                      >
                        {DURACOES.map(d => (
                          <option key={d.value} value={d.value} className="bg-[#1A1A1A]">{d.label}</option>
                        ))}
                      </select>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addService}
                      disabled={loading}
                      className="border-[#C4943C]/30 text-[#C4943C] hover:bg-[#C4943C]/10 rounded-xl"
                    >
                      <Plus className="h-4 w-4 mr-2" /> Adicionar Serviço
                    </Button>
                  </div>
                </div>

                {services.length === 0 && suggestedServices.length === 0 && (
                  <p className="text-sm text-white/30 text-center py-4">
                    Nenhum serviço cadastrado. Você pode pular e adicionar depois.
                  </p>
                )}
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-3">
                {horarios.map((h, i) => {
                  const dayInfo = DIAS_SEMANA[i];
                  return (
                    <div key={dayInfo.key} className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 rounded-xl border transition-all ${
                      h.ativo
                        ? "bg-white/[0.04] border-white/[0.08]"
                        : "bg-white/[0.02] border-white/[0.04] opacity-50"
                    }`}>
                      <button
                        type="button"
                        onClick={() => setHorarios(prev => prev.map((item, idx) =>
                          idx === i ? { ...item, ativo: !item.ativo } : item
                        ))}
                        className="flex items-center gap-3 min-w-[100px] sm:min-w-[120px]"
                      >
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                          h.ativo ? "bg-[#C4943C] border-[#C4943C]" : "border-white/20"
                        }`}>
                          {h.ativo && <Check className="h-3 w-3 text-white" />}
                        </div>
                        <span className={`text-sm font-medium ${h.ativo ? "text-white/80" : "text-white/30"}`}>
                          <span className="sm:hidden">{dayInfo.short}</span>
                          <span className="hidden sm:inline">{dayInfo.label}</span>
                        </span>
                      </button>

                      {h.ativo && (
                        <div className="flex items-center gap-2 ml-8 sm:ml-0">
                          <input
                            type="time"
                            value={h.abertura}
                            onChange={e => setHorarios(prev => prev.map((item, idx) =>
                              idx === i ? { ...item, abertura: e.target.value } : item
                            ))}
                            className="h-9 px-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#C4943C] [color-scheme:dark]"
                          />
                          <span className="text-white/30 text-sm">às</span>
                          <input
                            type="time"
                            value={h.fechamento}
                            onChange={e => setHorarios(prev => prev.map((item, idx) =>
                              idx === i ? { ...item, fechamento: e.target.value } : item
                            ))}
                            className="h-9 px-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#C4943C] [color-scheme:dark]"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-5">
                {professionals.length > 0 && (
                  <div className="space-y-2">
                    {professionals.map((p, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-[#C4943C]/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-[#C4943C] font-bold text-sm">
                              {p.nomeExibicao.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-white/80 truncate">{p.nomeExibicao}</div>
                            {p.celular && <div className="text-xs text-white/40">{p.celular}</div>}
                            {i === 0 && ownerAutoAdded && (
                              <div className="text-[10px] text-[#C4943C]">Proprietário</div>
                            )}
                          </div>
                        </div>
                        {!(i === 0 && ownerAutoAdded) && (
                          <button onClick={() => removeProfessional(i)} className="text-red-400/60 hover:text-red-400 transition-colors p-1 flex-shrink-0">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className={professionals.length > 0 ? "border-t border-white/[0.06] pt-4" : ""}>
                  <h3 className="text-sm font-semibold text-white/50 mb-3">Adicionar profissional</h3>
                  <div className="space-y-3">
                    <Input
                      value={profForm.nomeExibicao}
                      onChange={e => setProfForm(p => ({ ...p, nomeExibicao: e.target.value }))}
                      placeholder="Nome do profissional"
                      className="h-11 bg-white/[0.06] border-white/[0.08] text-white placeholder:text-white/20 rounded-xl"
                    />
                    <Input
                      value={profForm.celular}
                      onChange={e => setProfForm(p => ({ ...p, celular: formatPhone(e.target.value) }))}
                      placeholder="Celular (opcional)"
                      className="h-11 bg-white/[0.06] border-white/[0.08] text-white placeholder:text-white/20 rounded-xl"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addProfessional}
                      disabled={loading}
                      className="border-[#C4943C]/30 text-[#C4943C] hover:bg-[#C4943C]/10 rounded-xl"
                    >
                      <Plus className="h-4 w-4 mr-2" /> Adicionar
                    </Button>
                  </div>
                </div>

                {professionals.length === 0 && (
                  <p className="text-sm text-white/30 text-center py-2">
                    Nenhum profissional adicionado. Você pode pular e adicionar depois.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-20 bg-[#0A0A0A]/95 backdrop-blur-sm border-t border-white/[0.06] p-4">
        <div className="max-w-2xl mx-auto flex justify-between items-center gap-3">
          {currentStep > 1 ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentStep(s => s - 1)}
              className="h-12 px-4 sm:px-6 border-white/[0.1] text-white/60 hover:bg-white/[0.06] rounded-xl"
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            {(currentStep === 2 || currentStep === 3 || currentStep === 4) && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  if (currentStep < 4) {
                    setCurrentStep(s => s + 1);
                  } else {
                    handleFinalize();
                  }
                }}
                className="h-12 px-4 text-white/30 hover:text-white/60 hover:bg-white/[0.04] rounded-xl text-sm"
              >
                Pular
              </Button>
            )}

            <Button
              type="button"
              size="lg"
              className="h-12 px-6 sm:px-8 bg-gradient-to-r from-[#C4943C] to-[#D4A94C] hover:brightness-110 text-white rounded-xl shadow-lg shadow-[#C4943C]/20 font-semibold"
              disabled={loading}
              onClick={() => {
                if (currentStep === 1) handleStep1Submit();
                else if (currentStep === 2) setCurrentStep(3);
                else if (currentStep === 3) handleHorariosSubmit();
                else handleFinalize();
              }}
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...</>
              ) : currentStep < 4 ? (
                <>Continuar <ChevronRight className="h-4 w-4 ml-1" /></>
              ) : (
                <>Finalizar <Check className="h-4 w-4 ml-1" /></>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
