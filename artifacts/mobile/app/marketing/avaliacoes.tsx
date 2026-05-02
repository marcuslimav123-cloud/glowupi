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

type Avaliacao = {
  id: number;
  nota: number;
  comentario?: string | null;
  clienteNome?: string | null;
  profissionalNome?: string | null;
  createdAt?: string | null;
};

export default function AvaliacoesScreen() {
  const { barbeariaId } = useAuth();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { data, isLoading, isError, refetch, isRefetching, error } = useQuery<Avaliacao[]>({
    queryKey: ["avaliacoes", barbeariaId],
    queryFn: async () => {
      if (!barbeariaId) return [];
      const raw = await fetchJson<unknown>(`/barbearias/${barbeariaId}/avaliacoes`);
      return Array.isArray(raw) ? (raw as Avaliacao[]) : [];
    },
    enabled: !!barbeariaId,
  });

  const total = data?.length ?? 0;
  const media = total > 0 ? (data!.reduce((s, a) => s + (a.nota || 0), 0) / total) : 0;

  return (
    <ScreenContainer
      title="Avaliações"
      subtitle="Feedback dos clientes"
      refreshing={isRefetching}
      onRefresh={refetch}
    >
      {isLoading ? (
        <SkeletonList count={4} variant="card" />
      ) : isError ? (
        <ErrorView error={error} onRetry={refetch} />
      ) : total === 0 ? (
        <EmptyState
          icon="star"
          title="Nenhuma avaliação"
          description="Quando seus clientes avaliarem o atendimento, as notas e comentários aparecerão aqui."
        />
      ) : (
        <>
          <View style={styles.summary}>
            <View style={styles.summaryStars}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Feather
                  key={i}
                  name="star"
                  size={22}
                  color={i <= Math.round(media) ? colors.warning : colors.surfaceBorder}
                />
              ))}
            </View>
            <Text style={styles.summaryValue}>{media.toFixed(1)}</Text>
            <Text style={styles.summaryLabel}>{total} avaliação{total === 1 ? "" : "ões"}</Text>
          </View>

          {data!.map((a) => (
            <View key={a.id} style={styles.card}>
              <View style={styles.cardHead}>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Feather
                      key={i}
                      name="star"
                      size={14}
                      color={i <= a.nota ? colors.warning : colors.surfaceBorder}
                    />
                  ))}
                </View>
                {a.createdAt ? (
                  <Text style={styles.date}>{new Date(a.createdAt).toLocaleDateString("pt-BR")}</Text>
                ) : null}
              </View>
              {a.comentario ? <Text style={styles.comment}>"{a.comentario}"</Text> : null}
              <View style={styles.metaRow}>
                {a.clienteNome ? (
                  <View style={styles.metaItem}>
                    <Feather name="user" size={12} color={colors.textMuted} />
                    <Text style={styles.metaText}>{a.clienteNome}</Text>
                  </View>
                ) : null}
                {a.profissionalNome ? (
                  <View style={styles.metaItem}>
                    <Feather name="scissors" size={12} color={colors.textMuted} />
                    <Text style={styles.metaText}>{a.profissionalNome}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          ))}
        </>
      )}
    </ScreenContainer>
  );
}

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
    summary: {
      backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.surfaceBorder,
      padding: 18, alignItems: "center", marginBottom: 14,
    },
    summaryStars: { flexDirection: "row", gap: 4, marginBottom: 6 },
    summaryValue: { color: c.text, fontFamily: "Inter_700Bold", fontSize: 32 },
    summaryLabel: { color: c.textSecondary, fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 2 },
    card: {
      backgroundColor: c.surface, borderRadius: 12, borderWidth: 1, borderColor: c.surfaceBorder,
      padding: 14, marginBottom: 8,
    },
    cardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
    starsRow: { flexDirection: "row", gap: 2 },
    date: { color: c.textMuted, fontFamily: "Inter_500Medium", fontSize: 11 },
    comment: { color: c.text, fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19, marginBottom: 8, fontStyle: "italic" },
    metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
    metaText: { color: c.textSecondary, fontFamily: "Inter_500Medium", fontSize: 11 },
  });
