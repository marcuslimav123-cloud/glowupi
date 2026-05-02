import React, { useCallback, useMemo, useState } from "react";
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import { ScreenContainer } from "@/components/ScreenContainer";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonList } from "@/components/Skeleton";
import { DateRangeBar } from "@/components/DateRangeBar";
import { SectionHeader } from "@/components/SectionHeader";
import { fetchJson, formatCurrency, dateToStr, getErrorMessage } from "@/lib/api";
import { buildCsv, shareCsv } from "@/lib/csvExport";
import { useAuth } from "@/contexts/AuthContext";

type Tab = "profissionais" | "servicos" | "clientes" | "produtos";
type RankProfissional = { profissionalId: number; nome: string; atendimentos: number; receita: number };
type RankServico = { servicoId: number; nome: string; vendas: number; receita: number };
type RankCliente = { clienteId: number; nome: string; visitas: number; gasto: number };
type RankProduto = { produtoId: number; nome: string; vendas: number; receita: number };

type RankingsData = {
  profissionais: RankProfissional[];
  servicos: RankServico[];
  clientes: RankCliente[];
  produtos: RankProduto[];
};

const TABS: { id: Tab; label: string }[] = [
  { id: "profissionais", label: "Profissionais" },
  { id: "servicos", label: "Serviços" },
  { id: "clientes", label: "Clientes" },
  { id: "produtos", label: "Produtos" },
];

