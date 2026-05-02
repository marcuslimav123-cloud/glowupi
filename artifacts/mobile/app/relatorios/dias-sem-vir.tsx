import React, { useCallback, useMemo, useState } from "react";
import { Alert, FlatList, Platform, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useColors, type ColorPalette } from "@/lib/theme";
import { ScreenContainer } from "@/components/ScreenContainer";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonList } from "@/components/Skeleton";
import { fetchJson, getErrorMessage } from "@/lib/api";
import { buildCsv, shareCsv } from "@/lib/csvExport";
import { useAuth } from "@/contexts/AuthContext";

type Row = {
  id: number;
  nome: string;
  telefone: string | null;
  email: string | null;
  ultimaVisita: string | null;
  diasSemVir: number;
};

export default function DiasSemVirScreen() {
  const { barbeariaId } = useAuth();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [diasInput, setDiasInput] = useState("60");
  const [dias, setDias] = useState(60);

  const query = useQuery<Row[]>({
    queryKey: ["rel-dias-sem-vir", barbeariaId, dias],
    enabled: !!barbeariaId,
    queryFn: async () => {
      if (!barbeariaId) return [];
      const r = await fetchJson<Row[]>(`/barbearias/${barbeariaId}/relatorios/dias-sem-vir?dias=${dias}`);
      return Array.isArray(r) ? r : [];
    },
  });

  const apply = useCallback(() => {
    const n = parseInt(diasInput, 10);
    if (isFinite(n) && n > 0) setDias(n);
  }, [diasInput]);

  const exportCsv = useCallback(async () => {
    const data = query.data ?? [];
    if (!data.length) return;
    try {
      const csv = buildCsv(
        ["Cliente", "Telefone", "Email", "Última visita", "Dias sem vir"],
        data.map((r) => [r.nome, r.telefone || "", r.email || "", r.ultimaVisita || "", r.diasSemVir]),
      );
      await shareCsv(`dias_sem_vir_${dias}d`, csv);
    } catch (e) {
      Alert.alert("Erro ao exportar", getErrorMessage(e));
    }
  }, [query.data, dias]);

  const data = query.data ?? [];

  return (
    <ScreenContainer title="Clientes inativos" subtitle="Sem visita no período" scroll={false} contentPadding={false}>
      <FlatList
        data={data}
        keyExtractor={(r) => String(r.id)}
        contentContainerStyle={[styles.content, { paddingBottom: 120 + insets.bottom }]}
        refreshControl={
          <RefreshControl refreshing={query.isRefetching && !query.isLoading} onRefresh={() => query.refetch()} tintColor={colors.accent} colors={[colors.accent]} />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.bar}>
              <View style={styles.field}>
                <Text style={styles.label}>Sem vir há (dias)</Text>
                <TextInput
                  value={diasInput}
                  onChangeText={setDiasInput}
                  keyboardType={Platform.OS === "ios" ? "number-pad" : "numeric"}
                  style={styles.input}
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              <View style={styles.actions}>
                <Text style={styles.btnPrimary} onPress={apply}>Aplicar</Text>
                <Text
                  style={[styles.btnGhost, !data.length && { opacity: 0.4 }]}
                  onPress={data.length ? exportCsv : undefined}
                >
                  CSV
                </Text>
              </View>
            </View>
            <View style={styles.countRow}>
              <Text style={styles.count}>
                {query.isLoading ? "Carregando…" : `${data.length} ${data.length === 1 ? "cliente" : "clientes"}`}
              </Text>
              {!query.isLoading ? <Text style={styles.range}>≥ {dias} dias</Text> : null}
            </View>
          </View>
        }
        ListEmptyComponent={
          query.isLoading ? (
            <SkeletonList count={4} variant="card" />
          ) : query.isError ? (
            <EmptyState icon="alert-triangle" title="Erro ao carregar" description={getErrorMessage(query.error)} />
          ) : (
            <EmptyState icon="user-x" title="Nenhum cliente inativo" description="Todos os clientes vieram recentemente." />
          )
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHead}>
              <Text style={styles.name}>{item.nome}</Text>
              <View style={styles.badge}>
                <Feather name="clock" size={11} color={colors.accent} />
                <Text style={styles.badgeText}>{item.diasSemVir}d</Text>
              </View>
            </View>
            <Text style={styles.line}>Última visita: {item.ultimaVisita || "—"}</Text>
            <Text style={styles.line}>Telefone: {item.telefone || "—"}</Text>
            {item.email ? <Text style={styles.line}>E-mail: {item.email}</Text> : null}
          </View>
        )}
      />
    </ScreenContainer>
  );
}

const makeStyles = (c: ColorPalette) => StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 16 },
  bar: {
    backgroundColor: c.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.surfaceBorder,
    padding: 12,
    marginBottom: 12,
    gap: 10,
  },
  field: { gap: 4 },
  label: { fontSize: 11, color: c.textSecondary, fontFamily: "Inter_500Medium" },
  input: {
    backgroundColor: c.surfaceLight,
    borderWidth: 1,
    borderColor: c.surfaceBorder,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    color: c.text,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  actions: { flexDirection: "row", gap: 8 },
  btnPrimary: {
    backgroundColor: c.accent,
    color: c.invertedText,
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    overflow: "hidden",
  },
  btnGhost: {
    backgroundColor: c.surfaceLight,
    color: c.text,
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.surfaceBorder,
    overflow: "hidden",
  },
  countRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8, paddingHorizontal: 4 },
  count: { fontSize: 12, color: c.textSecondary, fontFamily: "Inter_600SemiBold" },
  range: { fontSize: 11, color: c.textMuted, fontFamily: "Inter_500Medium" },
  card: {
    backgroundColor: c.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.surfaceBorder,
    padding: 14,
    marginBottom: 8,
    gap: 4,
  },
  cardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  name: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: c.text, flex: 1 },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: "rgba(196,164,106,0.12)" },
  badgeText: { color: c.accent, fontFamily: "Inter_600SemiBold", fontSize: 11 },
  line: { fontSize: 12, color: c.textSecondary, fontFamily: "Inter_500Medium" },
});
