import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors, type ColorPalette } from "@/lib/theme";
import { ScreenContainer } from "@/components/ScreenContainer";
import { EmptyState } from "@/components/EmptyState";
import { ErrorView } from "@/components/ErrorView";
import { SkeletonList } from "@/components/Skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { fetchJson } from "@/lib/api";

type Comanda = {
  id: number;
  clienteNome?: string | null;
  profissionalNome?: string | null;
  valorTotal?: number | string | null;
  gorjeta?: number | string | null;
  taxaCartao?: number | string | null;
  observacao?: string | null;
  dataFechamento?: string | null;
  pagamentos?: Array<{ metodo: string; valor: number | string }>;
};

const METODO_LABEL: Record<string, string> = {
  pix: "PIX", dinheiro: "Dinheiro", credito: "Crédito", debito: "Débito", outros: "Outros",
};

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toNum(v: number | string | null | undefined): number {
  if (v == null) return 0;
  const n = typeof v === "string" ? Number(v) : v;
  return isFinite(n) ? n : 0;
}

function formatBRL(v: number | string | null | undefined) {
  return `R$ ${toNum(v).toFixed(2).replace(".", ",")}`;
}

function formatTime(s?: string | null) {
  if (!s) return "";
  try {
    const d = new Date(s);
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function CaixaScreen() {
  const { barbeariaId } = useAuth();
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [dataInicio, setDataInicio] = useState(todayStr());
  const [dataFim, setDataFim] = useState(todayStr());
  const [busca, setBusca] = useState("");

  const { data, isLoading, isError, refetch, isRefetching, error } = useQuery<Comanda[]>({
    queryKey: ["caixa-comandas", barbeariaId, dataInicio, dataFim],
    queryFn: async () => {
      if (!barbeariaId) return [];
      const params = new URLSearchParams({ dataInicio, dataFim });
      const raw = await fetchJson<unknown>(`/barbearias/${barbeariaId}/comandas?${params.toString()}`);
      return Array.isArray(raw) ? (raw as Comanda[]) : [];
    },
    enabled: !!barbeariaId,
  });

  const filtradas = useMemo(() => {
    if (!data) return [];
    const t = busca.trim().toLowerCase();
    if (!t) return data;
    return data.filter((c) =>
      (c.clienteNome || "").toLowerCase().includes(t) ||
      (c.profissionalNome || "").toLowerCase().includes(t) ||
      String(c.id).includes(t),
    );
  }, [data, busca]);

  const totals = useMemo(() => {
    const acc = { total: 0, gorjeta: 0, taxa: 0, porMetodo: {} as Record<string, number> };
    for (const c of filtradas) {
      acc.total += toNum(c.valorTotal);
      acc.gorjeta += toNum(c.gorjeta);
      acc.taxa += toNum(c.taxaCartao);
      for (const p of c.pagamentos || []) {
        const k = p.metodo || "outros";
        acc.porMetodo[k] = (acc.porMetodo[k] || 0) + toNum(p.valor);
      }
    }
    return acc;
  }, [filtradas]);

  const metodosPresentes = Object.entries(totals.porMetodo);

  return (
    <ScreenContainer
      title="Caixa"
      subtitle="Comandas fechadas e totais do período"
      refreshing={isRefetching}
      onRefresh={refetch}
      rightAction={{ icon: "external-link", label: "Caixa diário (abrir/fechar)", onPress: () => router.push("/financeiro/caixa-diario") }}
    >
      <View style={styles.filtersCard}>
        <View style={styles.row2}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>De</Text>
            <TextInput
              value={dataInicio}
              onChangeText={setDataInicio}
              placeholder="AAAA-MM-DD"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Até</Text>
            <TextInput
              value={dataFim}
              onChangeText={setDataFim}
              placeholder="AAAA-MM-DD"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
          </View>
        </View>
        <Text style={styles.label}>Buscar</Text>
        <TextInput
          value={busca}
          onChangeText={setBusca}
          placeholder="Cliente, profissional ou número"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
      </View>

      <View style={styles.totalsCard}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValueBig}>{formatBRL(totals.total)}</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 4 }}>
          {metodosPresentes.length === 0 ? (
            <Text style={styles.totalSub}>Sem pagamentos no período</Text>
          ) : metodosPresentes.map(([k, v]) => (
            <View key={k} style={styles.chip}>
              <Text style={styles.chipLabel}>{METODO_LABEL[k] || k}</Text>
              <Text style={styles.chipValue}>{formatBRL(v)}</Text>
            </View>
          ))}
          {totals.gorjeta > 0 ? (
            <View style={[styles.chip, { backgroundColor: colors.accent + "22", borderColor: colors.accent + "33" }]}>
              <Text style={[styles.chipLabel, { color: colors.accent }]}>Gorjetas</Text>
              <Text style={[styles.chipValue, { color: colors.accent }]}>{formatBRL(totals.gorjeta)}</Text>
            </View>
          ) : null}
        </ScrollView>
      </View>

      {isLoading ? (
        <SkeletonList count={5} variant="row" />
      ) : isError ? (
        <ErrorView error={error} onRetry={refetch} />
      ) : filtradas.length === 0 ? (
        <EmptyState
          icon="dollar-sign"
          title="Nenhuma comanda no período"
          description="Ajuste o intervalo de datas ou registre uma nova comanda."
          ctaLabel="Ir para comandas"
          onCtaPress={() => router.push("/comandas")}
        />
      ) : (
        <View style={styles.listCard}>
          {filtradas.map((c) => {
            const metodos = (c.pagamentos || []).map((p) => METODO_LABEL[p.metodo] || p.metodo).join(" • ");
            return (
              <Pressable key={c.id} onPress={() => router.push(`/comandas/${c.id}` as any)} style={styles.item}>
                <View style={{ flex: 1 }}>
                  <View style={styles.itemHead}>
                    <Text style={styles.itemTitle}>#{c.id} {c.clienteNome || "Cliente"}</Text>
                    <Text style={styles.itemValue}>{formatBRL(c.valorTotal)}</Text>
                  </View>
                  <Text style={styles.itemSub}>
                    {[c.profissionalNome, formatTime(c.dataFechamento), metodos].filter(Boolean).join(" • ")}
                  </Text>
                </View>
                <Feather name="chevron-right" size={16} color={colors.textMuted} />
              </Pressable>
            );
          })}
        </View>
      )}
    </ScreenContainer>
  );
}

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
    filtersCard: { backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.surfaceBorder, padding: 12, marginBottom: 12 },
    totalsCard: { backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.surfaceBorder, padding: 14, marginBottom: 12 },
    totalRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
    totalLabel: { color: c.textSecondary, fontFamily: "Inter_600SemiBold", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 },
    totalValueBig: { color: c.text, fontFamily: "Inter_700Bold", fontSize: 22 },
    totalSub: { color: c.textMuted, fontFamily: "Inter_500Medium", fontSize: 12 },
    chip: { backgroundColor: c.surfaceLight, borderWidth: 1, borderColor: c.surfaceBorder, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
    chipLabel: { color: c.textSecondary, fontFamily: "Inter_500Medium", fontSize: 10 },
    chipValue: { color: c.text, fontFamily: "Inter_700Bold", fontSize: 12, marginTop: 2 },
    label: { fontSize: 11, fontFamily: "Inter_500Medium", color: c.textSecondary, marginBottom: 4, marginTop: 6 },
    input: { backgroundColor: c.surfaceLight, borderWidth: 1, borderColor: c.surfaceBorder, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, color: c.text, fontFamily: "Inter_500Medium", fontSize: 13 },
    row2: { flexDirection: "row", gap: 10 },
    listCard: { backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.surfaceBorder, overflow: "hidden" },
    item: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.surfaceBorder },
    itemHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
    itemTitle: { color: c.text, fontFamily: "Inter_600SemiBold", fontSize: 14 },
    itemValue: { color: c.accent, fontFamily: "Inter_700Bold", fontSize: 14 },
    itemSub: { color: c.textSecondary, fontFamily: "Inter_500Medium", fontSize: 11, marginTop: 2 },
  });
