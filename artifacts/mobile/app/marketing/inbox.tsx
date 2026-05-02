import React, { useCallback, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import { ScreenContainer } from "@/components/ScreenContainer";
import { EmptyState } from "@/components/EmptyState";
import { ErrorView } from "@/components/ErrorView";
import { SkeletonList } from "@/components/Skeleton";
import { fetchJson } from "@/lib/api";

interface Mensagem {
  id: number;
  tipo: string;
  titulo: string;
  conteudo: string;
  destinatarios: unknown[];
  status: string;
  dataEnvio: string | null;
  createdAt: string;
}

const STATUS_COLOR: Record<string, string> = {
  rascunho: Colors.textMuted,
  enviada: Colors.success,
  agendada: Colors.info,
  falha: Colors.error,
};

export default function InboxScreen() {
  const { barbeariaId } = useAuth();
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data: msgs = [], isLoading, isError, error, refetch } = useQuery<Mensagem[]>({
    queryKey: ["mensagens", barbeariaId],
    queryFn: () => fetchJson(`/barbearias/${barbeariaId}/mensagens`),
    enabled: !!barbeariaId,
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) =>
      fetchJson(`/barbearias/${barbeariaId}/mensagens/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mensagens"] }),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const onDelete = (m: Mensagem) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (Platform.OS === "web") {
      if (window.confirm(`Excluir "${m.titulo}"?`)) deleteMut.mutate(m.id);
    } else {
      Alert.alert("Excluir mensagem", `Excluir "${m.titulo}"?`, [
        { text: "Cancelar", style: "cancel" },
        { text: "Excluir", style: "destructive", onPress: () => deleteMut.mutate(m.id) },
      ]);
    }
  };

  return (
    <ScreenContainer
      title="Inbox de mensagens"
      subtitle={`${msgs.length} mensagem(ns)`}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {isLoading ? (
        <SkeletonList count={4} variant="card" />
      ) : isError ? (
        <ErrorView error={error} onRetry={() => refetch()} />
      ) : msgs.length === 0 ? (
        <EmptyState
          icon="message-square"
          title="Nenhuma mensagem"
          description="As mensagens enviadas a clientes aparecerão aqui."
        />
      ) : (
        msgs
          .slice()
          .sort((a, b) => (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
          .map((m) => (
            <View key={m.id} style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.tipo}>{m.tipo.toUpperCase()}</Text>
                <View style={[styles.pill, { backgroundColor: (STATUS_COLOR[m.status] || Colors.textMuted) + "22" }]}>
                  <Text style={[styles.pillText, { color: STATUS_COLOR[m.status] || Colors.textMuted }]}>
                    {m.status.toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={styles.titulo} numberOfLines={1}>{m.titulo}</Text>
              <Text style={styles.conteudo} numberOfLines={3}>{m.conteudo}</Text>
              <View style={styles.footer}>
                <Text style={styles.meta}>
                  {Array.isArray(m.destinatarios) ? m.destinatarios.length : 0} destinatário(s)
                  {m.dataEnvio ? ` • ${new Date(m.dataEnvio).toLocaleDateString("pt-BR")}` : ""}
                </Text>
                <TouchableOpacity onPress={() => onDelete(m)} accessibilityLabel="Excluir">
                  {deleteMut.isPending && deleteMut.variables === m.id ? (
                    <ActivityIndicator size="small" color={Colors.error} />
                  ) : (
                    <Feather name="trash-2" size={16} color={Colors.error} />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ))
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface, borderRadius: 14, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  tipo: { fontSize: 10, fontFamily: "Inter_700Bold", color: Colors.accent, letterSpacing: 0.8 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  pillText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  titulo: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.text, marginBottom: 4 },
  conteudo: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary, lineHeight: 18 },
  footer: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginTop: 10, borderTopWidth: 1, borderTopColor: Colors.surfaceBorder, paddingTop: 8,
  },
  meta: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted },
});
