import React, { useCallback, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Modal, KeyboardAvoidingView, Platform,
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
import { fetchJson, getErrorMessage } from "@/lib/api";

interface Campanha {
  id: number;
  assunto: string;
  corpo: string;
  status: string;
  totalDestinatarios: number;
  totalEnviados: number;
  totalEntregues: number;
  totalAbertos: number;
  totalFalhas: number;
  filtros: { filtro?: string } | null;
  criadaEm: string;
  enviadaEm: string | null;
  finalizadaEm: string | null;
}

interface Config {
  ativado: boolean;
  quota: {
    massa: { usado: number; limite: number; restante: number };
    manual: { usado: number; limite: number; restante: number };
  };
}

interface Preview {
  total: number;
  items: Array<{ id: number; nome: string; email: string }>;
}

const FILTROS = [
  { value: "todos", label: "Todos os clientes" },
  { value: "ativos_90", label: "Ativos (90d)" },
  { value: "aniversariantes_mes", label: "Aniversariantes do mês" },
  { value: "inativos_60", label: "Inativos 60+ dias" },
  { value: "inativos_120", label: "Inativos 120+ dias" },
];

const STATUS_LABEL: Record<string, { text: string; color: string }> = {
  rascunho: { text: "RASCUNHO", color: Colors.textMuted },
  enviando: { text: "ENVIANDO", color: Colors.warning },
  concluida: { text: "CONCLUÍDA", color: Colors.success },
};

export default function EmailMarketingScreen() {
  const { barbeariaId } = useAuth();
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [assunto, setAssunto] = useState("");
  const [corpo, setCorpo] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [formError, setFormError] = useState<string | null>(null);

  const cfg = useQuery<Config>({
    queryKey: ["email-cfg", barbeariaId],
    queryFn: () => fetchJson(`/barbearias/${barbeariaId}/email-marketing/config`),
    enabled: !!barbeariaId,
  });

  const list = useQuery<Campanha[]>({
    queryKey: ["email-campanhas", barbeariaId],
    queryFn: () => fetchJson(`/barbearias/${barbeariaId}/email-marketing/campanhas`),
    enabled: !!barbeariaId,
  });

  const preview = useQuery<Preview>({
    queryKey: ["email-preview", barbeariaId, filtro],
    queryFn: () => fetchJson(`/barbearias/${barbeariaId}/email-marketing/recipients-preview?filtro=${filtro}`),
    enabled: !!barbeariaId && modalOpen,
  });

  const ativarMut = useMutation({
    mutationFn: () => fetchJson(`/barbearias/${barbeariaId}/email-marketing/config`, {
      method: "PATCH", body: { ativado: !cfg.data?.ativado },
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["email-cfg"] }),
  });

  const createSendMut = useMutation({
    mutationFn: async () => {
      if (!assunto.trim()) throw new Error("Informe um assunto");
      if (!corpo.trim()) throw new Error("Informe o corpo do e-mail");
      if (!cfg.data?.ativado) throw new Error("Ative o E-mail Marketing antes de enviar");
      const ids = (preview.data?.items || []).map((c) => c.id);
      if (ids.length === 0) throw new Error("Nenhum destinatário válido para esse filtro");
      const camp = await fetchJson<{ id: number }>(`/barbearias/${barbeariaId}/email-marketing/campanhas`, {
        method: "POST",
        body: { assunto: assunto.trim(), corpo: corpo.trim(), filtros: { filtro } },
      });
      await fetchJson(`/barbearias/${barbeariaId}/email-marketing/campanhas/${camp.id}/enviar`, {
        method: "POST", body: { clienteIds: ids },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email-campanhas"] });
      qc.invalidateQueries({ queryKey: ["email-cfg"] });
      setModalOpen(false);
      setAssunto(""); setCorpo(""); setFiltro("todos"); setFormError(null);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (e) => setFormError(getErrorMessage(e)),
  });

  const onRefresh = useCallback(() => {
    list.refetch();
    cfg.refetch();
  }, [list, cfg]);

  const isLoading = list.isLoading || cfg.isLoading;
  const isError = list.isError || cfg.isError;
  const error = list.error || cfg.error;
  const campanhas = list.data || [];

  return (
    <ScreenContainer
      title="E-mail marketing"
      subtitle={cfg.data?.ativado ? "Ativo" : "Inativo"}
      rightAction={{
        icon: "plus",
        onPress: () => { setFormError(null); setModalOpen(true); },
        label: "Nova campanha",
      }}
      onRefresh={onRefresh}
    >
      {cfg.data ? (
        <View style={styles.statusCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.statusTitle}>
              E-mail marketing {cfg.data.ativado ? "ativado" : "desativado"}
            </Text>
            <Text style={styles.statusDesc}>
              Hoje: {cfg.data.quota.massa.usado}/{cfg.data.quota.massa.limite} em massa, {cfg.data.quota.manual.usado}/{cfg.data.quota.manual.limite} individuais
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.toggleBtn, cfg.data.ativado && styles.toggleBtnActive]}
            onPress={() => ativarMut.mutate()}
            disabled={ativarMut.isPending}
          >
            <Text style={[styles.toggleText, cfg.data.ativado && styles.toggleTextActive]}>
              {cfg.data.ativado ? "Desativar" : "Ativar"}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {isLoading ? (
        <SkeletonList count={3} variant="card" />
      ) : isError ? (
        <ErrorView error={error} onRetry={onRefresh} />
      ) : campanhas.length === 0 ? (
        <EmptyState
          icon="mail"
          title="Nenhuma campanha"
          description="Crie sua primeira campanha de e-mail marketing."
          ctaLabel="Criar campanha"
          onCtaPress={() => { setFormError(null); setModalOpen(true); }}
        />
      ) : (
        campanhas.map((c) => {
          const st = STATUS_LABEL[c.status] || { text: c.status.toUpperCase(), color: Colors.textMuted };
          return (
            <View key={c.id} style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle} numberOfLines={2}>{c.assunto}</Text>
                <View style={[styles.pill, { backgroundColor: st.color + "22" }]}>
                  <Text style={[styles.pillText, { color: st.color }]}>{st.text}</Text>
                </View>
              </View>
              <Text style={styles.cardMeta}>
                Criada em {new Date(c.criadaEm).toLocaleDateString("pt-BR")}
              </Text>
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{c.totalDestinatarios}</Text>
                  <Text style={styles.statLabel}>destin.</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{c.totalEntregues}</Text>
                  <Text style={styles.statLabel}>entregues</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{c.totalAbertos}</Text>
                  <Text style={styles.statLabel}>abertos</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={[styles.statValue, c.totalFalhas > 0 && { color: Colors.error }]}>{c.totalFalhas}</Text>
                  <Text style={styles.statLabel}>falhas</Text>
                </View>
              </View>
            </View>
          );
        })
      )}

      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={() => setModalOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Nova campanha</Text>
                <TouchableOpacity onPress={() => setModalOpen(false)} accessibilityLabel="Fechar">
                  <Feather name="x" size={22} color={Colors.text} />
                </TouchableOpacity>
              </View>

              {formError ? (
                <View style={styles.errorBox}>
                  <Feather name="alert-circle" size={14} color={Colors.error} />
                  <Text style={styles.errorText}>{formError}</Text>
                </View>
              ) : null}

              <Text style={styles.label}>Assunto *</Text>
              <TextInput
                style={styles.input}
                value={assunto}
                onChangeText={setAssunto}
                placeholder="Olá {{nome_cliente}}, novidade!"
                placeholderTextColor={Colors.textMuted}
              />

              <Text style={styles.label}>Corpo do e-mail *</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                value={corpo}
                onChangeText={setCorpo}
                placeholder={"Olá {{nome_cliente}},\n\nGostaríamos de convidar você..."}
                placeholderTextColor={Colors.textMuted}
                multiline
                textAlignVertical="top"
              />
              <Text style={styles.hint}>
                Variáveis: {"{{nome_cliente}}"}, {"{{nome_estabelecimento}}"}, {"{{link_agendamento}}"}
              </Text>

              <Text style={styles.label}>Público</Text>
              <View style={styles.filterGroup}>
                {FILTROS.map((f) => (
                  <TouchableOpacity
                    key={f.value}
                    style={[styles.filterChip, filtro === f.value && styles.filterChipActive]}
                    onPress={() => setFiltro(f.value)}
                  >
                    <Text style={[styles.filterText, filtro === f.value && styles.filterTextActive]}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.previewBox}>
                {preview.isLoading ? (
                  <ActivityIndicator color={Colors.accent} />
                ) : (
                  <Text style={styles.previewText}>
                    {preview.data?.total ?? 0} destinatário(s) com e-mail válido
                  </Text>
                )}
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, createSendMut.isPending && { opacity: 0.6 }]}
                onPress={() => { setFormError(null); createSendMut.mutate(); }}
                disabled={createSendMut.isPending}
              >
                {createSendMut.isPending ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.saveBtnText}>Criar e enviar</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  statusCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.surface, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.surfaceBorder, marginBottom: 12,
  },
  statusTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text },
  statusDesc: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 4 },
  toggleBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    backgroundColor: Colors.accent + "22", borderWidth: 1, borderColor: Colors.accent + "44",
  },
  toggleBtnActive: { backgroundColor: Colors.error + "22", borderColor: Colors.error + "44" },
  toggleText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.accent },
  toggleTextActive: { color: Colors.error },
  card: {
    backgroundColor: Colors.surface, borderRadius: 14, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 6 },
  cardTitle: { flex: 1, fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.text },
  cardMeta: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginBottom: 10 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  pillText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  statsRow: {
    flexDirection: "row", gap: 8,
    backgroundColor: Colors.surfaceLight, borderRadius: 10, padding: 8,
  },
  statBox: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.text },
  statLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginTop: 2 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalCard: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 32, maxHeight: "92%",
    borderTopWidth: 1, borderColor: Colors.surfaceBorder,
  },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.text },
  errorBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.error + "15", borderColor: Colors.error + "40",
    borderWidth: 1, padding: 10, borderRadius: 10, marginBottom: 12,
  },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.error, flex: 1 },
  label: {
    fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary,
    marginTop: 12, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    color: Colors.text, fontSize: 15, fontFamily: "Inter_400Regular",
    minHeight: 46,
  },
  textarea: { minHeight: 140 },
  hint: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginTop: 6 },
  filterGroup: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  filterChipActive: { backgroundColor: Colors.accent + "22", borderColor: Colors.accent },
  filterText: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  filterTextActive: { color: Colors.accent },
  previewBox: {
    marginTop: 12, padding: 12, backgroundColor: Colors.surfaceLight,
    borderRadius: 10, alignItems: "center",
  },
  previewText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.text },
  saveBtn: {
    marginTop: 18, backgroundColor: Colors.accent, borderRadius: 12,
    height: 50, alignItems: "center", justifyContent: "center",
  },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#000" },
});
