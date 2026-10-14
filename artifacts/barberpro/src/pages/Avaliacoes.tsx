import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useListAvaliacoes } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, TrendingUp, MessageSquare, Users } from "lucide-react";

export default function Avaliacoes() {
  const { barbeariaId } = useAuth();
  const { data: avaliacoes = [], isLoading } = useListAvaliacoes(barbeariaId!, { query: { enabled: !!barbeariaId } });

  const list = avaliacoes as any[];
  const media = list.length > 0 ? list.reduce((s, a) => s + a.nota, 0) / list.length : 0;
  const distribuicao = [5,4,3,2,1].map(n => ({ nota: n, count: list.filter(a => a.nota === n).length }));
  const maxCount = Math.max(...distribuicao.map(d => d.count), 1);

  const profMap = new Map<string, { total: number; count: number }>();
  list.forEach(a => {
    if (!a.profissionalNome) return;
    const cur = profMap.get(a.profissionalNome) || { total: 0, count: 0 };
    profMap.set(a.profissionalNome, { total: cur.total + a.nota, count: cur.count + 1 });
  });
  const profRanking = [...profMap.entries()].map(([nome, v]) => ({ nome, media: v.total / v.count, count: v.count })).sort((a, b) => b.media - a.media);

  function renderStars(nota: number) {
    return (
      <div className="flex gap-0.5">
        {[1,2,3,4,5].map(i => (
          <Star key={i} className={`h-4 w-4 ${i <= nota ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30"}`} />
        ))}
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">Avaliações</h1>
        <p className="text-muted-foreground mt-1">Notas e comentários deixados pelos clientes</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-9 w-9 rounded-lg bg-yellow-500/10 flex items-center justify-center"><Star className="h-5 w-5 text-yellow-400 fill-yellow-400" /></div>
              <span className="text-sm text-muted-foreground">Nota Média</span>
            </div>
            <p className="text-3xl font-bold text-yellow-400">{media.toFixed(1)}</p>
            <div className="mt-1">{renderStars(Math.round(media))}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center"><MessageSquare className="h-5 w-5 text-primary" /></div>
              <span className="text-sm text-muted-foreground">Total de Avaliações</span>
            </div>
            <p className="text-3xl font-bold text-primary">{list.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-9 w-9 rounded-lg bg-green-500/10 flex items-center justify-center"><TrendingUp className="h-5 w-5 text-green-400" /></div>
              <span className="text-sm text-muted-foreground">Satisfação</span>
            </div>
            <p className="text-3xl font-bold text-green-400">{list.length > 0 ? ((list.filter(a => a.nota >= 4).length / list.length) * 100).toFixed(0) : 0}%</p>
            <p className="text-xs text-muted-foreground mt-1">Nota 4 ou 5</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>Distribuição de Notas</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {distribuicao.map(d => (
                <div key={d.nota} className="flex items-center gap-3">
                  <div className="flex items-center gap-1 w-16">
                    <span className="text-sm font-medium">{d.nota}</span>
                    <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
                  </div>
                  <div className="flex-1 h-6 bg-muted/30 rounded-full overflow-hidden">
                    <div className="h-full bg-yellow-400/80 rounded-full transition-all" style={{ width: `${(d.count / maxCount) * 100}%` }} />
                  </div>
                  <span className="text-sm text-muted-foreground w-8 text-right">{d.count}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Avaliações Recentes</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}</div> :
               list.length === 0 ? <p className="text-muted-foreground text-sm text-center py-8">Nenhuma avaliação recebida ainda.</p> :
               <div className="space-y-3">
                {list.slice(0, 20).map((a: any) => (
                  <div key={a.id} className="p-4 rounded-xl border border-border bg-card">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                          {a.clienteNome?.charAt(0)?.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{a.clienteNome}</p>
                          {a.profissionalNome && <p className="text-xs text-muted-foreground">Profissional: {a.profissionalNome}</p>}
                        </div>
                      </div>
                      {renderStars(a.nota)}
                    </div>
                    {a.comentario && <p className="text-sm text-muted-foreground mt-2">{a.comentario}</p>}
                  </div>
                ))}
              </div>}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-4 w-4" /> Ranking Profissionais</CardTitle></CardHeader>
            <CardContent>
              {profRanking.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">Sem dados</p> :
               <div className="space-y-3">
                {profRanking.map((p, i) => (
                  <div key={p.nome} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border">
                    <span className="text-lg font-bold text-muted-foreground/40 w-6">{i + 1}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{p.nome}</p>
                      <p className="text-xs text-muted-foreground">{p.count} avaliações</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
                      <span className="font-bold text-yellow-400">{p.media.toFixed(1)}</span>
                    </div>
                  </div>
                ))}
              </div>}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
