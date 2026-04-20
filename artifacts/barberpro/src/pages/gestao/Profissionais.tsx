import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import {
  useListProfissionais, useCreateProfissional,
  useUpdateProfissional, useDeleteProfissional,
  useListServicos
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, Users, Award, ToggleLeft, ToggleRight, Clock, Calendar, Scissors, Check, User, Phone } from "lucide-react";
import { formatCurrency, formatPhone } from "@/lib/utils";
import { ImageUpload } from "@/components/ImageUpload";

type ServicoOverride = {
  servicoId: number;
  comissaoOverride?: number | null;
  tempoOverride?: number | null;
  precoOverride?: number | null;
};

type Prof = {
  id: number;
  nomeExibicao: string;
  apelido?: string | null;
  celular?: string | null;
  especialidade: string | null;
  comissaoTipo: string;
  comissaoValor: number;
  ativo: boolean;
  horarios?: any;
  fotoUrl?: string | null;
  servicoIds?: number[];
  servicosOverrides?: ServicoOverride[];
};

type Servico = {
  id: number;
  nome: string;
  preco: number;
  duracaoMinutos: number;
  comissaoPorcentagem?: number | null;
  ativo: boolean;
};

const DIAS_SEMANA = [
  { key: "segunda", label: "Segunda" },
  { key: "terca", label: "Terça" },
  { key: "quarta", label: "Quarta" },
  { key: "quinta", label: "Quinta" },
  { key: "sexta", label: "Sexta" },
  { key: "sabado", label: "Sábado" },
  { key: "domingo", label: "Domingo" },
];

