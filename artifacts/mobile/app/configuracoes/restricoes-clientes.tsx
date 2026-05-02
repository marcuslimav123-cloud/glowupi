import React, { useMemo, useState } from "react";
import { Alert, FlatList, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useColors, type ColorPalette } from "@/lib/theme";
import { ScreenContainer } from "@/components/ScreenContainer";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonList } from "@/components/Skeleton";
import { fetchJson, getErrorMessage } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

type Restricao = { id: number; clienteId: number; tipo: "bloqueio" | "alerta" | "observacao"; descricao: string };
type Cliente = { id: number; nome: string };

export default function RestricoesClientesScreen() {
  const { barbeariaId } = useAuth();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const TIPOS: { id: Restricao["tipo"]; label: string; color: string }[] = [
    { id: "bloqueio", label: "Bloqueio", color: colors.error },
    { id: "alerta", label: "Alerta", color: colors.warning },
    { id: "observacao", label: "Observação", color: colors.info },
  ];
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showClientePicker, setShowClientePicker] = useState(false);
  const [clienteSearch, setClienteSearch] = useState("");
  const [form, setForm] = useState<{ clienteId: string; tipo: Restricao["tipo"]; descricao: string }>({
    clienteId: "",
    tipo: "bloqueio",
    descricao: "",
  });

  const restricoesQuery = useQuery<Restricao[]>({
    queryKey: ["restricoes", barbeariaId],
    enabled: !!barbeariaId,
    queryFn: async () => {
      const r = await fetchJson<Restricao[]>(`/barbearias/${barbeariaId}/documentos/restricoes`);
      return Array.isArray(r) ? r : [];
    },
  });

  const clientesQuery = useQuery<Cliente[]>({
    queryKey: ["clientes-list", barbeariaId],
    enabled: !!barbeariaId,
    queryFn: async () => {
      const r = await fetchJson<Cliente[]>(`/barbearias/${barbeariaId}/clientes`);
      return Array.isArray(r) ? r : [];
    },
  });

  const createMutation = useMutation({
    mutationFn: () =>
      fetchJson(`/barbearias/${barbeariaId}/documentos/restricoes`, {
        method: "POST",
        body: { clienteId: parseInt(form.clienteId, 10), tipo: form.tipo, descricao: form.descricao },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["restricoes", barbeariaId] });
      setShowForm(false);
      setForm({ clienteId: "", tipo: "bloqueio", descricao: "" });
    },
    onError: (e) => Alert.alert("Erro", getErrorMessage(e)),
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) =>
      fetchJson(`/barbearias/${barbeariaId}/documentos/restricoes/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["restricoes", barbeariaId] }),
    onError: (e) => Alert.alert("Erro", getErrorMessage(e)),
  });

  const clientesById = useMemo(() => {
    const m = new Map<number, string>();
    (clientesQuery.data ?? []).forEach((c) => m.set(c.id, c.nome));
    return m;
  }, [clientesQuery.data]);

  const filtered = useMemo(() => {
    const data = restricoesQuery.data ?? [];
    if (!search) return data;
    const t = search.toLowerCase();
    return data.filter(
      (r) =>
        (clientesById.get(r.clienteId) || "").toLowerCase().includes(t) ||
        (r.descricao || "").toLowerCase().includes(t),
    );
  }, [restricoesQuery.data, search, clientesById]);

  const filteredClientes = useMemo(() => {
    const all = clientesQuery.data ?? [];
    if (!clienteSearch) return all.slice(0, 80);
    const t = clienteSearch.toLowerCase();
    return all.filter((c) => c.nome.toLowerCase().includes(t)).slice(0, 80);
  }, [clientesQuery.data, clienteSearch]);

  const tipoMeta = (tipo: Restricao["tipo"]) => TIPOS.find((t) => t.id === tipo) ?? TIPOS[2];

  return (
    <ScreenContainer
      title="Restrições"
      subtitle="Bloqueios e alertas por cliente"
      scroll={false}
      contentPadding={false}
      rightAction={{ icon: "plus", label: "Nova restrição", onPress: () => setShowForm(true) }}
    >
      <FlatList
        data={filtered}
        keyExtractor={(r) => String(r.id)}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 + insets.bottom }}
        ListHeaderComponent={
          <View style={styles.searchWrap}>
            <Feather name="search" size={14} color={colors.textMuted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Buscar cliente ou motivo…"
              placeholderTextColor={colors.textMuted}
              style={styles.search}
            />
          </View>
        }
        ListEmptyComponent={
          restricoesQuery.isLoading ? (
            <SkeletonList count={3} variant="card" />
          ) : restricoesQuery.isError ? (
            <EmptyState icon="alert-triangle" title="Erro" description={getErrorMessage(restricoesQuery.error)} />
          ) : (
            <EmptyState icon="user-x" title="Sem restrições" description="Toque em + para cadastrar." />
          )
        }
        renderItem={({ item }) => {
          const meta = tipoMeta(item.tipo);
          return (
            <View style={styles.card}>
              <View style={[styles.tipoIcon, { backgroundColor: meta.color + "22" }]}>
                <Feather name="alert-triangle" size={16} color={meta.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cliName}>{clientesById.get(item.clienteId) || `Cliente #${item.clienteId}`}</Text>
                {item.descricao ? <Text style={styles.cliDesc} numberOfLines={3}>{item.descricao}</Text> : null}
                <View style={[styles.badge, { backgroundColor: meta.color + "22" }]}>
                  <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
                </View>
              </View>
              <Pressable
                onPress={() => Alert.alert("Remover", "Remover esta restrição?", [
                  { text: "Cancelar", style: "cancel" },
                  { text: "Remover", style: "destructive", onPress: () => removeMutation.mutate(item.id) },
                ])}
                hitSlop={8}
                style={({ pressed }) => [styles.removeBtn, pressed && { opacity: 0.6 }]}
              >
                <Feather name="trash-2" size={16} color={colors.error} />
              </Pressable>
            </View>
          );
        }}
      />

      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <Pressable style={styles.backdrop} onPress={() => setShowForm(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.modalTitle}>Nova restrição</Text>

            <Text style={styles.fieldLabel}>Cliente</Text>
            <Pressable style={styles.selectField} onPress={() => setShowClientePicker(true)}>
              <Text style={[styles.selectText, !form.clienteId && { color: colors.textMuted }]}>
                {form.clienteId
                  ? clientesById.get(parseInt(form.clienteId, 10)) ?? `Cliente #${form.clienteId}`
                  : "Selecionar cliente"}
              </Text>
              <Feather name="chevron-down" size={16} color={colors.textMuted} />
            </Pressable>

            <Text style={styles.fieldLabel}>Tipo</Text>
            <View style={styles.chips}>
              {TIPOS.map((t) => (
                <Pressable
                  key={t.id}
                  onPress={() => setForm((f) => ({ ...f, tipo: t.id }))}
                  style={[styles.chip, form.tipo === t.id && { backgroundColor: t.color, borderColor: t.color }]}
                >
                  <Text style={[styles.chipText, form.tipo === t.id && { color: "#fff" }]}>{t.label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Descrição</Text>
            <TextInput
              value={form.descricao}
              onChangeText={(t) => setForm((f) => ({ ...f, descricao: t }))}
              placeholder="Motivo da restrição…"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { minHeight: 80, textAlignVertical: "top" }]}
              multiline
            />

            <View style={styles.actions}>
              <Pressable style={[styles.btn, styles.btnGhost]} onPress={() => setShowForm(false)}>
                <Text style={styles.btnGhostText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.btn, styles.btnPrimary, (!form.clienteId || createMutation.isPending) && { opacity: 0.5 }]}
                disabled={!form.clienteId || createMutation.isPending}
                onPress={() => createMutation.mutate()}
              >
                <Text style={styles.btnPrimaryText}>{createMutation.isPending ? "Salvando…" : "Salvar"}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showClientePicker} transparent animationType="slide" onRequestClose={() => setShowClientePicker(false)}>
        <Pressable style={styles.backdrop} onPress={() => setShowClientePicker(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.modalTitle}>Selecionar cliente</Text>
            <View style={styles.searchWrap}>
              <Feather name="search" size={14} color={colors.textMuted} />
              <TextInput
                value={clienteSearch}
                onChangeText={setClienteSearch}
                placeholder="Buscar…"
                placeholderTextColor={colors.textMuted}
                style={styles.search}
                autoFocus
              />
            </View>
            <FlatList
              data={filteredClientes}
              keyExtractor={(c) => String(c.id)}
              keyboardShouldPersistTaps="handled"
              style={{ maxHeight: 360 }}
              ListEmptyComponent={
                <Text style={{ color: colors.textMuted, padding: 16, textAlign: "center" }}>Nenhum cliente</Text>
              }
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    setForm((f) => ({ ...f, clienteId: String(item.id) }));
                    setShowClientePicker(false);
                    setClienteSearch("");
                  }}
                  style={({ pressed }) => [styles.cliRow, pressed && { backgroundColor: colors.surfaceLight }]}
                >
                  <Text style={styles.cliRowText}>{item.nome}</Text>
                </Pressable>
              )}
            />
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
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.surfaceBorder,
    padding: 12, marginBottom: 8,
  },
  tipoIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  cliName: { color: c.text, fontFamily: "Inter_600SemiBold", fontSize: 13 },
  cliDesc: { color: c.textSecondary, fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 4 },
  badge: { alignSelf: "flex-start", marginTop: 6, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  badgeText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  removeBtn: { padding: 6 },
  backdrop: { flex: 1, backgroundColor: c.overlay, justifyContent: "flex-end" },
  sheet: {
    backgroundColor: c.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 18, maxHeight: "85%",
  },
  modalTitle: { color: c.text, fontFamily: "Inter_700Bold", fontSize: 15, marginBottom: 12 },
  fieldLabel: { color: c.textMuted, fontFamily: "Inter_500Medium", fontSize: 11, marginTop: 8, marginBottom: 4 },
  selectField: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: c.surfaceLight, borderRadius: 10, borderWidth: 1, borderColor: c.surfaceBorder,
    paddingHorizontal: 12, paddingVertical: 12,
  },
  selectText: { color: c.text, fontFamily: "Inter_500Medium", fontSize: 13 },
  chips: { flexDirection: "row", gap: 8 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
    backgroundColor: c.surfaceLight, borderWidth: 1, borderColor: c.surfaceBorder,
  },
  chipText: { color: c.textSecondary, fontFamily: "Inter_600SemiBold", fontSize: 12 },
  input: {
    backgroundColor: c.surfaceLight, borderRadius: 10, borderWidth: 1, borderColor: c.surfaceBorder,
    paddingHorizontal: 12, paddingVertical: 10, color: c.text, fontFamily: "Inter_500Medium", fontSize: 13,
  },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 14 },
  btn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  btnGhost: { backgroundColor: c.surfaceLight, borderWidth: 1, borderColor: c.surfaceBorder },
  btnGhostText: { color: c.text, fontFamily: "Inter_600SemiBold", fontSize: 13 },
  btnPrimary: { backgroundColor: c.accent },
  btnPrimaryText: { color: c.invertedText, fontFamily: "Inter_600SemiBold", fontSize: 13 },
  cliRow: { paddingHorizontal: 12, paddingVertical: 12, borderRadius: 8 },
  cliRowText: { color: c.text, fontFamily: "Inter_500Medium", fontSize: 13 },
});
