import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useGetMyBarbearia, useUpdateBarbearia } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ImageUpload } from "@/components/ImageUpload";
import { formatPhone, stripPhone, apiUrl } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Building2, MapPin, Clock, Palette, Save, Link2, Copy, Check, ExternalLink, ImageIcon, XCircle, AlertTriangle, Loader2, CreditCard, ArrowUpRight } from "lucide-react";

const DIAS = ["segunda","terca","quarta","quinta","sexta","sabado","domingo"];
const DIA_LABEL: Record<string,string> = { segunda:"Segunda",terca:"Terça",quarta:"Quarta",quinta:"Quinta",sexta:"Sexta",sabado:"Sábado",domingo:"Domingo" };
const FUNCIONAMENTO_TO_EMPRESA: Record<string,string> = { "Segunda":"segunda","Terça":"terca","Quarta":"quarta","Quinta":"quinta","Sexta":"sexta","Sábado":"sabado","Domingo":"domingo" };

const DEFAULT_HORARIOS = Object.fromEntries(DIAS.map(d => [d, { aberto: d !== "domingo", inicio: "09:00", fim: "19:00" }]));

function normalizeHorarios(raw: any): any {
  if (!raw) return DEFAULT_HORARIOS;
  if (Array.isArray(raw)) {
    const result: any = { ...DEFAULT_HORARIOS };
    for (const item of raw) {
      const key = FUNCIONAMENTO_TO_EMPRESA[item.dia];
      if (key) {
        result[key] = {
          aberto: item.ativo ?? true,
          inicio: item.abertura || "09:00",
          fim: item.fechamento || "19:00",
        };
      }
    }
    return result;
  }
  return raw;
}

