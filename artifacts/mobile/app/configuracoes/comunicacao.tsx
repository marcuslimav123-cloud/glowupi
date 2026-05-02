import React, { useMemo } from "react";
import { Alert, StyleSheet, Switch, Text, View } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useColors, type ColorPalette } from "@/lib/theme";
import { ScreenContainer } from "@/components/ScreenContainer";
import { SkeletonList } from "@/components/Skeleton";
import { fetchJson, getErrorMessage } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export default function ComunicacaoScreen() {
  const { barbeariaId } = useAuth();
  const qc = useQueryClient();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const query = useQuery<{ modoHumano: boolean }>({
    queryKey: ["modo-humano", barbeariaId],
    enabled: !!barbeariaId,
    queryFn: () => fetchJson<{ modoHumano: boolean }>(`/barbearias/${barbeariaId}/modo-humano`),
  });

  const updateMutation = useMutation({
    mutationFn: (modoHumano: boolean) =>
      fetchJson(`/barbearias/${barbeariaId}/modo-humano`, { method: "PUT", body: { modoHumano } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["modo-humano", barbeariaId] }),
    onError: (e) => Alert.alert("Erro", getErrorMessage(e)),
  });

  const ativo = !!query.data?.modoHumano;

  return (
    <ScreenContainer title="Comunicação" subtitle="Como o sistema fala com seus clientes">
      {query.isLoading ? (
        <SkeletonList count={2} variant="card" />
      ) : (
        <>
          <View style={[styles.card, ativo && styles.cardActive]}>
            <View style={styles.head}>
              <View style={[styles.icon, ativo && { backgroundColor: "rgba(255,193,7,0.18)" }]}>
                <Feather name="user-x" size={18} color={ativo ? colors.warning : colors.textSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>Modo Humano (anti-automação)</Text>
                <Text style={styles.desc}>
                  Confirmações, lembretes e aniversários ficam pendentes para você revisar e enviar manualmente.
                </Text>
              </View>
              <Switch
                value={ativo}
                onValueChange={(v) => updateMutation.mutate(v)}
                disabled={updateMutation.isPending}
                trackColor={{ false: colors.surfaceLight, true: colors.accent }}
                thumbColor="#fff"
              />
            </View>
            {ativo ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Ativo</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>O que muda ao ativar?</Text>
            {[
              "Confirmação de novo agendamento por e-mail/push deixa de sair sozinha.",
              "Lembretes 1 dia / 2 horas / 30 minutos antes ficam pendentes.",
              "Aniversariantes do dia aparecem como sugestões prontas.",
              "Você ainda pode disparar campanhas e mensagens diretas.",
            ].map((line, i) => (
              <View key={i} style={styles.bulletRow}>
                <View style={styles.bullet} />
                <Text style={styles.bulletText}>{line}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </ScreenContainer>
  );
}

const makeStyles = (c: ColorPalette) => StyleSheet.create({
  card: {
    backgroundColor: c.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.surfaceBorder,
    padding: 14,
    marginBottom: 12,
  },
  cardActive: { borderColor: c.warning + "60", backgroundColor: "rgba(255,193,7,0.04)" },
  head: { flexDirection: "row", alignItems: "center", gap: 12 },
  icon: { width: 44, height: 44, borderRadius: 12, backgroundColor: c.surfaceLight, alignItems: "center", justifyContent: "center" },
  title: { color: c.text, fontFamily: "Inter_600SemiBold", fontSize: 14 },
  desc: { color: c.textSecondary, fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 4, lineHeight: 17 },
  badge: { alignSelf: "flex-start", marginTop: 10, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: "rgba(255,193,7,0.18)" },
  badgeText: { color: c.warning, fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 0.5 },
  infoCard: {
    backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.surfaceBorder, padding: 14,
  },
  infoTitle: { color: c.text, fontFamily: "Inter_600SemiBold", fontSize: 13, marginBottom: 8 },
  bulletRow: { flexDirection: "row", gap: 8, marginBottom: 6 },
  bullet: { width: 4, height: 4, borderRadius: 2, backgroundColor: c.accent, marginTop: 7 },
  bulletText: { color: c.textSecondary, fontFamily: "Inter_500Medium", fontSize: 12, flex: 1, lineHeight: 17 },
});
