import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import { EmptyState } from "@/components/EmptyState";
import { ErrorView } from "@/components/ErrorView";
import { SkeletonList } from "@/components/Skeleton";
import { fetchJson, formatCurrency, todayStr, dateToStr } from "@/lib/api";

interface Comanda {
  id: number;
  clienteNome?: string;
  profissionalNome?: string;
  dataFechamento?: string;
  status?: string;
  valorTotal?: number;
  comissaoTotal?: number;
  pagamentos?: { metodo: string; valor: number; bandeira?: string }[];
}

interface Agendamento {
  id: number;
  clienteNome: string;
  servicoNome?: string;
  profissionalNome?: string;
  horaInicio: string;
  horaFim?: string;
  data: string;
  status: string;
  pago?: boolean;
  valor?: number | string;
  valorTotal?: number;
}

type Tab = "abertas" | "fechadas";
type Periodo = "hoje" | "semana" | "mes" | "custom";

function periodoRange(p: Periodo): { dataInicio: string; dataFim: string } {
  const today = new Date();
  const fim = todayStr();
  if (p === "hoje") return { dataInicio: fim, dataFim: fim };
  if (p === "semana") {
    const d = new Date(today); d.setDate(d.getDate() - 6);
    return { dataInicio: dateToStr(d), dataFim: fim };
  }
  // mes
  const d = new Date(today.getFullYear(), today.getMonth(), 1);
  return { dataInicio: dateToStr(d), dataFim: fim };
}

