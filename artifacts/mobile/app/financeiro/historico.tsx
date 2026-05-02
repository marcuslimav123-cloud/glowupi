import React, { useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import { ScreenContainer } from "@/components/ScreenContainer";
import { ErrorView } from "@/components/ErrorView";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonList } from "@/components/Skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { fetchJson, formatCurrency, dateToStr } from "@/lib/api";

type CaixaSummary = {
  id: number;
  status: "aberto" | "fechado";
  dataAbertura: string;
  dataFechamento: string | null;
  abertoPor: string | null;
  fechadoPor: string | null;
  valorAbertura: number;
  totalEntradas: number;
  totalSaidas: number;
  saldoFinal: number | null;
};

function days(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return dateToStr(d);
}

export default function HistoricoCaixaScreen() {
  const { barbeariaId } = useAuth();
  const [dataInicio, setDataInicio] = useState(days(30));
  const [dataFim, setDataFim] = useState(dateToStr(new Date()));

  const { data: caixas = [], isLoading, isError, error, refetch, isFetching } = useQuery<CaixaSummary[]>({
    queryKey: ["caixa-historico", barbeariaId, dataInicio, dataFim],
    enabled: !!barbeariaId,
    queryFn: async () => {
      const r = await fetchJson<CaixaSummary[]>(`/barbearias/${barbeariaId}/caixa-diario/historico?dataInicio=${dataInicio}&dataFim=${dataFim}`);
      return Array.isArray(r) ? r : [];
    },
  });

  const totals = useMemo(() => {
    return caixas.reduce(
      (acc, c) => {
        acc.entradas += c.totalEntradas || 0;
        acc.saidas += c.totalSaidas || 0;
        return acc;
      },
      { entradas: 0, saidas: 0 },
    );
  }, [caixas]);

  return (
    <ScreenContainer
      title="Histórico de caixa"
      subtitle={`${caixas.length} caixa${caixas.length === 1 ? "" : "s"}`}
      refreshing={isFetching && !isLoading}
      onRefresh={() => refetch()}
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
        <TouchableOpacity style={styles.searchBtn} onPress={() => refetch()}>
          <Feather name="search" size={16} color={Colors.accent} />
        </TouchableOpacity>
      </View>

      <View style={styles.statRow}>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: Colors.success }]}>{formatCurrency(totals.entradas)}</Text>
          <Text style={styles.statLabel}>Entradas</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: Colors.error }]}>{formatCurrency(totals.saidas)}</Text>
          <Text style={styles.statLabel}>Saídas</Text>
        </View>
      </View>

      {isLoading ? (
        <SkeletonList count={4} variant="row" />
      ) : isError ? (
        <ErrorView error={error} onRetry={() => refetch()} />
      ) : caixas.length === 0 ? (
        <EmptyState icon="archive" title="Nenhum caixa" description="Não há caixas registrados no período." />
      ) : (
        <View style={{ gap: 8 }}>
          {caixas.map(c => {
            const saldo = c.saldoFinal ?? ((c.valorAbertura || 0) + (c.totalEntradas || 0) - (c.totalSaidas || 0));
            const aberto = c.status === "aberto";
            return (
              <View key={c.id} style={styles.card}>
                <View style={[styles.cardIcon, { backgroundColor: (aberto ? Colors.success : Colors.textMuted) + "1f" }]}>
                  <Feather name={aberto ? "unlock" : "lock"} size={16} color={aberto ? Colors.success : Colors.textMuted} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.cardTitle}>
                    {new Date(c.dataAbertura).toLocaleDateString("pt-BR")}
                    {c.dataFechamento ? ` → ${new Date(c.dataFechamento).toLocaleDateString("pt-BR")}` : ""}
                  </Text>
                  <Text style={styles.cardMeta} numberOfLines={1}>
                    {aberto ? "Aberto" : "Fechado"} · por {c.abertoPor || "—"}
                    {c.fechadoPor ? ` / ${c.fechadoPor}` : ""}
                  </Text>
                  <View style={styles.lineRow}>
                    <Text style={styles.lineMeta}>Abertura {formatCurrency(c.valorAbertura)}</Text>
                    <Text style={[styles.lineMeta, { color: Colors.success }]}>+{formatCurrency(c.totalEntradas)}</Text>
                    <Text style={[styles.lineMeta, { color: Colors.error }]}>−{formatCurrency(c.totalSaidas)}</Text>
                  </View>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.saldoLabel}>Saldo</Text>
                  <Text style={styles.saldoValue}>{formatCurrency(saldo)}</Text>
                </View>
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
  statRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  statBox: { flex: 1, padding: 12, borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder },
  statValue: { fontSize: 16, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, color: Colors.textMuted, fontFamily: "Inter_500Medium", marginTop: 4, textTransform: "uppercase", letterSpacing: 0.5 },
  card: { flexDirection: "row", gap: 10, padding: 12, borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder, alignItems: "center" },
  cardIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.text },
  cardMeta: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2 },
  lineRow: { flexDirection: "row", gap: 10, marginTop: 6 },
  lineMeta: { fontSize: 10, fontFamily: "Inter_500Medium", color: Colors.textMuted },
  saldoLabel: { fontSize: 10, color: Colors.textMuted, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5 },
  saldoValue: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.text, marginTop: 2 },
});
