import React, { useMemo, useState } from "react";
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useColors, type ColorPalette } from "@/lib/theme";
import { ScreenContainer } from "@/components/ScreenContainer";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonList } from "@/components/Skeleton";
import { fetchJson, getErrorMessage } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

type Perfil = {
  id: number;
  nome: string;
  descricao: string | null;
  tipo: "web" | "app";
  ativo: boolean;
  permissoes: string[];
  profissionais?: Array<{ id: number; nome: string }>;
};

type Form = {
  id?: number;
  nome: string;
  descricao: string;
  tipo: "web" | "app";
  ativo: boolean;
  permissoes: string[];
};

const EMPTY_FORM: Form = { nome: "", descricao: "", tipo: "web", ativo: true, permissoes: [] };

const WEB_GROUPS: { label: string; items: { key: string; label: string }[] }[] = [
  { label: "Principal", items: [
    { key: "dashboard", label: "Dashboard" },
    { key: "agenda", label: "Agenda" },
    { key: "agenda_picos", label: "Horários de pico" },
    { key: "comandas", label: "Comandas" },
  ]},
  { label: "Cadastros", items: [
    { key: "clientes", label: "Clientes" },
    { key: "profissionais", label: "Profissionais" },
    { key: "servicos", label: "Serviços" },
    { key: "produtos", label: "Produtos" },
    { key: "tipos", label: "Tipos / categorias" },
    { key: "cupons", label: "Cupons" },
    { key: "mensagens", label: "Mensagens" },
    { key: "lembretes", label: "Lembretes" },
    { key: "avaliacoes", label: "Avaliações" },
    { key: "clube", label: "Clube de fidelidade" },
    { key: "clubes_assinatura", label: "Clubes de assinatura" },
  ]},
  { label: "Pacotes", items: [
    { key: "pacotes", label: "Meus pacotes" },
    { key: "venda_pacotes", label: "Venda de pacotes" },
  ]},
  { label: "Relatórios", items: [
    { key: "relatorios", label: "Relatórios" },
  ]},
  { label: "Financeiro", items: [
    { key: "caixa", label: "Caixa" },
    { key: "financeiro", label: "Financeiro" },
    { key: "comissoes", label: "Comissões" },
  ]},
  { label: "Operacional", items: [
    { key: "lista_espera", label: "Lista de espera" },
    { key: "configuracoes", label: "Configurações" },
    { key: "empresa", label: "Meu estabelecimento" },
    { key: "equipe", label: "Equipe" },
  ]},
  { label: "Usuário", items: [
    { key: "dados_usuario", label: "Dados do usuário" },
    { key: "senha_acesso", label: "Senha de acesso" },
  ]},
];

const APP_GROUPS: { label: string; items: { key: string; label: string }[] }[] = [
  { label: "Principal", items: [
    { key: "app_dashboard", label: "Dashboard profissional" },
    { key: "app_agenda", label: "Agenda" },
    { key: "app_comandas", label: "Comandas" },
  ]},
  { label: "Cadastros", items: [
    { key: "app_clientes", label: "Clientes" },
    { key: "app_servicos", label: "Serviços" },
    { key: "app_produtos", label: "Produtos" },
  ]},
  { label: "Operacional", items: [
    { key: "app_caixa", label: "Caixa" },
    { key: "app_comissoes", label: "Comissões" },
    { key: "app_rede_social", label: "Rede social" },
    { key: "app_divulgacao", label: "Divulgação" },
  ]},
  { label: "Outros", items: [
    { key: "app_ajuda", label: "Ajuda" },
    { key: "app_videos_tutoriais", label: "Vídeos tutoriais" },
    { key: "app_documentos", label: "Documentos" },
    { key: "app_tap_to_pay", label: "Tap to Pay" },
  ]},
];

