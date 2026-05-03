import React, { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plug, CheckCircle2, AlertCircle, Trash2, Copy, ExternalLink, ShieldCheck, Webhook } from "lucide-react";

export default function ConexaoAsaas() {
  const { barbeariaId } = useAuth();
  const { toast } = useToast();
  const BASE = import.meta.env.BASE_URL;
  const [loading, setLoading] = useState(true);
  const [conta, setConta] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [ambiente, setAmbiente] = useState<"sandbox" | "producao">("sandbox");
  const [validating, setValidating] = useState(false);
  const [validatedAccount, setValidatedAccount] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [webhookInfo, setWebhookInfo] = useState<{ url: string; authToken: string } | null>(null);
  const [autoWebhookLoading, setAutoWebhookLoading] = useState(false);
  const [splitOptIn, setSplitOptIn] = useState(false);

  async function load() {
    if (!barbeariaId) return;
    setLoading(true);
    try {
      const res = await fetch(`${BASE}api/barbearias/${barbeariaId}/asaas`, { credentials: "include" });
      const data = await res.json();
      if (data?.conta) {
        setConta(data.conta);
        setSplitOptIn(!!data.conta.splitOptIn);
      } else {
        setConta(null);
      }
      if (data?.conta) {
        const wh = await fetch(`${BASE}api/barbearias/${barbeariaId}/asaas/webhook-url`, { credentials: "include" });
        if (wh.ok) setWebhookInfo(await wh.json());
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [barbeariaId]);

  async function validar() {
    setValidating(true);
    setValidatedAccount(null);
    try {
      const res = await fetch(`${BASE}api/barbearias/${barbeariaId}/asaas/validar`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ apiKey, ambiente }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Chave inválida");
      setValidatedAccount(data.account);
      toast({ title: "Chave validada com sucesso!" });
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" });
    } finally { setValidating(false); }
  }

  async function salvar() {
    setSaving(true);
    try {
      const res = await fetch(`${BASE}api/barbearias/${barbeariaId}/asaas`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ apiKey, ambiente, splitOptIn }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao conectar");
      toast({ title: "Conta Asaas conectada com sucesso!" });
      setShowForm(false);
      setApiKey("");
      setValidatedAccount(null);
      await load();
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  }

  async function configurarWebhook() {
    setAutoWebhookLoading(true);
    try {
      const res = await fetch(`${BASE}api/barbearias/${barbeariaId}/asaas/webhook-auto`, {
        method: "POST", credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao configurar webhook");
      toast({ title: "Webhook configurado automaticamente no Asaas!" });
      await load();
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" });
    } finally { setAutoWebhookLoading(false); }
  }

  async function desconectar() {
    if (!confirm("Tem certeza que deseja desconectar sua conta Asaas? Pagamentos pendentes podem ficar inacessíveis.")) return;
    try {
      const res = await fetch(`${BASE}api/barbearias/${barbeariaId}/asaas`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Erro ao desconectar");
      toast({ title: "Conta desconectada" });
      setConta(null); setShowForm(false);
    } catch (e: any) { toast({ title: e.message, variant: "destructive" }); }
  }

  async function salvarSplit() {
    try {
      const res = await fetch(`${BASE}api/barbearias/${barbeariaId}/asaas`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ splitOptIn }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro");
      toast({ title: "Configuração salva" });
      setConta(data.conta);
    } catch (e: any) { toast({ title: e.message, variant: "destructive" }); }
  }

  if (loading) {
    return <AppLayout><div className="flex items-center justify-center py-32"><Loader2 className="h-6 w-6 animate-spin" /></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto p-4 lg:p-6 space-y-4">
        <div>
          <h1 className="text-[20px] font-semibold text-foreground mb-1 flex items-center gap-2">
            <Plug className="h-5 w-5" /> Conexão Asaas
          </h1>
          <p className="text-sm text-foreground/60">
            Conecte sua própria conta Asaas para receber sinais, comandas e cobranças diretamente.
          </p>
        </div>

        {!conta && !showForm && (
          <Card>
            <CardContent className="p-6 text-center space-y-4">
              <div className="h-14 w-14 rounded-full bg-foreground/5 flex items-center justify-center mx-auto">
                <Plug className="h-7 w-7 text-foreground/40" />
              </div>
              <div>
                <h3 className="font-semibold text-base mb-1">Sem conta conectada</h3>
                <p className="text-sm text-foreground/60 mb-4">Conecte sua chave da API Asaas para começar a receber pagamentos online.</p>
                <Button onClick={() => setShowForm(true)}>Conectar conta Asaas</Button>
              </div>
              <div className="text-xs text-foreground/50 pt-2">
                Não tem conta? <a href="https://www.asaas.com" target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-1">Criar gratuitamente <ExternalLink className="h-3 w-3" /></a>
              </div>
            </CardContent>
          </Card>
        )}

        {showForm && (
          <Card>
            <CardContent className="p-6 space-y-4">
              <h3 className="font-semibold text-base">Conectar Asaas</h3>
              <div>
                <Label className="text-sm">Ambiente</Label>
                <div className="flex gap-2 mt-1.5">
                  <Button type="button" variant={ambiente === "sandbox" ? "default" : "outline"} size="sm" onClick={() => setAmbiente("sandbox")}>
                    Sandbox (testes)
                  </Button>
                  <Button type="button" variant={ambiente === "producao" ? "default" : "outline"} size="sm" onClick={() => setAmbiente("producao")}>
                    Produção
                  </Button>
                </div>
              </div>
              <div>
                <Label className="text-sm" htmlFor="asaas-key">Chave da API Asaas</Label>
                <Input
                  id="asaas-key"
                  type="password"
                  placeholder="$aact_..."
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  className="mt-1.5 font-mono text-xs"
                />
                <p className="text-xs text-foreground/50 mt-1">
                  Encontre em Asaas → Integrações → Chave de API. Sua chave é criptografada antes de ser salva.
                </p>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-foreground/5">
                <div>
                  <Label className="text-sm">Habilitar split por profissional</Label>
                  <p className="text-xs text-foreground/60 mt-0.5">Cada profissional pode ter sua própria carteira Asaas para receber a comissão automaticamente.</p>
                </div>
                <Switch checked={splitOptIn} onCheckedChange={setSplitOptIn} />
              </div>
              <div className="flex gap-2">
                <Button onClick={validar} disabled={!apiKey || validating} variant="outline" className="flex-1">
                  {validating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                  Validar chave
                </Button>
                <Button onClick={salvar} disabled={!apiKey || !validatedAccount || saving} className="flex-1">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                  Conectar
                </Button>
              </div>
              {validatedAccount && (
                <div className="p-3 rounded-lg bg-green-50 text-green-700 text-sm">
                  <CheckCircle2 className="h-4 w-4 inline mr-1.5" />
                  Conta válida: {validatedAccount.name || validatedAccount.email || "OK"}
                </div>
              )}
              <Button onClick={() => { setShowForm(false); setApiKey(""); setValidatedAccount(null); }} variant="ghost" size="sm" className="w-full">
                Cancelar
              </Button>
            </CardContent>
          </Card>
        )}

        {conta && (
          <>
            <Card>
              <CardContent className="p-6 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <h3 className="font-semibold">Conta conectada</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-foreground/10 uppercase">{conta.ambiente}</span>
                    </div>
                    <p className="text-sm text-foreground/80">{conta.accountName || conta.accountEmail || "Conta Asaas"}</p>
                    {conta.accountEmail && <p className="text-xs text-foreground/50">{conta.accountEmail}</p>}
                    <p className="text-xs text-foreground/50 mt-2">Chave: <span className="font-mono">{conta.apiKeyMasked}</span></p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={desconectar} className="text-red-500 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-sm flex items-center gap-2"><Webhook className="h-4 w-4" /> Webhook</h4>
                    <p className="text-xs text-foreground/60 mt-0.5">
                      O Asaas precisa nos avisar quando um pagamento for recebido.
                    </p>
                  </div>
                  {conta.webhookConfigured && <span className="text-[10px] px-2 py-1 rounded-full bg-green-50 text-green-600">Configurado</span>}
                </div>
                {webhookInfo && (
                  <>
                    <div>
                      <Label className="text-xs">URL do webhook</Label>
                      <div className="flex gap-2 mt-1">
                        <Input readOnly value={webhookInfo.url} className="font-mono text-xs" />
                        <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(webhookInfo.url)}>
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Token de autenticação</Label>
                      <div className="flex gap-2 mt-1">
                        <Input readOnly value={webhookInfo.authToken} className="font-mono text-xs" />
                        <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(webhookInfo.authToken)}>
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
                <Button onClick={configurarWebhook} disabled={autoWebhookLoading} className="w-full" size="sm">
                  {autoWebhookLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Webhook className="h-4 w-4 mr-2" />}
                  Registrar webhook automaticamente no Asaas
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Split por profissional</Label>
                    <p className="text-xs text-foreground/60 mt-0.5">
                      Cada profissional recebe sua comissão direto na sua carteira Asaas. Configure as carteiras na tela Profissionais.
                    </p>
                  </div>
                  <Switch checked={splitOptIn} onCheckedChange={setSplitOptIn} />
                </div>
                {splitOptIn !== conta.splitOptIn && (
                  <Button onClick={salvarSplit} size="sm">Salvar</Button>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
