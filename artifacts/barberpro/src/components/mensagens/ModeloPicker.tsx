import { useState, useMemo, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Search, Star } from "lucide-react";
import { useListMensagensPadrao, useRenderMensagemPadrao } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";

export const CATEGORIA_LABELS: Record<string, string> = {
  aniversario: "Aniversário",
  pos_agendamento: "Pós-atendimento",
  confirmacao: "Confirmação",
  lembrete: "Lembrete",
  retorno: "Retorno",
  regulamento: "Regulamento",
  campanha: "Campanha",
  outro: "Outro",
};

interface Props {
  onPick: (texto: string) => void;
  agendamentoId?: number | null;
  clienteId?: number | null;
  triggerLabel?: string;
  triggerSize?: "sm" | "default" | "lg" | "icon";
  triggerVariant?: "default" | "outline" | "ghost" | "secondary";
  /** Pre-selects a categoria filter (e.g. "aniversario", "pos_agendamento", "lembrete"). */
  categoriaSugerida?: string;
}

export function ModeloPicker({ onPick, agendamentoId, clienteId, triggerLabel, triggerSize = "sm", triggerVariant = "outline", categoriaSugerida }: Props) {
  const { barbeariaId } = useAuth();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [categoria, setCategoria] = useState<string>(categoriaSugerida ?? "");

  useEffect(() => {
    if (categoriaSugerida !== undefined) setCategoria(categoriaSugerida);
  }, [categoriaSugerida]);

  const { data: modelos = [], isLoading } = useListMensagensPadrao(
    barbeariaId!,
    { arquivado: false },
    { query: { enabled: !!barbeariaId && open } as any },
  );
  const renderMut = useRenderMensagemPadrao();

  const filtrados = useMemo(() => {
    const list = modelos as any[];
    return list.filter(m => {
      if (categoria && m.categoria !== categoria) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!m.titulo.toLowerCase().includes(s) && !m.conteudo.toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [modelos, categoria, search]);

  async function handlePick(m: any) {
    try {
      const res = await renderMut.mutateAsync({
        barbeariaId: barbeariaId!,
        modeloId: m.id,
        data: { agendamentoId: agendamentoId ?? null, clienteId: clienteId ?? null },
      });
      onPick((res as any)?.conteudo ?? m.conteudo);
    } catch {
      onPick(m.conteudo);
    }
    setOpen(false);
  }

  const categorias = Array.from(new Set((modelos as any[]).map(m => m.categoria))).filter(Boolean);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" size={triggerSize} variant={triggerVariant} data-testid="button-modelo-picker">
          <Sparkles className="h-4 w-4 mr-1" /> {triggerLabel ?? "Inserir modelo"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0" align="end">
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9 h-9 text-sm" placeholder="Buscar modelo..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {categorias.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              <button type="button" onClick={() => setCategoria("")} className={`text-[11px] px-2 py-0.5 rounded-full border ${categoria === "" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}>Todas</button>
              {categorias.map(c => (
                <button key={c} type="button" onClick={() => setCategoria(c)} className={`text-[11px] px-2 py-0.5 rounded-full border ${categoria === c ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}>
                  {CATEGORIA_LABELS[c] ?? c}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="max-h-72 overflow-y-auto">
          {isLoading ? (
            <p className="text-center text-xs text-muted-foreground py-4">Carregando...</p>
          ) : filtrados.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-6">
              Nenhum modelo encontrado.<br />
              <span className="text-[10px]">Crie modelos em Mensagens → Banco de Modelos.</span>
            </p>
          ) : (
            filtrados.map((m: any) => (
              <button
                key={m.id}
                type="button"
                onClick={() => handlePick(m)}
                className="w-full text-left px-3 py-2 border-b border-border last:border-b-0 hover:bg-black/[0.03]"
                data-testid={`modelo-item-${m.id}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {m.favorito && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />}
                  <span className="text-xs font-semibold truncate">{m.titulo}</span>
                  <Badge variant="secondary" className="text-[10px] py-0 h-4 ml-auto">{CATEGORIA_LABELS[m.categoria] ?? m.categoria}</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground line-clamp-2">{m.conteudo}</p>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
