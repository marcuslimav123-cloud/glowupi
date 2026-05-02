import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import { EmptyState } from "@/components/EmptyState";
import { ErrorView } from "@/components/ErrorView";
import { SkeletonList } from "@/components/Skeleton";

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

interface Agendamento {
  id: number;
  clienteNome: string;
  clienteTelefone?: string;
  profissionalNome?: string;
  servicoNome?: string;
  data: string;
  horaInicio: string;
  horaFim?: string;
  status: string;
  pago?: boolean;
  valorTotal?: number;
}

function formatDateBR(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${yyyy}-${mm}-${dd}`;
}

function shortDateLabel(d: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Amanhã";
  if (diff === -1) return "Ontem";
  return d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
}

function statusColor(status: string): string {
  switch (status) {
    case "confirmado": return Colors.success;
    case "pendente": return Colors.warning;
    case "cancelado": return Colors.error;
    case "concluido": return Colors.info;
    default: return Colors.textMuted;
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "confirmado": return "Confirmado";
    case "pendente": return "Pendente";
    case "cancelado": return "Cancelado";
    case "concluido": return "Concluído";
    case "recusado": return "Recusado";
    default: return status;
  }
}

export default function AgendaScreen() {
  const insets = useSafeAreaInsets();
  const { barbeariaId, token } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [refreshing, setRefreshing] = useState(false);

  const dateStr = useMemo(() => formatDateBR(selectedDate), [selectedDate]);

  const days = useMemo(() => {
    const arr: Date[] = [];
    for (let i = -1; i <= 6; i++) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, []);

  const { data: agendamentos = [], isLoading, isError, error, refetch } = useQuery<Agendamento[]>({
    queryKey: ["agendamentos", barbeariaId, dateStr],
    queryFn: async () => {
      if (!barbeariaId || !token) return [];
      const res = await fetch(
        `${API_BASE}/api/barbearias/${barbeariaId}/agendamentos?data=${dateStr}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error("Erro ao carregar agenda");
      const data = await res.json();
      return Array.isArray(data) ? data : (data.agendamentos ?? []);
    },
    enabled: !!barbeariaId && !!token,
  });

  const confirmarMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${API_BASE}/api/barbearias/${barbeariaId}/agendamentos/${id}/confirmar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Falha ao confirmar");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agendamentos"] });
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const cancelarMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${API_BASE}/api/barbearias/${barbeariaId}/agendamentos/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Falha ao cancelar");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agendamentos"] });
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const askCancel = (a: Agendamento) => {
    Alert.alert(
      "Cancelar agendamento",
      `Deseja cancelar o agendamento de ${a.clienteNome}?`,
      [
        { text: "Voltar", style: "cancel" },
        { text: "Cancelar", style: "destructive", onPress: () => cancelarMutation.mutate(a.id) },
      ]
    );
  };

  const sortedAgendamentos = useMemo(
    () => [...agendamentos].sort((a, b) => (a.horaInicio || "").localeCompare(b.horaInicio || "")),
    [agendamentos]
  );

  const webTopPadding = Platform.OS === "web" ? 67 : 0;

  return (
    <View style={[styles.container, { paddingTop: webTopPadding }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Agenda</Text>
        <Text style={styles.subtitle}>{shortDateLabel(selectedDate)}</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.daysScroll}
        contentContainerStyle={styles.daysContent}
      >
        {days.map((d) => {
          const isSel = formatDateBR(d) === dateStr;
          return (
            <TouchableOpacity
              key={d.toISOString()}
              style={[styles.dayChip, isSel && styles.dayChipActive]}
              onPress={() => {
                if (Platform.OS !== "web") Haptics.selectionAsync();
                setSelectedDate(d);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Selecionar ${d.toLocaleDateString("pt-BR")}`}
            >
              <Text style={[styles.dayWeek, isSel && styles.dayTextActive]}>
                {d.toLocaleDateString("pt-BR", { weekday: "short" }).slice(0, 3)}
              </Text>
              <Text style={[styles.dayNumber, isSel && styles.dayTextActive]}>
                {d.getDate()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        style={styles.list}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Platform.OS === "web" ? 118 : 100 + insets.bottom },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
        }
      >
        {isLoading ? (
          <SkeletonList count={4} variant="card" />
        ) : isError ? (
          <ErrorView
            title="Não foi possível carregar a agenda"
            description="Verifique sua conexão e tente novamente."
            error={error}
            onRetry={() => refetch()}
          />
        ) : sortedAgendamentos.length === 0 ? (
          <EmptyState
            icon="calendar"
            title="Nenhum agendamento"
            description={`Você não tem atendimentos para ${shortDateLabel(selectedDate).toLowerCase()}.`}
          />
        ) : (
          sortedAgendamentos.map((a) => (
            <View key={a.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.timeBlock}>
                  <Text style={styles.timeText}>{a.horaInicio?.slice(0, 5) ?? "--:--"}</Text>
                  {a.horaFim && <Text style={styles.timeUntil}>até {a.horaFim.slice(0, 5)}</Text>}
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusColor(a.status) + "20" }]}>
                  <View style={[styles.statusDot, { backgroundColor: statusColor(a.status) }]} />
                  <Text style={[styles.statusText, { color: statusColor(a.status) }]}>
                    {statusLabel(a.status)}
                  </Text>
                </View>
              </View>
              <Text style={styles.clientName}>{a.clienteNome}</Text>
              {a.servicoNome && (
                <Text style={styles.serviceLine}>
                  <Feather name="scissors" size={12} color={Colors.textSecondary} /> {a.servicoNome}
                </Text>
              )}
              {a.profissionalNome && (
                <Text style={styles.profLine}>
                  <Feather name="user" size={12} color={Colors.textSecondary} /> {a.profissionalNome}
                </Text>
              )}
              <View style={styles.actions}>
                {a.status === "pendente" && (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.confirmBtn]}
                    onPress={() => confirmarMutation.mutate(a.id)}
                    disabled={confirmarMutation.isPending}
                    accessibilityRole="button"
                    accessibilityLabel="Confirmar agendamento"
                  >
                    <Feather name="check" size={14} color={Colors.success} />
                    <Text style={[styles.actionText, { color: Colors.success }]}>Confirmar</Text>
                  </TouchableOpacity>
                )}
                {a.status !== "cancelado" && a.status !== "concluido" && (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.cancelBtn]}
                    onPress={() => askCancel(a)}
                    disabled={cancelarMutation.isPending}
                    accessibilityRole="button"
                    accessibilityLabel="Cancelar agendamento"
                  >
                    <Feather name="x" size={14} color={Colors.error} />
                    <Text style={[styles.actionText, { color: Colors.error }]}>Cancelar</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 26, fontFamily: "Inter_700Bold", color: Colors.text },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2 },
  daysScroll: { maxHeight: 76, marginTop: 8 },
  daysContent: { paddingHorizontal: 16, gap: 8 },
  dayChip: {
    width: 56,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: "center",
  },
  dayChipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  dayWeek: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.textSecondary, textTransform: "capitalize" as const },
  dayNumber: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text, marginTop: 2 },
  dayTextActive: { color: "#000" },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingTop: 12 },
  center: { paddingVertical: 60, alignItems: "center" },
  empty: { paddingVertical: 60, alignItems: "center", paddingHorizontal: 32 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.text, marginTop: 16, marginBottom: 4 },
  emptySubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary, textAlign: "center" },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  timeBlock: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  timeText: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text },
  timeUntil: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  clientName: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.text, marginBottom: 4 },
  serviceLine: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginBottom: 2 },
  profLine: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  actions: { flexDirection: "row", gap: 8, marginTop: 12 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  confirmBtn: { borderColor: Colors.success + "60", backgroundColor: Colors.success + "10" },
  cancelBtn: { borderColor: Colors.error + "60", backgroundColor: Colors.error + "10" },
  actionText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
