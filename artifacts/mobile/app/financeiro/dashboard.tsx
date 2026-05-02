import React, { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { ScreenContainer } from "@/components/ScreenContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { ErrorView } from "@/components/ErrorView";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonList } from "@/components/Skeleton";
import { DateRangeBar } from "@/components/DateRangeBar";
import { useAuth } from "@/contexts/AuthContext";
import { fetchJson, formatCurrency, getErrorMessage, todayStr, dateToStr } from "@/lib/api";
import { buildCsv, shareCsv } from "@/lib/csvExport";

type Faturamento = {
  totalBruto: number;
  totalLiquido: number;
  totalComissoes: number;
  porDia: { data: string; valor: number; quantidade: number }[];
  porServico: { servicoId: number; nome: string; quantidade: number; valor: number; percentual: number }[];
  porFormaPagamento: { metodo: string; valor: number }[];
};

type ComissaoRow = {
  profissionalId: number;
  nome: string;
  totalAtendimentos: number;
  faturamentoBruto: number;
  comissaoTotal: number;
  percentualMedio: number;
};

type Rankings = {
  profissionais: { nome: string; atendimentos: number; faturamento: number }[];
  servicos: { nome: string; quantidade: number; faturamento: number }[];
};

type Conta = {
  id: number;
  tipo: "pagar" | "receber";
  status: string;
  valor: number;
  descricao: string;
};

type Periodo = "hoje" | "semana" | "mes" | "custom";

const PAYMENT_LABELS: Record<string, string> = {
  dinheiro: "Dinheiro",
  pix: "PIX",
  credito: "Crédito",
  debito: "Débito",
  outros: "Outros",
};

const PERIODOS: { id: Periodo; label: string }[] = [
  { id: "hoje", label: "Hoje" },
  { id: "semana", label: "Semana" },
  { id: "mes", label: "Mês" },
  { id: "custom", label: "Personalizado" },
];

function rangeFor(periodo: Periodo, custom: { di: string; df: string }): { di: string; df: string } {
  const hoje = todayStr();
  if (periodo === "hoje") return { di: hoje, df: hoje };
  if (periodo === "semana") {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return { di: dateToStr(d), df: hoje };
  }
  if (periodo === "mes") {
    const d = new Date();
    d.setDate(1);
    return { di: dateToStr(d), df: hoje };
  }
  return custom;
}

function previousRange(di: string, df: string): { di: string; df: string } {
  const d1 = new Date(di + "T12:00:00");
  const d2 = new Date(df + "T12:00:00");
  const days = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1);
  const prevFim = new Date(d1);
  prevFim.setDate(prevFim.getDate() - 1);
  const prevIni = new Date(prevFim);
  prevIni.setDate(prevFim.getDate() - (days - 1));
  return { di: dateToStr(prevIni), df: dateToStr(prevFim) };
}

