import React, { useCallback, useState, useMemo } from "react";
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Modal, KeyboardAvoidingView, Platform, Switch, Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useColors, type ColorPalette } from "@/lib/theme";
import { useAuth } from "@/contexts/AuthContext";
import { ScreenContainer } from "@/components/ScreenContainer";
import { EmptyState } from "@/components/EmptyState";
import { ErrorView } from "@/components/ErrorView";
import { SkeletonList } from "@/components/Skeleton";
import { fetchJson, getErrorMessage } from "@/lib/api";

interface Pergunta {
  id: string;
  texto: string;
  tipo: "nota" | "texto" | "sim_nao";
}

interface Pesquisa {
  id: number;
  titulo: string;
  perguntas: Pergunta[];
  ativo: boolean;
  envioAutomatico: boolean;
  createdAt: string;
}

interface Stats {
  totalRespostas: number;
  mediaNota: number;
  distribuicaoNotas: Record<string, number>;
}

const TIPOS = [
  { value: "nota", label: "Nota 1-5" },
  { value: "sim_nao", label: "Sim/Não" },
  { value: "texto", label: "Texto" },
] as const;

export default function PesquisasScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { barbeariaId } = useAuth();
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState<Pesquisa | null>(null);
  const [titulo, setTitulo] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [envioAutomatico, setEnvioAutomatico] = useState(false);
  const [perguntas, setPerguntas] = useState<Pergunta[]>([
    { id: "1", texto: "Como você avalia o atendimento?", tipo: "nota" },
  ]);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: pesquisas = [], isLoading, isError, error, refetch } = useQuery<Pesquisa[]>({
    queryKey: ["pesquisas", barbeariaId],
    queryFn: () => fetchJson(`/barbearias/${barbeariaId}/pesquisas`),
    enabled: !!barbeariaId,
  });

  const stats = useQuery<Stats>({
    queryKey: ["pesquisa-stats", barbeariaId, statsOpen?.id],
    queryFn: () => fetchJson(`/barbearias/${barbeariaId}/pesquisas/${statsOpen!.id}/estatisticas`),
    enabled: !!barbeariaId && !!statsOpen,
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!titulo.trim()) throw new Error("Título obrigatório");
      const validas = perguntas.filter((p) => p.texto.trim());
      if (validas.length === 0) throw new Error("Adicione ao menos uma pergunta");
      return fetchJson(`/barbearias/${barbeariaId}/pesquisas`, {
        method: "POST",
        body: { titulo: titulo.trim(), perguntas: validas, ativo, envioAutomatico },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pesquisas"] });
      setModalOpen(false); setTitulo(""); setAtivo(true); setEnvioAutomatico(false);
      setPerguntas([{ id: "1", texto: "Como você avalia o atendimento?", tipo: "nota" }]);
      setFormError(null);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (e) => setFormError(getErrorMessage(e)),
  });

  const toggleMut = useMutation({
    mutationFn: (p: Pesquisa) =>
      fetchJson(`/barbearias/${barbeariaId}/pesquisas/${p.id}`, { method: "PUT", body: { ativo: !p.ativo } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pesquisas"] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) =>
      fetchJson(`/barbearias/${barbeariaId}/pesquisas/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pesquisas"] }),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await refetch(); setRefreshing(false);
  }, [refetch]);

  const onDelete = (p: Pesquisa) => {
    if (Platform.OS === "web") {
      if (window.confirm(`Excluir pesquisa "${p.titulo}"?`)) deleteMut.mutate(p.id);
    } else {
      Alert.alert("Excluir pesquisa", `Excluir "${p.titulo}"?`, [
        { text: "Cancelar", style: "cancel" },
        { text: "Excluir", style: "destructive", onPress: () => deleteMut.mutate(p.id) },
      ]);
    }
  };

  const updateP = (idx: number, patch: Partial<Pergunta>) => {
    setPerguntas((arr) => arr.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  };
  const addP = () => setPerguntas((arr) => [...arr, { id: String(Date.now()), texto: "", tipo: "nota" }]);
  const removeP = (idx: number) => setPerguntas((arr) => arr.filter((_, i) => i !== idx));

  return (
    <ScreenContainer
      title="Pesquisas de satisfação"
      subtitle={`${pesquisas.length} criada(s)`}
      rightAction={{ icon: "plus", onPress: () => { setFormError(null); setModalOpen(true); }, label: "Nova pesquisa" }}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {isLoading ? (
        <SkeletonList count={3} variant="card" />
      ) : isError ? (
        <ErrorView error={error} onRetry={() => refetch()} />
      ) : pesquisas.length === 0 ? (
        <EmptyState
          icon="smile"
          title="Nenhuma pesquisa"
          description="Crie pesquisas curtas para medir a satisfação dos clientes."
          ctaLabel="Criar pesquisa"
          onCtaPress={() => { setFormError(null); setModalOpen(true); }}
        />
      ) : (
        pesquisas.map((p) => (
          <View key={p.id} style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.titulo} numberOfLines={1}>{p.titulo}</Text>
              <View style={[styles.pill, { backgroundColor: p.ativo ? colors.success + "22" : colors.textMuted + "22" }]}>
                <Text style={[styles.pillText, { color: p.ativo ? colors.success : colors.textMuted }]}>
                  {p.ativo ? "ATIVO" : "INATIVO"}
                </Text>
              </View>
            </View>
            <Text style={styles.meta}>
              {(p.perguntas || []).length} pergunta(s)
              {p.envioAutomatico ? " • envio automático" : ""}
            </Text>
            <View style={styles.actions}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => setStatsOpen(p)}>
                <Feather name="bar-chart-2" size={14} color={colors.text} />
                <Text style={styles.actionText}>Respostas</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => toggleMut.mutate(p)}>
                <Feather name={p.ativo ? "pause" : "play"} size={14} color={colors.text} />
                <Text style={styles.actionText}>{p.ativo ? "Desativar" : "Ativar"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => onDelete(p)}>
                <Feather name="trash-2" size={14} color={colors.error} />
                <Text style={[styles.actionText, { color: colors.error }]}>Excluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={() => setModalOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Nova pesquisa</Text>
                <TouchableOpacity onPress={() => setModalOpen(false)} accessibilityLabel="Fechar">
                  <Feather name="x" size={22} color={colors.text} />
                </TouchableOpacity>
              </View>

              {formError ? (
                <View style={styles.errorBox}>
                  <Feather name="alert-circle" size={14} color={colors.error} />
                  <Text style={styles.errorText}>{formError}</Text>
                </View>
              ) : null}

              <Text style={styles.label}>Título *</Text>
              <TextInput
                style={styles.input}
                value={titulo}
                onChangeText={setTitulo}
                placeholder="Ex: Pesquisa pós-atendimento"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.label}>Perguntas</Text>
              {perguntas.map((p, idx) => (
                <View key={p.id} style={styles.pBox}>
                  <View style={styles.pHeader}>
                    <Text style={styles.pIdx}>#{idx + 1}</Text>
                    {perguntas.length > 1 ? (
                      <TouchableOpacity onPress={() => removeP(idx)}>
                        <Feather name="x" size={16} color={colors.error} />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                  <TextInput
                    style={styles.input}
                    value={p.texto}
                    onChangeText={(v) => updateP(idx, { texto: v })}
                    placeholder="Texto da pergunta"
                    placeholderTextColor={colors.textMuted}
                  />
                  <View style={[styles.segGroup, { marginTop: 8 }]}>
                    {TIPOS.map((t) => (
                      <TouchableOpacity
                        key={t.value}
                        style={[styles.segBtn, p.tipo === t.value && styles.segBtnActive]}
                        onPress={() => updateP(idx, { tipo: t.value })}
                      >
                        <Text style={[styles.segText, p.tipo === t.value && styles.segTextActive]}>{t.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
              <TouchableOpacity style={styles.addPBtn} onPress={addP}>
                <Feather name="plus" size={14} color={colors.accent} />
                <Text style={styles.addPText}>Adicionar pergunta</Text>
              </TouchableOpacity>

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Ativo</Text>
                <Switch
                  value={ativo}
                  onValueChange={setAtivo}
                  trackColor={{ false: colors.surfaceLight, true: colors.accent + "80" }}
                  thumbColor={ativo ? colors.accent : "#888"}
                />
              </View>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Envio automático após atendimento</Text>
                <Switch
                  value={envioAutomatico}
                  onValueChange={setEnvioAutomatico}
                  trackColor={{ false: colors.surfaceLight, true: colors.accent + "80" }}
                  thumbColor={envioAutomatico ? colors.accent : "#888"}
                />
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, saveMut.isPending && { opacity: 0.6 }]}
                onPress={() => { setFormError(null); saveMut.mutate(); }}
                disabled={saveMut.isPending}
              >
                {saveMut.isPending ? <ActivityIndicator color={colors.invertedText} /> : <Text style={styles.saveBtnText}>Criar pesquisa</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={!!statsOpen} animationType="slide" transparent onRequestClose={() => setStatsOpen(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1}>{statsOpen?.titulo}</Text>
              <TouchableOpacity onPress={() => setStatsOpen(null)} accessibilityLabel="Fechar">
                <Feather name="x" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>
            {stats.isLoading ? (
              <View style={{ paddingVertical: 30, alignItems: "center" }}>
                <ActivityIndicator color={colors.accent} />
              </View>
            ) : stats.isError ? (
              <ErrorView error={stats.error} onRetry={() => stats.refetch()} />
            ) : stats.data ? (
              <>
                <View style={styles.statsRow}>
                  <View style={styles.statBox}>
                    <Text style={styles.statValue}>{stats.data.totalRespostas}</Text>
                    <Text style={styles.statLabel}>respostas</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statValue}>{stats.data.mediaNota.toFixed(1)}</Text>
                    <Text style={styles.statLabel}>nota média</Text>
                  </View>
                </View>
                <Text style={[styles.label, { marginTop: 18 }]}>Distribuição de notas</Text>
                {[5, 4, 3, 2, 1].map((n) => {
                  const v = Number(stats.data?.distribuicaoNotas?.[n] || 0);
                  const total = stats.data?.totalRespostas || 0;
                  const pct = total > 0 ? Math.round((v / total) * 100) : 0;
                  return (
                    <View key={n} style={styles.distRow}>
                      <Text style={styles.distLabel}>{n}★</Text>
                      <View style={styles.distBarBg}>
                        <View style={[styles.distBarFill, { width: `${pct}%` }]} />
                      </View>
                      <Text style={styles.distCount}>{v}</Text>
                    </View>
                  );
                })}
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
  card: {
    backgroundColor: c.surface, borderRadius: 14, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: c.surfaceBorder,
  },
  cardTop: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  titulo: { flex: 1, fontSize: 15, fontFamily: "Inter_600SemiBold", color: c.text },
  meta: { fontSize: 12, fontFamily: "Inter_400Regular", color: c.textSecondary, marginBottom: 10 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  pillText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  actions: { flexDirection: "row", gap: 8, borderTopWidth: 1, borderTopColor: c.surfaceBorder, paddingTop: 10 },
  actionBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: c.surfaceLight, borderRadius: 8,
  },
  actionText: { fontSize: 12, fontFamily: "Inter_500Medium", color: c.text },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalCard: {
    backgroundColor: c.background,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 32, maxHeight: "92%",
    borderTopWidth: 1, borderColor: c.surfaceBorder,
  },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: c.text, flex: 1 },
  errorBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: c.error + "15", borderColor: c.error + "40",
    borderWidth: 1, padding: 10, borderRadius: 10, marginBottom: 12,
  },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular", color: c.error, flex: 1 },
  label: {
    fontSize: 12, fontFamily: "Inter_600SemiBold", color: c.textSecondary,
    marginTop: 12, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5,
  },
  input: {
    backgroundColor: c.surface, borderWidth: 1, borderColor: c.surfaceBorder,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    color: c.text, fontSize: 15, fontFamily: "Inter_400Regular",
    minHeight: 46,
  },
  pBox: {
    backgroundColor: c.surfaceLight, borderRadius: 12, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: c.surfaceBorder,
  },
  pHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  pIdx: { fontSize: 12, fontFamily: "Inter_700Bold", color: c.accent },
  segGroup: { flexDirection: "row", gap: 6 },
  segBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 8,
    backgroundColor: c.surface, borderWidth: 1, borderColor: c.surfaceBorder,
    alignItems: "center",
  },
  segBtnActive: { backgroundColor: c.accent + "22", borderColor: c.accent },
  segText: { fontSize: 11, fontFamily: "Inter_500Medium", color: c.textSecondary },
  segTextActive: { color: c.accent },
  addPBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 10, borderRadius: 10,
    borderWidth: 1, borderStyle: "dashed", borderColor: c.accent,
  },
  addPText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: c.accent },
  switchRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginTop: 14, paddingVertical: 4,
  },
  switchLabel: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium", color: c.text },
  saveBtn: {
    marginTop: 18, backgroundColor: c.accent, borderRadius: 12,
    height: 50, alignItems: "center", justifyContent: "center",
  },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: c.invertedText },
  statsRow: { flexDirection: "row", gap: 10 },
  statBox: {
    flex: 1, backgroundColor: c.surfaceLight, borderRadius: 12, padding: 14, alignItems: "center",
  },
  statValue: { fontSize: 26, fontFamily: "Inter_700Bold", color: c.text },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: c.textMuted, marginTop: 4 },
  distRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  distLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: c.text, width: 28 },
  distBarBg: { flex: 1, height: 10, borderRadius: 5, backgroundColor: c.surfaceLight },
  distBarFill: { height: 10, borderRadius: 5, backgroundColor: c.accent },
  distCount: { fontSize: 13, fontFamily: "Inter_500Medium", color: c.textSecondary, width: 30, textAlign: "right" },
});
