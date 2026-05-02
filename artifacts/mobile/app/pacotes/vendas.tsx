import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useColors, type ColorPalette } from "@/lib/theme";
import { ScreenContainer } from "@/components/ScreenContainer";
import { EmptyState } from "@/components/EmptyState";
import { ErrorView } from "@/components/ErrorView";
import { SkeletonList } from "@/components/Skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { fetchJson } from "@/lib/api";

type Venda = {
  id: number;
  pacoteNome?: string | null;
  clienteNome?: string | null;
  valor?: number | string | null;
  status?: "ativo" | "expirado" | "consumido" | string;
  dataCompra?: string | null;
  dataExpiracao?: string | null;
  sessoesRestantes?: number;
  sessoesTotal?: number;
};

function formatBRL(v: number | string | null | undefined) {
  const n = typeof v === "string" ? Number(v) : (v ?? 0);
  return `R$ ${n.toFixed(2).replace(".", ",")}`;
}

function formatDate(s?: string | null) {
  if (!s) return null;
  try {
    return new Date(s).toLocaleDateString("pt-BR");
  } catch {
    return null;
  }
}

export default function PacotesVendasScreen() {
  const { barbeariaId } = useAuth();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { data, isLoading, isError, refetch, isRefetching, error } = useQuery<Venda[]>({
    queryKey: ["pacotes-cliente", barbeariaId],
    queryFn: async () => {
      if (!barbeariaId) return [];
      const raw = await fetchJson<unknown>(`/barbearias/${barbeariaId}/pacotes-cliente`);
      return Array.isArray(raw) ? (raw as Venda[]) : [];
    },
    enabled: !!barbeariaId,
  });

  const tone = (status?: string) =>
    status === "ativo" ? colors.success : status === "expirado" ? colors.error : colors.textSecondary;

  return (
    <ScreenContainer
      title="Vendas de pacotes"
      subtitle="Pacotes vendidos a clientes"
      refreshing={isRefetching}
      onRefresh={refetch}
    >
      {isLoading ? (
        <SkeletonList count={4} variant="card" />
      ) : isError ? (
        <ErrorView error={error} onRetry={refetch} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon="shopping-bag"
          title="Nenhum pacote vendido"
          description="Quando clientes comprarem pacotes, eles aparecerão aqui com o saldo de sessões."
        />
      ) : (
        data.map((v) => (
          <View key={v.id} style={styles.card}>
            <View style={styles.headRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title} numberOfLines={1}>{v.pacoteNome || "Pacote"}</Text>
                <Text style={styles.cliente}>{v.clienteNome || "Cliente"}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: tone(v.status) + "22" }]}>
                <Text style={[styles.statusText, { color: tone(v.status) }]}>
                  {(v.status || "ativo").toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={styles.metaRow}>
              {v.sessoesTotal != null ? (
                <View style={styles.metaItem}>
                  <Feather name="clipboard" size={12} color={colors.textMuted} />
                  <Text style={styles.metaText}>
                    {v.sessoesRestantes ?? 0}/{v.sessoesTotal} sessões
                  </Text>
                </View>
              ) : null}
              {formatDate(v.dataCompra) ? (
                <View style={styles.metaItem}>
                  <Feather name="calendar" size={12} color={colors.textMuted} />
                  <Text style={styles.metaText}>Compra: {formatDate(v.dataCompra)}</Text>
                </View>
              ) : null}
              {formatDate(v.dataExpiracao) ? (
                <View style={styles.metaItem}>
                  <Feather name="clock" size={12} color={colors.textMuted} />
                  <Text style={styles.metaText}>Expira: {formatDate(v.dataExpiracao)}</Text>
                </View>
              ) : null}
              {v.valor != null ? (
                <View style={styles.metaItem}>
                  <Feather name="dollar-sign" size={12} color={colors.accent} />
                  <Text style={[styles.metaText, { color: colors.accent }]}>{formatBRL(v.valor)}</Text>
                </View>
              ) : null}
            </View>
          </View>
        ))
      )}
    </ScreenContainer>
  );
}

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.surfaceBorder,
      padding: 14, marginBottom: 8,
    },
    headRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
    title: { color: c.text, fontFamily: "Inter_600SemiBold", fontSize: 14 },
    cliente: { color: c.textSecondary, fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 2 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 0.5 },
    metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
    metaText: { color: c.textSecondary, fontFamily: "Inter_500Medium", fontSize: 11 },
  });