export default function DashboardFinanceiro() {
  const { barbeariaId } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [customDi, setCustomDi] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return dateToStr(d);
  });
  const [customDf, setCustomDf] = useState(() => todayStr());
  const [appliedCustom, setAppliedCustom] = useState({ di: customDi, df: customDf });

  const { di: dataInicio, df: dataFim } = useMemo(
    () => rangeFor(periodo, appliedCustom),
    [periodo, appliedCustom],
  );
  const prev = useMemo(() => previousRange(dataInicio, dataFim), [dataInicio, dataFim]);

  const fatQ = useQuery<Faturamento>({
    queryKey: ["fin-dash-fat", barbeariaId, dataInicio, dataFim],
    enabled: !!barbeariaId,
    queryFn: () =>
      fetchJson<Faturamento>(
        `/barbearias/${barbeariaId}/relatorios/faturamento?dataInicio=${dataInicio}&dataFim=${dataFim}`,
      ),
  });

  const fatPrevQ = useQuery<Faturamento>({
    queryKey: ["fin-dash-fat-prev", barbeariaId, prev.di, prev.df],
    enabled: !!barbeariaId,
    queryFn: () =>
      fetchJson<Faturamento>(
        `/barbearias/${barbeariaId}/relatorios/faturamento?dataInicio=${prev.di}&dataFim=${prev.df}`,
      ),
  });

  const comQ = useQuery<ComissaoRow[]>({
    queryKey: ["fin-dash-com", barbeariaId, dataInicio, dataFim],
    enabled: !!barbeariaId,
    queryFn: async () => {
      const r = await fetchJson<ComissaoRow[]>(
        `/barbearias/${barbeariaId}/relatorios/comissoes?dataInicio=${dataInicio}&dataFim=${dataFim}`,
      );
      return Array.isArray(r) ? r : [];
    },
  });

  const rankQ = useQuery<Rankings>({
    queryKey: ["fin-dash-rank", barbeariaId, dataInicio, dataFim],
    enabled: !!barbeariaId,
    queryFn: () =>
      fetchJson<Rankings>(
        `/barbearias/${barbeariaId}/relatorios/rankings?dataInicio=${dataInicio}&dataFim=${dataFim}`,
      ),
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
    await Promise.all([fatQ.refetch(), fatPrevQ.refetch(), comQ.refetch(), rankQ.refetch(), contasQ.refetch()]);
    setRefreshing(false);
  };

  const isLoading = fatQ.isLoading || comQ.isLoading || rankQ.isLoading || contasQ.isLoading;
  const isError = fatQ.isError || comQ.isError || rankQ.isError || contasQ.isError;
  const error = fatQ.error || comQ.error || rankQ.error || contasQ.error;

  const totals = useMemo(() => {
    const contas = contasQ.data ?? [];
    const aPagar = contas
      .filter((c) => c.tipo === "pagar" && c.status !== "paga")
      .reduce((s, c) => s + (c.valor || 0), 0);
    const aReceber = contas
      .filter((c) => c.tipo === "receber" && c.status !== "paga")
      .reduce((s, c) => s + (c.valor || 0), 0);
    const comissoesTotal = (comQ.data ?? []).reduce((s, c) => s + (c.comissaoTotal || 0), 0);
    return { aPagar, aReceber, comissoesTotal };
  }, [contasQ.data, comQ.data]);

  const porDia = fatQ.data?.porDia ?? [];
  const maxDia = Math.max(1, ...porDia.map((d) => d.valor));
  const porPag = fatQ.data?.porFormaPagamento ?? [];
  const totalPag = porPag.reduce((s, p) => s + (p.valor || 0), 0);
  const porServico = (fatQ.data?.porServico ?? []).slice(0, 8);
  const ranking = (rankQ.data?.profissionais ?? []).slice(0, 6);

  const compareDelta = useMemo(() => {
    const cur = fatQ.data?.totalBruto ?? 0;
    const prev = fatPrevQ.data?.totalBruto ?? 0;
    if (prev <= 0) return { delta: cur > 0 ? 100 : 0, prev, cur };
    return { delta: ((cur - prev) / prev) * 100, prev, cur };
  }, [fatQ.data?.totalBruto, fatPrevQ.data?.totalBruto]);

  const handleApplyCustom = useCallback(() => {
    setAppliedCustom({ di: customDi, df: customDf });
  }, [customDi, customDf]);

  const handleExport = useCallback(async () => {
    try {
      const sections: { title: string; headers: string[]; rows: (string | number)[][] }[] = [];
      const fat = fatQ.data;
      if (fat) {
        sections.push({
          title: "Resumo",
          headers: ["Indicador", "Valor"],
          rows: [
            ["Faturamento bruto", Number(fat.totalBruto).toFixed(2)],
            ["Faturamento líquido", Number(fat.totalLiquido).toFixed(2)],
            ["Total de comissões", Number(fat.totalComissoes).toFixed(2)],
            ["A receber (pendente)", Number(totals.aReceber).toFixed(2)],
            ["A pagar (pendente)", Number(totals.aPagar).toFixed(2)],
            ["Faturamento mês anterior", Number(fatPrevQ.data?.totalBruto ?? 0).toFixed(2)],
          ],
        });
        sections.push({
          title: "Faturamento por dia",
          headers: ["Data", "Valor", "Comandas"],
          rows: fat.porDia.map((d) => [d.data, Number(d.valor).toFixed(2), d.quantidade]),
        });
        sections.push({
          title: "Formas de pagamento",
          headers: ["Forma", "Valor"],
          rows: fat.porFormaPagamento.map((p) => [
            PAYMENT_LABELS[p.metodo] ?? p.metodo,
            Number(p.valor).toFixed(2),
          ]),
        });
        sections.push({
          title: "Top serviços",
          headers: ["Serviço", "Quantidade", "Valor", "% do total"],
          rows: fat.porServico.map((s) => [s.nome, s.quantidade, Number(s.valor).toFixed(2), s.percentual]),
        });
      }
      sections.push({
        title: "Comissões do período",
        headers: ["Profissional", "Atendimentos", "Faturamento bruto", "Comissão", "% médio"],
        rows: (comQ.data ?? []).map((c) => [
          c.nome,
          c.totalAtendimentos,
          Number(c.faturamentoBruto).toFixed(2),
          Number(c.comissaoTotal).toFixed(2),
          c.percentualMedio,
        ]),
      });
      sections.push({
        title: "Ranking de profissionais",
        headers: ["Profissional", "Atendimentos", "Faturamento"],
        rows: (rankQ.data?.profissionais ?? []).map((p) => [
          p.nome,
          p.atendimentos,
          Number(p.faturamento).toFixed(2),
        ]),
      });

      const parts: string[] = [`Relatório financeiro,${dataInicio} a ${dataFim}`, ""];
      sections.forEach((sec) => {
        parts.push(sec.title);
        parts.push(buildCsv(sec.headers, sec.rows).replace(/^\uFEFF/, "").trimEnd());
        parts.push("");
      });
      const csv = "\uFEFF" + parts.join("\n");
      await shareCsv(`relatorio_financeiro_${dataInicio}_${dataFim}`, csv);
    } catch (e) {
      Alert.alert("Erro ao exportar", getErrorMessage(e));
    }
  }, [fatQ.data, fatPrevQ.data, comQ.data, rankQ.data, totals, dataInicio, dataFim]);

  const isCustom = periodo === "custom";

  return (
    <ScreenContainer
      title="Relatórios financeiros"
      subtitle={`${dataInicio} → ${dataFim}`}
      refreshing={refreshing}
      onRefresh={onRefresh}
      rightAction={{ icon: "share-2", label: "Exportar CSV", onPress: handleExport }}
    >
      <View style={styles.periodRow}>
        {PERIODOS.map((p) => {
          const active = p.id === periodo;
          return (
            <Pressable
              key={p.id}
              onPress={() => setPeriodo(p.id)}
              style={({ pressed }) => [
                styles.periodChip,
                active && styles.periodChipActive,
                pressed && { opacity: 0.85 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Período ${p.label}`}
            >
              <Text style={[styles.periodText, active && styles.periodTextActive]}>{p.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {isCustom ? (
        <DateRangeBar
          inicio={customDi}
          fim={customDf}
          onInicioChange={setCustomDi}
          onFimChange={setCustomDf}
          onApply={handleApplyCustom}
          loading={fatQ.isFetching}
        />
      ) : null}

      {isLoading ? (
        <SkeletonList count={3} />
      ) : isError ? (
        <ErrorView error={error} onRetry={onRefresh} />
      ) : (
        <>
          <SectionHeader label="Faturamento" />
          <View style={styles.kpiGrid}>
            <KpiCard icon="trending-up" label="Receita bruta" value={formatCurrency(fatQ.data?.totalBruto ?? 0)} tone="success" />
            <KpiCard icon="dollar-sign" label="Receita líquida" value={formatCurrency(fatQ.data?.totalLiquido ?? 0)} tone="accent" />
            <KpiCard icon="percent" label="Comissões" value={formatCurrency(fatQ.data?.totalComissoes ?? 0)} tone="warning" />
            <KpiCard icon="arrow-up-circle" label="A receber" value={formatCurrency(totals.aReceber)} tone="info" />
            <KpiCard icon="arrow-down-circle" label="A pagar" value={formatCurrency(totals.aPagar)} tone="error" />
            <KpiCard
              icon={compareDelta.delta >= 0 ? "trending-up" : "trending-down"}
              label="vs período anterior"
              value={`${compareDelta.delta >= 0 ? "+" : ""}${compareDelta.delta.toFixed(1)}%`}
              tone={compareDelta.delta >= 0 ? "success" : "error"}
            />
          </View>

          <View style={styles.saldoCard}>
            <View>
              <Text style={styles.saldoLabel}>Saldo previsto</Text>
              <Text style={styles.saldoSub}>Líquido + a receber − a pagar</Text>
            </View>
            <Text
              style={[
                styles.saldoValue,
                {
                  color:
                    (fatQ.data?.totalLiquido ?? 0) + totals.aReceber - totals.aPagar >= 0
                      ? Colors.success
                      : Colors.error,
                },
              ]}
            >
              {formatCurrency((fatQ.data?.totalLiquido ?? 0) + totals.aReceber - totals.aPagar)}
            </Text>
          </View>

          <View style={styles.compareCard}>
            <Feather name="bar-chart-2" size={16} color={Colors.textSecondary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.compareTitle}>Comparativo</Text>
              <Text style={styles.compareSub}>
                {`Atual ${formatCurrency(compareDelta.cur)} · Anterior ${formatCurrency(compareDelta.prev)}`}
              </Text>
              <Text style={styles.compareSub}>{`Período anterior: ${prev.di} → ${prev.df}`}</Text>
            </View>
          </View>

          <SectionHeader label="Receitas por dia" description={`${porDia.length} dias com movimento`} />
          <View style={styles.chartCard}>
            {porDia.length === 0 ? (
              <EmptyState icon="bar-chart-2" title="Sem dados" description="Sem comandas fechadas no período." />
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

          <SectionHeader label="Formas de pagamento" />
          <View style={styles.cardSurface}>
            {porPag.length === 0 ? (
              <View style={{ padding: 12 }}>
                <EmptyState icon="credit-card" title="Sem dados" description="Nenhum pagamento registrado." />
              </View>
            ) : (
              porPag.map((p, i) => {
                const pct = totalPag > 0 ? (p.valor / totalPag) * 100 : 0;
                return (
                  <View key={`${p.metodo}-${i}`} style={styles.pagRow}>
                    <View style={{ flex: 1 }}>
                      <View style={styles.pagHeader}>
                        <Text style={styles.pagLabel}>{PAYMENT_LABELS[p.metodo] ?? p.metodo}</Text>
                        <Text style={styles.pagValue}>{formatCurrency(p.valor)}</Text>
                      </View>
                      <View style={styles.pagTrack}>
                        <View style={[styles.pagFill, { width: `${pct}%` }]} />
                      </View>
                      <Text style={styles.pagPct}>{pct.toFixed(1)}% do total</Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>

          <SectionHeader label="Top serviços" />
          <View style={styles.cardSurface}>
            {porServico.length === 0 ? (
              <View style={{ padding: 12 }}>
                <EmptyState icon="scissors" title="Sem dados" description="Sem serviços vendidos no período." />
              </View>
            ) : (
              porServico.map((s) => (
                <View key={s.servicoId ?? s.nome} style={styles.servRow}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.pagHeader}>
                      <Text style={styles.pagLabel} numberOfLines={1}>{s.nome}</Text>
                      <Text style={styles.pagValue}>{formatCurrency(s.valor)}</Text>
                    </View>
                    <View style={styles.pagTrack}>
                      <View style={[styles.pagFill, { width: `${Math.min(100, s.percentual)}%` }]} />
                    </View>
                    <Text style={styles.pagPct}>{s.quantidade}× · {s.percentual}%</Text>
                  </View>
                </View>
              ))
            )}
          </View>

          <SectionHeader label="Ranking de profissionais" description="Por faturamento no período" />
          <View style={styles.cardSurface}>
            {ranking.length === 0 ? (
              <View style={{ padding: 12 }}>
                <EmptyState icon="award" title="Sem dados" description="Sem comandas no período." />
              </View>
            ) : (
              ranking.map((p, i) => (
                <View key={`${p.nome}-${i}`} style={styles.rankRow}>
                  <View style={styles.rankBadge}>
                    <Text style={styles.rankBadgeText}>#{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rankNome}>{p.nome}</Text>
                    <Text style={styles.rankSub}>{p.atendimentos} atend.</Text>
                  </View>
                  <Text style={styles.rankValor}>{formatCurrency(p.faturamento)}</Text>
                </View>
              ))
            )}
          </View>

          <SectionHeader label="Comissões consolidadas" description={`${(comQ.data ?? []).length} profissionais no período`} />
          <View style={styles.cardSurface}>
            {(comQ.data ?? []).length === 0 ? (
              <View style={{ padding: 12 }}>
                <EmptyState icon="percent" title="Sem comissões" description="Sem comandas com comissão no período." />
              </View>
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
                        {c.totalAtendimentos} atend. · {c.percentualMedio}% médio · bruto {formatCurrency(c.faturamentoBruto)}
                      </Text>
                    </View>
                    <Text style={styles.comissaoValor}>{formatCurrency(c.comissaoTotal)}</Text>
                  </View>
                ))}
              </>
            )}
          </View>

          <Pressable
            onPress={handleExport}
            style={({ pressed }) => [styles.exportBtn, pressed && { opacity: 0.85 }]}
            accessibilityRole="button"
            accessibilityLabel="Exportar relatório completo"
          >
            <Feather name="download" size={16} color={Colors.invertedText} />
            <Text style={styles.exportText}>Exportar relatório completo (CSV)</Text>
          </Pressable>
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
  tone: "success" | "error" | "accent" | "info" | "warning";
}) {
  const color =
    tone === "success"
      ? Colors.success
      : tone === "error"
      ? Colors.error
      : tone === "info"
      ? Colors.info
      : tone === "warning"
      ? Colors.warning
      : Colors.accent;
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
  periodRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  periodChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  periodChipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  periodText: { color: Colors.textSecondary, fontFamily: "Inter_600SemiBold", fontSize: 12 },
  periodTextActive: { color: Colors.invertedText },

  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
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

  compareCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 14,
    padding: 12,
  },
  compareTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.text },
  compareSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2 },

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
  chartValue: { width: 90, textAlign: "right", fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.text },

  cardSurface: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 14,
    overflow: "hidden",
  },

  pagRow: { padding: 12, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder },
  pagHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  pagLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.text, flex: 1 },
  pagValue: { fontSize: 13, fontFamily: "Inter_700Bold", color: Colors.text },
  pagTrack: { height: 6, borderRadius: 4, backgroundColor: Colors.surfaceLight, overflow: "hidden", marginTop: 8 },
  pagFill: { height: 6, backgroundColor: Colors.accent },
  pagPct: { fontSize: 11, color: Colors.textMuted, fontFamily: "Inter_500Medium", marginTop: 4 },

  servRow: { padding: 12, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder },

  rankRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  rankBadge: { width: 36, height: 36, borderRadius: 12, backgroundColor: Colors.surfaceLight, alignItems: "center", justifyContent: "center" },
  rankBadgeText: { color: Colors.accent, fontFamily: "Inter_700Bold", fontSize: 12 },
  rankNome: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text },
  rankSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2 },
  rankValor: { fontSize: 13, fontFamily: "Inter_700Bold", color: Colors.accent },

  comissaoTotalBlock: { padding: 12, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder, backgroundColor: Colors.accent + "11" },
  comissaoTotalLabel: { fontSize: 11, color: Colors.textSecondary, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5 },
  comissaoTotalValue: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.accent, marginTop: 4 },
  comissaoRow: { flexDirection: "row", alignItems: "center", padding: 12, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder },
  comissaoNome: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text },
  comissaoSub: { fontSize: 11, color: Colors.textSecondary, fontFamily: "Inter_400Regular", marginTop: 2 },
  comissaoValor: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.accent },

  exportBtn: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.accent,
    paddingVertical: 12,
    borderRadius: 12,
  },
  exportText: { color: Colors.invertedText, fontFamily: "Inter_600SemiBold", fontSize: 13 },
});
