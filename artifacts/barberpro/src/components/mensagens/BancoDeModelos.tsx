import { useState, useMemo } from "react";
import { renderConteudoPreview, SAMPLE_CONTEXT } from "@/lib/mensagensPreview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Star, Archive, ArchiveRestore, Trash2, Copy, Pencil, BookOpen, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  useListMensagensPadrao,
  useCreateMensagemPadrao,
  useUpdateMensagemPadrao,
  useDeleteMensagemPadrao,
  useDuplicarMensagemPadrao,
  getListMensagensPadraoQueryKey,
} from "@workspace/api-client-react";
import { CATEGORIA_LABELS } from "./ModeloPicker";

const CATEGORIAS = Object.keys(CATEGORIA_LABELS);
const VARIAVEIS = ["{cliente}", "{servico}", "{data}", "{hora}", "{profissional}", "{salao}", "{valor}"];

export function BancoDeModelos() {
  const { barbeariaId } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<string>("");
  const [showArchived, setShowArchived] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ titulo: "", conteudo: "", categoria: "outro", favorito: false });

  const { data: modelos = [], isLoading } = useListMensagensPadrao(
    barbeariaId!,
    { arquivado: showArchived },
    { query: { enabled: !!barbeariaId } as any },
  );

  const createMut = useCreateMensagemPadrao();
  const updateMut = useUpdateMensagemPadrao();
  const deleteMut = useDeleteMensagemPadrao();
  const duplicarMut = useDuplicarMensagemPadrao();

  function invalidate() {
    qc.invalidateQueries({ queryKey: getListMensagensPadraoQueryKey(barbeariaId!, { arquivado: true }) });
    qc.invalidateQueries({ queryKey: getListMensagensPadraoQueryKey(barbeariaId!, { arquivado: false }) });
    qc.invalidateQueries({ queryKey: getListMensagensPadraoQueryKey(barbeariaId!) });
  }

  const filtered = useMemo(() => {
    return (modelos as any[]).filter(m => {
      if (filterCat && m.categoria !== filterCat) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!m.titulo.toLowerCase().includes(s) && !m.conteudo.toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [modelos, filterCat, search]);

  function openNew() {
    setEditing(null);
    setForm({ titulo: "", conteudo: "", categoria: "outro", favorito: false });
    setDialogOpen(true);
  }
  function openEdit(m: any) {
    setEditing(m);
    setForm({ titulo: m.titulo, conteudo: m.conteudo, categoria: m.categoria, favorito: !!m.favorito });
    setDialogOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.titulo.trim() || !form.conteudo.trim()) {
      toast({ title: "Preencha título e conteúdo", variant: "destructive" });
      return;
    }
    try {
      if (editing) {
        await updateMut.mutateAsync({
          barbeariaId: barbeariaId!,
          modeloId: editing.id,
          data: { titulo: form.titulo, conteudo: form.conteudo, categoria: form.categoria, favorito: form.favorito },
        });
        toast({ title: "Modelo atualizado" });
      } else {
        await createMut.mutateAsync({
          barbeariaId: barbeariaId!,
          data: { titulo: form.titulo, conteudo: form.conteudo, categoria: form.categoria, favorito: form.favorito },
        });
        toast({ title: "Modelo criado" });
      }
      invalidate();
      setDialogOpen(false);
    } catch (err: any) {
      toast({ title: "Erro", description: err?.data?.error || err?.message || "Falha ao salvar", variant: "destructive" });
    }
  }

  async function toggleFavorito(m: any) {
    try {
      await updateMut.mutateAsync({ barbeariaId: barbeariaId!, modeloId: m.id, data: { favorito: !m.favorito } });
      invalidate();
    } catch {}
  }
  async function toggleArquivado(m: any) {
    try {
      await updateMut.mutateAsync({ barbeariaId: barbeariaId!, modeloId: m.id, data: { arquivado: !m.arquivado } });
      invalidate();
      toast({ title: m.arquivado ? "Modelo restaurado" : "Modelo arquivado" });
    } catch {}
  }
  async function handleDelete(m: any) {
    if (!confirm(`Excluir "${m.titulo}"?`)) return;
    try {
      await deleteMut.mutateAsync({ barbeariaId: barbeariaId!, modeloId: m.id });
      invalidate();
      toast({ title: "Modelo excluído" });
    } catch {}
  }
  async function handleDuplicar(m: any) {
    try {
      await duplicarMut.mutateAsync({ barbeariaId: barbeariaId!, modeloId: m.id });
      invalidate();
      toast({ title: "Modelo duplicado" });
    } catch {}
  }

  function inserirVariavel(v: string) {
    setForm(f => ({ ...f, conteudo: f.conteudo + v }));
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar modelo..." value={search} onChange={e => setSearch(e.target.value)} data-testid="input-search-modelo" />
        </div>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm" data-testid="select-categoria-filter">
          <option value="">Todas as categorias</option>
          {CATEGORIAS.map(c => <option key={c} value={c}>{CATEGORIA_LABELS[c]}</option>)}
        </select>
        <Button variant={showArchived ? "default" : "outline"} size="sm" onClick={() => setShowArchived(s => !s)} data-testid="button-toggle-archived">
          {showArchived ? <ArchiveRestore className="h-4 w-4 mr-1" /> : <Archive className="h-4 w-4 mr-1" />}
          {showArchived ? "Arquivados" : "Ativos"}
        </Button>
        <Button onClick={openNew} data-testid="button-novo-modelo">
          <Plus className="h-4 w-4 mr-1" /> Novo Modelo
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhum modelo {showArchived ? "arquivado" : "ativo"}.</p>
          {!showArchived && <Button variant="outline" className="mt-3" onClick={openNew}>Criar primeiro modelo</Button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((m: any) => (
            <div key={m.id} className="rounded-xl border border-border bg-card p-4" data-testid={`modelo-card-${m.id}`}>
              <div className="flex items-start gap-2 mb-2">
                <button onClick={() => toggleFavorito(m)} className="shrink-0 mt-0.5" data-testid={`button-fav-${m.id}`}>
                  <Star className={`h-4 w-4 ${m.favorito ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{m.titulo}</p>
                  <Badge variant="secondary" className="text-[10px] mt-1">{CATEGORIA_LABELS[m.categoria] ?? m.categoria}</Badge>
                </div>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-3 mb-3 whitespace-pre-wrap">{m.conteudo}</p>
              <div className="flex gap-1 flex-wrap">
                <Button size="sm" variant="ghost" onClick={() => openEdit(m)} data-testid={`button-edit-${m.id}`}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleDuplicar(m)}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => toggleArquivado(m)}>
                  {m.arquivado ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                </Button>
                <Button size="sm" variant="ghost" className="text-red-500 ml-auto" onClick={() => handleDelete(m)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Editar Modelo" : "Novo Modelo"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <Label>Título</Label>
              <Input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} required data-testid="input-titulo-modelo" />
            </div>
            <div>
              <Label>Categoria</Label>
              <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" data-testid="select-categoria-modelo">
                {CATEGORIAS.map(c => <option key={c} value={c}>{CATEGORIA_LABELS[c]}</option>)}
              </select>
            </div>
            <div>
              <Label>Conteúdo</Label>
              <Textarea value={form.conteudo} onChange={e => setForm(f => ({ ...f, conteudo: e.target.value }))} required rows={6} placeholder="Olá {cliente}! Seu horário..." data-testid="textarea-conteudo-modelo" />
              <div className="flex flex-wrap gap-1 mt-2">
                <span className="text-[11px] text-muted-foreground self-center mr-1">Variáveis:</span>
                {VARIAVEIS.map(v => (
                  <button key={v} type="button" onClick={() => inserirVariavel(v)} className="text-[11px] px-2 py-0.5 rounded-full border border-border text-muted-foreground hover:bg-muted">
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3" data-testid="banco-modelo-preview">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold uppercase text-muted-foreground">Pré-visualização</span>
                <span className="text-[10px] text-muted-foreground">com dados-exemplo</span>
              </div>
              <p className="text-sm whitespace-pre-wrap text-foreground/90 min-h-[40px]">
                {form.conteudo ? renderConteudoPreview(form.conteudo) : <span className="text-muted-foreground italic">Comece a digitar para ver a prévia...</span>}
              </p>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                {Object.entries(SAMPLE_CONTEXT).map(([k, v]) => (
                  <span key={k}><code>{`{${k}}`}</code> = {v}</span>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.favorito} onChange={e => setForm(f => ({ ...f, favorito: e.target.checked }))} />
              Marcar como favorito (usado por padrão no Modo Humano)
            </label>
            <Button type="submit" className="w-full" disabled={createMut.isPending || updateMut.isPending} data-testid="button-salvar-modelo">
              {editing ? "Salvar alterações" : "Criar modelo"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
