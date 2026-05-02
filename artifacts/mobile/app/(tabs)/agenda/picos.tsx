import React, { useMemo } from "react";
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import { fetchJson, dateToStr } from "@/lib/api";

const HORAS = Array.from({ length: 13 }, (_, i) => `${(i + 8).toString().padStart(2, "0")}:00`);
const DIAS_SEMANA = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
const DIA_LABEL = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const DIA_NOME: Record<string, string> = {
  segunda: "Segunda", terca: "Terça", quarta: "Quarta", quinta: "Quinta",
  sexta: "Sexta", sabado: "Sábado", domingo: "Domingo",
};

function heatColor(pct: number): { bg: string; text: string } {
  if (pct === 0) return { bg: Colors.surface, text: Colors.textMuted };
  if (pct < 20) return { bg: "#3b82f61a", text: "#93c5fd" };
  if (pct < 40) return { bg: "#3b82f633", text: "#bfdbfe" };
  if (pct < 60) return { bg: "#facc1533", text: "#fde68a" };
  if (pct < 80) return { bg: "#fb923c4d", text: "#fed7aa" };
  return { bg: "#ef44444d", text: "#fecaca" };
}

export default function PicosScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { barbeariaId } = useAuth();

  const days = 30;
  const allDays = useMemo(() => {
    const arr: string[] = [];
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      arr.push(dateToStr(d));
    }
    return arr;
  }, [days]);

  const dataInicio = allDays[0];
  const dataFim = allDays[allDays.length - 1];

  const { data: agendamentos = [], isLoading } = useQuery<any[]>({
    queryKey: ["agendamentos-picos", barbeariaId, dataInicio, dataFim],
    queryFn: async () => {
      if (!barbeariaId) return [];
      const data = await fetchJson<any[]>(
        `/barbearias/${barbeariaId}/agendamentos?dataInicio=${dataInicio}&dataFim=${dataFim}`,
      );
      return Array.isArray(data) ? data : [];
    },
    enabled: !!barbeariaId,
  });

  const heatmap = useMemo(() => {
    const map: Record<string, Record<string, { total: number; ocupados: number }>> = {};
    for (const dia of DIAS_SEMANA) {
      map[dia] = {};
      for (const hora of HORAS) map[dia][hora] = { total: 0, ocupados: 0 };
    }
    for (const data of allDays) {
      const diaSemana = DIAS_SEMANA[new Date(data + "T12:00:00").getDay()];
      for (const hora of HORAS) map[diaSemana][hora].total++;
    }
    for (const a of agendamentos) {
      if (!allDays.includes(a.data)) continue;
      if (a.status === "cancelado" || a.status === "recusado") continue;
      const diaSemana = DIAS_SEMANA[new Date(a.data + "T12:00:00").getDay()];
      const hora = String(a.horaInicio || "").slice(0, 2) + ":00";
      if (map[diaSemana]?.[hora]) map[diaSemana][hora].ocupados++;
    }
    return map;
  }, [agendamentos, allDays]);

  const insights = useMemo(() => {
    let maxPct = 0; let maxDia = ""; let maxHora = "";
    let minPct = 101; let minDia = ""; let minHora = "";
    for (const dia of DIAS_SEMANA) {
      for (const hora of HORAS) {
        const { total, ocupados } = heatmap[dia][hora];
        if (total === 0) continue;
        const pct = (ocupados / total) * 100;
        if (pct > maxPct) { maxPct = pct; maxDia = dia; maxHora = hora; }
        if (pct < minPct) { minPct = pct; minDia = dia; minHora = hora; }
      }
    }
    return { maxPct, maxDia, maxHora, minPct, minDia, minHora };
  }, [heatmap]);

  const webTopPad = Platform.OS === "web" ? 67 : insets.top + 8;

  return (
    <View style={[styles.container, { paddingTop: webTopPad }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Horários de pico</Text>
          <Text style={styles.subtitle}>Ocupação por dia e hora — últimos {days} dias</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 + insets.bottom }}>
        {isLoading ? (
          <View style={{ paddingTop: 60, alignItems: "center" }}>
            <ActivityIndicator color={Colors.accent} />
          </View>
        ) : (
          <>
            {insights.maxPct > 0 && (
              <View style={{ gap: 10, marginBottom: 16 }}>
                <View style={[styles.insightCard, { backgroundColor: "#ef44441a", borderColor: "#ef444466" }]}>
                  <View style={[styles.insightIcon, { backgroundColor: "#ef444433" }]}>
                    <Feather name="trending-up" size={18} color="#fca5a5" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.insightLabel}>Mais movimentado</Text>
                    <Text style={styles.insightValue}>
                      {DIA_NOME[insights.maxDia]} às {insights.maxHora} ({insights.maxPct.toFixed(0)}%)
                    </Text>
                  </View>
                </View>
                <View style={[styles.insightCard, { backgroundColor: "#3b82f61a", borderColor: "#3b82f666" }]}>
                  <View style={[styles.insightIcon, { backgroundColor: "#3b82f633" }]}>
                    <Feather name="trending-down" size={18} color="#93c5fd" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.insightLabel}>Mais vazio</Text>
                    <Text style={styles.insightValue}>
                      {DIA_NOME[insights.minDia]} às {insights.minHora} ({insights.minPct.toFixed(0)}%)
                    </Text>
                  </View>
                </View>
              </View>
            )}

            <View style={styles.heatCard}>
              <View style={styles.heatHeader}>
                <Feather name="zap" size={16} color={Colors.accent} />
                <Text style={styles.heatTitle}>Mapa de calor</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View>
                  <View style={[styles.heatRow, { marginBottom: 4 }]}>
                    <View style={styles.heatLabel} />
                    {DIA_LABEL.map((d, i) => (
                      <Text key={i} style={styles.heatColLabel}>{d}</Text>
                    ))}
                  </View>
                  {HORAS.map((hora) => (
                    <View key={hora} style={styles.heatRow}>
                      <Text style={[styles.heatLabel, styles.heatHourLabel]}>{hora}</Text>
                      {DIAS_SEMANA.map((dia) => {
                        const { total, ocupados } = heatmap[dia][hora];
                        const pct = total > 0 ? (ocupados / total) * 100 : 0;
                        const c = heatColor(pct);
                        return (
                          <View key={dia} style={[styles.heatCell, { backgroundColor: c.bg }]}>
                            <Text style={[styles.heatCellText, { color: c.text }]}>
                              {pct > 0 ? `${pct.toFixed(0)}` : ""}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  ))}
                </View>
              </ScrollView>
              <View style={styles.legend}>
                {[
                  { label: "0%", c: heatColor(0) },
                  { label: "<20", c: heatColor(10) },
                  { label: "20-40", c: heatColor(30) },
                  { label: "40-60", c: heatColor(50) },
                  { label: "60-80", c: heatColor(70) },
                  { label: ">80", c: heatColor(90) },
                ].map((item) => (
                  <View key={item.label} style={styles.legendItem}>
                    <View style={[styles.legendSwatch, { backgroundColor: item.c.bg }]} />
                    <Text style={styles.legendText}>{item.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            {(insights.maxPct > 70 || insights.minPct < 20) && (
              <View style={[styles.heatCard, { marginTop: 14 }]}>
                <View style={styles.heatHeader}>
                  <Feather name="star" size={16} color={Colors.accent} />
                  <Text style={styles.heatTitle}>Sugestões</Text>
                </View>
                {insights.maxPct > 70 && (
                  <View style={[styles.suggestionBox, { backgroundColor: "#fb923c1a", borderColor: "#fb923c66" }]}>
                    <Text style={styles.suggestionText}>
                      Seu horário mais cheio é {DIA_NOME[insights.maxDia]} às {insights.maxHora} ({insights.maxPct.toFixed(0)}% de ocupação).
                      Considere adicionar um profissional neste turno ou ajustar preços.
                    </Text>
                  </View>
                )}
                {insights.minPct < 20 && (
                  <View style={[styles.suggestionBox, { backgroundColor: "#3b82f61a", borderColor: "#3b82f666" }]}>
                    <Text style={styles.suggestionText}>
                      {DIA_NOME[insights.minDia]} às {insights.minHora} é seu horário mais vazio ({insights.minPct.toFixed(0)}%).
                      Crie promoções para aumentar o movimento.
                    </Text>
                  </View>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 12, paddingBottom: 8, gap: 8 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.text },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2 },
  insightCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 12, borderWidth: 1 },
  insightIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  insightLabel: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },
  insightValue: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.text, marginTop: 2 },
  heatCard: { backgroundColor: Colors.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.surfaceBorder },
  heatHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  heatTitle: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.text },
  heatRow: { flexDirection: "row", alignItems: "center" },
  heatLabel: { width: 48, fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.textMuted },
  heatHourLabel: { paddingVertical: 4 },
  heatColLabel: { width: 40, textAlign: "center", fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary },
  heatCell: { width: 36, height: 32, marginHorizontal: 2, marginVertical: 2, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  heatCellText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  legend: { flexDirection: "row", flexWrap: "wrap", marginTop: 12, gap: 10 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendSwatch: { width: 14, height: 12, borderRadius: 4 },
  legendText: { fontSize: 10, fontFamily: "Inter_500Medium", color: Colors.textMuted },
  suggestionBox: { padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
  suggestionText: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.text, lineHeight: 17 },
});