function ScheduleEditor({ value, onChange }: { value: any; onChange: (v: any) => void }) {
  const horarios = value?.porDia || {};

  const updateDay = (dia: string, field: string, val: any) => {
    const current = horarios[dia] || { inicio: "08:00", fim: "18:00", folga: false };
    const updated = { ...current, [field]: val };
    onChange({ ...value, porDia: { ...horarios, [dia]: updated } });
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2 text-sm font-medium">
        <Clock className="h-4 w-4 text-primary" />
        Horários por Dia da Semana
      </Label>
      <div className="rounded-xl border border-border overflow-hidden">
        {DIAS_SEMANA.map((dia, i) => {
          const config = horarios[dia.key] || { inicio: "08:00", fim: "18:00", folga: false };
          return (
            <div key={dia.key} className={`flex items-center gap-3 px-4 py-2.5 ${i > 0 ? "border-t border-border/50" : ""} ${config.folga ? "opacity-50 bg-muted/30" : ""}`}>
              <span className="w-20 text-sm font-medium text-foreground shrink-0">{dia.label}</span>
              <div className="flex items-center gap-2 flex-1">
                <Input
                  type="time"
                  value={config.folga ? "" : (config.inicio || "08:00")}
                  onChange={e => updateDay(dia.key, "inicio", e.target.value)}
                  disabled={config.folga}
                  className="h-8 w-28 text-xs bg-background"
                />
                <span className="text-xs text-muted-foreground">às</span>
                <Input
                  type="time"
                  value={config.folga ? "" : (config.fim || "18:00")}
                  onChange={e => updateDay(dia.key, "fim", e.target.value)}
                  disabled={config.folga}
                  className="h-8 w-28 text-xs bg-background"
                />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-muted-foreground">Folga</span>
                <Switch
                  checked={config.folga || false}
                  onCheckedChange={(checked) => updateDay(dia.key, "folga", checked)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProfForm({
  initial, onSave, onCancel, isPending, servicos
}: {
  initial?: Partial<Prof>;
  onSave: (d: any) => void;
  onCancel: () => void;
  isPending?: boolean;
  servicos: Servico[];
}) {
  const [nome, setNome] = useState(initial?.nomeExibicao ?? "");
  const [apelido, setApelido] = useState(initial?.apelido ?? "");
  const [celular, setCelular] = useState(initial?.celular ?? "");
  const [esp, setEsp] = useState(initial?.especialidade ?? "");
  const [tipo, setTipo] = useState<string>(initial?.comissaoTipo ?? "percentual");
  const [valor, setValor] = useState(String(initial?.comissaoValor ?? ""));
  const [fotoUrl, setFotoUrl] = useState(initial?.fotoUrl ?? "");
  const [horarios, setHorarios] = useState<any>(initial?.horarios || { porDia: {} });
  const [showSchedule, setShowSchedule] = useState(!!initial?.horarios?.porDia && Object.keys(initial.horarios.porDia).length > 0);
  const [selectedServicoIds, setSelectedServicoIds] = useState<number[]>(initial?.servicoIds || []);

  const initialOverridesMap = new Map<number, ServicoOverride>();
  (initial?.servicosOverrides || []).forEach(o => initialOverridesMap.set(o.servicoId, o));
  const [overrides, setOverrides] = useState<Map<number, ServicoOverride>>(initialOverridesMap);

  const activeServicos = servicos.filter(s => s.ativo);

  const toggleServico = (id: number) => {
    setSelectedServicoIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedServicoIds(activeServicos.map(s => s.id));
  };

  const clearAll = () => {
    setSelectedServicoIds([]);
  };

  const updateOverride = (servicoId: number, field: keyof ServicoOverride, value: string) => {
    setOverrides(prev => {
      const next = new Map(prev);
      const existing = next.get(servicoId) || { servicoId };
      const numVal = value === "" ? null : Number(value);
      next.set(servicoId, { ...existing, [field]: numVal });
      return next;
    });
  };

  const getOverride = (servicoId: number): ServicoOverride => {
    return overrides.get(servicoId) || { servicoId };
  };

  return (
    <form onSubmit={e => {
      e.preventDefault();
      const servicosOverrides = selectedServicoIds
        .map(id => getOverride(id))
        .filter(o => o.comissaoOverride != null || o.tempoOverride != null || o.precoOverride != null);

      onSave({
        nomeExibicao: nome,
        apelido: apelido || null,
        celular: celular || null,
        especialidade: esp || null,
        comissaoTipo: tipo,
        comissaoValor: parseFloat(valor),
        fotoUrl: fotoUrl || null,
        horarios: showSchedule ? horarios : null,
        servicoIds: selectedServicoIds,
        servicosOverrides,
      });
    }} className="space-y-4 mt-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Nome de Exibição *</Label>
          <Input value={nome} onChange={e => setNome(e.target.value)} required placeholder="Ex: Ana Beatriz" className="bg-background" />
        </div>
        <div className="space-y-2">
          <Label>Apelido</Label>
          <Input value={apelido} onChange={e => setApelido(e.target.value)} placeholder="Nome curto para agenda" className="bg-background" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Especialidade</Label>
          <Input value={esp} onChange={e => setEsp(e.target.value)} placeholder="Ex: Nail Designer" className="bg-background" />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5" />
            Celular
          </Label>
          <Input value={celular} onChange={e => setCelular(formatPhone(e.target.value))} placeholder="(11) 99999-0000" className="bg-background" />
        </div>
      </div>

      <ImageUpload
        value={fotoUrl}
        onChange={(url) => setFotoUrl(url || "")}
        shape="circle"
        size="md"
        label="Foto de Perfil"
        placeholder={<User className="h-6 w-6 text-muted-foreground" />}
      />

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tipo de Comissão</Label>
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="percentual">Percentual (%)</SelectItem>
              <SelectItem value="valor_fixo">Valor Fixo (R$)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{tipo === "percentual" ? "Porcentagem (%)" : "Valor (R$)"}</Label>
          <Input
            type="number" step="0.01" min="0"
            value={valor} onChange={e => setValor(e.target.value)}
            required placeholder={tipo === "percentual" ? "40" : "30.00"}
            className="bg-background"
          />
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <Label className="flex items-center gap-2 text-sm font-medium mb-3">
          <Scissors className="h-4 w-4 text-primary" />
          Serviços que atende
        </Label>
        {activeServicos.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum serviço ativo cadastrado</p>
        ) : (
          <>
            <div className="flex gap-2 mb-2">
              <button type="button" onClick={selectAll} className="text-xs text-primary hover:underline">Selecionar todos</button>
              <span className="text-xs text-muted-foreground">|</span>
              <button type="button" onClick={clearAll} className="text-xs text-muted-foreground hover:underline">Limpar</button>
            </div>
            <div className="rounded-xl border border-border overflow-hidden max-h-[400px] overflow-y-auto">
              {activeServicos.map((s, i) => {
                const checked = selectedServicoIds.includes(s.id);
                const ov = getOverride(s.id);
                return (
                  <div key={s.id} className={`${i > 0 ? "border-t border-border/50" : ""}`}>
                    <button
                      type="button"
                      onClick={() => toggleServico(s.id)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/30`}
                    >
                      <div className={`h-5 w-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${checked ? "bg-primary border-primary" : "border-border"}`}>
                        {checked && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{s.nome}</p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {s.duracaoMinutos}min — R$ {s.preco.toFixed(2).replace(".", ",")}
                      </span>
                    </button>
                    {checked && (
                      <div className="px-4 pb-3 pt-1 bg-muted/10">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-medium">Valores personalizados (deixe vazio para usar padrão)</p>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[10px] text-muted-foreground block mb-0.5">Comissão (%)</label>
                            <Input
                              type="number" step="0.01" min="0" max="100"
                              value={ov.comissaoOverride != null ? String(ov.comissaoOverride) : ""}
                              onChange={e => updateOverride(s.id, "comissaoOverride", e.target.value)}
                              placeholder={s.comissaoPorcentagem != null ? `${s.comissaoPorcentagem}%` : "padrão"}
                              className="h-7 text-xs bg-background"
                              onClick={e => e.stopPropagation()}
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-muted-foreground block mb-0.5">Tempo (min)</label>
                            <Input
                              type="number" min="1"
                              value={ov.tempoOverride != null ? String(ov.tempoOverride) : ""}
                              onChange={e => updateOverride(s.id, "tempoOverride", e.target.value)}
                              placeholder={`${s.duracaoMinutos}`}
                              className="h-7 text-xs bg-background"
                              onClick={e => e.stopPropagation()}
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-muted-foreground block mb-0.5">Valor (R$)</label>
                            <Input
                              type="number" step="0.01" min="0"
                              value={ov.precoOverride != null ? String(ov.precoOverride) : ""}
                              onChange={e => updateOverride(s.id, "precoOverride", e.target.value)}
                              placeholder={s.preco.toFixed(2)}
                              className="h-7 text-xs bg-background"
                              onClick={e => e.stopPropagation()}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              {selectedServicoIds.length} de {activeServicos.length} selecionado(s)
              {selectedServicoIds.length === 0 && " — vincule serviços para o profissional aparecer no agendamento"}
            </p>
          </>
        )}
      </div>

      <div className="border-t border-border pt-4">
        <div className="flex items-center justify-between mb-3">
          <Label className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Horário Personalizado
          </Label>
          <Switch checked={showSchedule} onCheckedChange={setShowSchedule} />
        </div>
        {showSchedule && <ScheduleEditor value={horarios} onChange={setHorarios} />}
        {!showSchedule && (
          <p className="text-xs text-muted-foreground">Usando horário de funcionamento do estabelecimento</p>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" className="flex-1" disabled={isPending}>
          {isPending ? "Salvando..." : "Salvar"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
      </div>
    </form>
  );
}

export default function Profissionais() {
  const { barbeariaId } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: profissionais = [], isLoading } = useListProfissionais(barbeariaId!, { query: { enabled: !!barbeariaId } });
  const { data: servicos = [] } = useListServicos(barbeariaId!, { query: { enabled: !!barbeariaId } });
  const createMutation = useCreateProfissional();
  const updateMutation = useUpdateProfissional();
  const deleteMutation = useDeleteProfissional();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Prof | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Prof | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["/api/barbearias", barbeariaId, "profissionais"] });

  const queryKey = ["/api/barbearias", barbeariaId, "profissionais"];

  const handleSave = async (data: any) => {
    const snapshot = qc.getQueryData<Prof[]>(queryKey);
    try {
      if (editing) {
        qc.setQueryData(queryKey, (old: Prof[] | undefined) =>
          (old || []).map(p => p.id === editing.id ? { ...p, ...data } : p)
        );
        await updateMutation.mutateAsync({ barbeariaId: barbeariaId!, profissionalId: editing.id, data });
        toast({ title: "Profissional atualizado!" });
      } else {
        const tempId = -Date.now();
        qc.setQueryData(queryKey, (old: Prof[] | undefined) =>
          [...(old || []), { ...data, id: tempId, ativo: true } as Prof]
        );
        await createMutation.mutateAsync({ barbeariaId: barbeariaId!, data });
        toast({ title: "Profissional adicionado!" });
      }
      setModalOpen(false);
      setEditing(null);
    } catch (err: any) {
      qc.setQueryData(queryKey, snapshot);
      const errorBody = err?.response?.data || err?.body;
      if (errorBody?.error === "professional_limit_reached") {
        toast({
          title: "Limite de profissionais atingido",
          description: errorBody.message || "Faça upgrade do seu plano para adicionar mais profissionais.",
          variant: "destructive",
        });
      } else if (typeof errorBody?.error === "string" && errorBody.error.length > 0) {
        toast({
          title: "Não foi possível salvar",
          description: errorBody.error,
          variant: "destructive",
        });
      } else {
        toast({ title: "Erro ao salvar", description: err?.message || undefined, variant: "destructive" });
      }
    } finally {
      invalidate();
    }
  };

  const handleToggleAtivo = async (p: Prof) => {
    const snapshot = qc.getQueryData<Prof[]>(queryKey);
    qc.setQueryData(queryKey, (old: Prof[] | undefined) =>
      (old || []).map(item => item.id === p.id ? { ...item, ativo: !item.ativo } : item)
    );
    try {
      await updateMutation.mutateAsync({ barbeariaId: barbeariaId!, profissionalId: p.id, data: { ativo: !p.ativo } });
      toast({ title: p.ativo ? "Profissional desativado" : "Profissional reativado" });
    } catch {
      qc.setQueryData(queryKey, snapshot);
      toast({ title: "Erro", variant: "destructive" });
    } finally {
      invalidate();
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const snapshot = qc.getQueryData<Prof[]>(queryKey);
    qc.setQueryData(queryKey, (old: Prof[] | undefined) =>
      (old || []).filter(p => p.id !== deleteTarget.id)
    );
    try {
      await deleteMutation.mutateAsync({ barbeariaId: barbeariaId!, profissionalId: deleteTarget.id });
      toast({ title: "Profissional removido" });
      setDeleteTarget(null);
    } catch {
      qc.setQueryData(queryKey, snapshot);
      toast({ title: "Erro ao remover", variant: "destructive" });
    } finally {
      invalidate();
    }
  };

  const getScheduleSummary = (prof: Prof) => {
    if (!prof.horarios?.porDia) return null;
    const days = Object.entries(prof.horarios.porDia) as [string, any][];
    const workDays = days.filter(([, v]) => !v.folga);
    const offDays = days.filter(([, v]) => v.folga);
    if (workDays.length === 0 && offDays.length === 0) return null;
    return `${workDays.length} dias • ${offDays.length} folga(s)`;
  };

  const servicoMap: Record<number, string> = {};
  (servicos as Servico[]).forEach(s => { servicoMap[s.id] = s.nome; });

  const countOverrides = (p: Prof) => {
    if (!p.servicosOverrides) return 0;
    return p.servicosOverrides.filter(o => o.comissaoOverride != null || o.tempoOverride != null || o.precoOverride != null).length;
  };

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Profissionais</h1>
          <p className="text-muted-foreground mt-1">Gerencie a equipe do seu espaço</p>
        </div>
        <Button className="shadow-lg shadow-primary/25" onClick={() => { setEditing(null); setModalOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Adicionar Membro
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-card rounded-2xl animate-pulse" />)}</div>
      ) : (profissionais as Prof[]).length === 0 ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-border">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium">Nenhum profissional cadastrado</h3>
          <p className="text-muted-foreground text-sm mt-1">Adicione profissionais à sua equipe.</p>
          <Button className="mt-4" onClick={() => setModalOpen(true)}>Adicionar primeiro profissional</Button>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl">
          {(profissionais as Prof[]).map((p, i) => (
            <div key={p.id} className={`flex items-center gap-4 p-5 hover:bg-muted/20 transition-colors ${i !== 0 ? "border-t border-border" : ""} ${!p.ativo ? "opacity-50" : ""}`}>
              <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg border border-primary/20 shrink-0 overflow-hidden">
                {p.fotoUrl ? (
                  <img src={p.fotoUrl} alt={p.nomeExibicao} className="h-full w-full object-cover" />
                ) : (
                  p.nomeExibicao.charAt(0).toUpperCase()
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-foreground">{p.nomeExibicao}</p>
                  {p.apelido && (
                    <span className="text-xs text-muted-foreground">({p.apelido})</span>
                  )}
                  <Badge variant={p.ativo ? "default" : "secondary"} className={p.ativo ? "bg-green-500/15 text-green-400 border-green-500/25 text-xs" : "text-xs"}>
                    {p.ativo ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{p.especialidade || "Sem especialidade definida"}</p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {p.servicoIds && p.servicoIds.length > 0 && (
                    <Badge variant="outline" className="text-[10px] h-5 bg-primary/5 border-primary/20 text-primary">
                      <Scissors className="h-2.5 w-2.5 mr-1" />
                      {p.servicoIds.length} serviço(s)
                    </Badge>
                  )}
                  {countOverrides(p) > 0 && (
                    <Badge variant="outline" className="text-[10px] h-5 bg-amber-500/10 border-amber-500/20 text-amber-500">
                      {countOverrides(p)} override(s)
                    </Badge>
                  )}
                  {p.celular && (
                    <Badge variant="outline" className="text-[10px] h-5">
                      <Phone className="h-2.5 w-2.5 mr-1" />
                      {p.celular}
                    </Badge>
                  )}
                </div>
                {getScheduleSummary(p) && (
                  <div className="flex items-center gap-1 mt-1">
                    <Clock className="h-3 w-3 text-primary" />
                    <span className="text-xs text-primary">{getScheduleSummary(p)}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="text-right hidden sm:block">
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    <Award className="h-4 w-4 text-primary" />
                    <span className="text-primary">
                      {p.comissaoTipo === "percentual" ? `${p.comissaoValor}%` : formatCurrency(p.comissaoValor)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{p.comissaoTipo === "percentual" ? "comissão" : "valor fixo"}</p>
                </div>

                <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-primary" title={p.ativo ? "Desativar" : "Ativar"} onClick={() => handleToggleAtivo(p)}>
                  {p.ativo ? <ToggleRight className="h-5 w-5 text-green-400" /> : <ToggleLeft className="h-5 w-5" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-primary" onClick={() => { setEditing(p); setModalOpen(true); }}>
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(p)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={v => { setModalOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="bg-card border-border sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-display">{editing ? "Editar Profissional" : "Novo Profissional"}</DialogTitle>
          </DialogHeader>
          <ProfForm
            initial={editing ?? {}}
            onSave={handleSave}
            onCancel={() => { setModalOpen(false); setEditing(null); }}
            isPending={createMutation.isPending || updateMutation.isPending}
            servicos={servicos as Servico[]}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={v => { if (!v) setDeleteTarget(null); }}>
        <DialogContent className="bg-card border-border sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle className="text-destructive">Remover Profissional</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mt-2">
            Tem certeza que deseja remover <strong className="text-foreground">{deleteTarget?.nomeExibicao}</strong>? Esta ação não pode ser desfeita.
          </p>
          <div className="flex gap-3 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" className="flex-1" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Removendo..." : "Sim, remover"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
