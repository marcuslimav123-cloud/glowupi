import React, { useMemo } from "react";
import {
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, type Href } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors, type ColorPalette } from "@/lib/theme";
import { useAuth } from "@/contexts/AuthContext";
import { fetchJson, getErrorMessage } from "@/lib/api";

interface NotificacaoItem {
  id: number;
  titulo: string;
  corpo: string;
  tipo: string;
  dados: Record<string, any> | null;
  lida: boolean;
  createdAt: string;
}

const TYPE_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  agenda: "calendar",
  agendamento: "calendar",
  new_appointment: "calendar",
  pending_appointment: "clock",
  cancelled_appointment: "x-circle",
  reminder: "bell",
  new_atendimento: "calendar",
  pending_appointments_nudge: "alert-circle",
  comanda_fechada: "file-text",
  comanda_paga: "dollar-sign",
  comissao_paga: "trending-up",
  conta_a_pagar: "credit-card",
  caixa_sangria: "minus-circle",
  caixa_vale: "user-minus",
  avaliacao_nova: "star",
  convite_aceito: "user-plus",
  assinatura_status: "alert-triangle",
};

function iconForTipo(tipo: string): keyof typeof Feather.glyphMap {
  return TYPE_ICONS[tipo] || "bell";
}

function relativeTime(iso: string): string {
  try {
    const t = new Date(iso).getTime();
    const diff = Date.now() - t;
    if (diff < 60_000) return "agora";
    const m = Math.floor(diff / 60_000);
    if (m < 60) return `${m} min atrás`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} h atrás`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d} d atrás`;
    return new Date(iso).toLocaleDateString("pt-BR");
  } catch {
    return "";
  }
}

function deeplinkForTipo(tipo: string, dados: Record<string, any> | null): Href | null {
  const url = dados?.url as string | undefined;
  if (url && typeof url === "string") return url as Href;
  if (tipo.includes("agend") || tipo === "reminder") return "/(tabs)/agenda";
  if (tipo.startsWith("comanda")) return "/(tabs)/comandas";
  if (tipo.startsWith("comissao")) return "/financeiro/comissoes" as Href;
  if (tipo.startsWith("conta_") || tipo.startsWith("caixa")) return "/financeiro" as Href;
  if (tipo === "convite_aceito") return "/equipe" as Href;
  if (tipo === "avaliacao_nova") return "/relatorios" as Href;
  if (tipo === "assinatura_status") return "/configuracoes/assinatura" as Href;
  return null;
}

export default function NotificacoesScreen() {
  const { barbeariaId } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const query = useQuery<NotificacaoItem[]>({
    queryKey: ["notificacoes", barbeariaId],
    enabled: !!barbeariaId,
    refetchInterval: 15_000,
    queryFn: () => fetchJson<NotificacaoItem[]>(`/barbearias/${barbeariaId}/notificacoes-internas?limit=60`),
  });

  const marcarLida = useMutation({
    mutationFn: (id: number) =>
      fetchJson(`/barbearias/${barbeariaId}/notificacoes-internas/${id}/lida`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notificacoes", barbeariaId] });
      qc.invalidateQueries({ queryKey: ["notificacoes-nao-lidas", barbeariaId] });
    },
  });

  const lerTodas = useMutation({
    mutationFn: () =>
      fetchJson(`/barbearias/${barbeariaId}/notificacoes-internas/ler-todas`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notificacoes", barbeariaId] });
      qc.invalidateQueries({ queryKey: ["notificacoes-nao-lidas", barbeariaId] });
    },
    onError: (e) => Alert.alert("Erro", getErrorMessage(e)),
  });

  const handlePress = (item: NotificacaoItem) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!item.lida) marcarLida.mutate(item.id);
    const link = deeplinkForTipo(item.tipo, item.dados);
    if (link) router.push(link);
  };

  const data = query.data || [];
  const naoLidas = data.filter(n => !n.lida).length;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn} accessibilityLabel="Voltar">
          <Feather name="chevron-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Notificações</Text>
          <Text style={styles.subtitle}>{naoLidas > 0 ? `${naoLidas} não lida${naoLidas === 1 ? "" : "s"}` : "Tudo em dia"}</Text>
        </View>
        {naoLidas > 0 && (
          <TouchableOpacity
            onPress={() => lerTodas.mutate()}
            style={styles.markAllBtn}
            disabled={lerTodas.isPending}
            accessibilityLabel="Marcar todas como lidas"
          >
            <Feather name="check-circle" size={14} color={colors.accent} />
            <Text style={styles.markAllText}>Ler todas</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={data}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24, paddingHorizontal: 16, paddingTop: 8 }}
        refreshControl={
          <RefreshControl refreshing={query.isFetching && !query.isLoading} onRefresh={() => query.refetch()} tintColor={colors.accent} />
        }
        ListEmptyComponent={
          query.isLoading ? null : (
            <View style={styles.empty}>
              <Feather name="bell-off" size={36} color={colors.textSecondary} />
              <Text style={styles.emptyTitle}>Nenhuma notificação</Text>
              <Text style={styles.emptyDesc}>Quando algo acontecer no seu estabelecimento, aparece aqui.</Text>
            </View>
          )
        }
        renderItem={({ item }) => {
          const icon = iconForTipo(item.tipo);
          return (
            <TouchableOpacity
              onPress={() => handlePress(item)}
              activeOpacity={0.8}
              style={[styles.row, !item.lida && styles.rowUnread]}
            >
              <View style={[styles.iconWrap, !item.lida && { backgroundColor: colors.accent + "22" }]}>
                <Feather name={icon} size={18} color={!item.lida ? colors.accent : colors.textSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.rowHead}>
                  <Text style={[styles.rowTitle, !item.lida && { color: colors.text }]} numberOfLines={1}>{item.titulo}</Text>
                  {!item.lida && <View style={styles.dot} />}
                </View>
                <Text style={styles.rowBody} numberOfLines={2}>{item.corpo}</Text>
                <Text style={styles.rowTime}>{relativeTime(item.createdAt)}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const makeStyles = (c: ColorPalette) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: c.surfaceBorder },
  headerBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  title: { color: c.text, fontFamily: "Inter_700Bold", fontSize: 18 },
  subtitle: { color: c.textSecondary, fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 2 },
  markAllBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: c.accent + "15" },
  markAllText: { color: c.accent, fontFamily: "Inter_700Bold", fontSize: 12 },
  row: { flexDirection: "row", gap: 12, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: c.surfaceBorder, backgroundColor: c.surface, marginTop: 8 },
  rowUnread: { borderColor: c.accent + "40", backgroundColor: c.surface },
  iconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.surfaceLight, alignItems: "center", justifyContent: "center" },
  rowHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  rowTitle: { flex: 1, color: c.textSecondary, fontFamily: "Inter_600SemiBold", fontSize: 14 },
  rowBody: { color: c.textSecondary, fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 2, lineHeight: 17 },
  rowTime: { color: c.textSecondary, fontFamily: "Inter_500Medium", fontSize: 11, marginTop: 4, opacity: 0.7 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.accent },
  empty: { alignItems: "center", paddingVertical: 60, gap: 8 },
  emptyTitle: { color: c.text, fontFamily: "Inter_600SemiBold", fontSize: 14, marginTop: 8 },
  emptyDesc: { color: c.textSecondary, fontFamily: "Inter_500Medium", fontSize: 12, textAlign: "center", paddingHorizontal: 40 },
});
