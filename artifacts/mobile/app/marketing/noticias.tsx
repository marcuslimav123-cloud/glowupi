import React, { useCallback, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Modal, KeyboardAvoidingView, Platform, Switch, Alert, Image,
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

interface Noticia {
  id: number;
  titulo: string;
  conteudo: string;
  imagemUrl: string | null;
  publicadoEm: string | null;
  ativo: boolean;
  createdAt: string;
}

type FormState = {
  titulo: string;
  conteudo: string;
  imagemUrl: string;
  publicadoEm: string;
  ativo: boolean;
};

const empty: FormState = { titulo: "", conteudo: "", imagemUrl: "", publicadoEm: "", ativo: true };

export default function NoticiasScreen() {
  const { barbeariaId } = useAuth();
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Noticia | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: noticias = [], isLoading, isError, error, refetch } = useQuery<Noticia[]>({
    queryKey: ["noticias", barbeariaId],
    queryFn: () => fetchJson(`/barbearias/${barbeariaId}/noticias`),
    enabled: !!barbeariaId,
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!form.titulo.trim()) throw new Error("Título obrigatório");
      if (!form.conteudo.trim()) throw new Error("Conteúdo obrigatório");
      const body = {
        titulo: form.titulo.trim(),
        conteudo: form.conteudo.trim(),
        imagemUrl: form.imagemUrl.trim() || null,
        publicadoEm: form.publicadoEm.trim() || null,
        ativo: form.ativo,
      };
      if (editing) {
        return fetchJson(`/barbearias/${barbeariaId}/noticias/${editing.id}`, { method: "PUT", body });
      }
      return fetchJson(`/barbearias/${barbeariaId}/noticias`, { method: "POST", body });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["noticias"] });
      setModalOpen(false); setEditing(null); setForm(empty); setFormError(null);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (e) => setFormError(getErrorMessage(e)),
  });

  const toggleMut = useMutation({
    mutationFn: (n: Noticia) =>
      fetchJson(`/barbearias/${barbeariaId}/noticias/${n.id}`, { method: "PUT", body: { ativo: !n.ativo } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["noticias"] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) =>
      fetchJson(`/barbearias/${barbeariaId}/noticias/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["noticias"] }),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await refetch(); setRefreshing(false);
  }, [refetch]);

  const openNew = () => { setEditing(null); setForm(empty); setFormError(null); setModalOpen(true); };
  const openEdit = (n: Noticia) => {
    setEditing(n);
    setForm({
      titulo: n.titulo,
      conteudo: n.conteudo,
      imagemUrl: n.imagemUrl || "",
      publicadoEm: n.publicadoEm ? n.publicadoEm.slice(0, 10) : "",
      ativo: n.ativo,
    });
    setFormError(null); setModalOpen(true);
  };
  const onDelete = (n: Noticia) => {
    if (Platform.OS === "web") {
      if (window.confirm(`Excluir "${n.titulo}"?`)) deleteMut.mutate(n.id);
    } else {
      Alert.alert("Excluir notícia", `Excluir "${n.titulo}"?`, [
        { text: "Cancelar", style: "cancel" },
        { text: "Excluir", style: "destructive", onPress: () => deleteMut.mutate(n.id) },
      ]);
    }
  };

  return (
    <ScreenContainer
      title="Notícias para clientes"
      subtitle={`${noticias.length} publicada(s)`}
      rightAction={{ icon: "plus", onPress: openNew, label: "Nova notícia" }}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {isLoading ? (
        <SkeletonList count={3} variant="card" />
      ) : isError ? (
        <ErrorView error={error} onRetry={() => refetch()} />
      ) : noticias.length === 0 ? (
        <EmptyState
          icon="rss"
          title="Nenhuma notícia"
          description="Compartilhe novidades, promoções e avisos com os clientes."
          ctaLabel="Criar notícia"
          onCtaPress={openNew}
        />
      ) : (
        noticias
          .slice()
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .map((n) => (
            <View key={n.id} style={styles.card}>
              {n.imagemUrl ? (
                <Image source={{ uri: n.imagemUrl }} style={styles.image} resizeMode="cover" />
              ) : null}
              <View style={styles.cardBody}>
                <View style={styles.cardTop}>
                  <Text style={styles.titulo} numberOfLines={2}>{n.titulo}</Text>
                  <View style={[styles.pill, { backgroundColor: n.ativo ? Colors.success + "22" : Colors.textMuted + "22" }]}>
                    <Text style={[styles.pillText, { color: n.ativo ? Colors.success : Colors.textMuted }]}>
                      {n.ativo ? "ATIVO" : "INATIVO"}
                    </Text>
                  </View>
                </View>
                <Text style={styles.conteudo} numberOfLines={3}>{n.conteudo}</Text>
                {n.publicadoEm ? (
                  <Text style={styles.meta}>Publicado em {new Date(n.publicadoEm).toLocaleDateString("pt-BR")}</Text>
                ) : null}
                <View style={styles.actions}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => toggleMut.mutate(n)}>
                    <Feather name={n.ativo ? "eye-off" : "eye"} size={14} color={Colors.text} />
                    <Text style={styles.actionText}>{n.ativo ? "Ocultar" : "Publicar"}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(n)}>
                    <Feather name="edit-2" size={14} color={Colors.text} />
                    <Text style={styles.actionText}>Editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => onDelete(n)}>
                    <Feather name="trash-2" size={14} color={Colors.error} />
                    <Text style={[styles.actionText, { color: Colors.error }]}>Excluir</Text>
                  </TouchableOpacity>
                </View>
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
                <Text style={styles.modalTitle}>{editing ? "Editar notícia" : "Nova notícia"}</Text>
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
                value={form.titulo}
                onChangeText={(v) => setForm({ ...form, titulo: v })}
                placeholder="Ex: Promoção de inverno"
                placeholderTextColor={Colors.textMuted}
              />

              <Text style={styles.label}>Conteúdo *</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                value={form.conteudo}
                onChangeText={(v) => setForm({ ...form, conteudo: v })}
                placeholder="Texto completo da notícia..."
                placeholderTextColor={Colors.textMuted}
                multiline
                textAlignVertical="top"
              />

              <Text style={styles.label}>URL da imagem</Text>
              <TextInput
                style={styles.input}
                value={form.imagemUrl}
                onChangeText={(v) => setForm({ ...form, imagemUrl: v })}
                placeholder="https://..."
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="none"
              />

              <Text style={styles.label}>Publicar em (AAAA-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={form.publicadoEm}
                onChangeText={(v) => setForm({ ...form, publicadoEm: v })}
                placeholder="2026-01-15"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="none"
              />

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Ativo (visível ao cliente)</Text>
                <Switch
                  value={form.ativo}
                  onValueChange={(v) => setForm({ ...form, ativo: v })}
                  trackColor={{ false: Colors.surfaceLight, true: Colors.accent + "80" }}
                  thumbColor={form.ativo ? Colors.accent : "#888"}
                />
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, saveMut.isPending && { opacity: 0.6 }]}
                onPress={() => { setFormError(null); saveMut.mutate(); }}
                disabled={saveMut.isPending}
              >
                {saveMut.isPending ? <ActivityIndicator color="#000" /> : (
                  <Text style={styles.saveBtnText}>{editing ? "Salvar alterações" : "Publicar"}</Text>
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
  card: {
    backgroundColor: Colors.surface, borderRadius: 14, marginBottom: 10,
    borderWidth: 1, borderColor: Colors.surfaceBorder, overflow: "hidden",
  },
  image: { width: "100%", height: 140, backgroundColor: Colors.surfaceLight },
  cardBody: { padding: 14 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 6 },
  titulo: { flex: 1, fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.text },
  conteudo: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary, lineHeight: 18, marginBottom: 6 },
  meta: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginBottom: 10 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  pillText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  actions: { flexDirection: "row", gap: 8, borderTopWidth: 1, borderTopColor: Colors.surfaceBorder, paddingTop: 10, marginTop: 4 },
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
  switchRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginTop: 14, paddingVertical: 4,
  },
  switchLabel: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.text },
  saveBtn: {
    marginTop: 18, backgroundColor: Colors.accent, borderRadius: 12,
    height: 50, alignItems: "center", justifyContent: "center",
  },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#000" },
});
