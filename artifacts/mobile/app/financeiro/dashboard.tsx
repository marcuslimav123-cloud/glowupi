import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { ScreenContainer } from "@/components/ScreenContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { ErrorView } from "@/components/ErrorView";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonList } from "@/components/Skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { fetchJson, formatCurrency, todayStr, dateToStr } from "@/lib/api";

type Faturamento = {
  totalBruto: number;
  totalLiquido: number;
  totalComissoes: number;
  porDia: { data: string; valor: number; quantidade: number }[];
};

type ComissaoRow = {
  profissionalId: number;
  nome: string;
  totalAtendimentos: number;
  faturamentoBruto: number;
  comissaoTotal: number;
  percentualMedio: number;
};

type Conta = {
  id: number;
  tipo: "pagar" | "receber";
  status: string;
  valor: number;
  descricao: string;
};

function startOfMonthStr() {
  const d = new Date();
  d.setDate(1);
  return dateToStr(d);
}

function mesAnoStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function DashboardFinanceiro() {
  const { barbeariaId } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const dataInicio = startOfMonthStr();
  const dataFim = todayStr();
  const mes = mesAnoStr();

  const fatQ = useQuery<Faturamento>({
    queryKey: ["fin-dash-fat", barbeariaId, dataInicio, dataFim],
    enabled: !!barbeariaId,
    queryFn: () => fetchJson<Faturamento>(`/barbearias/${barbeariaId}/relatorios/faturamento?dataInicio=${dataInicio}&dataFim=${dataFim}`),
  });

  const comQ = useQuery<ComissaoRow[]>({
    queryKey: ["fin-dash-com", barbeariaId, mes],
    enabled: !!barbeariaId,
    queryFn: async () => {
      const r = await fetchJson<ComissaoRow[]>(`/barbearias/${barbeariaId}/relatorios/comissoes?mes=${mes}`);
      return Array.isArray(r) ? r : [];
    },
  });

  const contasQ = useQuery<Conta[]>({
    queryKey: ["fin-dash-contas", barbeariaId],
    enabled: !!barbeariaId,
    queryFn: async () => {
      const r = await fetchJson<Conta[]>(`/barbearias/${barbeariaId}/financeiro`);
      return Array.isArray(r) ? r : [];
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fatQ.refetch(), comQ.refetch(), contasQ.refetch()]);
    setRefreshing(false);
  };

  const isLoading = fatQ.isLoading || comQ.isLoading || contasQ.isLoading;
  const isError = fatQ.isError || comQ.isError || contasQ.isError;
  const error = fatQ.error || comQ.error || contasQ.error;

  const totals = useMemo(() => {
    const contas = contasQ.data ?? [];
    const aPagar = contas.filter(c => c.tipo === "pagar" && c.status !== "paga").reduce((s, c) => s + (c.valor || 0), 0);
    const aReceber = contas.filter(c => c.tipo === "receber" && c.status !== "paga").reduce((s, c) => s + (c.valor || 0), 0);
    const comissoesTotal = (comQ.data ?? []).reduce((s, c) => s + (c.comissaoTotal || 0), 0);
    return { aPagar, aReceber, comissoesTotal };
  }, [contasQ.data, comQ.data]);

  const porDia = fatQ.data?.porDia ?? [];
  const maxDia = Math.max(1, ...porDia.map(d => d.valor));

  return (
    <ScreenContainer
      title="Painel financeiro"
      subtitle={`${dataInicio} → ${dataFim}`}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {isLoading ? (
        <SkeletonList count={3} />
      ) : isError ? (
        <ErrorView error={error} onRetry={onRefresh} />
      ) : (
        <>
          <SectionHeader label="Faturamento do mês" />
          <View style={styles.kpiGrid}>
            <KpiCard
              icon="trending-up"
              label="Receita bruta"
              value={formatCurrency(fatQ.data?.totalBruto ?? 0)}
              tone="success"
            />
            <KpiCard
              icon="dollar-sign"
              label="Receita líquida"
              value={formatCurrency(fatQ.data?.totalLiquido ?? 0)}
              tone="accent"
            />
            <KpiCard
              icon="arrow-up-circle"
              label="A receber"
              value={formatCurrency(totals.aReceber)}
              tone="info"
            />
            <KpiCard
              icon="arrow-down-circle"
              label="A pagar"
              value={formatCurrency(totals.aPagar)}
              tone="error"
            />
          </View>

          <View style={styles.saldoCard}>
            <View>
              <Text style={styles.saldoLabel}>Saldo previsto do mês</Text>
              <Text style={styles.saldoSub}>Líquido + a receber − a pagar</Text>
            </View>
            <Text style={[
              styles.saldoValue,
              { color: ((fatQ.data?.totalLiquido ?? 0) + totals.aReceber - totals.aPagar) >= 0 ? Colors.success : Colors.error },
            ]}>
              {formatCurrency((fatQ.data?.totalLiquido ?? 0) + totals.aReceber - totals.aPagar)}
            </Text>
          </View>

          <SectionHeader label="Receitas por dia" />
          <View style={styles.chartCard}>
            {porDia.length === 0 ? (
              <EmptyState icon="bar-chart-2" title="Sem dados no período" description="Conforme as comandas forem fechadas, o gráfico aparece aqui." />
            ) : (
              porDia.slice(-14).map((d) => {
                const pct = Math.max(2, (d.valor / maxDia) * 100);
                const dt = new Date(d.data + "T12:00:00");
                const dia = `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}`;
                return (
                  <View key={d.data} style={styles.chartRow}>
                    <Text style={styles.chartDate}>{dia}</Text>
                    <View style={styles.chartBarTrack}>
                      <View style={[styles.chartBarFill, { width: `${pct}%` }]} />
                    </View>
                    <Text style={styles.chartValue}>{formatCurrency(d.valor)}</Text>
                  </View>
                );
              })
            )}
          </View>

          <SectionHeader label="Comissões do mês" description={`${(comQ.data ?? []).length} profissionais`} />
          <View style={styles.cardSurface}>
            {(comQ.data ?? []).length === 0 ? (
              <EmptyState icon="percent" title="Sem comissões" description="Ainda não há comandas com comissão neste mês." />
            ) : (
              <>
                <View style={styles.comissaoTotalBlock}>
                  <Text style={styles.comissaoTotalLabel}>Total geral</Text>
                  <Text style={styles.comissaoTotalValue}>{formatCurrency(totals.comissoesTotal)}</Text>
                </View>
                {(comQ.data ?? []).map((c) => (
                  <View key={c.profissionalId} style={styles.comissaoRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.comissaoNome}>{c.nome}</Text>
                      <Text style={styles.comissaoSub}>
                        {c.totalAtendimentos} atend. · {c.percentualMedio}% médio
                      </Text>
                    </View>
                    <Text style={styles.comissaoValor}>{formatCurrency(c.comissaoTotal)}</Text>
                  </View>
                ))}
              </>
            )}
          </View>
        </>
      )}
    </ScreenContainer>
  );
}

function KpiCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  tone: "success" | "error" | "accent" | "info";
}) {
  const color = tone === "success" ? Colors.success : tone === "error" ? Colors.error : tone === "info" ? Colors.info : Colors.accent;
  return (
    <View style={styles.kpiCard}>
      <View style={[styles.kpiIcon, { backgroundColor: color + "1f" }]}>
        <Feather name={icon} size={16} color={color} />
      </View>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={[styles.kpiValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  kpiCard: {
    flexBasis: "48%",
    flexGrow: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 14,
    padding: 12,
  },
  kpiIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  kpiLabel: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 },
  kpiValue: { fontSize: 17, fontFamily: "Inter_700Bold", marginTop: 4 },
  saldoCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 14,
    padding: 14,
  },
  saldoLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.text },
  saldoSub: { fontSize: 11, color: Colors.textMuted, fontFamily: "Inter_400Regular", marginTop: 2 },
  saldoValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  chartCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  chartRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  chartDate: { width: 44, fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  chartBarTrack: { flex: 1, height: 10, borderRadius: 6, backgroundColor: Colors.surfaceLight, overflow: "hidden" },
  chartBarFill: { height: 10, backgroundColor: Colors.accent },
  chartValue: { width: 80, textAlign: "right", fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.text },
  cardSurface: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 14,
    overflow: "hidden",
  },
  comissaoTotalBlock: { padding: 12, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder, backgroundColor: Colors.accent + "11" },
  comissaoTotalLabel: { fontSize: 11, color: Colors.textSecondary, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5 },
  comissaoTotalValue: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.accent, marginTop: 4 },
  comissaoRow: { flexDirection: "row", alignItems: "center", padding: 12, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder },
  comissaoNome: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text },
  comissaoSub: { fontSize: 11, color: Colors.textSecondary, fontFamily: "Inter_400Regular", marginTop: 2 },
  comissaoValor: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.accent },
});
