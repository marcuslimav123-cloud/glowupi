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
import { fetchJson, formatCurrency, getErrorMessage } from "@/lib/api";

interface Vantagem {
  id: number;
  nome: string;
  descricao: string | null;
  tipo: string;
  valorDesconto: number | null;
  percentualDesconto: number | null;
  pontosNecessarios: number | null;
  ativo: boolean;
  createdAt: string;
}

type FormState = {
  nome: string;
  descricao: string;
  tipo: "desconto_valor" | "desconto_percentual" | "servico_gratis";
  valorDesconto: string;
  percentualDesconto: string;
  pontosNecessarios: string;
  ativo: boolean;
};

const empty: FormState = {
  nome: "", descricao: "", tipo: "desconto_percentual",
  valorDesconto: "", percentualDesconto: "", pontosNecessarios: "100", ativo: true,
};

const TIPOS = [
  { value: "desconto_percentual", label: "% off" },
  { value: "desconto_valor", label: "R$ off" },
  { value: "servico_gratis", label: "Serviço grátis" },
] as const;

export default function FidelidadeScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { barbeariaId } = useAuth();
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Vantagem | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: vantagens = [], isLoading, isError, error, refetch } = useQuery<Vantagem[]>({
    queryKey: ["clube-vantagens", barbeariaId],
    queryFn: () => fetchJson(`/barbearias/${barbeariaId}/clube-vantagens`),
    enabled: !!barbeariaId,
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!form.nome.trim()) throw new Error("Nome obrigatório");
      let valorDesconto: number | null = null;
      let percentualDesconto: number | null = null;
      if (form.tipo === "desconto_valor") {
        const v = parseFloat(form.valorDesconto.replace(",", "."));
        if (Number.isNaN(v) || v <= 0) throw new Error("Valor de desconto inválido");
        valorDesconto = v;
      } else if (form.tipo === "desconto_percentual") {
        const p = parseFloat(form.percentualDesconto.replace(",", "."));
        if (Number.isNaN(p) || p <= 0 || p > 100) throw new Error("Percentual inválido");
        percentualDesconto = p;
      }
      const body = {
        nome: form.nome.trim(),
        descricao: form.descricao.trim() || null,
        tipo: form.tipo,
        pontosNecessarios: form.pontosNecessarios ? parseInt(form.pontosNecessarios, 10) : 0,
        ativo: form.ativo,
        valorDesconto,
        percentualDesconto,
      };
      if (editing) {
        return fetchJson(`/barbearias/${barbeariaId}/clube-vantagens/${editing.id}`, { method: "PUT", body });
      }
      return fetchJson(`/barbearias/${barbeariaId}/clube-vantagens`, { method: "POST", body });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clube-vantagens"] });
      setModalOpen(false); setEditing(null); setForm(empty); setFormError(null);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (e) => setFormError(getErrorMessage(e)),
  });

  const toggleMut = useMutation({
    mutationFn: (v: Vantagem) =>
      fetchJson(`/barbearias/${barbeariaId}/clube-vantagens/${v.id}`, { method: "PUT", body: { ativo: !v.ativo } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clube-vantagens"] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) =>
      fetchJson(`/barbearias/${barbeariaId}/clube-vantagens/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clube-vantagens"] }),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await refetch(); setRefreshing(false);
  }, [refetch]);

  const openNew = () => {
    setEditing(null); setForm(empty); setFormError(null); setModalOpen(true);
  };
  const openEdit = (v: Vantagem) => {
    setEditing(v);
    setForm({
      nome: v.nome,
      descricao: v.descricao || "",
      tipo: (v.tipo as FormState["tipo"]) || "desconto_percentual",
      valorDesconto: v.valorDesconto != null ? String(v.valorDesconto) : "",
      percentualDesconto: v.percentualDesconto != null ? String(v.percentualDesconto) : "",
      pontosNecessarios: v.pontosNecessarios != null ? String(v.pontosNecessarios) : "0",
      ativo: v.ativo,
    });
    setFormError(null); setModalOpen(true);
  };
  const onDelete = (v: Vantagem) => {
    if (Platform.OS === "web") {
      if (window.confirm(`Excluir "${v.nome}"?`)) deleteMut.mutate(v.id);
    } else {
      Alert.alert("Excluir vantagem", `Excluir "${v.nome}"?`, [
        { text: "Cancelar", style: "cancel" },
        { text: "Excluir", style: "destructive", onPress: () => deleteMut.mutate(v.id) },
      ]);
    }
  };

  const describeBenefit = (v: Vantagem) => {
    if (v.tipo === "desconto_percentual" && v.percentualDesconto != null) return `${v.percentualDesconto}% off`;
    if (v.tipo === "desconto_valor" && v.valorDesconto != null) return `${formatCurrency(v.valorDesconto)} off`;
    if (v.tipo === "servico_gratis") return "Serviço grátis";
    return v.tipo;
  };

  return (
    <ScreenContainer
      title="Clube de vantagens"
      subtitle={`${vantagens.length} vantagem(ns)`}
      rightAction={{ icon: "plus", onPress: openNew, label: "Nova vantagem" }}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <View style={styles.infoBox}>
        <Feather name="info" size={14} color={colors.accent} />
        <Text style={styles.infoText}>
          Configure quantos pontos os clientes precisam acumular para resgatar cada vantagem.
        </Text>
      </View>

      {isLoading ? (
        <SkeletonList count={3} variant="card" />
      ) : isError ? (
        <ErrorView error={error} onRetry={() => refetch()} />
      ) : vantagens.length === 0 ? (
        <EmptyState
          icon="award"
          title="Nenhuma vantagem"
          description="Crie a primeira vantagem do seu programa de fidelidade."
          ctaLabel="Criar vantagem"
          onCtaPress={openNew}
        />
      ) : (
        vantagens.map((v) => (
          <View key={v.id} style={styles.card}>
            <View style={styles.cardTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.nome}>{v.nome}</Text>
                <Text style={styles.beneficio}>{describeBenefit(v)}</Text>
              </View>
              <View style={[styles.pill, { backgroundColor: v.ativo ? colors.success + "22" : colors.textMuted + "22" }]}>
                <Text style={[styles.pillText, { color: v.ativo ? colors.success : colors.textMuted }]}>
                  {v.ativo ? "ATIVO" : "INATIVO"}
                </Text>
              </View>
            </View>
            {v.descricao ? <Text style={styles.descricao} numberOfLines={2}>{v.descricao}</Text> : null}
            <Text style={styles.pontos}>
              <Feather name="star" size={11} color={colors.accent} /> {v.pontosNecessarios ?? 0} pontos para resgate
            </Text>
            <View style={styles.actions}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => toggleMut.mutate(v)}>
                <Feather name={v.ativo ? "pause" : "play"} size={14} color={colors.text} />
                <Text style={styles.actionText}>{v.ativo ? "Desativar" : "Ativar"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(v)}>
                <Feather name="edit-2" size={14} color={colors.text} />
                <Text style={styles.actionText}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => onDelete(v)}>
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
                <Text style={styles.modalTitle}>{editing ? "Editar vantagem" : "Nova vantagem"}</Text>
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

              <Text style={styles.label}>Nome *</Text>
              <TextInput
                style={styles.input}
                value={form.nome}
                onChangeText={(v) => setForm({ ...form, nome: v })}
                placeholder="Ex: Corte grátis"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.label}>Descrição</Text>
              <TextInput
                style={[styles.input, { minHeight: 60 }]}
                value={form.descricao}
                onChangeText={(v) => setForm({ ...form, descricao: v })}
                placeholder="Detalhes da recompensa"
                placeholderTextColor={colors.textMuted}
                multiline
                textAlignVertical="top"
              />

              <Text style={styles.label}>Tipo de benefício</Text>
              <View style={styles.segGroup}>
                {TIPOS.map((t) => (
                  <TouchableOpacity
                    key={t.value}
                    style={[styles.segBtn, form.tipo === t.value && styles.segBtnActive]}
                    onPress={() => setForm({ ...form, tipo: t.value })}
                  >
                    <Text style={[styles.segText, form.tipo === t.value && styles.segTextActive]}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {form.tipo === "desconto_percentual" ? (
                <>
                  <Text style={styles.label}>Percentual (%)</Text>
                  <TextInput
                    style={styles.input}
                    value={form.percentualDesconto}
                    onChangeText={(v) => setForm({ ...form, percentualDesconto: v })}
                    placeholder="10"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                  />
                </>
              ) : null}
              {form.tipo === "desconto_valor" ? (
                <>
                  <Text style={styles.label}>Valor (R$)</Text>
                  <TextInput
                    style={styles.input}
                    value={form.valorDesconto}
                    onChangeText={(v) => setForm({ ...form, valorDesconto: v })}
                    placeholder="20.00"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                  />
                </>
              ) : null}

              <Text style={styles.label}>Pontos necessários</Text>
              <TextInput
                style={styles.input}
                value={form.pontosNecessarios}
                onChangeText={(v) => setForm({ ...form, pontosNecessarios: v.replace(/\D/g, "") })}
                placeholder="100"
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
                {saveMut.isPending ? <ActivityIndicator color={colors.invertedText} /> : (
                  <Text style={styles.saveBtnText}>{editing ? "Salvar alterações" : "Criar vantagem"}</Text>
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
  infoBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: c.accent + "10", borderColor: c.accent + "30",
    borderWidth: 1, padding: 10, borderRadius: 10, marginBottom: 12,
  },
  infoText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: c.text, lineHeight: 17 },
  card: {
    backgroundColor: c.surface, borderRadius: 14, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: c.surfaceBorder,
  },
  cardTop: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  nome: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: c.text },
  beneficio: { fontSize: 13, fontFamily: "Inter_500Medium", color: c.accent, marginTop: 2 },
  descricao: { fontSize: 12, fontFamily: "Inter_400Regular", color: c.textSecondary, marginBottom: 6 },
  pontos: { fontSize: 12, fontFamily: "Inter_500Medium", color: c.textSecondary, marginBottom: 10 },
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
  segGroup: { flexDirection: "row", gap: 8 },
  segBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    backgroundColor: c.surface, borderWidth: 1, borderColor: c.surfaceBorder,
    alignItems: "center",
  },
  segBtnActive: { backgroundColor: c.accent + "22", borderColor: c.accent },
  segText: { fontSize: 12, fontFamily: "Inter_500Medium", color: c.textSecondary },
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