export default function RankingsScreen() {
  const { barbeariaId } = useAuth();
  const insets = useSafeAreaInsets();

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
  const [tab, setTab] = useState<Tab>("profissionais");

  const query = useQuery<RankingsData>({
    queryKey: ["rel-rankings", barbeariaId, searchDi, searchDf],
    enabled: !!barbeariaId,
    queryFn: () =>
      fetchJson(`/barbearias/${barbeariaId}/relatorios/rankings?dataInicio=${searchDi}&dataFim=${searchDf}`),
  });

  const apply = () => { setSearchDi(di); setSearchDf(df); };

  const list = useMemo<Array<Record<string, unknown>>>(() => {
    const d = query.data;
    if (!d) return [];
    if (tab === "profissionais") return (d.profissionais ?? []) as any;
    if (tab === "servicos") return (d.servicos ?? []) as any;
    if (tab === "clientes") return (d.clientes ?? []) as any;
    return (d.produtos ?? []) as any;
  }, [tab, query.data]);

  const exportCsv = useCallback(async () => {
    if (!list.length) return;
    try {
      let headers: string[] = [];
      let rows: (string | number)[][] = [];
      if (tab === "profissionais") {
        headers = ["Profissional", "Atendimentos", "Receita"];
        rows = (list as RankProfissional[]).map((r) => [r.nome, r.atendimentos, Number(r.receita || 0).toFixed(2)]);
      } else if (tab === "servicos") {
        headers = ["Serviço", "Vendas", "Receita"];
        rows = (list as RankServico[]).map((r) => [r.nome, r.vendas, Number(r.receita || 0).toFixed(2)]);
      } else if (tab === "clientes") {
        headers = ["Cliente", "Visitas", "Total gasto"];
        rows = (list as RankCliente[]).map((r) => [r.nome, r.visitas, Number(r.gasto || 0).toFixed(2)]);
      } else {
        headers = ["Produto", "Vendas", "Receita"];
        rows = (list as RankProduto[]).map((r) => [r.nome, r.vendas, Number(r.receita || 0).toFixed(2)]);
      }
      await shareCsv(`rankings_${tab}_${searchDi}_${searchDf}`, buildCsv(headers, rows));
    } catch (e) {
      Alert.alert("Erro ao exportar", getErrorMessage(e));
    }
  }, [list, tab, searchDi, searchDf]);

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const rank = index + 1;
    let name = "";
    let v1Label = "";
    let v1Value = "";
    let v2Label = "";
    let v2Value = "";
    if (tab === "profissionais") {
      name = item.nome; v1Label = "Atendimentos"; v1Value = String(item.atendimentos);
      v2Label = "Receita"; v2Value = formatCurrency(item.receita);
    } else if (tab === "servicos") {
      name = item.nome; v1Label = "Vendas"; v1Value = String(item.vendas);
      v2Label = "Receita"; v2Value = formatCurrency(item.receita);
    } else if (tab === "clientes") {
      name = item.nome; v1Label = "Visitas"; v1Value = String(item.visitas);
      v2Label = "Total"; v2Value = formatCurrency(item.gasto);
    } else {
      name = item.nome; v1Label = "Vendas"; v1Value = String(item.vendas);
      v2Label = "Receita"; v2Value = formatCurrency(item.receita);
    }

    return (
      <View style={styles.card}>
        <View style={styles.rank}><Text style={styles.rankText}>#{rank}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={2}>{name}</Text>
          <View style={styles.metricsRow}>
            <View><Text style={styles.metricLabel}>{v1Label}</Text><Text style={styles.metricValue}>{v1Value}</Text></View>
            <View><Text style={styles.metricLabel}>{v2Label}</Text><Text style={[styles.metricValue, { color: Colors.accent }]}>{v2Value}</Text></View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <ScreenContainer title="Rankings" subtitle="Top profissionais, serviços, clientes e produtos" scroll={false} contentPadding={false}>
      <FlatList
        data={list}
        keyExtractor={(item, idx) => `${tab}-${idx}-${(item as any).profissionalId ?? (item as any).servicoId ?? (item as any).clienteId ?? (item as any).produtoId ?? idx}`}
        contentContainerStyle={[styles.content, { paddingBottom: 120 + insets.bottom }]}
        refreshControl={<RefreshControl refreshing={query.isRefetching && !query.isLoading} onRefresh={() => query.refetch()} tintColor={Colors.accent} colors={[Colors.accent]} />}
        ListHeaderComponent={
          <View>
            <DateRangeBar inicio={di} fim={df} onInicioChange={setDi} onFimChange={setDf} onApply={apply} onExport={exportCsv} exportDisabled={!list.length} loading={query.isLoading || query.isRefetching} />
            <View style={styles.tabs}>
              {TABS.map((t) => {
                const active = t.id === tab;
                return (
                  <Text
                    key={t.id}
                    onPress={() => setTab(t.id)}
                    style={[styles.tab, active && styles.tabActive]}
                  >
                    {t.label}
                  </Text>
                );
              })}
            </View>
            <SectionHeader label={TABS.find((t) => t.id === tab)?.label ?? ""} />
          </View>
        }
        ListEmptyComponent={
          query.isLoading ? <SkeletonList count={4} variant="card" /> :
          query.isError ? <EmptyState icon="alert-triangle" title="Erro ao carregar" description={getErrorMessage(query.error)} /> :
          <EmptyState icon="bar-chart-2" title="Sem dados" description="Sem registros no período." />
        }
        renderItem={renderItem}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 16 },
  tabs: { flexDirection: "row", gap: 6, marginBottom: 8, flexWrap: "wrap" },
  tab: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 999, backgroundColor: Colors.surfaceLight,
    color: Colors.textSecondary, fontFamily: "Inter_600SemiBold", fontSize: 12,
    borderWidth: 1, borderColor: Colors.surfaceBorder,
    overflow: "hidden",
  },
  tabActive: { backgroundColor: Colors.accent, color: "#000", borderColor: Colors.accent },
  card: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.surfaceBorder,
    padding: 14, marginBottom: 8,
  },
  rank: { width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.surfaceLight, alignItems: "center", justifyContent: "center" },
  rankText: { color: Colors.accent, fontFamily: "Inter_700Bold", fontSize: 13 },
  name: { color: Colors.text, fontFamily: "Inter_600SemiBold", fontSize: 14, marginBottom: 6 },
  metricsRow: { flexDirection: "row", justifyContent: "space-between" },
  metricLabel: { color: Colors.textMuted, fontSize: 11, fontFamily: "Inter_500Medium" },
  metricValue: { color: Colors.text, fontSize: 13, fontFamily: "Inter_600SemiBold", marginTop: 1 },
});
