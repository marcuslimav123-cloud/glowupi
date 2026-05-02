import React, { useMemo, useState } from "react";
import { Alert, FlatList, Modal, Platform, Pressable, RefreshControl, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useColors, type ColorPalette } from "@/lib/theme";
import { ScreenContainer } from "@/components/ScreenContainer";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonList } from "@/components/Skeleton";
import { fetchJson, getErrorMessage } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

type Membro = {
  id: number;
  nome: string;
  email: string;
  role: "dono" | "gerente" | "colaborador";
  ativo?: boolean;
  fotoUrl?: string | null;
  profissionalId?: number | null;
  profissionalNome?: string | null;
};

const ROLE_LABELS: Record<string, string> = {
  dono: "Proprietário",
  gerente: "Gerente",
  colaborador: "Colaborador",
};

type Editing = { id: number; nome: string; role: "gerente" | "colaborador"; ativo: boolean } | null;

export default function MembrosScreen() {
  const { barbeariaId, user } = useAuth();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Editing>(null);

  const query = useQuery<Membro[]>({
    queryKey: ["equipe", barbeariaId],
    enabled: !!barbeariaId,
    queryFn: async () => {
      const r = await fetchJson<Membro[]>(`/convites/equipe`);
      return Array.isArray(r) ? r : [];
    },
  });

  const updateMutation = useMutation({
    mutationFn: (e: { id: number; role?: string; ativo?: boolean }) =>
      fetchJson(`/convites/equipe/${e.id}`, {
        method: "PATCH",
        body: { role: e.role, ativo: e.ativo },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["equipe", barbeariaId] });
      setEditing(null);
    },
    onError: (e) => Alert.alert("Erro", getErrorMessage(e)),
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => fetchJson(`/convites/equipe/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["equipe", barbeariaId] }),
    onError: (e) => Alert.alert("Erro", getErrorMessage(e)),
  });

  const filtered = useMemo(() => {
    const data = query.data ?? [];
    if (!search) return data;
    const t = search.toLowerCase();
    return data.filter((m) => m.nome.toLowerCase().includes(t) || m.email.toLowerCase().includes(t));
  }, [query.data, search]);

  return (
    <ScreenContainer title="Membros" subtitle="Equipe do estabelecimento" scroll={false} contentPadding={false}>
      <FlatList
        data={filtered}
        keyExtractor={(m) => String(m.id)}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 + insets.bottom }}
        refreshControl={<RefreshControl refreshing={query.isRefetching && !query.isLoading} onRefresh={() => query.refetch()} tintColor={colors.accent} colors={[colors.accent]} />}
        ListHeaderComponent={
          <View style={styles.searchWrap}>
            <Feather name="search" size={14} color={colors.textMuted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Buscar membro…"
              placeholderTextColor={colors.textMuted}
              style={styles.search}
            />
          </View>
        }
        ListEmptyComponent={
          query.isLoading ? <SkeletonList count={3} variant="card" /> :
          query.isError ? <EmptyState icon="alert-triangle" title="Erro" description={getErrorMessage(query.error)} /> :
          <EmptyState icon="users" title="Nenhum membro" description="Use a aba Convites para adicionar." />
        }
        renderItem={({ item }) => {
          const isMe = item.id === user?.id;
          const isOwner = item.role === "dono";
          const initials = (item.nome || "?").split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
          return (
            <View style={styles.card}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.titleRow}>
                  <Text style={styles.name}>{item.nome}</Text>
                  {isMe ? <Text style={styles.youBadge}>você</Text> : null}
                </View>
                <Text style={styles.email}>{item.email}</Text>
                <View style={styles.badges}>
                  <View style={[styles.badge, isOwner && { backgroundColor: "rgba(196,164,106,0.18)" }]}>
                    <Feather name="shield" size={10} color={isOwner ? colors.accent : colors.textSecondary} />
                    <Text style={[styles.badgeText, isOwner && { color: colors.accent }]}>{ROLE_LABELS[item.role]}</Text>
                  </View>
                  {item.profissionalNome ? (
                    <View style={styles.badge}>
                      <Feather name="user" size={10} color={colors.textSecondary} />
                      <Text style={styles.badgeText}>{item.profissionalNome}</Text>
                    </View>
                  ) : null}
                  {item.ativo === false ? (
                    <View style={[styles.badge, { backgroundColor: colors.error + "22" }]}>
                      <Text style={[styles.badgeText, { color: colors.error }]}>Inativo</Text>
                    </View>
                  ) : null}
                </View>
              </View>
              {!isOwner && !isMe ? (
                <View style={styles.actions}>
                  <Pressable
                    hitSlop={8}
                    onPress={() =>
                      setEditing({
                        id: item.id,
                        nome: item.nome,
                        role: item.role === "gerente" ? "gerente" : "colaborador",
                        ativo: item.ativo !== false,
                      })
                    }
                    style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.6 }]}
                  >
                    <Feather name="edit-2" size={14} color={colors.text} />
                  </Pressable>
                  <Pressable
                    hitSlop={8}
                    onPress={() =>
                      Alert.alert("Remover", `Remover ${item.nome} da equipe?`, [
                        { text: "Cancelar", style: "cancel" },
                        { text: "Remover", style: "destructive", onPress: () => removeMutation.mutate(item.id) },
                      ])
                    }
                    style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.6 }]}
                  >
                    <Feather name="trash-2" size={14} color={colors.error} />
                  </Pressable>
                </View>
              ) : null}
            </View>
          );
        }}
      />

      <Modal visible={!!editing} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <Pressable style={styles.backdrop} onPress={() => setEditing(null)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.modalTitle}>Editar {editing?.nome}</Text>

            <Text style={styles.label}>Cargo</Text>
            <View style={styles.chips}>
              {(["gerente", "colaborador"] as const).map((r) => (
                <Pressable
                  key={r}
                  onPress={() => setEditing((cur) => (cur ? { ...cur, role: r } : cur))}
                  style={[styles.chip, editing?.role === r && styles.chipActive]}
                >
                  <Text style={[styles.chipText, editing?.role === r && { color: colors.invertedText }]}>{ROLE_LABELS[r]}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.label}>Ativo</Text>
              <Switch
                value={editing?.ativo ?? true}
                onValueChange={(v) => setEditing((cur) => (cur ? { ...cur, ativo: v } : cur))}
                trackColor={{ false: colors.surfaceLight, true: colors.accent }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.modalActions}>
              <Pressable style={[styles.btn, styles.btnGhost]} onPress={() => setEditing(null)}>
                <Text style={styles.btnGhostText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.btn, styles.btnPrimary, updateMutation.isPending && { opacity: 0.5 }]}
                disabled={updateMutation.isPending}
                onPress={() => editing && updateMutation.mutate({ id: editing.id, role: editing.role, ativo: editing.ativo })}
              >
                <Text style={styles.btnPrimaryText}>{updateMutation.isPending ? "Salvando…" : "Salvar"}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
}

const makeStyles = (c: ColorPalette) => StyleSheet.create({
  searchWrap: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: c.surface, borderRadius: 12, borderWidth: 1, borderColor: c.surfaceBorder,
    paddingHorizontal: 12, paddingVertical: Platform.OS === "ios" ? 10 : 6, marginBottom: 10,
  },
  search: { flex: 1, color: c.text, fontFamily: "Inter_500Medium", fontSize: 13 },
  card: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.surfaceBorder,
    padding: 12, marginBottom: 8,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "rgba(196,164,106,0.15)", alignItems: "center", justifyContent: "center",
  },
  avatarText: { color: c.accent, fontFamily: "Inter_700Bold", fontSize: 14 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { color: c.text, fontFamily: "Inter_600SemiBold", fontSize: 14 },
  youBadge: { color: c.accent, fontSize: 10, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.5 },
  email: { color: c.textSecondary, fontFamily: "Inter_500Medium", fontSize: 11, marginTop: 2 },
  badges: { flexDirection: "row", gap: 6, marginTop: 6, flexWrap: "wrap" },
  badge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999,
    backgroundColor: c.surfaceLight,
  },
  badgeText: { color: c.textSecondary, fontFamily: "Inter_600SemiBold", fontSize: 10 },
  actions: { flexDirection: "row", gap: 6 },
  actionBtn: {
    width: 32, height: 32, borderRadius: 8, backgroundColor: c.surfaceLight,
    borderWidth: 1, borderColor: c.surfaceBorder, alignItems: "center", justifyContent: "center",
  },
  backdrop: { flex: 1, backgroundColor: c.overlay, justifyContent: "flex-end" },
  sheet: { backgroundColor: c.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18, maxHeight: "80%" },
  modalTitle: { color: c.text, fontFamily: "Inter_700Bold", fontSize: 15, marginBottom: 8 },
  label: { color: c.textMuted, fontFamily: "Inter_500Medium", fontSize: 11, marginTop: 8, marginBottom: 4 },
  chips: { flexDirection: "row", gap: 6 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
    backgroundColor: c.surfaceLight, borderWidth: 1, borderColor: c.surfaceBorder,
  },
  chipActive: { backgroundColor: c.accent, borderColor: c.accent },
  chipText: { color: c.textSecondary, fontFamily: "Inter_600SemiBold", fontSize: 12 },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 14 },
  btn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  btnGhost: { backgroundColor: c.surfaceLight, borderWidth: 1, borderColor: c.surfaceBorder },
  btnGhostText: { color: c.text, fontFamily: "Inter_600SemiBold", fontSize: 13 },
  btnPrimary: { backgroundColor: c.accent },
  btnPrimaryText: { color: c.invertedText, fontFamily: "Inter_600SemiBold", fontSize: 13 },
});