export default function ComandasScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { barbeariaId } = useAuth();
  const [tab, setTab] = useState<Tab>("abertas");
  const [refreshing, setRefreshing] = useState(false);
  const [periodo, setPeriodo] = useState<Periodo>("mes");

  const range = useMemo(() => periodoRange(periodo), [periodo]);

  const abertasQuery = useQuery<Agendamento[]>({
    queryKey: ["comandas-abertas", barbeariaId],
    queryFn: async () => {
      if (!barbeariaId) return [];
      const today = todayStr();
      const list = await fetchJson<Agendamento[]>(`/barbearias/${barbeariaId}/agendamentos?data=${today}`);
      return (Array.isArray(list) ? list : []).filter((a) => a.status === "confirmado" && !a.pago);
    },
    enabled: !!barbeariaId && tab === "abertas",
  });

  const fechadasQuery = useQuery<Comanda[]>({
    queryKey: ["comandas-fechadas", barbeariaId, range.dataInicio, range.dataFim],
    queryFn: async () => {
      if (!barbeariaId) return [];
      const list = await fetchJson<Comanda[]>(
        `/barbearias/${barbeariaId}/comandas?dataInicio=${range.dataInicio}&dataFim=${range.dataFim}`
      );
      return Array.isArray(list) ? list : [];
    },
    enabled: !!barbeariaId && tab === "fechadas",
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (tab === "abertas") await abertasQuery.refetch();
    else await fechadasQuery.refetch();
    setRefreshing(false);
  }, [tab, abertasQuery, fechadasQuery]);

  const abertas = abertasQuery.data ?? [];
  const fechadas = fechadasQuery.data ?? [];

  const totalAbertas = useMemo(
    () => abertas.reduce((s, a) => s + (typeof a.valor === "string" ? parseFloat(a.valor) : (a.valor || 0)), 0),
    [abertas]
  );
  const totalFechadas = useMemo(
    () => fechadas.reduce((s, c) => s + (Number(c.valorTotal) || 0), 0),
    [fechadas]
  );
  const totalComissoes = useMemo(
    () => fechadas.reduce((s, c) => s + (Number(c.comissaoTotal) || 0), 0),
    [fechadas]
  );

  const webTopPadding = Platform.OS === "web" ? 67 : 0;
  const isLoading = tab === "abertas" ? abertasQuery.isLoading : fechadasQuery.isLoading;
  const isError = tab === "abertas" ? abertasQuery.isError : fechadasQuery.isError;
  const queryError = tab === "abertas" ? abertasQuery.error : fechadasQuery.error;
  const retry = () => {
    if (tab === "abertas") abertasQuery.refetch();
    else fechadasQuery.refetch();
  };

  const goAberta = (a: Agendamento) => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    router.push({ pathname: "/comandas/[id]", params: { id: String(a.id), tipo: "aberta" } });
  };
  const goFechada = (c: Comanda) => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    router.push({ pathname: "/comandas/[id]", params: { id: String(c.id), tipo: "fechada" } });
  };

  return (
    <View style={[styles.container, { paddingTop: webTopPadding }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Comandas</Text>
        <Text style={styles.subtitle}>
          {tab === "abertas" ? "Atendimentos em aberto hoje" : "Histórico de comandas fechadas"}
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
              {t === "abertas" ? `Abertas${abertas.length > 0 ? ` (${abertas.length})` : ""}` : "Fechadas"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === "abertas" && abertas.length > 0 && (
        <View style={styles.summary}>
          <View>
            <Text style={styles.summaryLabel}>Pendente hoje</Text>
            <Text style={styles.summarySub}>{abertas.length} comanda{abertas.length !== 1 ? "s" : ""}</Text>
          </View>
          <Text style={[styles.summaryValue, { color: Colors.warning }]}>{formatCurrency(totalAbertas)}</Text>
        </View>
      )}

      {tab === "fechadas" && (
        <View style={styles.periodoRow}>
          {(["hoje", "semana", "mes"] as Periodo[]).map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.chip, periodo === p && styles.chipActive]}
              onPress={() => {
                if (Platform.OS !== "web") Haptics.selectionAsync();
                setPeriodo(p);
              }}
            >
              <Text style={[styles.chipText, periodo === p && styles.chipTextActive]}>
                {p === "hoje" ? "Hoje" : p === "semana" ? "7 dias" : "Mês"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {tab === "fechadas" && fechadas.length > 0 && (
        <View style={styles.summaryCards}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabelSm}>Faturamento</Text>
            <Text style={[styles.summaryValueSm, { color: Colors.success }]}>{formatCurrency(totalFechadas)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabelSm}>Comandas</Text>
            <Text style={styles.summaryValueSm}>{fechadas.length}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabelSm}>Comissões</Text>
            <Text style={[styles.summaryValueSm, { color: Colors.accent }]}>{formatCurrency(totalComissoes)}</Text>
          </View>
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
          <SkeletonList count={4} variant="card" />
        ) : isError ? (
          <ErrorView
            title={tab === "abertas" ? "Não foi possível carregar as comandas abertas" : "Não foi possível carregar o histórico"}
            description="Verifique sua conexão e tente novamente."
            error={queryError}
            onRetry={retry}
          />
        ) : tab === "abertas" ? (
          abertas.length === 0 ? (
            <EmptyState
              icon="file-text"
              title="Sem comandas abertas"
              description="Confirme um agendamento na Agenda para abrir uma comanda."
            />
          ) : (
            abertas.map((a) => (
              <TouchableOpacity key={a.id} style={styles.card} onPress={() => goAberta(a)} activeOpacity={0.85}>
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
                  <View style={styles.lineRow}>
                    <Feather name="scissors" size={12} color={Colors.textSecondary} />
                    <Text style={styles.line}>{a.servicoNome}</Text>
                  </View>
                )}
                {a.profissionalNome && (
                  <View style={styles.lineRow}>
                    <Feather name="user" size={12} color={Colors.textSecondary} />
                    <Text style={styles.line}>{a.profissionalNome}</Text>
                  </View>
                )}
                <View style={styles.cardFooter}>
                  <Text style={styles.value}>{formatCurrency(typeof a.valor === "string" ? parseFloat(a.valor) : (a.valor || 0))}</Text>
                  <View style={styles.cta}>
                    <Feather name="dollar-sign" size={12} color="#000" />
                    <Text style={styles.ctaText}>Finalizar</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )
        ) : (
          fechadas.length === 0 ? (
            <EmptyState
              icon="archive"
              title="Sem comandas fechadas"
              description="As comandas finalizadas aparecerão aqui."
            />
          ) : (
            fechadas.map((c) => (
              <TouchableOpacity key={c.id} style={styles.card} onPress={() => goFechada(c)} activeOpacity={0.85}>
                <View style={styles.cardHeader}>
                  <Text style={styles.numero}>#{c.id}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: Colors.success + "20" }]}>
                    <Text style={[styles.statusText, { color: Colors.success }]}>Paga</Text>
                  </View>
                </View>
                <Text style={styles.clientName}>{c.clienteNome ?? "Sem cliente"}</Text>
                {c.profissionalNome && (
                  <View style={styles.lineRow}>
                    <Feather name="user" size={12} color={Colors.textSecondary} />
                    <Text style={styles.line}>{c.profissionalNome}</Text>
                  </View>
                )}
                {c.dataFechamento && (
                  <View style={styles.lineRow}>
                    <Feather name="calendar" size={12} color={Colors.textSecondary} />
                    <Text style={styles.line}>
                      {new Date(c.dataFechamento).toLocaleDateString("pt-BR")} •{" "}
                      {new Date(c.dataFechamento).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </Text>
                  </View>
                )}
                <View style={styles.cardFooter}>
                  <Text style={[styles.value, { color: Colors.success }]}>{formatCurrency(c.valorTotal)}</Text>
                  {c.pagamentos && c.pagamentos.length > 0 && (
                    <View style={styles.pagsRow}>
                      {c.pagamentos.slice(0, 3).map((p, i) => (
                        <View key={i} style={styles.pagBadge}>
                          <Text style={styles.pagBadgeText}>{p.metodo}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))
          )
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
  tabs: { flexDirection: "row", paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  tabBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder, alignItems: "center",
  },
  tabBtnActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  tabText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary },
  tabTextActive: { color: "#000" },
  periodoRow: { flexDirection: "row", paddingHorizontal: 16, paddingTop: 12, gap: 6 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  chipActive: { backgroundColor: Colors.accent + "30", borderColor: Colors.accent },
  chipText: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  chipTextActive: { color: Colors.accent, fontFamily: "Inter_600SemiBold" },
  summary: {
    marginHorizontal: 16, marginTop: 12, padding: 14, borderRadius: 14,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  summaryLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  summarySub: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginTop: 2 },
  summaryValue: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.success },
  summaryCards: { flexDirection: "row", paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  summaryCard: {
    flex: 1, padding: 12, borderRadius: 12,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  summaryLabelSm: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginBottom: 4 },
  summaryValueSm: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.text },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingTop: 12 },
  card: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  timeBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.accent + "20", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  timeText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.accent },
  numero: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  clientName: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.text, marginBottom: 6 },
  lineRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 3 },
  line: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  cardFooter: {
    marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.surfaceBorder,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  value: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.accent },
  cta: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.accent, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 9 },
  ctaText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#000" },
  pagsRow: { flexDirection: "row", gap: 4 },
  pagBadge: { backgroundColor: Colors.surfaceLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  pagBadgeText: { fontSize: 10, fontFamily: "Inter_500Medium", color: Colors.textSecondary, textTransform: "capitalize" },
});
