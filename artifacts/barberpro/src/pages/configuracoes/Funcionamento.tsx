import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Save, Users } from "lucide-react";

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
  const [showProfDialog, setShowProfDialog] = useState(false);
  const [profissionais, setProfissionais] = useState<any[]>([]);
  const [profsForaJanela, setProfsForaJanela] = useState<Array<{ id: number; nome: string; motivo: string }>>([]);
  const [selectedProfIds, setSelectedProfIds] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(true);
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

  const fetchProfissionais = async () => {
    try {
      const res = await fetch(`${BASE}api/barbearias/${barbeariaId}/profissionais`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setProfissionais(data);
        setSelectedProfIds(data.map((p: any) => p.id));
        setSelectAll(true);
      }
    } catch (e) { console.error(e); }
  };

  const save = async () => {
    try {
      const res = await fetch(`${BASE}api/barbearias/me`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ horarioFuncionamento: horarios }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({} as any));
        toast({ title: "Horários salvos com sucesso!" });
        const fora = Array.isArray(data?.profsForaJanela) ? data.profsForaJanela : [];
        setProfsForaJanela(fora);
        await fetchProfissionais();
        if (fora.length > 0) {
          setSelectedProfIds(fora.map((p: any) => p.id));
          setSelectAll(true);
          setShowProfDialog(true);
        }
      } else {
        const err = await res.json().catch(() => ({} as any));
        toast({ title: err?.error || "Erro ao salvar", variant: "destructive" });
      }
    } catch { toast({ title: "Erro ao salvar", variant: "destructive" }); }
  };

  const handleSyncProfs = async () => {
    if (selectedProfIds.length === 0) {
      setShowProfDialog(false);
      return;
    }
    try {
      const res = await fetch(`${BASE}api/barbearias/${barbeariaId}/profissionais/bulk-horarios`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({
          resetToDefault: true,
          profissionalIds: selectedProfIds,
        }),
      });
      if (res.ok) {
        toast({ title: `Horários de ${selectedProfIds.length} profissional(is) atualizados!` });
      } else {
        toast({ title: "Erro ao atualizar profissionais", variant: "destructive" });
      }
    } catch { toast({ title: "Erro ao atualizar", variant: "destructive" }); }
    setShowProfDialog(false);
  };

  const toggleProfId = (id: number) => {
    setSelectedProfIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      setSelectAll(next.length === profissionais.length);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectAll) {
      setSelectedProfIds([]);
      setSelectAll(false);
    } else {
      setSelectedProfIds(profissionais.map((p: any) => p.id));
      setSelectAll(true);
    }
  };

  const update = (index: number, field: string, value: any) => {
    setHorarios(h => h.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  if (loading) return <AppLayout><div className="animate-pulse h-48 bg-card rounded-2xl" /></AppLayout>;

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
          <Card key={h.dia} className="bg-card border-border shadow-none">
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

      <Dialog open={showProfDialog} onOpenChange={setShowProfDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Users className="h-5 w-5" />
              {profsForaJanela.length} profissional(is) ficaram fora do novo horário
            </DialogTitle>
            <DialogDescription>
              Os horários abaixo estão configurados fora do novo funcionamento do estabelecimento. Deseja sincronizar agora para aplicar o horário padrão?
            </DialogDescription>
          </DialogHeader>
          {profsForaJanela.length > 0 ? (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              <div className="flex items-center gap-2 pb-2 border-b">
                <Checkbox checked={selectAll} onCheckedChange={toggleAll} id="select-all" />
                <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">Selecionar todos</label>
              </div>
              {profsForaJanela.map((p) => (
                <div key={p.id} className="flex items-start gap-2">
                  <Checkbox checked={selectedProfIds.includes(p.id)} onCheckedChange={() => toggleProfId(p.id)} id={`prof-${p.id}`} className="mt-0.5" />
                  <label htmlFor={`prof-${p.id}`} className="text-sm cursor-pointer flex-1">
                    <div className="font-medium">{p.nome}</div>
                    <div className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">{p.motivo}</div>
                  </label>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Todos os profissionais estão dentro do horário.</p>
          )}
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="outline" onClick={() => setShowProfDialog(false)} className="rounded-xl">Agora não</Button>
            <Button onClick={handleSyncProfs} disabled={selectedProfIds.length === 0} className="rounded-xl">
              Sincronizar agora {selectedProfIds.length > 0 ? `(${selectedProfIds.length})` : ""}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
