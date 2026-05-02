import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useColors, type ColorPalette } from "@/lib/theme";
import { ScreenContainer } from "@/components/ScreenContainer";
import { ListRow } from "@/components/ListRow";
import { EmptyState } from "@/components/EmptyState";
import { ErrorView } from "@/components/ErrorView";
import { SkeletonList } from "@/components/Skeleton";
import { SectionHeader } from "@/components/SectionHeader";
import { useAuth } from "@/contexts/AuthContext";
import { fetchJson } from "@/lib/api";

type Pacote = {
  id: number;
  nome: string;
  descricao?: string | null;
  valor: number | string;
  validadeDias?: number | null;
  ativo?: boolean;
  totalVendas?: number;
};

function formatBRL(v: number | string | null | undefined) {
  const n = typeof v === "string" ? Number(v) : (v ?? 0);
  return `R$ ${n.toFixed(2).replace(".", ",")}`;
}

export default function PacotesScreen() {
  const { barbeariaId } = useAuth();
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { data, isLoading, isError, refetch, isRefetching, error } = useQuery<Pacote[]>({
    queryKey: ["pacotes", barbeariaId],
    queryFn: async () => {
      if (!barbeariaId) return [];
      const raw = await fetchJson<unknown>(`/barbearias/${barbeariaId}/pacotes`);
      return Array.isArray(raw) ? (raw as Pacote[]) : [];
    },
    enabled: !!barbeariaId,
  });

  return (
    <ScreenContainer
      title="Pacotes"
      subtitle="Crie pacotes e gerencie vendas"
      refreshing={isRefetching}
      onRefresh={refetch}
      rightAction={{ icon: "shopping-bag", label: "Vendas", onPress: () => router.push("/pacotes/vendas") }}
    >
      <View style={styles.card}>
        <ListRow
          icon="shopping-bag"
          label="Vendas e clientes"
          description="Veja quem comprou e o que está pendente"
          onPress={() => router.push("/pacotes/vendas")}
        />
      </View>

      <SectionHeader label="Pacotes disponíveis" description="Gerencie nomes, valores e validade pelo painel web." />

      {isLoading ? (
        <SkeletonList count={3} variant="card" />
      ) : isError ? (
        <ErrorView error={error} onRetry={refetch} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon="gift"
          title="Nenhum pacote criado"
          description="Crie pacotes de serviços com desconto no painel web em glowupi.com."
        />
      ) : (
        <View style={styles.card}>
          {data.map((p) => (
            <ListRow
              key={p.id}
              icon="gift"
              label={p.nome}
              description={p.descricao || (p.validadeDias ? `${p.validadeDias} dias de validade` : undefined)}
              badge={p.ativo === false ? "Inativo" : "Ativo"}
              badgeTone={p.ativo === false ? "default" : "success"}
              rightLabel={formatBRL(p.valor)}
            />
          ))}
        </View>
      )}
    </ScreenContainer>
  );
}

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
    card: { backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.surfaceBorder, overflow: "hidden", marginBottom: 8 },
  });
