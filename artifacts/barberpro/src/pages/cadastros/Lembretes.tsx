import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useApiList, useApiCreate, useApiUpdate, useApiDelete } from "@/hooks/useCrudApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit2, Trash2, Bell, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

const TIPOS_LEMBRETE = [
  { value: "retorno", label: "Retorno" },
  { value: "aniversario", label: "Aniversário" },
  { value: "promocao", label: "Promoção" },
  { value: "confirmacao", label: "Confirmação" },
  { value: "avaliacao", label: "Avaliação pós-atendimento" },
];

const VARIAVEIS = ["{nome_cliente}", "{servico}", "{data}", "{horario}", "{profissional}", "{nome_empresa}"];

export default function Lembretes() {
  const { barbeariaId } = useAuth();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [tipoSel, setTipoSel] = useState("retorno");
  const [template, setTemplate] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewText, setPreviewText] = useState("");

  const path = `/barbearias/${barbeariaId}/lembretes`;
  const { data: lembretes = [], isLoading } = useApiList("lembretes", path, !!barbeariaId);
  const createLembrete = useApiCreate("lembretes", path);
  const updateLembrete = useApiUpdate("lembretes", path);
  const deleteLembrete = useApiDelete("lembretes", path);

  function openNew() {
    setEditing(null);
    setTipoSel("retorno");
    setTemplate("");
    setDialogOpen(true);
  }

  function openEdit(item: any) {
    setEditing(item);
    setTipoSel(item.tipo);
    setTemplate(item.mensagemTemplate);
    setDialogOpen(true);
  }

  function showPreview(tpl: string) {
    const preview = tpl
      .replace("{nome_cliente}", "Maria Silva")
      .replace("{servico}", "Corte Feminino")
      .replace("{data}", "25/03/2026")
      .replace("{horario}", "14:00")
      .replace("{profissional}", "Ana")
      .replace("{nome_empresa}", "Studio Beauty");
    setPreviewText(preview);
    setPreviewOpen(true);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = {
      tipo: tipoSel,
      intervaloDias: parseInt(fd.get("intervaloDias") as string),
      mensagemTemplate: template,
    };
    try {
      if (editing) {
        await updateLembrete.mutateAsync({ id: editing.id, ...data });
        toast({ title: "Lembrete atualizado" });
      } else {
        await createLembrete.mutateAsync(data);
        toast({ title: "Lembrete criado" });
      }
      setDialogOpen(false);
      setEditing(null);
    } catch { toast({ title: "Erro", variant: "destructive" }); }
  }

  async function handleToggle(item: any) {
    try {
      await updateLembrete.mutateAsync({ id: item.id, ativo: !item.ativo });
    } catch { toast({ title: "Erro", variant: "destructive" }); }
  }

  async function handleDelete(id: number) {
    try {
      await deleteLembrete.mutateAsync(id);
      toast({ title: "Lembrete removido" });
    } catch { toast({ title: "Erro", variant: "destructive" }); }
  }

  const list = lembretes as any[];

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Lembretes</h1>
          <p className="text-muted-foreground mt-1">Configure lembretes automáticos para seus clientes</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Novo Lembrete</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card><CardContent className="p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center"><Bell className="h-5 w-5 text-primary" /></div>
            <span className="text-sm text-muted-foreground">Total</span>
          </div>
          <p className="text-3xl font-bold text-primary">{list.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-9 w-9 rounded-lg bg-green-500/10 flex items-center justify-center"><Bell className="h-5 w-5 text-green-500" /></div>
            <span className="text-sm text-muted-foreground">Ativos</span>
          </div>
          <p className="text-3xl font-bold text-green-500">{list.filter(l => l.ativo).length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center"><Bell className="h-5 w-5 text-blue-500" /></div>
            <span className="text-sm text-muted-foreground">Tipos</span>
          </div>
          <p className="text-3xl font-bold text-blue-500">{new Set(list.map(l => l.tipo)).size}</p>
        </CardContent></Card>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}</div>
      ) : list.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">Nenhum lembrete configurado ainda.</p>
      ) : (
        <div className="space-y-2">
          {list.map((item: any) => (
            <div key={item.id} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-sm capitalize">{item.tipo}</p>
                  <Badge variant={item.ativo ? "default" : "secondary"}>{item.ativo ? "Ativo" : "Inativo"}</Badge>
                  <Badge variant="outline" className="text-xs">{item.intervaloDias} dias</Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1">{item.mensagemTemplate}</p>
              </div>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => showPreview(item.mensagemTemplate)}>
                <Eye className="h-4 w-4" />
              </Button>
              <Switch checked={item.ativo} onCheckedChange={() => handleToggle(item)} />
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(item)}>
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400" onClick={() => handleDelete(item.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Editar Lembrete" : "Novo Lembrete"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Tipo</Label>
              <Select value={tipoSel} onValueChange={setTipoSel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS_LEMBRETE.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Intervalo (dias)</Label><Input name="intervaloDias" type="number" required defaultValue={editing?.intervaloDias || 7} /></div>
            <div>
              <Label>Mensagem Template</Label>
              <Textarea value={template} onChange={e => setTemplate(e.target.value)} rows={4} placeholder="Olá {nome_cliente}, seu próximo {servico} está chegando!" />
              <div className="flex flex-wrap gap-1 mt-2">
                {VARIAVEIS.map(v => (
                  <button key={v} type="button" className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20" onClick={() => setTemplate(prev => prev + " " + v)}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
            {template && (
              <div className="p-3 rounded-lg bg-muted text-sm">
                <p className="text-xs font-semibold text-muted-foreground mb-1">Preview:</p>
                <p>{template.replace("{nome_cliente}", "Maria Silva").replace("{servico}", "Corte Feminino").replace("{data}", "25/03/2026").replace("{horario}", "14:00").replace("{profissional}", "Ana").replace("{nome_empresa}", "Studio Beauty")}</p>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={createLembrete.isPending || updateLembrete.isPending}>
              {editing ? "Salvar" : "Criar Lembrete"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Preview da Mensagem</DialogTitle></DialogHeader>
          <div className="p-4 rounded-lg bg-muted">
            <p className="text-sm leading-relaxed">{previewText}</p>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
