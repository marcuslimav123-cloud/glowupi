import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useColors, type ColorPalette } from "@/lib/theme";
import { ScreenContainer } from "@/components/ScreenContainer";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonList } from "@/components/Skeleton";
import { fetchJson, formatCurrency, getErrorMessage } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { SectionHeader } from "@/components/SectionHeader";

type Resumo = {
  agendamentosHoje?: number;
  comandasAbertas?: number;
  faturamentoMes?: number;
  faturamentoHoje?: number;
  novosClientesMes?: number;
  totalClientes?: number;
  proximosAgendamentos?: Array<{ id: number; clienteNome: string; servicoNome: string; data: string; horaInicio: string }>;
  topServicos?: Array<{ nome: string; vendas: number; receita: number }>;
};

function Card({ icon, label, value, accent, colors, styles }: { icon: keyof typeof Feather.glyphMap; label: string; value: string; accent?: boolean; colors: ColorPalette; styles: ReturnType<typeof makeStyles> }) {
  return (
    <View style={styles.kpi}>
      <View style={[styles.kpiIcon, accent && { backgroundColor: "rgba(196,164,106,0.15)" }]}>
        <Feather name={icon} size={16} color={accent ? colors.accent : colors.textSecondary} />
      </View>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={[styles.kpiValue, accent && { color: colors.accent }]}>{value}</Text>
    </View>
  );
}

export default function ResumoScreen() {
  const { barbeariaId } = useAuth();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const query = useQuery<Resumo>({
    queryKey: ["rel-resumo", barbeariaId],
    enabled: !!barbeariaId,
    queryFn: () => fetchJson<Resumo>(`/barbearias/${barbeariaId}/dashboard/resumo`),
  });

  const data = query.data;

  const proximos = useMemo(() => data?.proximosAgendamentos ?? [], [data]);
  const topServicos = useMemo(() => data?.topServicos ?? [], [data]);

  return (
    <ScreenContainer
      title="Resumo do dia"
      subtitle="Visão geral do estabelecimento"
      refreshing={query.isRefetching && !query.isLoading}
      onRefresh={() => query.refetch()}
    >
      {query.isLoading ? (
        <SkeletonList count={4} variant="card" />
      ) : query.isError ? (
        <EmptyState icon="alert-triangle" title="Erro ao carregar" description={getErrorMessage(query.error)} />
      ) : !data ? (
        <EmptyState icon="bar-chart-2" title="Sem dados" />
      ) : (
        <>
          <View style={styles.grid}>
            <Card icon="calendar" label="Agendamentos hoje" value={String(data.agendamentosHoje ?? 0)} accent colors={colors} styles={styles} />
            <Card icon="clipboard" label="Comandas abertas" value={String(data.comandasAbertas ?? 0)} colors={colors} styles={styles} />
            <Card icon="dollar-sign" label="Faturamento hoje" value={formatCurrency(data.faturamentoHoje ?? 0)} accent colors={colors} styles={styles} />
            <Card icon="trending-up" label="Faturamento mês" value={formatCurrency(data.faturamentoMes ?? 0)} colors={colors} styles={styles} />
            <Card icon="user-plus" label="Novos clientes (mês)" value={String(data.novosClientesMes ?? 0)} colors={colors} styles={styles} />
            <Card icon="users" label="Total de clientes" value={String(data.totalClientes ?? 0)} colors={colors} styles={styles} />
          </View>

          <SectionHeader label="Próximos agendamentos" />
          {proximos.length === 0 ? (
            <View style={styles.emptyMini}><Text style={styles.emptyMiniText}>Sem agendamentos próximos</Text></View>
          ) : (
            proximos.slice(0, 6).map((a) => (
              <View key={a.id} style={styles.row}>
                <View style={styles.rowDate}>
                  <Text style={styles.rowDateText}>{a.horaInicio || "—"}</Text>
                  <Text style={styles.rowDateSub}>{a.data}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowName} numberOfLines={1}>{a.clienteNome || "—"}</Text>
                  <Text style={styles.rowSub} numberOfLines={1}>{a.servicoNome || "—"}</Text>
                </View>
              </View>
            ))
          )}

          <SectionHeader label="Top serviços" />
          {topServicos.length === 0 ? (
            <View style={styles.emptyMini}><Text style={styles.emptyMiniText}>Sem dados</Text></View>
          ) : (
            topServicos.slice(0, 6).map((s, i) => (
              <View key={`${s.nome}-${i}`} style={styles.row}>
                <View style={styles.rank}><Text style={styles.rankText}>#{i + 1}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowName} numberOfLines={1}>{s.nome}</Text>
                  <Text style={styles.rowSub}>{s.vendas} vendas</Text>
                </View>
                <Text style={[styles.rowName, { color: colors.accent }]}>{formatCurrency(s.receita)}</Text>
              </View>
            ))
          )}
        </>
      )}
    </ScreenContainer>
  );
}

const makeStyles = (c: ColorPalette) => StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 4 },
  kpi: {
    flexBasis: "48%", flexGrow: 1,
    backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.surfaceBorder,
    padding: 12, gap: 6,
  },
  kpiIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: c.surfaceLight, alignItems: "center", justifyContent: "center" },
  kpiLabel: { fontSize: 11, color: c.textMuted, fontFamily: "Inter_500Medium" },
  kpiValue: { fontSize: 18, fontFamily: "Inter_700Bold", color: c.text },
  row: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: c.surface, borderWidth: 1, borderColor: c.surfaceBorder,
    borderRadius: 12, padding: 12, marginBottom: 6,
  },
  rowDate: { width: 60, alignItems: "center" },
  rowDateText: { color: c.accent, fontFamily: "Inter_700Bold", fontSize: 14 },
  rowDateSub: { color: c.textMuted, fontFamily: "Inter_500Medium", fontSize: 10, marginTop: 1 },
  rowName: { color: c.text, fontFamily: "Inter_600SemiBold", fontSize: 13 },
  rowSub: { color: c.textSecondary, fontFamily: "Inter_500Medium", fontSize: 11, marginTop: 2 },
  rank: { width: 36, height: 36, borderRadius: 10, backgroundColor: c.surfaceLight, alignItems: "center", justifyContent: "center" },
  rankText: { color: c.accent, fontFamily: "Inter_700Bold", fontSize: 12 },
  emptyMini: { padding: 16, alignItems: "center" },
  emptyMiniText: { color: c.textMuted, fontFamily: "Inter_500Medium", fontSize: 12 },
});
