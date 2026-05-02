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

interface Lembrete {
  id: number;
  tipo: string;
  intervaloDias: number;
  mensagemTemplate: string;
  ativo: boolean;
  createdAt: string;
}

type FormState = {
  tipo: string;
  intervaloDias: string;
  mensagemTemplate: string;
  ativo: boolean;
};

const TIPOS = [
  { value: "retorno", label: "Retorno", icon: "rotate-ccw" as const },
  { value: "aniversario", label: "Aniversário", icon: "gift" as const },
  { value: "pos_atendimento", label: "Pós-atendimento", icon: "thumbs-up" as const },
  { value: "inativo", label: "Cliente inativo", icon: "user-x" as const },
];

const empty: FormState = { tipo: "retorno", intervaloDias: "30", mensagemTemplate: "", ativo: true };

export default function LembretesScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { barbeariaId } = useAuth();
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Lembrete | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: lembretes = [], isLoading, isError, error, refetch } = useQuery<Lembrete[]>({
    queryKey: ["lembretes", barbeariaId],
    queryFn: () => fetchJson(`/barbearias/${barbeariaId}/lembretes`),
    enabled: !!barbeariaId,
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      const dias = parseInt(form.intervaloDias, 10);
      if (Number.isNaN(dias) || dias <= 0) throw new Error("Intervalo de dias inválido");
      if (!form.mensagemTemplate.trim()) throw new Error("Mensagem obrigatória");
      const body = {
        tipo: form.tipo,
        intervaloDias: dias,
        mensagemTemplate: form.mensagemTemplate.trim(),
        ativo: form.ativo,
      };
      if (editing) {
        return fetchJson(`/barbearias/${barbeariaId}/lembretes/${editing.id}`, { method: "PUT", body });
      }
      return fetchJson(`/barbearias/${barbeariaId}/lembretes`, { method: "POST", body });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lembretes"] });
      setModalOpen(false); setEditing(null); setForm(empty); setFormError(null);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (e) => setFormError(getErrorMessage(e)),
  });

  const toggleMut = useMutation({
    mutationFn: (l: Lembrete) =>
      fetchJson(`/barbearias/${barbeariaId}/lembretes/${l.id}`, { method: "PUT", body: { ativo: !l.ativo } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lembretes"] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) =>
      fetchJson(`/barbearias/${barbeariaId}/lembretes/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lembretes"] }),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await refetch(); setRefreshing(false);
  }, [refetch]);

  const openNew = () => { setEditing(null); setForm(empty); setFormError(null); setModalOpen(true); };
  const openEdit = (l: Lembrete) => {
    setEditing(l);
    setForm({
      tipo: l.tipo,
      intervaloDias: String(l.intervaloDias),
      mensagemTemplate: l.mensagemTemplate,
      ativo: l.ativo,
    });
    setFormError(null); setModalOpen(true);
  };
  const onDelete = (l: Lembrete) => {
    if (Platform.OS === "web") {
      if (window.confirm("Excluir lembrete?")) deleteMut.mutate(l.id);
    } else {
      Alert.alert("Excluir lembrete", "Excluir este lembrete?", [
        { text: "Cancelar", style: "cancel" },
        { text: "Excluir", style: "destructive", onPress: () => deleteMut.mutate(l.id) },
      ]);
    }
  };

  const tipoLabel = (t: string) => TIPOS.find((x) => x.value === t)?.label || t;
  const tipoIcon = (t: string) => TIPOS.find((x) => x.value === t)?.icon || "bell";

  return (
    <ScreenContainer
      title="Lembretes automáticos"
      subtitle={`${lembretes.length} configurado(s)`}
      rightAction={{ icon: "plus", onPress: openNew, label: "Novo lembrete" }}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {isLoading ? (
        <SkeletonList count={3} variant="card" />
      ) : isError ? (
        <ErrorView error={error} onRetry={() => refetch()} />
      ) : lembretes.length === 0 ? (
        <EmptyState
          icon="bell"
          title="Nenhum lembrete"
          description="Configure mensagens automáticas para retorno, aniversário e mais."
          ctaLabel="Criar lembrete"
          onCtaPress={openNew}
        />
      ) : (
        lembretes.map((l) => (
          <View key={l.id} style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.iconBox}>
                <Feather name={tipoIcon(l.tipo)} size={16} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.tipo}>{tipoLabel(l.tipo)}</Text>
                <Text style={styles.meta}>A cada {l.intervaloDias} dia(s)</Text>
              </View>
              <View style={[styles.pill, { backgroundColor: l.ativo ? colors.success + "22" : colors.textMuted + "22" }]}>
                <Text style={[styles.pillText, { color: l.ativo ? colors.success : colors.textMuted }]}>
                  {l.ativo ? "ATIVO" : "INATIVO"}
                </Text>
              </View>
            </View>
            <Text style={styles.template} numberOfLines={3}>{l.mensagemTemplate}</Text>
            <View style={styles.actions}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => toggleMut.mutate(l)}>
                <Feather name={l.ativo ? "pause" : "play"} size={14} color={colors.text} />
                <Text style={styles.actionText}>{l.ativo ? "Desativar" : "Ativar"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(l)}>
                <Feather name="edit-2" size={14} color={colors.text} />
                <Text style={styles.actionText}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => onDelete(l)}>
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
                <Text style={styles.modalTitle}>{editing ? "Editar lembrete" : "Novo lembrete"}</Text>
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

              <Text style={styles.label}>Tipo</Text>
              <View style={styles.tiposGrid}>
                {TIPOS.map((t) => (
                  <TouchableOpacity
                    key={t.value}
                    style={[styles.tipoBtn, form.tipo === t.value && styles.tipoBtnActive]}
                    onPress={() => setForm({ ...form, tipo: t.value })}
                  >
                    <Feather name={t.icon} size={14} color={form.tipo === t.value ? colors.accent : colors.textSecondary} />
                    <Text style={[styles.tipoText, form.tipo === t.value && styles.tipoTextActive]}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Intervalo (dias) *</Text>
              <TextInput
                style={styles.input}
                value={form.intervaloDias}
                onChangeText={(v) => setForm({ ...form, intervaloDias: v.replace(/\D/g, "") })}
                placeholder="30"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
              />

              <Text style={styles.label}>Mensagem *</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                value={form.mensagemTemplate}
                onChangeText={(v) => setForm({ ...form, mensagemTemplate: v })}
                placeholder="Olá {cliente}, faz tempo que não nos vemos! Que tal agendar?"
                placeholderTextColor={colors.textMuted}
                multiline
                textAlignVertical="top"
              />
              <Text style={styles.hint}>Variáveis: {"{cliente}"}, {"{salao}"}, {"{servico}"}, {"{data}"}, {"{hora}"}</Text>

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Ativo</Text>
                <Switch
                  value={form.ativo}
                  onValueChange={(v) => setForm({ ...form, ativo: v })}
                  trackColor={{ false: colors.surfaceLight, true: colors.accent + "80" }}
                  thumbColor={form.ativo ? colors.accent : "#888"}
                />
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, saveMut.isPending && { opacity: 0.6 }]}
                onPress={() => { setFormError(null); saveMut.mutate(); }}
                disabled={saveMut.isPending}
              >
                {saveMut.isPending ? <ActivityIndicator color={colors.invertedText} /> : (
                  <Text style={styles.saveBtnText}>{editing ? "Salvar alterações" : "Criar lembrete"}</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
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
  cardTop: { flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 10 },
  iconBox: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: c.accent + "22", alignItems: "center", justifyContent: "center",
  },
  tipo: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: c.text },
  meta: { fontSize: 12, fontFamily: "Inter_400Regular", color: c.textSecondary, marginTop: 2 },
  template: { fontSize: 13, fontFamily: "Inter_400Regular", color: c.textSecondary, lineHeight: 18, marginBottom: 10 },
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
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: c.text },
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
  textarea: { minHeight: 110 },
  hint: { fontSize: 11, fontFamily: "Inter_400Regular", color: c.textMuted, marginTop: 6 },
  tiposGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tipoBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10,
    backgroundColor: c.surface, borderWidth: 1, borderColor: c.surfaceBorder,
  },
  tipoBtnActive: { backgroundColor: c.accent + "22", borderColor: c.accent },
  tipoText: { fontSize: 12, fontFamily: "Inter_500Medium", color: c.textSecondary },
  tipoTextActive: { color: c.accent },
  switchRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginTop: 14, paddingVertical: 4,
  },
  switchLabel: { fontSize: 14, fontFamily: "Inter_500Medium", color: c.text },
  saveBtn: {
    marginTop: 18, backgroundColor: c.accent, borderRadius: 12,
    height: 50, alignItems: "center", justifyContent: "center",
  },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: c.invertedText },
});
