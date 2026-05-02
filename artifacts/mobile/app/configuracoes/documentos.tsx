import React, { useMemo, useState } from "react";
import { Alert, FlatList, Linking, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { ScreenContainer } from "@/components/ScreenContainer";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonList } from "@/components/Skeleton";
import { fetchJson, getErrorMessage } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

type Documento = {
  id: number;
  clienteId: number | null;
  titulo: string;
  tipo: string | null;
  url: string | null;
  conteudo: string | null;
};

type Form = {
  id?: number;
  titulo: string;
  tipo: string;
  url: string;
  conteudo: string;
};

const EMPTY_FORM: Form = { titulo: "", tipo: "termo", url: "", conteudo: "" };

const TIPOS = ["termo", "contrato", "modelo", "outro"];

export default function DocumentosScreen() {
  const { barbeariaId } = useAuth();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Form | null>(null);

  const query = useQuery<Documento[]>({
    queryKey: ["documentos", barbeariaId],
    enabled: !!barbeariaId,
    queryFn: async () => {
      const r = await fetchJson<Documento[]>(`/barbearias/${barbeariaId}/documentos`);
      return Array.isArray(r) ? r.filter((d) => !d.clienteId) : [];
    },
  });

  const upsertMutation = useMutation({
    mutationFn: (f: Form) => {
      const body = { titulo: f.titulo, tipo: f.tipo, url: f.url || null, conteudo: f.conteudo || null };
      return f.id
        ? fetchJson(`/barbearias/${barbeariaId}/documentos/${f.id}`, { method: "PUT", body })
        : fetchJson(`/barbearias/${barbeariaId}/documentos`, { method: "POST", body });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documentos", barbeariaId] });
      setEditing(null);
    },
    onError: (e) => Alert.alert("Erro", getErrorMessage(e)),
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => fetchJson(`/barbearias/${barbeariaId}/documentos/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documentos", barbeariaId] }),
    onError: (e) => Alert.alert("Erro", getErrorMessage(e)),
  });

  const filtered = useMemo(() => {
    const data = query.data ?? [];
    if (!search) return data;
    const t = search.toLowerCase();
    return data.filter((d) => d.titulo.toLowerCase().includes(t) || (d.tipo || "").toLowerCase().includes(t));
  }, [query.data, search]);

  const handleOpen = async (url: string) => {
    try {
      const ok = await Linking.canOpenURL(url);
      if (ok) Linking.openURL(url);
      else Alert.alert("Link inválido", url);
    } catch {
      Alert.alert("Não foi possível abrir o link");
    }
  };

  return (
    <ScreenContainer
      title="Documentos"
      subtitle="Modelos de termos e contratos"
      scroll={false}
      contentPadding={false}
      rightAction={{ icon: "plus", label: "Novo documento", onPress: () => setEditing({ ...EMPTY_FORM }) }}
    >
      <FlatList
        data={filtered}
        keyExtractor={(d) => String(d.id)}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 + insets.bottom }}
        ListHeaderComponent={
          <View style={styles.searchWrap}>
            <Feather name="search" size={14} color={Colors.textMuted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Buscar documento…"
              placeholderTextColor={Colors.textMuted}
              style={styles.search}
            />
          </View>
        }
        ListEmptyComponent={
          query.isLoading ? (
            <SkeletonList count={3} variant="card" />
          ) : query.isError ? (
            <EmptyState icon="alert-triangle" title="Erro" description={getErrorMessage(query.error)} />
          ) : (
            <EmptyState icon="file-text" title="Sem documentos" description="Toque em + para cadastrar um modelo." />
          )
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.iconWrap}><Feather name="file-text" size={18} color={Colors.accent} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{item.titulo}</Text>
              <Text style={styles.subtitle}>{item.tipo || "outro"}</Text>
              {item.url ? (
                <Pressable onPress={() => item.url && handleOpen(item.url)} hitSlop={6}>
                  <Text style={styles.link} numberOfLines={1}>{item.url}</Text>
                </Pressable>
              ) : null}
            </View>
            <View style={styles.actions}>
              <Pressable
                hitSlop={8}
                onPress={() =>
                  setEditing({
                    id: item.id,
                    titulo: item.titulo,
                    tipo: item.tipo || "outro",
                    url: item.url || "",
                    conteudo: item.conteudo || "",
                  })
                }
                style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.6 }]}
              >
                <Feather name="edit-2" size={14} color={Colors.text} />
              </Pressable>
              <Pressable
                hitSlop={8}
                onPress={() => Alert.alert("Remover", `Remover "${item.titulo}"?`, [
                  { text: "Cancelar", style: "cancel" },
                  { text: "Remover", style: "destructive", onPress: () => removeMutation.mutate(item.id) },
                ])}
                style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.6 }]}
              >
                <Feather name="trash-2" size={14} color={Colors.error} />
              </Pressable>
            </View>
          </View>
        )}
      />

      <Modal visible={!!editing} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <Pressable style={styles.backdrop} onPress={() => setEditing(null)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.modalTitle}>{editing?.id ? "Editar documento" : "Novo documento"}</Text>

            <Text style={styles.label}>Título</Text>
            <TextInput
              value={editing?.titulo ?? ""}
              onChangeText={(t) => setEditing((f) => (f ? { ...f, titulo: t } : f))}
              placeholder="Ex.: Termo de consentimento"
              placeholderTextColor={Colors.textMuted}
              style={styles.input}
            />

            <Text style={styles.label}>Tipo</Text>
            <View style={styles.chips}>
              {TIPOS.map((t) => (
                <Pressable
                  key={t}
                  onPress={() => setEditing((f) => (f ? { ...f, tipo: t } : f))}
                  style={[styles.chip, editing?.tipo === t && styles.chipActive]}
                >
                  <Text style={[styles.chipText, editing?.tipo === t && { color: "#000" }]}>{t}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>URL (opcional)</Text>
            <TextInput
              value={editing?.url ?? ""}
              onChangeText={(t) => setEditing((f) => (f ? { ...f, url: t } : f))}
              placeholder="https://…"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              style={styles.input}
            />

            <Text style={styles.label}>Conteúdo (opcional)</Text>
            <TextInput
              value={editing?.conteudo ?? ""}
              onChangeText={(t) => setEditing((f) => (f ? { ...f, conteudo: t } : f))}
              placeholder="Texto do documento…"
              placeholderTextColor={Colors.textMuted}
              multiline
              style={[styles.input, { minHeight: 110, textAlignVertical: "top" }]}
            />

            <View style={styles.modalActions}>
              <Pressable style={[styles.btn, styles.btnGhost]} onPress={() => setEditing(null)}>
                <Text style={styles.btnGhostText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.btn, styles.btnPrimary, (!editing?.titulo || upsertMutation.isPending) && { opacity: 0.5 }]}
                disabled={!editing?.titulo || upsertMutation.isPending}
                onPress={() => editing && upsertMutation.mutate(editing)}
              >
                <Text style={styles.btnPrimaryText}>{upsertMutation.isPending ? "Salvando…" : "Salvar"}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.surfaceBorder,
    paddingHorizontal: 12, paddingVertical: Platform.OS === "ios" ? 10 : 6, marginBottom: 10,
  },
  search: { flex: 1, color: Colors.text, fontFamily: "Inter_500Medium", fontSize: 13 },
  card: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.surfaceBorder,
    padding: 12, marginBottom: 8,
  },
  iconWrap: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(196,164,106,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  title: { color: Colors.text, fontFamily: "Inter_600SemiBold", fontSize: 13 },
  subtitle: { color: Colors.textMuted, fontFamily: "Inter_500Medium", fontSize: 11, marginTop: 2 },
  link: { color: Colors.accent, fontFamily: "Inter_500Medium", fontSize: 11, marginTop: 6 },
  actions: { flexDirection: "row", gap: 6 },
  actionBtn: {
    width: 32, height: 32, borderRadius: 8, backgroundColor: Colors.surfaceLight,
    borderWidth: 1, borderColor: Colors.surfaceBorder, alignItems: "center", justifyContent: "center",
  },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 18, maxHeight: "92%",
  },
  modalTitle: { color: Colors.text, fontFamily: "Inter_700Bold", fontSize: 15, marginBottom: 8 },
  label: { color: Colors.textMuted, fontFamily: "Inter_500Medium", fontSize: 11, marginTop: 10, marginBottom: 4 },
  input: {
    backgroundColor: Colors.surfaceLight, borderRadius: 10, borderWidth: 1, borderColor: Colors.surfaceBorder,
    paddingHorizontal: 12, paddingVertical: 10, color: Colors.text, fontFamily: "Inter_500Medium", fontSize: 13,
  },
  chips: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  chip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
    backgroundColor: Colors.surfaceLight, borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  chipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  chipText: { color: Colors.textSecondary, fontFamily: "Inter_600SemiBold", fontSize: 12 },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 14 },
  btn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  btnGhost: { backgroundColor: Colors.surfaceLight, borderWidth: 1, borderColor: Colors.surfaceBorder },
  btnGhostText: { color: Colors.text, fontFamily: "Inter_600SemiBold", fontSize: 13 },
  btnPrimary: { backgroundColor: Colors.accent },
  btnPrimaryText: { color: "#000", fontFamily: "Inter_600SemiBold", fontSize: 13 },
});
