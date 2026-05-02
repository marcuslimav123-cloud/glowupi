import React, { useState } from "react";
import { Alert, FlatList, Modal, Platform, Pressable, RefreshControl, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { ScreenContainer } from "@/components/ScreenContainer";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonList } from "@/components/Skeleton";
import { fetchJson, getErrorMessage } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

type Convite = {
  id: number;
  email: string;
  role: "gerente" | "colaborador";
  nomeConvidado: string | null;
  status: "pendente" | "aceito" | "expirado" | "cancelado";
  perfilAcessoId: number | null;
  profissionalId: number | null;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
  expirado?: boolean;
};

type PerfilAcesso = { id: number; nome: string };

type Form = {
  email: string;
  role: "gerente" | "colaborador";
  nomeConvidado: string;
  perfilAcessoId: string;
  enviarEmail: boolean;
};

const EMPTY_FORM: Form = { email: "", role: "colaborador", nomeConvidado: "", perfilAcessoId: "", enviarEmail: true };

const STATUS_META: Record<string, { label: string; color: string }> = {
  pendente: { label: "Pendente", color: Colors.warning },
  aceito: { label: "Aceito", color: Colors.success },
  expirado: { label: "Expirado", color: Colors.textMuted },
  cancelado: { label: "Cancelado", color: Colors.textMuted },
};

const ROLE_LABELS: Record<string, string> = { gerente: "Gerente", colaborador: "Colaborador" };

