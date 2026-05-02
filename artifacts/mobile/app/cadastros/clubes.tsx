import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useColors, type ColorPalette } from "@/lib/theme";
import { ScreenContainer } from "@/components/ScreenContainer";
import { EmptyState } from "@/components/EmptyState";
import { ErrorView } from "@/components/ErrorView";
import { SkeletonList } from "@/components/Skeleton";
import { ListRow } from "@/components/ListRow";
import { useAuth } from "@/contexts/AuthContext";
import { fetchJson } from "@/lib/api";

type Clube = {
  id: number;
  nome: string;
  descricao?: string | null;
  valorMensal?: number | string | null;
  ativo?: boolean;
  totalAssinantes?: number;
};

export default function ClubesScreen() {
  const { barbeariaId } = useAuth();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { data, isLoading, isError, refetch, isRefetching, error } = useQuery<Clube[]>({
    queryKey: ["clube-vantagens", barbeariaId],
    queryFn: async () => {
      if (!barbeariaId) return [];
      const raw = await fetchJson<unknown>(`/barbearias/${barbeariaId}/clube-vantagens`);
      return Array.isArray(raw) ? (raw as Clube[]) : [];
    },
    enabled: !!barbeariaId,
  });

  return (
    <ScreenContainer
      title="Clubes de assinatura"
      subtitle="Planos recorrentes para clientes"
      refreshing={isRefetching}
      onRefresh={refetch}
    >
      {isLoading ? (
        <SkeletonList count={3} variant="card" />
      ) : isError ? (
        <ErrorView error={error} onRetry={refetch} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon="award"
          title="Nenhum clube cadastrado"
          description="Crie planos mensais com benefícios para fidelizar clientes recorrentes. Disponível no painel web."
        />
      ) : (
        <View style={styles.card}>
          {data.map((c) => {
            const valor = typeof c.valorMensal === "string" ? Number(c.valorMensal) : (c.valorMensal ?? 0);
            return (
              <ListRow
                key={c.id}
                icon="award"
                label={c.nome}
                description={c.descricao || (c.totalAssinantes != null ? `${c.totalAssinantes} assinante(s)` : undefined)}
                badge={c.ativo === false ? "Inativo" : "Ativo"}
                badgeTone={c.ativo === false ? "default" : "success"}
                rightLabel={valor ? `R$ ${valor.toFixed(2).replace(".", ",")}/mês` : undefined}
              />
            );
          })}
        </View>
      )}
      <Text style={styles.hint}>
        Para criar e editar clubes, acesse o painel web em glowupi.com.
      </Text>
    </ScreenContainer>
  );
}

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
    card: { backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.surfaceBorder, overflow: "hidden" },
    hint: { color: c.textMuted, fontFamily: "Inter_500Medium", fontSize: 11, textAlign: "center", marginTop: 16 },
  });
