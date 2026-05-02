import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import { ScreenContainer } from "@/components/ScreenContainer";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonList } from "@/components/Skeleton";
import { SectionHeader } from "@/components/SectionHeader";
import { fetchJson, getErrorMessage } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

type PicoSemana = { dia: number; agendamentos: number };
type PicoHora = { hora: number; agendamentos: number };
type Picos = { porDiaSemana?: PicoSemana[]; porHora?: PicoHora[] };

export default function PicosScreen() {
  const { barbeariaId } = useAuth();
  const query = useQuery<Picos>({
    queryKey: ["rel-picos", barbeariaId],
    enabled: !!barbeariaId,
    queryFn: async () => {
      try {
        return await fetchJson<Picos>(`/barbearias/${barbeariaId}/dashboard/agenda-picos`);
      } catch {
        return {};
      }
    },
  });

  const semana = useMemo(() => query.data?.porDiaSemana ?? [], [query.data]);
  const horas = useMemo(() => query.data?.porHora ?? [], [query.data]);
  const maxSem = Math.max(1, ...semana.map((s) => s.agendamentos));
  const maxHora = Math.max(1, ...horas.map((s) => s.agendamentos));

  if (query.isLoading) {
    return (
      <ScreenContainer title="Picos da agenda" subtitle="Quando seu cliente costuma agendar">
        <SkeletonList count={3} variant="card" />
      </ScreenContainer>
    );
  }

  if (query.isError || (!semana.length && !horas.length)) {
    return (
      <ScreenContainer title="Picos da agenda" subtitle="Quando seu cliente costuma agendar">
        <EmptyState
          icon="bar-chart-2"
          title="Sem dados"
          description="Os picos da agenda ainda não estão disponíveis no aplicativo."
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      title="Picos da agenda"
      subtitle="Quando seu cliente costuma agendar"
      refreshing={query.isRefetching}
      onRefresh={() => query.refetch()}
    >
      {semana.length > 0 ? (
        <>
          <SectionHeader label="Por dia da semana" />
          {semana.map((s) => (
            <View key={s.dia} style={styles.row}>
              <Text style={styles.rowLabel}>{DIAS[s.dia] ?? `Dia ${s.dia}`}</Text>
              <View style={styles.barWrap}><View style={[styles.barFill, { width: `${(s.agendamentos / maxSem) * 100}%` }]} /></View>
              <Text style={styles.rowValue}>{s.agendamentos}</Text>
            </View>
          ))}
        </>
      ) : null}

      {horas.length > 0 ? (
        <>
          <SectionHeader label="Por horário" />
          {horas.map((s) => (
            <View key={s.hora} style={styles.row}>
              <Text style={styles.rowLabel}>{String(s.hora).padStart(2, "0")}h</Text>
              <View style={styles.barWrap}><View style={[styles.barFill, { width: `${(s.agendamentos / maxHora) * 100}%` }]} /></View>
              <Text style={styles.rowValue}>{s.agendamentos}</Text>
            </View>
          ))}
        </>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 6,
  },
  rowLabel: { color: Colors.text, fontFamily: "Inter_600SemiBold", fontSize: 12, width: 80 },
  rowValue: { color: Colors.accent, fontFamily: "Inter_700Bold", fontSize: 12, width: 36, textAlign: "right" },
  barWrap: { flex: 1, height: 8, backgroundColor: Colors.surfaceLight, borderRadius: 4, overflow: "hidden" },
  barFill: { height: 8, backgroundColor: Colors.accent },
});
