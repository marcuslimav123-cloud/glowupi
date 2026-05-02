import React, { useCallback, useMemo, useState } from "react";
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useColors, type ColorPalette } from "@/lib/theme";
import { ScreenContainer } from "@/components/ScreenContainer";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonList } from "@/components/Skeleton";
import { DateRangeBar } from "@/components/DateRangeBar";
import { fetchJson, formatCurrency, dateToStr, getErrorMessage } from "@/lib/api";
import { buildCsv, shareCsv } from "@/lib/csvExport";
import { useAuth } from "@/contexts/AuthContext";

type CupomRow = {
  id: number;
  codigo: string;
  descricao: string | null;
  desconto: number;
  tipoDesconto: string;
  usos: number;
  receitaGerada: number;
  descontoTotal: number;
};

export default function CuponsRelatorioScreen() {
  const { barbeariaId } = useAuth();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const initial = useMemo(() => {
    const t = new Date();
    const s = new Date();
    s.setDate(t.getDate() - 30);
    return { di: dateToStr(s), df: dateToStr(t) };
  }, []);
  const [di, setDi] = useState(initial.di);
  const [df, setDf] = useState(initial.df);
  const [searchDi, setSearchDi] = useState(initial.di);
  const [searchDf, setSearchDf] = useState(initial.df);

  const query = useQuery<CupomRow[]>({
    queryKey: ["rel-cupons", barbeariaId, searchDi, searchDf],
    enabled: !!barbeariaId,
    queryFn: async () => {
      const r = await fetchJson<unknown>(`/barbearias/${barbeariaId}/cupons/relatorio?inicio=${searchDi}&fim=${searchDf}`);
      return Array.isArray(r) ? (r as CupomRow[]) : [];
    },
  });

  const data = query.data ?? [];

  const apply = () => { setSearchDi(di); setSearchDf(df); };
  const exportCsv = useCallback(async () => {
    if (!data.length) return;
    try {
      const csv = buildCsv(
        ["Código", "Descrição", "Desconto", "Tipo", "Usos", "Receita gerada", "Desconto total"],
        data.map((r) => [
          r.codigo,
          r.descricao || "",
          r.desconto,
          r.tipoDesconto,
          r.usos,
          Number(r.receitaGerada || 0).toFixed(2),
          Number(r.descontoTotal || 0).toFixed(2),
        ]),
      );
      await shareCsv(`cupons_${searchDi}_${searchDf}`, csv);
    } catch (e) {
      Alert.alert("Erro ao exportar", getErrorMessage(e));
    }
  }, [data, searchDi, searchDf]);

  return (
    <ScreenContainer title="Cupons" subtitle="Performance dos cupons no período" scroll={false} contentPadding={false}>
      <FlatList
        data={data}
        keyExtractor={(r) => String(r.id)}
        contentContainerStyle={[{ paddingHorizontal: 16, paddingTop: 16 }, { paddingBottom: 120 + insets.bottom }]}
        refreshControl={<RefreshControl refreshing={query.isRefetching && !query.isLoading} onRefresh={() => query.refetch()} tintColor={colors.accent} colors={[colors.accent]} />}
        ListHeaderComponent={
          <DateRangeBar inicio={di} fim={df} onInicioChange={setDi} onFimChange={setDf} onApply={apply} onExport={exportCsv} exportDisabled={!data.length} loading={query.isLoading || query.isRefetching} />
        }
        ListEmptyComponent={
          query.isLoading ? <SkeletonList count={4} variant="card" /> :
          query.isError ? <EmptyState icon="alert-triangle" title="Erro ao carregar" description={getErrorMessage(query.error)} /> :
          <EmptyState icon="tag" title="Sem cupons" description="Nenhum cupom utilizado no período." />
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.head}>
              <Text style={styles.codigo}>{item.codigo}</Text>
              <Text style={styles.tipo}>
                {item.tipoDesconto === "percentual" ? `${item.desconto}%` : formatCurrency(item.desconto)}
              </Text>
            </View>
            {item.descricao ? <Text style={styles.desc}>{item.descricao}</Text> : null}
            <View style={styles.metrics}>
              <View style={styles.metricItem}><Text style={styles.metricLabel}>Usos</Text><Text style={styles.metricValue}>{item.usos}</Text></View>
              <View style={styles.metricItem}><Text style={styles.metricLabel}>Receita</Text><Text style={[styles.metricValue, { color: colors.accent }]}>{formatCurrency(item.receitaGerada)}</Text></View>
              <View style={styles.metricItem}><Text style={styles.metricLabel}>Descontos</Text><Text style={styles.metricValue}>{formatCurrency(item.descontoTotal)}</Text></View>
            </View>
          </View>
        )}
      />
    </ScreenContainer>
  );
}

const makeStyles = (c: ColorPalette) => StyleSheet.create({
  card: {
    backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.surfaceBorder,
    padding: 14, marginBottom: 8, gap: 6,
  },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  codigo: { color: c.text, fontSize: 15, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  tipo: { color: c.accent, fontSize: 13, fontFamily: "Inter_600SemiBold" },
  desc: { color: c.textSecondary, fontSize: 12, fontFamily: "Inter_500Medium" },
  metrics: { flexDirection: "row", justifyContent: "space-between", marginTop: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: c.surfaceBorder },
  metricItem: { alignItems: "flex-start" },
  metricLabel: { color: c.textMuted, fontSize: 11, fontFamily: "Inter_500Medium" },
  metricValue: { color: c.text, fontSize: 13, fontFamily: "Inter_600SemiBold", marginTop: 2 },
});