export default function AcessosScreen() {
  const { barbeariaId } = useAuth();
  const qc = useQueryClient();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [tab, setTab] = useState<"web" | "app">("web");
  const [editing, setEditing] = useState<Form | null>(null);
  const [permSearch, setPermSearch] = useState("");

  const query = useQuery<Perfil[]>({
    queryKey: ["perfis-acesso", barbeariaId, tab],
    enabled: !!barbeariaId,
    queryFn: async () => {
      const r = await fetchJson<Perfil[]>(`/barbearias/${barbeariaId}/perfis-acesso?tipo=${tab}`);
      return Array.isArray(r) ? r : [];
    },
  });

  const upsertMutation = useMutation({
    mutationFn: (f: Form) => {
      const body = {
        nome: f.nome,
        descricao: f.descricao || null,
        tipo: f.tipo,
        ativo: f.ativo,
        permissoes: f.permissoes,
      };
      return f.id
        ? fetchJson(`/barbearias/${barbeariaId}/perfis-acesso/${f.id}`, { method: "PUT", body })
        : fetchJson(`/barbearias/${barbeariaId}/perfis-acesso`, { method: "POST", body });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["perfis-acesso", barbeariaId] });
      setEditing(null);
    },
    onError: (e) => Alert.alert("Erro", getErrorMessage(e)),
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => fetchJson(`/barbearias/${barbeariaId}/perfis-acesso/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["perfis-acesso", barbeariaId] }),
    onError: (e) => Alert.alert("Erro", getErrorMessage(e)),
  });

  const groups = editing?.tipo === "app" ? APP_GROUPS : WEB_GROUPS;

  const filteredGroups = useMemo(() => {
    if (!permSearch) return groups;
    const q = permSearch.toLowerCase();
    return groups
      .map((g) => ({ ...g, items: g.items.filter((i) => i.label.toLowerCase().includes(q) || i.key.includes(q)) }))
      .filter((g) => g.items.length > 0);
  }, [groups, permSearch]);

  const togglePerm = (key: string) => {
    setEditing((cur) => {
      if (!cur) return cur;
      const has = cur.permissoes.includes(key);
      return { ...cur, permissoes: has ? cur.permissoes.filter((p) => p !== key) : [...cur.permissoes, key] };
    });
  };

  return (
    <ScreenContainer
      title="Perfis de acesso"
      subtitle="Permissões granulares por cargo"
      rightAction={{ icon: "plus", label: "Novo perfil", onPress: () => setEditing({ ...EMPTY_FORM, tipo: tab }) }}
    >
      <View style={styles.tabs}>
        {(["web", "app"] as const).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]}>
            <Text style={[styles.tabText, tab === t && { color: colors.invertedText }]}>
              {t === "web" ? "Sistema (web)" : "App profissional"}
            </Text>
          </Pressable>
        ))}
      </View>

      {query.isLoading ? (
        <SkeletonList count={3} variant="card" />
      ) : query.isError ? (
        <EmptyState icon="alert-triangle" title="Erro" description={getErrorMessage(query.error)} />
      ) : (query.data ?? []).length === 0 ? (
        <EmptyState icon="shield" title="Nenhum perfil" description="Toque em + para criar um perfil." />
      ) : (
        (query.data ?? []).map((p) => (
          <View key={p.id} style={styles.card}>
            <View style={styles.cardHead}>
              <View style={styles.iconWrap}><Feather name="shield" size={18} color={colors.accent} /></View>
              <View style={{ flex: 1 }}>
                <View style={styles.titleRow}>
                  <Text style={styles.title}>{p.nome}</Text>
                  {!p.ativo ? <Text style={styles.inactive}>Inativo</Text> : null}
                </View>
                {p.descricao ? <Text style={styles.subtitle}>{p.descricao}</Text> : null}
                <Text style={styles.metaText}>
                  {(p.permissoes ?? []).length} permissão(ões) · {(p.profissionais ?? []).length} profissional(is)
                </Text>
              </View>
              <View style={styles.actions}>
                <Pressable
                  hitSlop={8}
                  onPress={() => setEditing({
                    id: p.id, nome: p.nome, descricao: p.descricao || "", tipo: p.tipo, ativo: p.ativo,
                    permissoes: Array.isArray(p.permissoes) ? p.permissoes : [],
                  })}
                  style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.6 }]}
                >
                  <Feather name="edit-2" size={14} color={colors.text} />
                </Pressable>
                <Pressable
                  hitSlop={8}
                  onPress={() =>
                    Alert.alert("Excluir", `Excluir perfil "${p.nome}"?`, [
                      { text: "Cancelar", style: "cancel" },
                      { text: "Excluir", style: "destructive", onPress: () => removeMutation.mutate(p.id) },
                    ])
                  }
                  style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.6 }]}
                >
                  <Feather name="trash-2" size={14} color={colors.error} />
                </Pressable>
              </View>
            </View>
          </View>
        ))
      )}

      <Modal visible={!!editing} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <Pressable style={styles.backdrop} onPress={() => setEditing(null)}>
          <Pressable style={[styles.sheet, { maxHeight: "92%" }]} onPress={() => {}}>
            <Text style={styles.modalTitle}>{editing?.id ? "Editar perfil" : "Novo perfil"}</Text>
            <ScrollView style={{ maxHeight: 540 }} keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>Nome</Text>
              <TextInput
                value={editing?.nome ?? ""}
                onChangeText={(t) => setEditing((f) => (f ? { ...f, nome: t } : f))}
                placeholder="Ex.: Recepcionista"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
              />
              <Text style={styles.label}>Descrição</Text>
              <TextInput
                value={editing?.descricao ?? ""}
                onChangeText={(t) => setEditing((f) => (f ? { ...f, descricao: t } : f))}
                placeholder="Opcional"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
              />
              <Text style={styles.label}>Tipo</Text>
              <View style={styles.chips}>
                {(["web", "app"] as const).map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => setEditing((f) => (f ? { ...f, tipo: t } : f))}
                    style={[styles.chip, editing?.tipo === t && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, editing?.tipo === t && { color: colors.invertedText }]}>
                      {t === "web" ? "Sistema (web)" : "App"}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.label}>Ativo</Text>
                <Switch
                  value={editing?.ativo ?? true}
                  onValueChange={(v) => setEditing((f) => (f ? { ...f, ativo: v } : f))}
                  trackColor={{ false: colors.surfaceLight, true: colors.accent }}
                  thumbColor="#fff"
                />
              </View>

              <Text style={styles.label}>Permissões ({(editing?.permissoes ?? []).length})</Text>
              <View style={styles.searchInline}>
                <Feather name="search" size={12} color={colors.textMuted} />
                <TextInput
                  value={permSearch}
                  onChangeText={setPermSearch}
                  placeholder="Filtrar permissão…"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.input, { flex: 1, paddingVertical: Platform.OS === "ios" ? 8 : 6, fontSize: 12 }]}
                />
              </View>

              {filteredGroups.map((g) => (
                <View key={g.label} style={{ marginTop: 10 }}>
                  <Text style={styles.groupLabel}>{g.label}</Text>
                  {g.items.map((it) => {
                    const checked = (editing?.permissoes ?? []).includes(it.key);
                    return (
                      <Pressable key={it.key} onPress={() => togglePerm(it.key)} style={styles.permRow}>
                        <View style={[styles.checkbox, checked && { backgroundColor: colors.accent, borderColor: colors.accent }]}>
                          {checked ? <Feather name="check" size={12} color={colors.invertedText} /> : null}
                        </View>
                        <Text style={styles.permLabel}>{it.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable style={[styles.btn, styles.btnGhost]} onPress={() => setEditing(null)}>
                <Text style={styles.btnGhostText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.btn,
                  styles.btnPrimary,
                  (!editing?.nome?.trim() || upsertMutation.isPending) && { opacity: 0.5 },
                ]}
                disabled={!editing?.nome?.trim() || upsertMutation.isPending}
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

const makeStyles = (c: ColorPalette) => StyleSheet.create({
  tabs: { flexDirection: "row", gap: 6, marginBottom: 12 },
  tab: { flex: 1, paddingVertical: 9, alignItems: "center", borderRadius: 999, backgroundColor: c.surfaceLight, borderWidth: 1, borderColor: c.surfaceBorder },
  tabActive: { backgroundColor: c.accent, borderColor: c.accent },
  tabText: { color: c.textSecondary, fontFamily: "Inter_600SemiBold", fontSize: 12 },
  card: {
    backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.surfaceBorder,
    padding: 12, marginBottom: 8,
  },
  cardHead: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(196,164,106,0.15)", alignItems: "center", justifyContent: "center" },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { color: c.text, fontFamily: "Inter_600SemiBold", fontSize: 13 },
  subtitle: { color: c.textSecondary, fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 2 },
  metaText: { color: c.textMuted, fontFamily: "Inter_500Medium", fontSize: 11, marginTop: 4 },
  inactive: { color: c.warning, fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 0.4 },
  actions: { flexDirection: "row", gap: 6 },
  actionBtn: {
    width: 32, height: 32, borderRadius: 8, backgroundColor: c.surfaceLight,
    borderWidth: 1, borderColor: c.surfaceBorder, alignItems: "center", justifyContent: "center",
  },
  backdrop: { flex: 1, backgroundColor: c.overlay, justifyContent: "flex-end" },
  sheet: { backgroundColor: c.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18 },
  modalTitle: { color: c.text, fontFamily: "Inter_700Bold", fontSize: 15, marginBottom: 4 },
  label: { color: c.textMuted, fontFamily: "Inter_500Medium", fontSize: 11, marginTop: 10, marginBottom: 4 },
  input: {
    backgroundColor: c.surfaceLight, borderRadius: 10, borderWidth: 1, borderColor: c.surfaceBorder,
    paddingHorizontal: 12, paddingVertical: Platform.OS === "ios" ? 10 : 8, color: c.text, fontFamily: "Inter_500Medium", fontSize: 13,
  },
  chips: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  chip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
    backgroundColor: c.surfaceLight, borderWidth: 1, borderColor: c.surfaceBorder,
  },
  chipActive: { backgroundColor: c.accent, borderColor: c.accent },
  chipText: { color: c.textSecondary, fontFamily: "Inter_600SemiBold", fontSize: 12 },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 },
  searchInline: { flexDirection: "row", alignItems: "center", gap: 6 },
  groupLabel: { color: c.accent, fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 4 },
  permRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  checkbox: {
    width: 20, height: 20, borderRadius: 6,
    borderWidth: 1, borderColor: c.surfaceBorder,
    alignItems: "center", justifyContent: "center",
    backgroundColor: c.surfaceLight,
  },
  permLabel: { color: c.text, fontFamily: "Inter_500Medium", fontSize: 13, flex: 1 },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 14 },
  btn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  btnGhost: { backgroundColor: c.surfaceLight, borderWidth: 1, borderColor: c.surfaceBorder },
  btnGhostText: { color: c.text, fontFamily: "Inter_600SemiBold", fontSize: 13 },
  btnPrimary: { backgroundColor: c.accent },
  btnPrimaryText: { color: c.invertedText, fontFamily: "Inter_600SemiBold", fontSize: 13 },
});