export default function Empresa() {
  const { barbeariaId } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [linkCopied, setLinkCopied] = useState(false);
  const { data: barbearia, isLoading } = useGetMyBarbearia({ query: { enabled: !!barbeariaId } });
  const updateMutation = useUpdateBarbearia();

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [cep, setCep] = useState("");
  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");
  const [corPrimaria, setCorPrimaria] = useState("#3b82f6");
  const [horarios, setHorarios] = useState<any>(DEFAULT_HORARIOS);
  const [loadingCep, setLoadingCep] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [cancellingPlan, setCancellingPlan] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);

  useEffect(() => {
    if (barbearia) {
      setNome(barbearia.nome || "");
      setTelefone(formatPhone(barbearia.telefone || ""));
      setEmail(barbearia.email || "");
      setCnpj(barbearia.cnpj || "");
      setCep(barbearia.cep || "");
      setLogradouro(barbearia.logradouro || "");
      setNumero(barbearia.numero || "");
      setBairro(barbearia.bairro || "");
      setCidade(barbearia.cidade || "");
      setUf(barbearia.uf || "");
      setCorPrimaria(barbearia.corPrimaria || "#3b82f6");
      setHorarios(normalizeHorarios(barbearia.horarioFuncionamento));
      setLogoUrl((barbearia as any).logoUrl || null);
    }
  }, [barbearia]);

  const buscarCep = async () => {
    const c = cep.replace(/\D/g, "");
    if (c.length !== 8) return;
    setLoadingCep(true);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${c}/json/`);
      const data = await r.json();
      if (!data.erro) {
        setLogradouro(data.logradouro || "");
        setBairro(data.bairro || "");
        setCidade(data.localidade || "");
        setUf(data.uf || "");
      }
    } catch {} finally { setLoadingCep(false); }
  };

  const toggleDia = (dia: string) => {
    setHorarios((h: any) => ({ ...h, [dia]: { ...h[dia], aberto: !h[dia]?.aberto } }));
  };

  const setHorario = (dia: string, field: "inicio" | "fim", val: string) => {
    setHorarios((h: any) => ({ ...h, [dia]: { ...h[dia], [field]: val } }));
  };

  const isTrial = !barbearia?.stripeCustomerId || (barbearia as any)?.subscriptionStatus === "trial";

  const openStripePortal = async () => {
    if (isTrial) {
      const basePath = import.meta.env.BASE_URL || "/";
      window.location.href = `${basePath}#pricing`;
      return;
    }
    setOpeningPortal(true);
    try {
      const res = await fetch(apiUrl("/checkout/create-portal-session"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      let data: any;
      try { data = await res.json(); } catch { data = {}; }
      if (!res.ok) throw new Error(data.error || "Erro ao abrir portal");
      if (data.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setOpeningPortal(false);
    }
  };

  const handleCancelPlan = async () => {
    setCancellingPlan(true);
    try {
      const res = await fetch(apiUrl("/checkout/cancel-subscription"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      let data: any;
      try { data = await res.json(); } catch { data = {}; }
      if (!res.ok) throw new Error(data.message || data.error || "Falha ao cancelar assinatura");
      const endDate = data.periodEnd ? new Date(data.periodEnd).toLocaleDateString("pt-BR") : "";
      toast({ title: "Assinatura cancelada", description: endDate ? `Você tem acesso até ${endDate}. Não haverá mais cobranças.` : "Não haverá mais cobranças." });
      setShowCancelConfirm(false);
      qc.invalidateQueries();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message || "Falha ao cancelar assinatura. Tente novamente.", variant: "destructive" });
    } finally {
      setCancellingPlan(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateMutation.mutateAsync({ data: { nome, telefone: stripPhone(telefone), email: email || null, cnpj: cnpj || null, cep: cep || null, logradouro: logradouro || null, numero: numero || null, bairro: bairro || null, cidade: cidade || null, uf: uf || null, corPrimaria, horarioFuncionamento: horarios, logoUrl } as any });
      qc.invalidateQueries();
      toast({ title: "Dados atualizados com sucesso!" });
    } catch { toast({ title: "Erro ao salvar", variant: "destructive" }); }
  };

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground">Meu Estúdio</h1>
        <p className="text-muted-foreground mt-1">Configurações do seu espaço</p>
      </div>

      {barbearia && (
        <div className="flex items-center gap-3 mb-6 p-4 bg-card rounded-xl border border-border">
          {logoUrl ? (
            <img src={logoUrl} alt={barbearia.nome} className="h-12 w-12 rounded-xl object-cover border border-primary/30" />
          ) : (
            <div className="h-12 w-12 rounded-xl flex items-center justify-center border border-primary/30" style={{ background: `${corPrimaria}20` }}>
              <Building2 className="h-6 w-6" style={{ color: corPrimaria }} />
            </div>
          )}
          <div>
            <p className="font-bold text-lg">{barbearia.nome}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={barbearia.planoStatus === "ativo" ? "secondary" : "destructive"}>{barbearia.planoNome}</Badge>
              <span className="text-xs text-muted-foreground">/{barbearia.slug}</span>
            </div>
          </div>
        </div>
      )}

      {barbearia?.slug && (
        <Card className="mb-6">
          <CardHeader><CardTitle className="flex items-center gap-2"><Link2 className="h-5 w-5 text-primary" /> Página Pública</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">Compartilhe este link com seus clientes para agendamento online:</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 rounded-lg bg-muted text-sm font-mono truncate">
                {window.location.origin}{import.meta.env.BASE_URL}s/{barbearia.slug}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const url = `${window.location.origin}${import.meta.env.BASE_URL}s/${barbearia.slug}`;
                  navigator.clipboard.writeText(url);
                  setLinkCopied(true);
                  toast({ title: "Link copiado!", description: "Compartilhe com seus clientes" });
                  setTimeout(() => setLinkCopied(false), 2000);
                }}
              >
                {linkCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                asChild
              >
                <a href={`${import.meta.env.BASE_URL}s/${barbearia.slug}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {barbearia && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-primary" /> Meu Plano</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-sm">{barbearia.subscriptionPlan || barbearia.planoNome || "Trial"}</Badge>
                  {barbearia.subscriptionPeriod && <span className="text-xs text-muted-foreground">({barbearia.subscriptionPeriod})</span>}
                </div>
                {barbearia.planoVencimento && (
                  <p className="text-sm text-muted-foreground">
                    Acesso até: <strong className="text-foreground">{new Date(barbearia.planoVencimento).toLocaleDateString("pt-BR")}</strong>
                  </p>
                )}
              </div>
              <Button variant="outline" onClick={openStripePortal} disabled={openingPortal}>
                {openingPortal ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowUpRight className="h-4 w-4 mr-2" />}
                {isTrial ? "Escolher Plano" : "Gerenciar Plano / Upgrade"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-40 bg-card rounded-2xl animate-pulse" />)}</div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><ImageIcon className="h-5 w-5 text-primary" /> Logo do Estúdio</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Essa imagem aparecerá na sua página pública de agendamento. Recomendamos uma imagem quadrada (ex: 500x500px).
              </p>
              <ImageUpload
                value={logoUrl}
                onChange={setLogoUrl}
                shape="square"
                size="lg"
                placeholder={<Building2 className="h-8 w-8 text-muted-foreground" />}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" /> Dados do Estúdio</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label>Nome do Salão / Estúdio</Label>
                <Input value={nome} onChange={e => setNome(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Telefone / WhatsApp</Label>
                <Input value={telefone} onChange={e => setTelefone(formatPhone(e.target.value))} placeholder="(99) 91234-5678" />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="contato@seusalao.com" />
              </div>
              <div className="space-y-2">
                <Label>CNPJ</Label>
                <Input value={cnpj} onChange={e => setCnpj(e.target.value)} placeholder="00.000.000/0001-00" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" /> Endereço</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>CEP</Label>
                <div className="flex gap-2">
                  <Input value={cep} onChange={e => setCep(e.target.value)} onBlur={buscarCep} placeholder="00000-000" maxLength={9} />
                  <Button type="button" variant="outline" size="sm" onClick={buscarCep} disabled={loadingCep}>
                    {loadingCep ? "..." : "Buscar"}
                  </Button>
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Logradouro</Label>
                <Input value={logradouro} onChange={e => setLogradouro(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Número</Label>
                <Input value={numero} onChange={e => setNumero(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Bairro</Label>
                <Input value={bairro} onChange={e => setBairro(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Cidade / UF</Label>
                <div className="flex gap-2">
                  <Input className="flex-1" value={cidade} onChange={e => setCidade(e.target.value)} />
                  <Input className="w-16" value={uf} onChange={e => setUf(e.target.value)} maxLength={2} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5 text-primary" /> Horário de Funcionamento</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {DIAS.map(dia => (
                <div key={dia} className="flex items-center gap-3">
                  <button type="button" onClick={() => toggleDia(dia)} className={`w-24 text-sm px-3 py-1.5 rounded-lg border font-medium transition-colors ${horarios[dia]?.aberto ? "bg-primary/10 border-primary/30 text-primary" : "bg-muted border-border text-muted-foreground"}`}>
                    {DIA_LABEL[dia]}
                  </button>
                  {horarios[dia]?.aberto ? (
                    <div className="flex items-center gap-2">
                      <Input type="time" value={horarios[dia]?.inicio || "09:00"} onChange={e => setHorario(dia, "inicio", e.target.value)} className="w-32" />
                      <span className="text-muted-foreground text-sm">até</span>
                      <Input type="time" value={horarios[dia]?.fim || "19:00"} onChange={e => setHorario(dia, "fim", e.target.value)} className="w-32" />
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground italic">Fechado</span>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5 text-primary" /> Personalização</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="space-y-2">
                  <Label>Cor Principal</Label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={corPrimaria} onChange={e => setCorPrimaria(e.target.value)} className="h-10 w-16 rounded-lg border border-border cursor-pointer" />
                    <Input value={corPrimaria} onChange={e => setCorPrimaria(e.target.value)} className="w-32 font-mono" />
                    <div className="h-10 w-10 rounded-lg border border-border" style={{ background: corPrimaria }} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-500">
                <XCircle className="h-5 w-5" /> Cancelar Assinatura
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!showCancelConfirm ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Ao cancelar, as cobranças param imediatamente, mas você mantém acesso até o final do período já pago.
                  </p>
                  <Button variant="outline" className="border-red-500/30 text-red-500 hover:bg-red-500/10" onClick={() => setShowCancelConfirm(true)}>
                    Cancelar Meu Plano
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 p-4 bg-red-500/5 rounded-xl border border-red-500/20">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm text-red-500">Tem certeza que deseja cancelar?</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Sua assinatura será cancelada e não haverá mais cobranças. Você poderá continuar usando até o final do período atual.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="destructive" onClick={handleCancelPlan} disabled={cancellingPlan}>
                      {cancellingPlan ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Cancelando...</> : "Sim, Cancelar Assinatura"}
                    </Button>
                    <Button variant="outline" onClick={() => setShowCancelConfirm(false)} disabled={cancellingPlan}>
                      Não, Manter Plano
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" size="lg" disabled={updateMutation.isPending}>
              <Save className="h-4 w-4 mr-2" /> {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      )}
    </AppLayout>
  );
}
