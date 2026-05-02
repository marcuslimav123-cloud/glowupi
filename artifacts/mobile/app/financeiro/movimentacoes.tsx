import React, { useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useQueries, useQuery } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import { ScreenContainer } from "@/components/ScreenContainer";
import { ErrorView } from "@/components/ErrorView";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonList } from "@/components/Skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { fetchJson, formatCurrency, dateToStr } from "@/lib/api";

type CaixaSummary = { id: number; status: "aberto" | "fechado"; dataAbertura: string };
type CaixaMov = { id: number; caixaId: number; tipo: "entrada" | "saida"; categoria: string | null; descricao: string; valor: number; formaPagamento: string | null; createdAt: string };
type Conta = { id: number; tipo: "pagar" | "receber"; descricao: string; categoria: string | null; valor: number; status: string; dataPagamento: string | null; formaPagamento: string | null; dataVencimento: string | null };
type Comissao = { id: number; profissionalNome: string; valorComissao: number; status: string; dataPagamento: string | null; mesAno: string };
type Comanda = { id: number; clienteNome: string | null; valorTotal: number; valorLiquido?: number; dataFechamento: string | null; pagamentos?: { metodo: string; valor: number }[] };

type Source = "caixa" | "conta" | "comissao" | "comanda";
type Entry = {
  key: string;
  date: string; // ISO datetime
  tipo: "entrada" | "saida";
  source: Source;
  descricao: string;
  categoria: string | null;
  valor: number;
  meta: string | null;
};

type FilterTipo = "todas" | "entrada" | "saida";
type FilterSource = "todas" | Source;

function days(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return dateToStr(d);
}

const SOURCE_LABEL: Record<Source, string> = {
  caixa: "Caixa diário",
  conta: "Conta a pagar/receber",
  comissao: "Comissão",
  comanda: "Comanda",
};

const SOURCE_ICON: Record<Source, keyof typeof Feather.glyphMap> = {
  caixa: "dollar-sign",
  conta: "file-text",
  comissao: "percent",
  comanda: "shopping-bag",
};

