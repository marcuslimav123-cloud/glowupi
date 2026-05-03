import React, { useMemo } from "react";
import { Alert, StyleSheet, Switch, Text, View } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useColors, type ColorPalette } from "@/lib/theme";
import { ScreenContainer } from "@/components/ScreenContainer";
import { SkeletonList } from "@/components/Skeleton";
import { fetchJson, getErrorMessage } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

type ParamRow = { chave: string; valor: string };

const PUSH_CATEGORIES_UI: { key: string; label: string; description: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: "agenda", label: "Agenda", description: "Novos agendamentos, cancelamentos, lembretes e pendências.", icon: "calendar" },
  { key: "financeiro", label: "Financeiro", description: "Comandas, contas a pagar, sangrias, vales e comissões.", icon: "dollar-sign" },
  { key: "equipe", label: "Equipe", description: "Convites aceitos e mudanças no time.", icon: "users" },
  { key: "marketing", label: "Marketing", description: "Avaliações, aniversariantes e campanhas.", icon: "star" },
  { key: "sistema", label: "Sistema", description: "Status da assinatura, cobrança, alertas gerais.", icon: "alert-triangle" },
];

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

  const paramsQuery = useQuery<ParamRow[]>({
    queryKey: ["parametros", barbeariaId],
    enabled: !!barbeariaId,
    queryFn: async () => {
      const r = await fetchJson<ParamRow[]>(`/barbearias/${barbeariaId}/parametros`);
      return Array.isArray(r) ? r : [];
    },
  });

  const updateParam = useMutation({
    mutationFn: ({ chave, valor }: { chave: string; valor: string }) =>
      fetchJson(`/barbearias/${barbeariaId}/parametros/${encodeURIComponent(chave)}`, { method: "PUT", body: { valor } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["parametros", barbeariaId] }),
    onError: (e) => Alert.alert("Erro", getErrorMessage(e)),
  });

  const getParam = (chave: string): boolean => {
    const row = (paramsQuery.data || []).find((p) => p.chave === chave);
    return row ? row.valor !== "Não" : true;
  };

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

          <View style={[styles.card, { paddingBottom: 6 }]}>
            <View style={styles.head}>
              <View style={styles.icon}>
                <Feather name="bell" size={18} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>Notificações push (sua equipe)</Text>
                <Text style={styles.desc}>Escolha quais categorias de alerta o app envia para você e sua equipe.</Text>
              </View>
            </View>
            {PUSH_CATEGORIES_UI.map((cat) => {
              const chave = `notif_push_${cat.key}`;
              const ativoCat = getParam(chave);
              return (
                <View key={cat.key} style={styles.prefRow}>
                  <View style={[styles.prefIcon, ativoCat && { backgroundColor: colors.accent + "22" }]}>
                    <Feather name={cat.icon} size={16} color={ativoCat ? colors.accent : colors.textSecondary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.prefLabel}>{cat.label}</Text>
                    <Text style={styles.prefDesc}>{cat.description}</Text>
                  </View>
                  <Switch
                    value={ativoCat}
                    onValueChange={(v) => updateParam.mutate({ chave, valor: v ? "Sim" : "Não" })}
                    disabled={updateParam.isPending || paramsQuery.isLoading}
                    trackColor={{ false: colors.surfaceLight, true: colors.accent }}
                    thumbColor="#fff"
                  />
                </View>
              );
            })}
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
  prefRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: c.surfaceBorder, marginTop: 10 },
  prefIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: c.surfaceLight, alignItems: "center", justifyContent: "center" },
  prefLabel: { color: c.text, fontFamily: "Inter_600SemiBold", fontSize: 13 },
  prefDesc: { color: c.textSecondary, fontFamily: "Inter_500Medium", fontSize: 11, marginTop: 2, lineHeight: 15 },
});