export default function ConvitesScreen() {
  const { barbeariaId } = useAuth();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY_FORM);

  const convitesQuery = useQuery<Convite[]>({
    queryKey: ["convites", barbeariaId],
    enabled: !!barbeariaId,
    queryFn: async () => {
      const r = await fetchJson<Convite[]>(`/convites`);
      return Array.isArray(r) ? r : [];
    },
  });

  const perfisQuery = useQuery<PerfilAcesso[]>({
    queryKey: ["perfis-acesso-list", barbeariaId],
    enabled: !!barbeariaId,
    queryFn: async () => {
      const r = await fetchJson<PerfilAcesso[]>(`/barbearias/${barbeariaId}/perfis-acesso?tipo=app`);
      return Array.isArray(r) ? r : [];
    },
  });

  const createMutation = useMutation({
    mutationFn: () =>
      fetchJson(`/convites`, {
        method: "POST",
        body: {
          email: form.email,
          role: form.role,
          nomeConvidado: form.nomeConvidado || null,
          perfilAcessoId: form.perfilAcessoId ? parseInt(form.perfilAcessoId, 10) : null,
          enviarEmail: form.enviarEmail,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["convites", barbeariaId] });
      setShowForm(false);
      setForm(EMPTY_FORM);
    },
    onError: (e) => Alert.alert("Erro", getErrorMessage(e)),
  });

  const resendMutation = useMutation({
    mutationFn: (id: number) => fetchJson(`/convites/${id}/resend`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["convites", barbeariaId] });
      Alert.alert("Reenviado", "Convite reenviado com sucesso.");
    },
    onError: (e) => Alert.alert("Erro", getErrorMessage(e)),
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => fetchJson(`/convites/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["convites", barbeariaId] }),
    onError: (e) => Alert.alert("Erro", getErrorMessage(e)),
  });

  const handleSubmit = () => {
    if (!form.email.trim()) {
      Alert.alert("Atenção", "Informe um e-mail.");
      return;
    }
    if (form.role === "colaborador" && !form.perfilAcessoId) {
      Alert.alert(
        "Perfil obrigatório",
        "Selecione um perfil de acesso para colaboradores.\n\nCrie um em Configurações → Perfis de acesso.",
      );
      return;
    }
    createMutation.mutate();
  };

  return (
    <ScreenContainer
      title="Convites"
      subtitle="Convide novos membros para sua equipe"
      scroll={false}
      contentPadding={false}
      rightAction={{ icon: "user-plus", label: "Novo convite", onPress: () => setShowForm(true) }}
    >
      <FlatList
        data={convitesQuery.data ?? []}
        keyExtractor={(c) => String(c.id)}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 + insets.bottom }}
        refreshControl={<RefreshControl refreshing={convitesQuery.isRefetching && !convitesQuery.isLoading} onRefresh={() => convitesQuery.refetch()} tintColor={Colors.accent} colors={[Colors.accent]} />}
        ListEmptyComponent={
          convitesQuery.isLoading ? <SkeletonList count={3} variant="card" /> :
          convitesQuery.isError ? <EmptyState icon="alert-triangle" title="Erro" description={getErrorMessage(convitesQuery.error)} /> :
          <EmptyState icon="user-plus" title="Sem convites" description="Toque em + para enviar um convite." />
        }
        renderItem={({ item }) => {
          const status = item.expirado ? "expirado" : item.status;
          const meta = STATUS_META[status] ?? STATUS_META.pendente;
          const isPendente = status === "pendente";
          return (
            <View style={styles.card}>
              <View style={styles.iconWrap}><Feather name="mail" size={18} color={Colors.accent} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.email}>{item.email}</Text>
                {item.nomeConvidado ? <Text style={styles.name}>{item.nomeConvidado}</Text> : null}
                <View style={styles.badges}>
                  <View style={styles.badge}><Text style={styles.badgeText}>{ROLE_LABELS[item.role]}</Text></View>
                  <View style={[styles.badge, { backgroundColor: meta.color + "22" }]}>
                    <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.actions}>
                {isPendente ? (
                  <Pressable
                    hitSlop={8}
                    disabled={resendMutation.isPending}
                    onPress={() => resendMutation.mutate(item.id)}
                    style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.6 }]}
                  >
                    <Feather name="refresh-cw" size={14} color={Colors.text} />
                  </Pressable>
                ) : null}
                <Pressable
                  hitSlop={8}
                  onPress={() =>
                    Alert.alert("Remover convite", `Remover convite para ${item.email}?`, [
                      { text: "Cancelar", style: "cancel" },
                      { text: "Remover", style: "destructive", onPress: () => removeMutation.mutate(item.id) },
                    ])
                  }
                  style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.6 }]}
                >
                  <Feather name="trash-2" size={14} color={Colors.error} />
                </Pressable>
              </View>
            </View>
          );
        }}
      />

      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <Pressable style={styles.backdrop} onPress={() => setShowForm(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.modalTitle}>Novo convite</Text>

            <Text style={styles.label}>Nome (opcional)</Text>
            <TextInput
              value={form.nomeConvidado}
              onChangeText={(t) => setForm((f) => ({ ...f, nomeConvidado: t }))}
              placeholder="Nome do convidado"
              placeholderTextColor={Colors.textMuted}
              style={styles.input}
            />

            <Text style={styles.label}>E-mail</Text>
            <TextInput
              value={form.email}
              onChangeText={(t) => setForm((f) => ({ ...f, email: t }))}
              placeholder="email@exemplo.com"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
              style={styles.input}
            />

            <Text style={styles.label}>Cargo</Text>
            <View style={styles.chips}>
              {(["gerente", "colaborador"] as const).map((r) => (
                <Pressable
                  key={r}
                  onPress={() => setForm((f) => ({ ...f, role: r }))}
                  style={[styles.chip, form.role === r && styles.chipActive]}
                >
                  <Text style={[styles.chipText, form.role === r && { color: "#000" }]}>{ROLE_LABELS[r]}</Text>
                </Pressable>
              ))}
            </View>

            {form.role === "colaborador" ? (
              <>
                <Text style={styles.label}>Perfil de acesso (obrigatório)</Text>
                {perfisQuery.isLoading ? (
                  <Text style={styles.hint}>Carregando perfis…</Text>
                ) : (perfisQuery.data ?? []).length === 0 ? (
                  <Text style={styles.hint}>
                    Nenhum perfil disponível. Crie um em Configurações → Perfis de acesso (tipo App).
                  </Text>
                ) : (
                  <View style={styles.chips}>
                    {(perfisQuery.data ?? []).map((p) => {
                      const active = form.perfilAcessoId === String(p.id);
                      return (
                        <Pressable
                          key={p.id}
                          onPress={() => setForm((f) => ({ ...f, perfilAcessoId: String(p.id) }))}
                          style={[styles.chip, active && styles.chipActive]}
                        >
                          <Text style={[styles.chipText, active && { color: "#000" }]}>{p.nome}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </>
            ) : null}

            <View style={styles.switchRow}>
              <Text style={styles.label}>Enviar e-mail de convite</Text>
              <Switch
                value={form.enviarEmail}
                onValueChange={(v) => setForm((f) => ({ ...f, enviarEmail: v }))}
                trackColor={{ false: Colors.surfaceLight, true: Colors.accent }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.modalActions}>
              <Pressable style={[styles.btn, styles.btnGhost]} onPress={() => setShowForm(false)}>
                <Text style={styles.btnGhostText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.btn, styles.btnPrimary, createMutation.isPending && { opacity: 0.5 }]}
                disabled={createMutation.isPending}
                onPress={handleSubmit}
              >
                <Text style={styles.btnPrimaryText}>{createMutation.isPending ? "Enviando…" : "Enviar convite"}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.surfaceBorder,
    padding: 12, marginBottom: 8,
  },
  iconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(196,164,106,0.15)", alignItems: "center", justifyContent: "center" },
  email: { color: Colors.text, fontFamily: "Inter_600SemiBold", fontSize: 13 },
  name: { color: Colors.textSecondary, fontFamily: "Inter_500Medium", fontSize: 11, marginTop: 2 },
  badges: { flexDirection: "row", gap: 6, marginTop: 6, flexWrap: "wrap" },
  badge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
    backgroundColor: Colors.surfaceLight,
  },
  badgeText: { color: Colors.textSecondary, fontFamily: "Inter_600SemiBold", fontSize: 10 },
  actions: { flexDirection: "row", gap: 6 },
  actionBtn: {
    width: 32, height: 32, borderRadius: 8, backgroundColor: Colors.surfaceLight,
    borderWidth: 1, borderColor: Colors.surfaceBorder, alignItems: "center", justifyContent: "center",
  },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18, maxHeight: "92%" },
  modalTitle: { color: Colors.text, fontFamily: "Inter_700Bold", fontSize: 15, marginBottom: 4 },
  label: { color: Colors.textMuted, fontFamily: "Inter_500Medium", fontSize: 11, marginTop: 10, marginBottom: 4 },
  input: {
    backgroundColor: Colors.surfaceLight, borderRadius: 10, borderWidth: 1, borderColor: Colors.surfaceBorder,
    paddingHorizontal: 12, paddingVertical: Platform.OS === "ios" ? 10 : 8, color: Colors.text, fontFamily: "Inter_500Medium", fontSize: 13,
  },
  chips: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  chip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
    backgroundColor: Colors.surfaceLight, borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  chipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  chipText: { color: Colors.textSecondary, fontFamily: "Inter_600SemiBold", fontSize: 12 },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 },
  hint: { color: Colors.textMuted, fontFamily: "Inter_500Medium", fontSize: 11, marginTop: 4 },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 14 },
  btn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  btnGhost: { backgroundColor: Colors.surfaceLight, borderWidth: 1, borderColor: Colors.surfaceBorder },
  btnGhostText: { color: Colors.text, fontFamily: "Inter_600SemiBold", fontSize: 13 },
  btnPrimary: { backgroundColor: Colors.accent },
  btnPrimaryText: { color: "#000", fontFamily: "Inter_600SemiBold", fontSize: 13 },
});