export default function MovimentacoesScreen() {
  const { barbeariaId } = useAuth();
  const [dataInicio, setDataInicio] = useState(days(7));
  const [dataFim, setDataFim] = useState(dateToStr(new Date()));
  const [filterTipo, setFilterTipo] = useState<FilterTipo>("todas");
  const [filterSource, setFilterSource] = useState<FilterSource>("todas");
  const [filterCategoria, setFilterCategoria] = useState("");

  const caixasQ = useQuery<CaixaSummary[]>({
    queryKey: ["mov-caixas", barbeariaId, dataInicio, dataFim],
    enabled: !!barbeariaId,
    queryFn: async () => {
      const r = await fetchJson<CaixaSummary[]>(`/barbearias/${barbeariaId}/caixa-diario/historico?dataInicio=${dataInicio}&dataFim=${dataFim}`);
      return Array.isArray(r) ? r : [];
    },
  });

  const caixaIds = (caixasQ.data ?? []).map(c => c.id);
  const movQueries = useQueries({
    queries: caixaIds.map(cid => ({
      queryKey: ["mov-list", barbeariaId, cid],
      enabled: !!barbeariaId,
      queryFn: async () => {
        const r = await fetchJson<CaixaMov[]>(`/barbearias/${barbeariaId}/caixa-diario/${cid}/movimentacoes`);
        return Array.isArray(r) ? r : [];
      },
    })),
  });

  const contasQ = useQuery<Conta[]>({
    queryKey: ["mov-contas", barbeariaId],
    enabled: !!barbeariaId,
    queryFn: async () => {
      const r = await fetchJson<Conta[]>(`/barbearias/${barbeariaId}/financeiro`);
      return Array.isArray(r) ? r : [];
    },
  });

  const comQ = useQuery<Comissao[]>({
    queryKey: ["mov-comissoes", barbeariaId, dataInicio, dataFim],
    enabled: !!barbeariaId,
    queryFn: async () => {
      const meses = new Set<string>();
      const start = new Date(dataInicio + "T00:00:00");
      const end = new Date(dataFim + "T00:00:00");
      const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
      while (cursor <= end) {
        meses.add(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`);
        cursor.setMonth(cursor.getMonth() + 1);
      }
      const arrs = await Promise.all(Array.from(meses).map(m => fetchJson<Comissao[]>(`/barbearias/${barbeariaId}/comissoes?mesAno=${m}`).catch(() => [])));
      return arrs.flat().filter(Boolean);
    },
  });

  const comandasQ = useQuery<Comanda[]>({
    queryKey: ["mov-comandas", barbeariaId, dataInicio, dataFim],
    enabled: !!barbeariaId,
    queryFn: async () => {
      const r = await fetchJson<Comanda[]>(`/barbearias/${barbeariaId}/comandas?dataInicio=${dataInicio}&dataFim=${dataFim}`);
      return Array.isArray(r) ? r : [];
    },
  });

  const isLoading = caixasQ.isLoading || contasQ.isLoading || comQ.isLoading || comandasQ.isLoading || movQueries.some(q => q.isLoading);
  const isError = caixasQ.isError || contasQ.isError || comQ.isError || comandasQ.isError;
  const error = caixasQ.error || contasQ.error || comQ.error || comandasQ.error;

  const allEntries = useMemo<Entry[]>(() => {
    const out: Entry[] = [];
    const start = dataInicio;
    const end = dataFim;
    const inRange = (d: string | null | undefined) => !!d && d.slice(0, 10) >= start && d.slice(0, 10) <= end;

    movQueries.forEach(q => {
      (q.data ?? []).forEach(m => {
        if (!inRange(m.createdAt)) return;
        out.push({
          key: `caixa-${m.id}`,
          date: m.createdAt,
          tipo: m.tipo,
          source: "caixa",
          descricao: m.descricao,
          categoria: m.categoria,
          valor: m.valor || 0,
          meta: m.formaPagamento,
        });
      });
    });

    (contasQ.data ?? []).forEach(c => {
      if (!c.dataPagamento || !inRange(c.dataPagamento)) return;
      out.push({
        key: `conta-${c.id}`,
        date: c.dataPagamento + "T00:00:00",
        tipo: c.tipo === "receber" ? "entrada" : "saida",
        source: "conta",
        descricao: c.descricao,
        categoria: c.categoria,
        valor: c.valor || 0,
        meta: c.formaPagamento,
      });
    });

    (comQ.data ?? []).forEach(c => {
      if (c.status !== "pago" || !c.dataPagamento || !inRange(c.dataPagamento)) return;
      out.push({
        key: `comissao-${c.id}`,
        date: c.dataPagamento + "T00:00:00",
        tipo: "saida",
        source: "comissao",
        descricao: `Comissão · ${c.profissionalNome}`,
        categoria: "comissao",
        valor: c.valorComissao || 0,
        meta: c.mesAno,
      });
    });

    (comandasQ.data ?? []).forEach(cm => {
      if (!cm.dataFechamento || !inRange(cm.dataFechamento)) return;
      const formas = (cm.pagamentos ?? []).map(p => p.metodo).join(", ");
      out.push({
        key: `comanda-${cm.id}`,
        date: cm.dataFechamento,
        tipo: "entrada",
        source: "comanda",
        descricao: `Comanda #${cm.id}${cm.clienteNome ? ` · ${cm.clienteNome}` : ""}`,
        categoria: "comanda",
        valor: cm.valorLiquido ?? cm.valorTotal ?? 0,
        meta: formas || null,
      });
    });

    return out.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [movQueries, contasQ.data, comQ.data, comandasQ.data, dataInicio, dataFim]);

  const categorias = useMemo(() => {
    const set = new Set<string>();
    allEntries.forEach(e => { if (e.categoria) set.add(e.categoria); });
    return Array.from(set).sort();
  }, [allEntries]);

  const filtered = useMemo(() => {
    return allEntries.filter(e => {
      if (filterTipo !== "todas" && e.tipo !== filterTipo) return false;
      if (filterSource !== "todas" && e.source !== filterSource) return false;
      if (filterCategoria && e.categoria !== filterCategoria) return false;
      return true;
    });
  }, [allEntries, filterTipo, filterSource, filterCategoria]);

  const totals = useMemo(() => {
    const entradas = filtered.filter(e => e.tipo === "entrada").reduce((s, e) => s + e.valor, 0);
    const saidas = filtered.filter(e => e.tipo === "saida").reduce((s, e) => s + e.valor, 0);
    return { entradas, saidas, saldo: entradas - saidas };
  }, [filtered]);

  const refetchAll = () => {
    caixasQ.refetch(); contasQ.refetch(); comQ.refetch(); comandasQ.refetch();
    movQueries.forEach(q => q.refetch());
  };

  return (
    <ScreenContainer
      title="Movimentações"
      subtitle={`${filtered.length} transação${filtered.length === 1 ? "" : "ões"} no período`}
      refreshing={(caixasQ.isFetching || contasQ.isFetching || comQ.isFetching || comandasQ.isFetching) && !isLoading}
      onRefresh={refetchAll}
    >
      <View style={styles.filterCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.fieldLabel}>De</Text>
          <TextInput style={styles.input} value={dataInicio} onChangeText={setDataInicio} placeholder="AAAA-MM-DD" placeholderTextColor={Colors.textMuted} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.fieldLabel}>Até</Text>
          <TextInput style={styles.input} value={dataFim} onChangeText={setDataFim} placeholder="AAAA-MM-DD" placeholderTextColor={Colors.textMuted} />
        </View>
        <TouchableOpacity style={styles.searchBtn} onPress={refetchAll}>
          <Feather name="search" size={16} color={Colors.accent} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabRow}>
        {(["todas", "entrada", "saida"] as FilterTipo[]).map(t => (
          <TouchableOpacity key={t} style={[styles.tab, filterTipo === t && styles.tabActive]} onPress={() => setFilterTipo(t)}>
            <Text style={[styles.tabText, filterTipo === t && styles.tabTextActive]}>
              {t === "todas" ? "Todas" : t === "entrada" ? "Entradas" : "Saídas"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.catRow}>
        {(["todas", "caixa", "conta", "comissao", "comanda"] as FilterSource[]).map(s => (
          <TouchableOpacity key={s} style={[styles.catChip, filterSource === s && styles.catChipActive]} onPress={() => setFilterSource(s)}>
            <Text style={[styles.catChipText, filterSource === s && styles.catChipTextActive]}>
              {s === "todas" ? "Todas fontes" : SOURCE_LABEL[s]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {categorias.length > 0 ? (
        <View style={styles.catRow}>
          <TouchableOpacity style={[styles.catChip, !filterCategoria && styles.catChipActive]} onPress={() => setFilterCategoria("")}>
            <Text style={[styles.catChipText, !filterCategoria && styles.catChipTextActive]}>Todas categorias</Text>
          </TouchableOpacity>
          {categorias.map(c => (
            <TouchableOpacity key={c} style={[styles.catChip, filterCategoria === c && styles.catChipActive]} onPress={() => setFilterCategoria(c)}>
              <Text style={[styles.catChipText, filterCategoria === c && styles.catChipTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      <View style={styles.statRow}>
        <View style={styles.statBox}><Text style={[styles.statValue, { color: Colors.success }]}>+{formatCurrency(totals.entradas)}</Text><Text style={styles.statLabel}>Entradas</Text></View>
        <View style={styles.statBox}><Text style={[styles.statValue, { color: Colors.error }]}>−{formatCurrency(totals.saidas)}</Text><Text style={styles.statLabel}>Saídas</Text></View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: totals.saldo >= 0 ? Colors.accent : Colors.error }]}>{formatCurrency(totals.saldo)}</Text>
          <Text style={styles.statLabel}>Saldo</Text>
        </View>
      </View>

      {isLoading ? (
        <SkeletonList count={4} variant="row" />
      ) : isError ? (
        <ErrorView error={error} onRetry={refetchAll} />
      ) : filtered.length === 0 ? (
        <EmptyState icon="list" title="Sem movimentações" description="Nenhuma transação encontrada no período/filtros." />
      ) : (
        <View style={{ gap: 6 }}>
          {filtered.map(m => {
            const c = m.tipo === "entrada" ? Colors.success : Colors.error;
            return (
              <View key={m.key} style={styles.movRow}>
                <View style={[styles.movIcon, { backgroundColor: c + "1f" }]}>
                  <Feather name={SOURCE_ICON[m.source]} size={14} color={c} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.movDesc} numberOfLines={2}>{m.descricao}</Text>
                  <Text style={styles.movMeta} numberOfLines={1}>
                    {SOURCE_LABEL[m.source]}{m.categoria ? ` · ${m.categoria}` : ""}{m.meta ? ` · ${m.meta}` : ""} · {new Date(m.date).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </View>
                <Text style={[styles.movValue, { color: c }]}>
                  {m.tipo === "entrada" ? "+" : "−"}{formatCurrency(m.valor)}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  filterCard: { flexDirection: "row", gap: 8, alignItems: "flex-end", marginBottom: 12 },
  fieldLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: Colors.textMuted, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: Colors.text, fontSize: 13, fontFamily: "Inter_400Regular" },
  searchBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.accent + "1a", borderWidth: 1, borderColor: Colors.accent + "55", alignItems: "center", justifyContent: "center" },
  tabRow: { flexDirection: "row", gap: 6, marginBottom: 8 },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 10, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder },
  tabActive: { backgroundColor: Colors.accent + "22", borderColor: Colors.accent + "55" },
  tabText: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  tabTextActive: { color: Colors.accent, fontFamily: "Inter_600SemiBold" },
  catRow: { flexDirection: "row", gap: 6, marginBottom: 8, flexWrap: "wrap" },
  catChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder },
  catChipActive: { backgroundColor: Colors.accent + "22", borderColor: Colors.accent + "55" },
  catChipText: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  catChipTextActive: { color: Colors.accent, fontFamily: "Inter_600SemiBold" },
  statRow: { flexDirection: "row", gap: 8, marginBottom: 14, marginTop: 4 },
  statBox: { flex: 1, padding: 12, borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder },
  statValue: { fontSize: 14, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, color: Colors.textMuted, fontFamily: "Inter_500Medium", marginTop: 4, textTransform: "uppercase", letterSpacing: 0.5 },
  movRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder },
  movIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  movDesc: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.text },
  movMeta: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2 },
  movValue: { fontSize: 14, fontFamily: "Inter_700Bold" },
});
