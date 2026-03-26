import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Clock, Save } from "lucide-react";

const DIAS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
const DEFAULT_HORARIOS = DIAS.map((d, i) => ({
  dia: d,
  ativo: i < 6,
  abertura: "08:00",
  fechamento: "18:00",
  intervaloInicio: "12:00",
  intervaloFim: "13:00",
}));

export default function Funcionamento() {
  const { barbeariaId } = useAuth();
  const { toast } = useToast();
  const [horarios, setHorarios] = useState(DEFAULT_HORARIOS);
  const [loading, setLoading] = useState(true);
  const BASE = import.meta.env.BASE_URL;

  useEffect(() => { if (barbeariaId) fetchBarbearia(); }, [barbeariaId]);

  const fetchBarbearia = async () => {
    try {
      const res = await fetch(`${BASE}api/barbearias/me`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        if (data.horarioFuncionamento && Array.isArray(data.horarioFuncionamento)) {
          setHorarios(data.horarioFuncionamento);
        }
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const save = async () => {
    try {
      const res = await fetch(`${BASE}api/barbearias/me`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ horarioFuncionamento: horarios }),
      });
      if (res.ok) toast({ title: "Horários salvos com sucesso!" });
      else toast({ title: "Erro ao salvar", variant: "destructive" });
    } catch { toast({ title: "Erro ao salvar", variant: "destructive" }); }
  };

  const update = (index: number, field: string, value: any) => {
    setHorarios(h => h.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  if (loading) return <AppLayout><div className="animate-pulse h-48 bg-white rounded-2xl" /></AppLayout>;

  return (
    <AppLayout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-bold text-foreground">Horários de Funcionamento</h1>
          <p className="text-foreground/40 text-[14px] mt-0.5">Configure os horários de funcionamento do estúdio</p>
        </div>
        <Button onClick={save} className="rounded-xl"><Save className="h-4 w-4 mr-2" />Salvar</Button>
      </div>

      <div className="space-y-3">
        {horarios.map((h, i) => (
          <Card key={h.dia} className="bg-white border-black/[0.04] shadow-none">
            <CardContent className="p-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-3 sm:w-40">
                  <Switch checked={h.ativo} onCheckedChange={v => update(i, "ativo", v)} />
                  <span className={`text-[14px] font-medium ${h.ativo ? "" : "text-foreground/30"}`}>{h.dia}</span>
                </div>
                {h.ativo && (
                  <div className="flex flex-wrap gap-3 flex-1">
                    <div className="flex items-center gap-2">
                      <Label className="text-[12px] text-foreground/40">Abre</Label>
                      <Input type="time" value={h.abertura} onChange={e => update(i, "abertura", e.target.value)} className="w-28 h-9 rounded-xl text-[13px]" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-[12px] text-foreground/40">Fecha</Label>
                      <Input type="time" value={h.fechamento} onChange={e => update(i, "fechamento", e.target.value)} className="w-28 h-9 rounded-xl text-[13px]" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-[12px] text-foreground/40">Intervalo</Label>
                      <Input type="time" value={h.intervaloInicio} onChange={e => update(i, "intervaloInicio", e.target.value)} className="w-28 h-9 rounded-xl text-[13px]" />
                      <span className="text-foreground/20">—</span>
                      <Input type="time" value={h.intervaloFim} onChange={e => update(i, "intervaloFim", e.target.value)} className="w-28 h-9 rounded-xl text-[13px]" />
                    </div>
                  </div>
                )}
                {!h.ativo && <span className="text-[13px] text-foreground/30 italic">Fechado</span>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppLayout>
  );
}
