import React, { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CreditCard, CheckCircle2, AlertCircle } from "lucide-react";

interface Plano { id: string; nome: string; valor: number; }

export default function MensalidadeSaaS() {
  const { toast } = useToast();
  const BASE = import.meta.env.BASE_URL;
  const [loading, setLoading] = useState(true);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [assinatura, setAssinatura] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [planoSel, setPlanoSel] = useState<string>("");
  const [billingType, setBillingType] = useState<"PIX" | "BOLETO" | "CREDIT_CARD">("PIX");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [pRes, aRes] = await Promise.all([
        fetch(`${BASE}api/asaas-saas/planos`, { credentials: "include" }),
        fetch(`${BASE}api/asaas-saas`, { credentials: "include" }),
      ]);
      if (pRes.ok) setPlanos(await pRes.json());
      if (aRes.ok) {
        const data = await aRes.json();
        setAssinatura(data.assinatura);
        if (data.assinatura?.plano) setPlanoSel(data.assinatura.plano);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function assinar() {
    if (!planoSel) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${BASE}api/asaas-saas`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ plano: planoSel, billingType, payerCpfCnpj: cpfCnpj || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao criar assinatura");
      toast({ title: "Assinatura criada com sucesso!" });
      setShowForm(false);
      setCpfCnpj("");
      await load();
    } catch (e: any) { toast({ title: e.message, variant: "destructive" }); }
    finally { setSubmitting(false); }
  }

  async function cancelar() {
    if (!confirm("Tem certeza que deseja cancelar sua assinatura?")) return;
    try {
      const res = await fetch(`${BASE}api/asaas-saas`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error();
      toast({ title: "Assinatura cancelada" });
      await load();
    } catch { toast({ title: "Erro ao cancelar", variant: "destructive" }); }
  }

  if (loading) {
    return <AppLayout><div className="flex items-center justify-center py-32"><Loader2 className="h-6 w-6 animate-spin" /></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto p-4 lg:p-6 space-y-4">
        <div>
          <h1 className="text-[20px] font-semibold text-foreground mb-1 flex items-center gap-2">
            <CreditCard className="h-5 w-5" /> Mensalidade Glow Upi
          </h1>
          <p className="text-sm text-foreground/60">Pagamento via Asaas — Pix, boleto ou cartão.</p>
        </div>

        {assinatura && assinatura.status === "ACTIVE" && (
          <Card>
            <CardContent className="p-6 space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <h3 className="font-semibold">Assinatura ativa</h3>
              </div>
              <p className="text-sm">{planos.find(p => p.id === assinatura.plano)?.nome || assinatura.plano}</p>
              <p className="text-sm text-foreground/60">
                R$ {Number(assinatura.valor).toFixed(2).replace(".", ",")} / mês via {assinatura.billingType}
              </p>
              {assinatura.proximoVencimento && (
                <p className="text-xs text-foreground/50">Próximo vencimento: {new Date(assinatura.proximoVencimento + "T12:00:00").toLocaleDateString("pt-BR")}</p>
              )}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>Trocar plano</Button>
                <Button variant="ghost" size="sm" className="text-red-500" onClick={cancelar}>Cancelar</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {assinatura && assinatura.status !== "ACTIVE" && (
          <Card><CardContent className="p-6">
            <div className="flex items-center gap-2 text-amber-600 mb-2">
              <AlertCircle className="h-5 w-5" />
              <h3 className="font-semibold">Assinatura {assinatura.status}</h3>
            </div>
            <Button size="sm" onClick={() => setShowForm(true)}>Renovar</Button>
          </CardContent></Card>
        )}

        {(showForm || !assinatura) && (
          <Card>
            <CardContent className="p-6 space-y-4">
              <h3 className="font-semibold">{assinatura ? "Trocar plano" : "Escolher plano"}</h3>

              <div className="space-y-2">
                {planos.map(p => (
                  <label key={p.id} className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition ${planoSel === p.id ? "border-primary bg-primary/5" : "border-foreground/10 hover:bg-foreground/5"}`}>
                    <div className="flex items-center gap-3">
                      <input type="radio" checked={planoSel === p.id} onChange={() => setPlanoSel(p.id)} />
                      <div>
                        <div className="font-medium text-sm">{p.nome}</div>
                        <div className="text-xs text-foreground/60">R$ {p.valor.toFixed(2).replace(".", ",")} / mês</div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              <div>
                <Label className="text-sm">Forma de pagamento</Label>
                <div className="flex gap-2 mt-1.5">
                  {(["PIX", "BOLETO", "CREDIT_CARD"] as const).map(b => (
                    <Button key={b} type="button" size="sm" variant={billingType === b ? "default" : "outline"} onClick={() => setBillingType(b)}>
                      {b === "PIX" ? "Pix" : b === "BOLETO" ? "Boleto" : "Cartão"}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm">CPF/CNPJ</Label>
                <Input value={cpfCnpj} onChange={e => setCpfCnpj(e.target.value)} placeholder="Apenas números" className="mt-1.5" />
              </div>

              <div className="flex gap-2">
                {assinatura && <Button variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>}
                <Button onClick={assinar} disabled={!planoSel || submitting} className="flex-1">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {assinatura ? "Trocar para este plano" : "Assinar agora"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
