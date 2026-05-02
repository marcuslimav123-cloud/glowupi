import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  KeyboardAvoidingView,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

interface Cliente {
  id: number;
  nome: string;
  telefone?: string;
  email?: string;
  totalAtendimentos?: number;
  ultimoAtendimento?: string;
}

function initials(nome: string): string {
  const parts = nome.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export default function ClientesScreen() {
  const insets = useSafeAreaInsets();
  const { barbeariaId, token } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoTelefone, setNovoTelefone] = useState("");
  const [novoEmail, setNovoEmail] = useState("");
  const [savingError, setSavingError] = useState<string | null>(null);

  const { data: clientes = [], isLoading, refetch } = useQuery<Cliente[]>({
    queryKey: ["clientes", barbeariaId, search],
    queryFn: async () => {
      if (!barbeariaId || !token) return [];
      const qs = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
      const res = await fetch(`${API_BASE}/api/barbearias/${barbeariaId}/clientes${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Erro ao carregar clientes");
      const data = await res.json();
      return Array.isArray(data) ? data : (data.clientes ?? data.items ?? []);
    },
    enabled: !!barbeariaId && !!token,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/api/barbearias/${barbeariaId}/clientes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          nome: novoNome.trim(),
          telefone: novoTelefone.trim() || undefined,
          email: novoEmail.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || "Erro ao criar cliente");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      setModalOpen(false);
      setNovoNome(""); setNovoTelefone(""); setNovoEmail(""); setSavingError(null);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (e: Error) => setSavingError(e.message),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleCreate = () => {
    setSavingError(null);
    if (!novoNome.trim()) {
      setSavingError("Nome é obrigatório");
      return;
    }
    createMutation.mutate();
  };

  const webTopPadding = Platform.OS === "web" ? 67 : 0;

  return (
    <View style={[styles.container, { paddingTop: webTopPadding }]}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>Clientes</Text>
            <Text style={styles.subtitle}>{clientes.length} cadastrado(s)</Text>
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setModalOpen(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Novo cliente"
          >
            <Feather name="plus" size={20} color="#000" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchBox}>
          <Feather name="search" size={16} color={Colors.textMuted} />
          <TextInput
            placeholder="Buscar por nome ou telefone"
            placeholderTextColor={Colors.textMuted}
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            autoCapitalize="none"
            accessibilityLabel="Buscar clientes"
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch("")} accessibilityLabel="Limpar busca">
              <Feather name="x" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Platform.OS === "web" ? 118 : 100 + insets.bottom },
        ]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
        }
      >
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.accent} />
          </View>
        ) : clientes.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="users" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>Nenhum cliente</Text>
            <Text style={styles.emptySubtitle}>
              {search ? "Nenhum cliente encontrado para essa busca." : "Toque em + para cadastrar."}
            </Text>
          </View>
        ) : (
          clientes.map((c) => (
            <View key={c.id} style={styles.card}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials(c.nome)}</Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.clientName} numberOfLines={1}>{c.nome}</Text>
                {c.telefone && <Text style={styles.clientLine}>{c.telefone}</Text>}
                {c.email && <Text style={styles.clientLine} numberOfLines={1}>{c.email}</Text>}
                {typeof c.totalAtendimentos === "number" && c.totalAtendimentos > 0 && (
                  <Text style={styles.tag}>{c.totalAtendimentos} atendimento(s)</Text>
                )}
              </View>
              <Feather name="chevron-right" size={18} color={Colors.textMuted} />
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={() => setModalOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Novo cliente</Text>
              <TouchableOpacity
                onPress={() => setModalOpen(false)}
                accessibilityLabel="Fechar"
                accessibilityRole="button"
              >
                <Feather name="x" size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {savingError && (
              <View style={styles.errorBox}>
                <Feather name="alert-circle" size={14} color={Colors.error} />
                <Text style={styles.errorText}>{savingError}</Text>
              </View>
            )}

            <Text style={styles.label}>Nome *</Text>
            <TextInput
              style={styles.input}
              value={novoNome}
              onChangeText={setNovoNome}
              placeholder="Nome completo"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="words"
            />

            <Text style={styles.label}>Telefone</Text>
            <TextInput
              style={styles.input}
              value={novoTelefone}
              onChangeText={setNovoTelefone}
              placeholder="(11) 99999-9999"
              placeholderTextColor={Colors.textMuted}
              keyboardType="phone-pad"
            />

            <Text style={styles.label}>E-mail</Text>
            <TextInput
              style={styles.input}
              value={novoEmail}
              onChangeText={setNovoEmail}
              placeholder="email@exemplo.com"
              placeholderTextColor={Colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TouchableOpacity
              style={[styles.saveBtn, createMutation.isPending && { opacity: 0.6 }]}
              onPress={handleCreate}
              disabled={createMutation.isPending}
              accessibilityRole="button"
              accessibilityLabel="Salvar cliente"
            >
              {createMutation.isPending ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.saveBtnText}>Salvar</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  title: { fontSize: 26, fontFamily: "Inter_700Bold", color: Colors.text },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2 },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchInput: { flex: 1, color: Colors.text, fontSize: 14, fontFamily: "Inter_400Regular" },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingTop: 8 },
  center: { paddingVertical: 60, alignItems: "center" },
  empty: { paddingVertical: 60, alignItems: "center", paddingHorizontal: 32 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.text, marginTop: 16, marginBottom: 4 },
  emptySubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary, textAlign: "center" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.accent + "20",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.accent },
  info: { flex: 1 },
  clientName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.text },
  clientLine: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2 },
  tag: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.accent,
    marginTop: 4,
  },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalCard: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.text },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.error + "15",
    borderColor: Colors.error + "40",
    borderWidth: 1,
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.error, flex: 1 },
  label: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary, marginTop: 12, marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: 0.5 },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    color: Colors.text,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  saveBtn: {
    marginTop: 18,
    backgroundColor: Colors.accent,
    borderRadius: 12,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#000" },
});
