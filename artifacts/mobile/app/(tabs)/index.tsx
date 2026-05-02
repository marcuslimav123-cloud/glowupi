import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Platform,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useColors, type ColorPalette } from "@/lib/theme";
import { useAuth } from "@/contexts/AuthContext";

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

interface DashboardTopServico {
  servicoId: number;
  nome: string;
  quantidade: number;
  valor: number;
  percentual: number;
}

interface DashboardAlerta {
  tipo: string;
  mensagem: string;
  nivel: "warning" | "info";
}

interface DashboardData {
  isColaboradorView?: boolean;
  totalAgendamentosHoje?: number;
  confirmados?: number;
  pagos?: number;
  meusAgendamentosHoje?: unknown[];
  faturamentoTotal?: number;
  totalAgendamentos?: number;
  totalClientes?: number;
  clientesNovos?: number;
  ticketMedio?: number;
  taxaOcupacao?: number;
  topServicos?: DashboardTopServico[];
  alertas?: DashboardAlerta[];
}

function MetricCard({
  icon,
  label,
  value,
  color,
  styles,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  color: string;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricIconContainer, { backgroundColor: color + "20" }]}>
        <Feather name={icon} size={20} color={color} />
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function AlertItem({ mensagem, nivel, colors, styles }: { mensagem: string; nivel: "warning" | "info"; colors: ColorPalette; styles: ReturnType<typeof makeStyles> }) {
  const color = nivel === "warning" ? colors.warning : colors.info;
  const icon: keyof typeof Feather.glyphMap = nivel === "warning" ? "alert-triangle" : "info";
  return (
    <View style={styles.alertItem}>
      <Feather name={icon} size={16} color={color} />
      <Text style={styles.alertText} numberOfLines={2}>
        {mensagem}
      </Text>
    </View>
  );
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { barbeariaId, barbearia, user, token } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const { data: dashboard, isLoading, refetch } = useQuery<DashboardData | null>({
    queryKey: ["dashboard", barbeariaId],
    queryFn: async () => {
      if (!barbeariaId || !token) return null;
      const res = await fetch(
        `${API_BASE}/api/barbearias/${barbeariaId}/dashboard?periodo=hoje`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error("Erro ao carregar dashboard");
      return res.json() as Promise<DashboardData>;
    },
    enabled: !!barbeariaId && !!token,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const webTopPadding = Platform.OS === "web" ? 67 : 0;

  if (!barbeariaId) {
    return (
      <View style={[styles.container, styles.center]}>
        <Feather name="alert-circle" size={48} color={colors.textMuted} />
        <Text style={styles.emptyTitle}>Nenhuma barbearia vinculada</Text>
        <Text style={styles.emptySubtitle}>
          Seu perfil ainda não está associado a uma barbearia.
        </Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const isColaborador = dashboard?.isColaboradorView;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingTop: webTopPadding + 16, paddingBottom: Platform.OS === "web" ? 118 : 100 },
      ]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.accent]} />
      }
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image source={require("@/assets/images/logo.png")} style={styles.headerLogo} resizeMode="contain" />
          <View>
            <Text style={styles.greeting}>Olá, {user?.nome?.split(" ")[0] ?? ""}</Text>
            <Text style={styles.barbeariaName}>{barbearia?.nome ?? "Minha Barbearia"}</Text>
          </View>
        </View>
        <View style={styles.todayBadge}>
          <Text style={styles.todayText}>Hoje</Text>
        </View>
      </View>

      {isColaborador ? (
        <>
          <View style={styles.metricsRow}>
            <MetricCard icon="calendar" label="Agendamentos" value={String(dashboard?.totalAgendamentosHoje ?? 0)} color={colors.info} styles={styles} />
            <MetricCard icon="check-circle" label="Confirmados" value={String(dashboard?.confirmados ?? 0)} color={colors.success} styles={styles} />
          </View>
          <View style={styles.metricsRow}>
            <MetricCard icon="dollar-sign" label="Pagos" value={String(dashboard?.pagos ?? 0)} color={colors.accent} styles={styles} />
            <View style={styles.metricCard}>
              <View style={[styles.metricIconContainer, { backgroundColor: colors.warning + "20" }]}>
                <Feather name="clock" size={20} color={colors.warning} />
              </View>
              <Text style={styles.metricValue}>
                {(dashboard?.totalAgendamentosHoje ?? 0) - (dashboard?.pagos ?? 0)}
              </Text>
              <Text style={styles.metricLabel}>Pendentes</Text>
            </View>
          </View>
        </>
      ) : (
        <>
          <View style={styles.metricsRow}>
            <MetricCard icon="dollar-sign" label="Faturamento" value={`R$ ${(dashboard?.faturamentoTotal ?? 0).toFixed(2).replace(".", ",")}`} color={colors.success} styles={styles} />
            <MetricCard icon="calendar" label="Agendamentos" value={String(dashboard?.totalAgendamentos ?? 0)} color={colors.info} styles={styles} />
          </View>
          <View style={styles.metricsRow}>
            <MetricCard icon="users" label="Clientes" value={String(dashboard?.totalClientes ?? 0)} color={colors.accent} styles={styles} />
            <MetricCard icon="user-plus" label="Novos" value={String(dashboard?.clientesNovos ?? 0)} color={colors.warning} styles={styles} />
          </View>
          <View style={styles.metricsRow}>
            <MetricCard icon="trending-up" label="Ticket Médio" value={`R$ ${(dashboard?.ticketMedio ?? 0).toFixed(2).replace(".", ",")}`} color="#8b5cf6" styles={styles} />
            <MetricCard icon="percent" label="Ocupação" value={`${(dashboard?.taxaOcupacao ?? 0).toFixed(1)}%`} color="#06b6d4" styles={styles} />
          </View>

          {(dashboard?.topServicos?.length ?? 0) > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Top Serviços</Text>
              {dashboard!.topServicos!.slice(0, 3).map((s, i) => (
                <View key={i} style={styles.serviceRow}>
                  <View style={styles.serviceInfo}>
                    <Text style={styles.serviceRank}>#{i + 1}</Text>
                    <Text style={styles.serviceName} numberOfLines={1}>{s.nome}</Text>
                  </View>
                  <Text style={styles.serviceValue}>R$ {s.valor.toFixed(2).replace(".", ",")}</Text>
                </View>
              ))}
            </View>
          )}

          {(dashboard?.alertas?.length ?? 0) > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Alertas</Text>
              {dashboard!.alertas!.map((a, i) => (
                <AlertItem key={i} mensagem={a.mensagem} nivel={a.nivel} colors={colors} styles={styles} />
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    center: { alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
    scrollContent: { paddingHorizontal: 16 },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
    headerLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
    headerLogo: { width: 44, height: 44 },
    greeting: { fontSize: 14, fontFamily: "Inter_400Regular", color: c.textSecondary, marginBottom: 4 },
    barbeariaName: { fontSize: 22, fontFamily: "Inter_700Bold", color: c.text },
    todayBadge: { backgroundColor: c.accent + "20", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
    todayText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: c.accent },
    metricsRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
    metricCard: { flex: 1, backgroundColor: c.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: c.surfaceBorder },
    metricIconContainer: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 12 },
    metricValue: { fontSize: 22, fontFamily: "Inter_700Bold", color: c.text, marginBottom: 4 },
    metricLabel: { fontSize: 12, fontFamily: "Inter_500Medium", color: c.textSecondary },
    section: { marginTop: 12, backgroundColor: c.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: c.surfaceBorder },
    sectionTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: c.text, marginBottom: 16 },
    serviceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.surfaceBorder },
    serviceInfo: { flexDirection: "row", alignItems: "center", flex: 1, gap: 10 },
    serviceRank: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: c.accent, width: 24 },
    serviceName: { fontSize: 14, fontFamily: "Inter_400Regular", color: c.text, flex: 1 },
    serviceValue: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: c.success },
    alertItem: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.surfaceBorder },
    alertText: { fontSize: 13, fontFamily: "Inter_400Regular", color: c.textSecondary, flex: 1 },
    emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: c.text, marginTop: 16, marginBottom: 8 },
    emptySubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", color: c.textSecondary, textAlign: "center" },
  });
