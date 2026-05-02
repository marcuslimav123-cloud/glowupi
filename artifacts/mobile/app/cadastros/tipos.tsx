import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useColors, type ColorPalette } from "@/lib/theme";
import { ScreenContainer } from "@/components/ScreenContainer";
import { ListRow } from "@/components/ListRow";
import { EmptyState } from "@/components/EmptyState";
import { ErrorView } from "@/components/ErrorView";
import { SkeletonList } from "@/components/Skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { fetchJson } from "@/lib/api";

type Tipo = {
  id: number;
  nome: string;
  categoria: string;
  ativo?: boolean;
  descricao?: string | null;
};

type CategoriaInfo = { key: string; label: string; icon: keyof typeof Feather.glyphMap };

const CATEGORIAS: CategoriaInfo[] = [
  { key: "tipo_receita", label: "Receitas", icon: "trending-up" },
  { key: "tipo_despesa", label: "Despesas", icon: "trending-down" },
  { key: "forma_pagamento", label: "Formas de pagamento", icon: "credit-card" },
  { key: "bandeira", label: "Bandeiras", icon: "credit-card" },
  { key: "categoria_servico", label: "Categorias de serviço", icon: "scissors" },
  { key: "categoria_produto", label: "Categorias de produto", icon: "package" },
  { key: "categoria_profissional", label: "Categorias de profissional", icon: "users" },
  { key: "subconta", label: "Subcontas", icon: "layers" },
  { key: "equipamento", label: "Equipamentos", icon: "tool" },
  { key: "fornecedor", label: "Fornecedores", icon: "truck" },
  { key: "anamnese", label: "Anamnese", icon: "clipboard" },
  { key: "remuneracao", label: "Remunerações", icon: "dollar-sign" },
  { key: "deducao", label: "Deduções", icon: "minus-circle" },
];

export default function TiposScreen() {
  const { barbeariaId } = useAuth();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [tab, setTab] = useState<string>(CATEGORIAS[0].key);

  const { data, isLoading, isError, refetch, isRefetching, error } = useQuery<Tipo[]>({
    queryKey: ["tipos-financeiro", barbeariaId],
    queryFn: async () => {
      if (!barbeariaId) return [];
      const raw = await fetchJson<unknown>(`/barbearias/${barbeariaId}/tipos`);
      return Array.isArray(raw) ? (raw as Tipo[]) : [];
    },
    enabled: !!barbeariaId,
  });

  const filtrados = (data || []).filter((t) => t.categoria === tab);
  const catAtual = CATEGORIAS.find((c) => c.key === tab) || CATEGORIAS[0];

  return (
    <ScreenContainer
      title="Tipos"
      subtitle="Catálogo de categorias e classificações"
      refreshing={isRefetching}
      onRefresh={refetch}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsRow}
      >
        {CATEGORIAS.map((c) => {
          const active = c.key === tab;
          return (
            <Pressable
              key={c.key}
              onPress={() => setTab(c.key)}
              style={[styles.tab, active && styles.tabActive]}
            >
              <Feather
                name={c.icon}
                size={14}
                color={active ? colors.invertedText : colors.textSecondary}
              />
              <Text style={[styles.tabText, active && { color: colors.invertedText }]}>
                {c.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {isLoading ? (
        <SkeletonList count={4} variant="row" />
      ) : isError ? (
        <ErrorView error={error} onRetry={refetch} />
      ) : filtrados.length === 0 ? (
        <EmptyState
          icon={catAtual.icon}
          title={`Sem ${catAtual.label.toLowerCase()}`}
          description="Cadastre estes tipos pelo painel web em glowupi.com."
        />
      ) : (
        <View style={styles.card}>
          {filtrados.map((t) => (
            <ListRow
              key={t.id}
              icon={catAtual.icon}
              label={t.nome}
              description={t.descricao || undefined}
              badge={t.ativo === false ? "Inativo" : "Ativo"}
              badgeTone={t.ativo === false ? "default" : "success"}
            />
          ))}
        </View>
      )}

      <Text style={styles.hint}>
        Para criar e editar tipos, acesse o painel web em glowupi.com.
      </Text>
    </ScreenContainer>
  );
}

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
    tabsRow: { gap: 6, paddingBottom: 12, paddingRight: 8 },
    tab: {
      flexDirection: "row", alignItems: "center", gap: 6,
      paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
      backgroundColor: c.surface, borderWidth: 1, borderColor: c.surfaceBorder,
    },
    tabActive: { backgroundColor: c.accent, borderColor: c.accent },
    tabText: { color: c.textSecondary, fontFamily: "Inter_600SemiBold", fontSize: 12 },
    card: { backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.surfaceBorder, overflow: "hidden" },
    hint: { color: c.textMuted, fontFamily: "Inter_500Medium", fontSize: 11, textAlign: "center", marginTop: 16 },
  });
