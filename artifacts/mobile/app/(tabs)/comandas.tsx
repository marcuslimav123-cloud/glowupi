import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

interface Comanda {
  id: number;
  numero?: number | string;
  clienteNome?: string;
  data?: string;
  dataAbertura?: string;
  dataFechamento?: string;
  status?: string;
  valorTotal?: number;
  total?: number;
  pago?: boolean;
}

interface Agendamento {
  id: number;
  clienteNome: string;
  servicoNome?: string;
  profissionalNome?: string;
  horaInicio: string;
  data: string;
  status: string;
  pago?: boolean;
  valorTotal?: number;
}

type Tab = "abertas" | "fechadas";

function formatBRL(v: number | undefined): string {
  return `R$ ${(v ?? 0).toFixed(2).replace(".", ",")}`;
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function ComandasScreen() {
  const insets = useSafeAreaInsets();
  const { barbeariaId, token } = useAuth();
  const [tab, setTab] = useState<Tab>("abertas");
  const [refreshing, setRefreshing] = useState(false);

  const abertasQuery = useQuery<Agendamento[]>({
    queryKey: ["comandas-abertas", barbeariaId],
    queryFn: async () => {
      if (!barbeariaId || !token) return [];
      const today = todayISO();
      const res = await fetch(
        `${API_BASE}/api/barbearias/${barbeariaId}/agendamentos?data=${today}&status=confirmado`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error("Erro ao carregar comandas abertas");
      const data = await res.json();
      const list: Agendamento[] = Array.isArray(data) ? data : (data.agendamentos ?? []);
      return list.filter((a) => !a.pago);
    },
    enabled: !!barbeariaId && !!token && tab === "abertas",
  });

  const fechadasQuery = useQuery<Comanda[]>({
    queryKey: ["comandas-fechadas", barbeariaId],
    queryFn: async () => {
      if (!barbeariaId || !token) return [];
      const now = new Date();
      const mes = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const res = await fetch(
        `${API_BASE}/api/barbearias/${barbeariaId}/comandas?mes=${mes}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error("Erro ao carregar comandas fechadas");
      const data = await res.json();
      const list: Comanda[] = Array.isArray(data) ? data : (data.comandas ?? data.items ?? []);
      return list;
    },
    enabled: !!barbeariaId && !!token && tab === "fechadas",
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (tab === "abertas") await abertasQuery.refetch();
    else await fechadasQuery.refetch();
    setRefreshing(false);
  }, [tab, abertasQuery, fechadasQuery]);

  const totalDoMes = useMemo(() => {
    const list = fechadasQuery.data ?? [];
    return list.reduce((s, c) => s + (c.valorTotal ?? c.total ?? 0), 0);
  }, [fechadasQuery.data]);

  const webTopPadding = Platform.OS === "web" ? 67 : 0;
  const isLoading = tab === "abertas" ? abertasQuery.isLoading : fechadasQuery.isLoading;
  const abertas = abertasQuery.data ?? [];
  const fechadas = fechadasQuery.data ?? [];

  return (
    <View style={[styles.container, { paddingTop: webTopPadding }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Comandas</Text>
        <Text style={styles.subtitle}>
          {tab === "abertas" ? "Atendimentos em aberto hoje" : "Histórico do mês"}
        </Text>
      </View>

      <View style={styles.tabs}>
        {(["abertas", "fechadas"] as Tab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
            onPress={() => {
              if (Platform.OS !== "web") Haptics.selectionAsync();
              setTab(t);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: tab === t }}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === "abertas" ? "Abertas" : "Fechadas"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === "fechadas" && fechadas.length > 0 && (
        <View style={styles.summary}>
          <Text style={styles.summaryLabel}>Total do mês</Text>
          <Text style={styles.summaryValue}>{formatBRL(totalDoMes)}</Text>
        </View>
      )}

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
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.accent} />
          </View>
        ) : tab === "abertas" ? (
          abertas.length === 0 ? (
            <EmptyState icon="file-text" title="Sem comandas abertas" subtitle="Confirme um agendamento para abrir uma comanda." />
          ) : (
            abertas.map((a) => (
              <View key={a.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.timeBadge}>
                    <Feather name="clock" size={12} color={Colors.accent} />
                    <Text style={styles.timeText}>{a.horaInicio?.slice(0, 5)}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: Colors.warning + "20" }]}>
                    <Text style={[styles.statusText, { color: Colors.warning }]}>Aberta</Text>
                  </View>
                </View>
                <Text style={styles.clientName}>{a.clienteNome}</Text>
                {a.servicoNome && (
                  <Text style={styles.line}>
                    <Feather name="scissors" size={12} color={Colors.textSecondary} /> {a.servicoNome}
                  </Text>
                )}
                {a.profissionalNome && (
                  <Text style={styles.line}>
                    <Feather name="user" size={12} color={Colors.textSecondary} /> {a.profissionalNome}
                  </Text>
                )}
                {typeof a.valorTotal === "number" && (
                  <Text style={styles.value}>{formatBRL(a.valorTotal)}</Text>
                )}
              </View>
            ))
          )
        ) : (
          fechadas.length === 0 ? (
            <EmptyState icon="archive" title="Sem comandas fechadas" subtitle="As comandas finalizadas no mês aparecerão aqui." />
          ) : (
            fechadas.map((c) => (
              <View key={c.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.numero}>#{c.numero ?? c.id}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: Colors.success + "20" }]}>
                    <Text style={[styles.statusText, { color: Colors.success }]}>Fechada</Text>
                  </View>
                </View>
                <Text style={styles.clientName}>{c.clienteNome ?? "Sem cliente"}</Text>
                {(c.dataFechamento || c.data) && (
                  <Text style={styles.line}>
                    <Feather name="calendar" size={12} color={Colors.textSecondary} />{" "}
                    {new Date(c.dataFechamento ?? c.data!).toLocaleDateString("pt-BR")}
                  </Text>
                )}
                <Text style={styles.value}>{formatBRL(c.valorTotal ?? c.total)}</Text>
              </View>
            ))
          )
        )}
      </ScrollView>
    </View>
  );
}

function EmptyState({ icon, title, subtitle }: { icon: keyof typeof Feather.glyphMap; title: string; subtitle: string }) {
  return (
    <View style={styles.empty}>
      <Feather name={icon} size={48} color={Colors.textMuted} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySubtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 26, fontFamily: "Inter_700Bold", color: Colors.text },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2 },
  tabs: { flexDirection: "row", paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: "center",
  },
  tabBtnActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  tabText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary },
  tabTextActive: { color: "#000" },
  summary: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  summaryValue: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.success },
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
  timeBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.accent + "20", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  timeText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.accent },
  numero: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  clientName: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.text, marginBottom: 4 },
  line: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginBottom: 2 },
  value: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.success, marginTop: 8 },
});
