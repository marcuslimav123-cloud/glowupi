import React, { useMemo, useState } from "react";
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { ScreenContainer } from "@/components/ScreenContainer";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonList } from "@/components/Skeleton";
import { SectionHeader } from "@/components/SectionHeader";
import { fetchJson, getErrorMessage } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

type TipoAnamnese = { id: number; nome: string; descricao: string | null; ativo: boolean };
type FormularioAnamnese = {
  id: number;
  titulo: string;
  tipoId: number;
  ativo: boolean;
  campos: Array<{ label: string; tipo: string; obrigatorio?: boolean; opcoes?: string[] }>;
};

type TipoForm = { id?: number; nome: string; descricao: string; ativo: boolean };
type FormForm = { id?: number; titulo: string; tipoId: string; ativo: boolean };

const FIELD_TYPE_LABEL: Record<string, string> = {
  texto: "Texto curto", textarea: "Texto longo", boolean: "Sim/Não",
  select: "Seleção única", multiselect: "Seleção múltipla", numero: "Número",
  data: "Data", escala: "Escala 1-10",
};

const EMPTY_TIPO: TipoForm = { nome: "", descricao: "", ativo: true };
const EMPTY_FORM: FormForm = { titulo: "", tipoId: "", ativo: true };

export default function AnamneseScreen() {
  const { barbeariaId } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"tipos" | "formularios">("tipos");
  const [editTipo, setEditTipo] = useState<TipoForm | null>(null);
  const [editForm, setEditForm] = useState<FormForm | null>(null);

  const tiposQuery = useQuery<TipoAnamnese[]>({
    queryKey: ["anamnese-tipos", barbeariaId],
    enabled: !!barbeariaId,
    queryFn: async () => {
      const r = await fetchJson<TipoAnamnese[]>(`/barbearias/${barbeariaId}/anamnese/tipos`);
      return Array.isArray(r) ? r : [];
    },
  });

  const formsQuery = useQuery<FormularioAnamnese[]>({
    queryKey: ["anamnese-forms", barbeariaId],
    enabled: !!barbeariaId,
    queryFn: async () => {
      const r = await fetchJson<FormularioAnamnese[]>(`/barbearias/${barbeariaId}/anamnese/formularios`);
      return Array.isArray(r) ? r : [];
    },
  });

  const tipoMutation = useMutation({
    mutationFn: (f: TipoForm) => {
      const body = { nome: f.nome, descricao: f.descricao || null, ativo: f.ativo };
      return f.id
        ? fetchJson(`/barbearias/${barbeariaId}/anamnese/tipos/${f.id}`, { method: "PUT", body })
        : fetchJson(`/barbearias/${barbeariaId}/anamnese/tipos`, { method: "POST", body });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["anamnese-tipos", barbeariaId] });
      setEditTipo(null);
    },
    onError: (e) => Alert.alert("Erro", getErrorMessage(e)),
  });

  const removeTipo = useMutation({
    mutationFn: (id: number) => fetchJson(`/barbearias/${barbeariaId}/anamnese/tipos/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["anamnese-tipos", barbeariaId] }),
    onError: (e) => Alert.alert("Erro", getErrorMessage(e)),
  });

  const formMutation = useMutation({
    mutationFn: (f: FormForm) => {
      const body = {
        titulo: f.titulo,
        tipoId: parseInt(f.tipoId, 10),
        ativo: f.ativo,
        campos: [],
      };
      return f.id
        ? fetchJson(`/barbearias/${barbeariaId}/anamnese/formularios/${f.id}`, { method: "PUT", body })
        : fetchJson(`/barbearias/${barbeariaId}/anamnese/formularios`, { method: "POST", body });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["anamnese-forms", barbeariaId] });
      setEditForm(null);
    },
    onError: (e) => Alert.alert("Erro", getErrorMessage(e)),
  });

  const removeForm = useMutation({
    mutationFn: (id: number) => fetchJson(`/barbearias/${barbeariaId}/anamnese/formularios/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["anamnese-forms", barbeariaId] }),
    onError: (e) => Alert.alert("Erro", getErrorMessage(e)),
  });

  const tiposById = useMemo(() => {
    const m = new Map<number, TipoAnamnese>();
    (tiposQuery.data ?? []).forEach((t) => m.set(t.id, t));
    return m;
  }, [tiposQuery.data]);

  return (
    <ScreenContainer
      title="Anamnese"
      subtitle="Tipos e formulários"
      rightAction={{
        icon: "plus",
        label: tab === "tipos" ? "Novo tipo" : "Novo formulário",
        onPress: () => (tab === "tipos" ? setEditTipo({ ...EMPTY_TIPO }) : setEditForm({ ...EMPTY_FORM })),
      }}
    >
      <View style={styles.tabs}>
        {(["tipos", "formularios"] as const).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]}>
            <Text style={[styles.tabText, tab === t && { color: "#000" }]}>
              {t === "tipos" ? "Tipos" : "Formulários"}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === "tipos" ? (
        <>
          {tiposQuery.isLoading ? (
            <SkeletonList count={3} variant="card" />
          ) : tiposQuery.isError ? (
            <EmptyState icon="alert-triangle" title="Erro" description={getErrorMessage(tiposQuery.error)} />
          ) : (tiposQuery.data ?? []).length === 0 ? (
            <EmptyState icon="layers" title="Nenhum tipo" description="Crie tipos para organizar formulários." />
          ) : (
            (tiposQuery.data ?? []).map((t) => (
              <View key={t.id} style={styles.card}>
                <View style={styles.iconWrap}><Feather name="layers" size={18} color={Colors.accent} /></View>
                <View style={{ flex: 1 }}>
                  <View style={styles.titleRow}>
                    <Text style={styles.title}>{t.nome}</Text>
                    {!t.ativo ? <Text style={styles.inactive}>Inativo</Text> : null}
                  </View>
                  {t.descricao ? <Text style={styles.subtitle}>{t.descricao}</Text> : null}
                </View>
                <View style={styles.actions}>
                  <Pressable
                    hitSlop={8}
                    onPress={() => setEditTipo({ id: t.id, nome: t.nome, descricao: t.descricao || "", ativo: t.ativo })}
                    style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.6 }]}
                  >
                    <Feather name="edit-2" size={14} color={Colors.text} />
                  </Pressable>
                  <Pressable
                    hitSlop={8}
                    onPress={() =>
                      Alert.alert("Excluir", `Excluir tipo "${t.nome}"?`, [
                        { text: "Cancelar", style: "cancel" },
                        { text: "Excluir", style: "destructive", onPress: () => removeTipo.mutate(t.id) },
                      ])
                    }
                    style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.6 }]}
                  >
                    <Feather name="trash-2" size={14} color={Colors.error} />
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </>
      ) : (
        <>
          {formsQuery.isLoading ? (
            <SkeletonList count={3} variant="card" />
          ) : formsQuery.isError ? (
            <EmptyState icon="alert-triangle" title="Erro" description={getErrorMessage(formsQuery.error)} />
          ) : (formsQuery.data ?? []).length === 0 ? (
            <EmptyState icon="clipboard" title="Nenhum formulário" description="Crie um formulário para começar." />
          ) : (
            (formsQuery.data ?? []).map((f) => (
              <View key={f.id} style={styles.card}>
                <View style={styles.iconWrap}><Feather name="clipboard" size={18} color={Colors.accent} /></View>
                <View style={{ flex: 1 }}>
                  <View style={styles.titleRow}>
                    <Text style={styles.title}>{f.titulo}</Text>
                    {!f.ativo ? <Text style={styles.inactive}>Inativo</Text> : null}
                  </View>
                  <Text style={styles.subtitle}>
                    {tiposById.get(f.tipoId)?.nome || "—"} · {f.campos?.length ?? 0} campo(s)
                  </Text>
                  {f.campos?.length ? (
                    <View style={styles.fieldChips}>
                      {f.campos.slice(0, 4).map((c, i) => (
                        <Text key={i} style={styles.fieldChip}>
                          {c.label || "campo"} ({FIELD_TYPE_LABEL[c.tipo] || c.tipo})
                        </Text>
                      ))}
                      {f.campos.length > 4 ? <Text style={styles.fieldChip}>+{f.campos.length - 4}</Text> : null}
                    </View>
                  ) : null}
                </View>
                <View style={styles.actions}>
                  <Pressable
                    hitSlop={8}
                    onPress={() => setEditForm({ id: f.id, titulo: f.titulo, tipoId: String(f.tipoId), ativo: f.ativo })}
                    style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.6 }]}
                  >
                    <Feather name="edit-2" size={14} color={Colors.text} />
                  </Pressable>
                  <Pressable
                    hitSlop={8}
                    onPress={() =>
                      Alert.alert("Excluir", `Excluir formulário "${f.titulo}"?`, [
                        { text: "Cancelar", style: "cancel" },
                        { text: "Excluir", style: "destructive", onPress: () => removeForm.mutate(f.id) },
                      ])
                    }
                    style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.6 }]}
                  >
                    <Feather name="trash-2" size={14} color={Colors.error} />
                  </Pressable>
                </View>
              </View>
            ))
          )}
          <Text style={styles.note}>
            Para adicionar perguntas aos formulários, use o app web — esta versão lista e edita o cabeçalho.
          </Text>
        </>
      )}

      {/* Tipo modal */}
      <Modal visible={!!editTipo} transparent animationType="slide" onRequestClose={() => setEditTipo(null)}>
        <Pressable style={styles.backdrop} onPress={() => setEditTipo(null)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.modalTitle}>{editTipo?.id ? "Editar tipo" : "Novo tipo"}</Text>

            <Text style={styles.label}>Nome</Text>
            <TextInput
              value={editTipo?.nome ?? ""}
              onChangeText={(t) => setEditTipo((f) => (f ? { ...f, nome: t } : f))}
              placeholder="Ex.: Anamnese capilar"
              placeholderTextColor={Colors.textMuted}
              style={styles.input}
            />

            <Text style={styles.label}>Descrição</Text>
            <TextInput
              value={editTipo?.descricao ?? ""}
              onChangeText={(t) => setEditTipo((f) => (f ? { ...f, descricao: t } : f))}
              placeholder="Opcional"
              placeholderTextColor={Colors.textMuted}
              style={[styles.input, { minHeight: 70, textAlignVertical: "top" }]}
              multiline
            />

            <View style={styles.switchRow}>
              <Text style={styles.label}>Ativo</Text>
              <Switch
                value={editTipo?.ativo ?? true}
                onValueChange={(v) => setEditTipo((f) => (f ? { ...f, ativo: v } : f))}
                trackColor={{ false: Colors.surfaceLight, true: Colors.accent }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.modalActions}>
              <Pressable style={[styles.btn, styles.btnGhost]} onPress={() => setEditTipo(null)}>
                <Text style={styles.btnGhostText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.btn, styles.btnPrimary, (!editTipo?.nome?.trim() || tipoMutation.isPending) && { opacity: 0.5 }]}
                disabled={!editTipo?.nome?.trim() || tipoMutation.isPending}
                onPress={() => editTipo && tipoMutation.mutate(editTipo)}
              >
                <Text style={styles.btnPrimaryText}>{tipoMutation.isPending ? "Salvando…" : "Salvar"}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Formulário modal */}
      <Modal visible={!!editForm} transparent animationType="slide" onRequestClose={() => setEditForm(null)}>
        <Pressable style={styles.backdrop} onPress={() => setEditForm(null)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.modalTitle}>{editForm?.id ? "Editar formulário" : "Novo formulário"}</Text>

            <Text style={styles.label}>Título</Text>
            <TextInput
              value={editForm?.titulo ?? ""}
              onChangeText={(t) => setEditForm((f) => (f ? { ...f, titulo: t } : f))}
              placeholder="Ex.: Avaliação inicial"
              placeholderTextColor={Colors.textMuted}
              style={styles.input}
            />

            <Text style={styles.label}>Tipo</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {(tiposQuery.data ?? []).map((t) => {
                const active = editForm?.tipoId === String(t.id);
                return (
                  <Pressable
                    key={t.id}
                    onPress={() => setEditForm((f) => (f ? { ...f, tipoId: String(t.id) } : f))}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, active && { color: "#000" }]}>{t.nome}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.switchRow}>
              <Text style={styles.label}>Ativo</Text>
              <Switch
                value={editForm?.ativo ?? true}
                onValueChange={(v) => setEditForm((f) => (f ? { ...f, ativo: v } : f))}
                trackColor={{ false: Colors.surfaceLight, true: Colors.accent }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.modalActions}>
              <Pressable style={[styles.btn, styles.btnGhost]} onPress={() => setEditForm(null)}>
                <Text style={styles.btnGhostText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.btn,
                  styles.btnPrimary,
                  (!editForm?.titulo?.trim() || !editForm?.tipoId || formMutation.isPending) && { opacity: 0.5 },
                ]}
                disabled={!editForm?.titulo?.trim() || !editForm?.tipoId || formMutation.isPending}
                onPress={() => editForm && formMutation.mutate(editForm)}
              >
                <Text style={styles.btnPrimaryText}>{formMutation.isPending ? "Salvando…" : "Salvar"}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: "row", gap: 6, marginBottom: 12 },
  tab: { flex: 1, paddingVertical: 9, alignItems: "center", borderRadius: 999, backgroundColor: Colors.surfaceLight, borderWidth: 1, borderColor: Colors.surfaceBorder },
  tabActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  tabText: { color: Colors.textSecondary, fontFamily: "Inter_600SemiBold", fontSize: 12 },
  card: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.surfaceBorder,
    padding: 12, marginBottom: 8,
  },
  iconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(196,164,106,0.15)", alignItems: "center", justifyContent: "center" },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { color: Colors.text, fontFamily: "Inter_600SemiBold", fontSize: 13 },
  inactive: { color: Colors.warning, fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 0.4 },
  subtitle: { color: Colors.textSecondary, fontFamily: "Inter_500Medium", fontSize: 11, marginTop: 2 },
  fieldChips: { flexDirection: "row", gap: 4, marginTop: 6, flexWrap: "wrap" },
  fieldChip: {
    backgroundColor: Colors.surfaceLight, borderWidth: 1, borderColor: Colors.surfaceBorder,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
    color: Colors.textSecondary, fontFamily: "Inter_500Medium", fontSize: 10,
    overflow: "hidden",
  },
  actions: { flexDirection: "row", gap: 6 },
  actionBtn: {
    width: 32, height: 32, borderRadius: 8, backgroundColor: Colors.surfaceLight,
    borderWidth: 1, borderColor: Colors.surfaceBorder, alignItems: "center", justifyContent: "center",
  },
  note: { color: Colors.textMuted, fontFamily: "Inter_500Medium", fontSize: 11, textAlign: "center", marginTop: 12 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18, maxHeight: "85%" },
  modalTitle: { color: Colors.text, fontFamily: "Inter_700Bold", fontSize: 15, marginBottom: 4 },
  label: { color: Colors.textMuted, fontFamily: "Inter_500Medium", fontSize: 11, marginTop: 10, marginBottom: 4 },
  input: {
    backgroundColor: Colors.surfaceLight, borderRadius: 10, borderWidth: 1, borderColor: Colors.surfaceBorder,
    paddingHorizontal: 12, paddingVertical: Platform.OS === "ios" ? 12 : 10, color: Colors.text, fontFamily: "Inter_500Medium", fontSize: 13,
  },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
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
