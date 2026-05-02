import React, { useCallback, useState, useMemo } from "react";
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, KeyboardAvoidingView, Platform, Switch, Alert,
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
import { fetchJson, formatCurrency, getErrorMessage } from "@/lib/api";

interface Cupom {
  id: number;
  codigo: string;
  tipo: "percentual" | "valor";
  valor: number;
  validadeInicio: string | null;
  validadeFim: string | null;
  usoMaximo: number | null;
  usoAtual: number;
  ativo: boolean;
}

type FormState = {
  codigo: string;
  tipo: "percentual" | "valor";
  valor: string;
  validadeInicio: string;
  validadeFim: string;
  usoMaximo: string;
  ativo: boolean;
};

const emptyForm: FormState = {
  codigo: "", tipo: "percentual", valor: "", validadeInicio: "",
  validadeFim: "", usoMaximo: "", ativo: true,
};

export default function CuponsScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { barbeariaId } = useAuth();
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Cupom | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: cupons = [], isLoading, isError, error, refetch } = useQuery<Cupom[]>({
    queryKey: ["cupons", barbeariaId],
    queryFn: () => fetchJson(`/barbearias/${barbeariaId}/cupons`),
    enabled: !!barbeariaId,
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      const valor = parseFloat(form.valor.replace(",", "."));
      if (!form.codigo.trim()) throw new Error("Código é obrigatório");
      if (Number.isNaN(valor) || valor <= 0) throw new Error("Valor inválido");
      const body = {
        codigo: form.codigo.trim().toUpperCase(),
        tipo: form.tipo,
        valor,
        validadeInicio: form.validadeInicio.trim() || null,
        validadeFim: form.validadeFim.trim() || null,
        usoMaximo: form.usoMaximo.trim() ? parseInt(form.usoMaximo.trim(), 10) : null,
        ativo: form.ativo,
      };
      if (editing) {
        return fetchJson(`/barbearias/${barbeariaId}/cupons/${editing.id}`, { method: "PUT", body });
      }
      return fetchJson(`/barbearias/${barbeariaId}/cupons`, { method: "POST", body });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cupons"] });
      setModalOpen(false);
      setForm(emptyForm);
      setEditing(null);
      setFormError(null);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (e) => setFormError(getErrorMessage(e)),
  });

  const toggleMut = useMutation({
    mutationFn: (c: Cupom) =>
      fetchJson(`/barbearias/${barbeariaId}/cupons/${c.id}`, { method: "PUT", body: { ativo: !c.ativo } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cupons"] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) =>
      fetchJson(`/barbearias/${barbeariaId}/cupons/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cupons"] }),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (c: Cupom) => {
    setEditing(c);
    setForm({
      codigo: c.codigo,
      tipo: c.tipo,
      valor: String(c.valor),
      validadeInicio: c.validadeInicio ? c.validadeInicio.slice(0, 10) : "",
      validadeFim: c.validadeFim ? c.validadeFim.slice(0, 10) : "",
      usoMaximo: c.usoMaximo ? String(c.usoMaximo) : "",
      ativo: c.ativo,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const confirmDelete = (c: Cupom) => {
    if (Platform.OS === "web") {
      if (window.confirm(`Excluir cupom ${c.codigo}?`)) deleteMut.mutate(c.id);
    } else {
      Alert.alert("Excluir cupom", `Excluir o cupom ${c.codigo}?`, [
        { text: "Cancelar", style: "cancel" },
        { text: "Excluir", style: "destructive", onPress: () => deleteMut.mutate(c.id) },
      ]);
    }
  };

  const fmtValor = (c: Cupom) =>
    c.tipo === "percentual" ? `${c.valor}% off` : `${formatCurrency(c.valor)} off`;

  return (
    <ScreenContainer
      title="Cupons"
      subtitle={`${cupons.length} cadastrado(s)`}
      rightAction={{ icon: "plus", onPress: openNew, label: "Novo cupom" }}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {isLoading ? (
        <SkeletonList count={4} variant="card" />
      ) : isError ? (
        <ErrorView error={error} onRetry={() => refetch()} />
      ) : cupons.length === 0 ? (
        <EmptyState
          icon="tag"
          title="Nenhum cupom criado"
          description="Crie códigos de desconto com validade e limite de uso."
          ctaLabel="Criar cupom"
          onCtaPress={openNew}
        />
      ) : (
        cupons.map((c) => (
          <View key={c.id} style={styles.card}>
            <View style={styles.cardTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.codigo}>{c.codigo}</Text>
                <Text style={styles.meta}>{fmtValor(c)}</Text>
              </View>
              <View style={[styles.statusPill, { backgroundColor: c.ativo ? colors.success + "22" : colors.textMuted + "22" }]}>
                <Text style={[styles.statusText, { color: c.ativo ? colors.success : colors.textMuted }]}>
                  {c.ativo ? "ATIVO" : "INATIVO"}
                </Text>
              </View>
            </View>
            <View style={styles.row}>
              <Text style={styles.metaSmall}>
                Usos: {c.usoAtual}{c.usoMaximo ? ` / ${c.usoMaximo}` : ""}
              </Text>
              {c.validadeFim ? (
                <Text style={styles.metaSmall}>
                  Até {new Date(c.validadeFim).toLocaleDateString("pt-BR")}
                </Text>
              ) : null}
            </View>
            <View style={styles.actions}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => toggleMut.mutate(c)}>
                <Feather name={c.ativo ? "pause" : "play"} size={14} color={colors.text} />
                <Text style={styles.actionText}>{c.ativo ? "Desativar" : "Ativar"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(c)}>
                <Feather name="edit-2" size={14} color={colors.text} />
                <Text style={styles.actionText}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => confirmDelete(c)}>
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
                <Text style={styles.modalTitle}>{editing ? "Editar cupom" : "Novo cupom"}</Text>
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

              <Text style={styles.label}>Código *</Text>
              <TextInput
                style={styles.input}
                value={form.codigo}
                onChangeText={(v) => setForm({ ...form, codigo: v })}
                placeholder="EX: PROMO10"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
              />

              <Text style={styles.label}>Tipo</Text>
              <View style={styles.segGroup}>
                {(["percentual", "valor"] as const).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.segBtn, form.tipo === t && styles.segBtnActive]}
                    onPress={() => setForm({ ...form, tipo: t })}
                  >
                    <Text style={[styles.segText, form.tipo === t && styles.segTextActive]}>
                      {t === "percentual" ? "Percentual (%)" : "Valor (R$)"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Valor *</Text>
              <TextInput
                style={styles.input}
                value={form.valor}
                onChangeText={(v) => setForm({ ...form, valor: v })}
                placeholder={form.tipo === "percentual" ? "10" : "20.00"}
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
              />

              <Text style={styles.label}>Validade início (AAAA-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={form.validadeInicio}
                onChangeText={(v) => setForm({ ...form, validadeInicio: v })}
                placeholder="2026-01-01"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
              />

              <Text style={styles.label}>Validade fim (AAAA-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={form.validadeFim}
                onChangeText={(v) => setForm({ ...form, validadeFim: v })}
                placeholder="2026-12-31"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
              />

              <Text style={styles.label}>Limite de uso</Text>
              <TextInput
                style={styles.input}
                value={form.usoMaximo}
                onChangeText={(v) => setForm({ ...form, usoMaximo: v.replace(/\D/g, "") })}
                placeholder="Ilimitado"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
              />

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
                {saveMut.isPending ? (
                  <ActivityIndicator color={colors.invertedText} />
                ) : (
                  <Text style={styles.saveBtnText}>{editing ? "Salvar alterações" : "Criar cupom"}</Text>
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
    backgroundColor: c.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: c.surfaceBorder,
  },
  cardTop: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  codigo: { fontSize: 16, fontFamily: "Inter_700Bold", color: c.text, letterSpacing: 0.5 },
  meta: { fontSize: 13, fontFamily: "Inter_500Medium", color: c.accent, marginTop: 2 },
  metaSmall: { fontSize: 12, fontFamily: "Inter_400Regular", color: c.textSecondary },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
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
    padding: 20, paddingBottom: 32, maxHeight: "90%",
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
    borderRadius: 12, paddingHorizontal: 14, height: 46,
    color: c.text, fontSize: 15, fontFamily: "Inter_400Regular",
  },
  segGroup: { flexDirection: "row", gap: 8 },
  segBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    backgroundColor: c.surface, borderWidth: 1, borderColor: c.surfaceBorder,
    alignItems: "center",
  },
  segBtnActive: { backgroundColor: c.accent + "22", borderColor: c.accent },
  segText: { fontSize: 13, fontFamily: "Inter_500Medium", color: c.textSecondary },
  segTextActive: { color: c.accent },
  switchRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginTop: 16, paddingVertical: 4,
  },
  switchLabel: { fontSize: 14, fontFamily: "Inter_500Medium", color: c.text },
  saveBtn: {
    marginTop: 18, backgroundColor: c.accent, borderRadius: 12,
    height: 50, alignItems: "center", justifyContent: "center",
  },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: c.invertedText },
});
