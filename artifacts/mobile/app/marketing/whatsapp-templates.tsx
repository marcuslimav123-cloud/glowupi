import React, { useCallback, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Modal, KeyboardAvoidingView, Platform, Alert,
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

interface Template {
  id: number;
  tipo: string;
  titulo: string;
  conteudo: string;
  categoria: string;
  favorito: boolean;
  arquivado: boolean;
  ativo: boolean;
  createdAt: string;
}

const CATEGORIAS: Array<{ value: string; label: string; icon: keyof typeof Feather.glyphMap }> = [
  { value: "confirmacao", label: "Confirmação", icon: "check-circle" },
  { value: "lembrete", label: "Lembrete", icon: "bell" },
  { value: "pos_agendamento", label: "Pós-atendimento", icon: "thumbs-up" },
  { value: "aniversario", label: "Aniversário", icon: "gift" },
  { value: "retorno", label: "Recuperação/Retorno", icon: "rotate-ccw" },
  { value: "campanha", label: "Campanha", icon: "send" },
  { value: "regulamento", label: "Regulamento", icon: "file-text" },
  { value: "outro", label: "Outro", icon: "message-circle" },
];

const PLACEHOLDERS = ["{cliente}", "{servico}", "{data}", "{hora}", "{profissional}", "{salao}", "{valor}"];

export default function WhatsappTemplatesScreen() {
  const { barbeariaId } = useAuth();
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [categoria, setCategoria] = useState<string>("confirmacao");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const { data: templates = [], isLoading, isError, error, refetch } = useQuery<Template[]>({
    queryKey: ["wa-templates", barbeariaId, categoria],
    queryFn: () => fetchJson(`/barbearias/${barbeariaId}/mensagens-padrao?categoria=${categoria}&arquivado=false`),
    enabled: !!barbeariaId,
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!titulo.trim()) throw new Error("Título obrigatório");
      if (!conteudo.trim()) throw new Error("Conteúdo obrigatório");
      const body = { titulo: titulo.trim(), conteudo: conteudo.trim(), categoria };
      if (editing) {
        return fetchJson(`/barbearias/${barbeariaId}/mensagens-padrao/${editing.id}`, { method: "PUT", body });
      }
      return fetchJson(`/barbearias/${barbeariaId}/mensagens-padrao`, { method: "POST", body });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wa-templates"] });
      setModalOpen(false); setEditing(null); setTitulo(""); setConteudo(""); setFormError(null);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (e) => setFormError(getErrorMessage(e)),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) =>
      fetchJson(`/barbearias/${barbeariaId}/mensagens-padrao/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wa-templates"] }),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await refetch(); setRefreshing(false);
  }, [refetch]);

  const openNew = () => {
    setEditing(null); setTitulo(""); setConteudo(""); setFormError(null); setModalOpen(true);
  };
  const openEdit = (t: Template) => {
    setEditing(t); setTitulo(t.titulo); setConteudo(t.conteudo); setFormError(null); setModalOpen(true);
  };
  const onDelete = (t: Template) => {
    if (Platform.OS === "web") {
      if (window.confirm(`Excluir template "${t.titulo}"?`)) deleteMut.mutate(t.id);
    } else {
      Alert.alert("Excluir template", `Excluir "${t.titulo}"?`, [
        { text: "Cancelar", style: "cancel" },
        { text: "Excluir", style: "destructive", onPress: () => deleteMut.mutate(t.id) },
      ]);
    }
  };

  const insertPlaceholder = (p: string) => setConteudo((c) => c + p);

  const renderPreview = (text: string) => {
    const sample: Record<string, string> = {
      cliente: "João Silva",
      servico: "Corte + Barba",
      data: "15/03/2026",
      hora: "14:30",
      profissional: "Marcelo",
      salao: "Barbearia Demo",
      valor: "R$ 65,00",
    };
    return text.replace(/\{(\w+)\}/g, (m, k) => sample[k] ?? m);
  };

  return (
    <ScreenContainer
      title="Templates do WhatsApp"
      subtitle={CATEGORIAS.find((c) => c.value === categoria)?.label}
      rightAction={{ icon: "plus", onPress: openNew, label: "Novo template" }}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsRow}
      >
        {CATEGORIAS.map((c) => (
          <TouchableOpacity
            key={c.value}
            style={[styles.tab, categoria === c.value && styles.tabActive]}
            onPress={() => setCategoria(c.value)}
          >
            <Feather name={c.icon} size={13} color={categoria === c.value ? Colors.accent : Colors.textSecondary} />
            <Text style={[styles.tabText, categoria === c.value && styles.tabTextActive]}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <SkeletonList count={3} variant="card" />
      ) : isError ? (
        <ErrorView error={error} onRetry={() => refetch()} />
      ) : templates.length === 0 ? (
        <EmptyState
          icon="send"
          title="Nenhum template"
          description={`Crie modelos de mensagem de ${CATEGORIAS.find((c) => c.value === categoria)?.label.toLowerCase()}.`}
          ctaLabel="Criar template"
          onCtaPress={openNew}
        />
      ) : (
        templates.map((t) => (
          <View key={t.id} style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.titulo} numberOfLines={1}>{t.titulo}</Text>
              {t.favorito ? <Feather name="star" size={14} color={Colors.accent} /> : null}
            </View>
            <Text style={styles.conteudo} numberOfLines={4}>{t.conteudo}</Text>
            <View style={styles.actions}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(t)}>
                <Feather name="edit-2" size={14} color={Colors.text} />
                <Text style={styles.actionText}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => onDelete(t)}>
                <Feather name="trash-2" size={14} color={Colors.error} />
                <Text style={[styles.actionText, { color: Colors.error }]}>Excluir</Text>
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
                <Text style={styles.modalTitle}>{editing ? "Editar template" : "Novo template"}</Text>
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

              <Text style={styles.label}>Título *</Text>
              <TextInput
                style={styles.input}
                value={titulo}
                onChangeText={setTitulo}
                placeholder="Ex: Confirmação amistosa"
                placeholderTextColor={Colors.textMuted}
              />

              <Text style={styles.label}>Conteúdo *</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                value={conteudo}
                onChangeText={setConteudo}
                placeholder="Olá {cliente}! Confirma seu horário às {hora}?"
                placeholderTextColor={Colors.textMuted}
                multiline
                textAlignVertical="top"
              />

              <Text style={styles.hint}>Toque para inserir variáveis:</Text>
              <View style={styles.placeholderRow}>
                {PLACEHOLDERS.map((p) => (
                  <TouchableOpacity key={p} style={styles.placeholderChip} onPress={() => insertPlaceholder(p)}>
                    <Text style={styles.placeholderText}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {conteudo.trim() ? (
                <>
                  <Text style={styles.label}>Pré-visualização</Text>
                  <View style={styles.previewBubble}>
                    <Text style={styles.previewBubbleText}>{renderPreview(conteudo)}</Text>
                  </View>
                </>
              ) : null}

              <TouchableOpacity
                style={[styles.saveBtn, saveMut.isPending && { opacity: 0.6 }]}
                onPress={() => { setFormError(null); saveMut.mutate(); }}
                disabled={saveMut.isPending}
              >
                {saveMut.isPending ? <ActivityIndicator color="#000" /> : (
                  <Text style={styles.saveBtnText}>{editing ? "Salvar alterações" : "Criar template"}</Text>
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
  tabsRow: { gap: 8, paddingBottom: 12 },
  tab: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  tabActive: { backgroundColor: Colors.accent + "22", borderColor: Colors.accent },
  tabText: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  tabTextActive: { color: Colors.accent },
  card: {
    backgroundColor: Colors.surface, borderRadius: 14, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  titulo: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.text, flex: 1 },
  conteudo: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary, lineHeight: 19 },
  actions: { flexDirection: "row", gap: 8, marginTop: 12, borderTopWidth: 1, borderTopColor: Colors.surfaceBorder, paddingTop: 10 },
  actionBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: Colors.surfaceLight, borderRadius: 8,
  },
  actionText: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.text },
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
  hint: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginTop: 10, marginBottom: 6 },
  placeholderRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  placeholderChip: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
    backgroundColor: Colors.surfaceLight, borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  placeholderText: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.accent },
  previewBubble: {
    backgroundColor: "#1f3b2c", borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: Colors.success + "44",
  },
  previewBubbleText: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.text, lineHeight: 19 },
  saveBtn: {
    marginTop: 18, backgroundColor: Colors.accent, borderRadius: 12,
    height: 50, alignItems: "center", justifyContent: "center",
  },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#000" },
});
