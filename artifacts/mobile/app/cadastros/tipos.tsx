import React, { useMemo, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useColors, type ColorPalette } from "@/lib/theme";
import { ScreenContainer } from "@/components/ScreenContainer";
import { ListRow } from "@/components/ListRow";
import { EmptyState } from "@/components/EmptyState";
import { ErrorView } from "@/components/ErrorView";
import { SkeletonList } from "@/components/Skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { fetchJson, getErrorMessage } from "@/lib/api";

type Tipo = {
  id: number;
  nome: string;
  categoria: string;
  ativo?: boolean;
  descricao?: string | null;
};

type CategoriaInfo = {
  key: string;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  simpleCrud: boolean;
};

const CATEGORIAS: CategoriaInfo[] = [
  { key: "tipo_receita", label: "Receitas", icon: "trending-up", simpleCrud: true },
  { key: "tipo_despesa", label: "Despesas", icon: "trending-down", simpleCrud: true },
  { key: "categoria_servico", label: "Serviços", icon: "scissors", simpleCrud: true },
  { key: "categoria_produto", label: "Produtos", icon: "package", simpleCrud: true },
  { key: "categoria_profissional", label: "Profissionais", icon: "users", simpleCrud: true },
  { key: "subconta", label: "Subcontas", icon: "layers", simpleCrud: true },
  { key: "equipamento", label: "Equipamentos", icon: "tool", simpleCrud: true },
  { key: "fornecedor", label: "Fornecedores", icon: "truck", simpleCrud: true },
  { key: "anamnese", label: "Anamnese", icon: "clipboard", simpleCrud: true },
  { key: "remuneracao", label: "Remunerações", icon: "dollar-sign", simpleCrud: true },
  { key: "deducao", label: "Deduções", icon: "minus-circle", simpleCrud: true },
  { key: "forma_pagamento", label: "Pagamentos", icon: "credit-card", simpleCrud: false },
  { key: "bandeira", label: "Bandeiras", icon: "credit-card", simpleCrud: false },
];

export default function TiposScreen() {
  const { barbeariaId, user } = useAuth();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const qc = useQueryClient();
  const canManage = user?.role === "dono" || user?.role === "gerente";

  const [tab, setTab] = useState<string>(CATEGORIAS[0].key);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Tipo | null>(null);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [ativo, setAtivo] = useState(true);

  const catAtual = CATEGORIAS.find((c) => c.key === tab) || CATEGORIAS[0];

  const { data, isLoading, isError, refetch, isRefetching, error } = useQuery<Tipo[]>({
    queryKey: ["tipos-financeiro", barbeariaId],
    queryFn: async () => {
      if (!barbeariaId) return [];
      const raw = await fetchJson<unknown>(`/barbearias/${barbeariaId}/tipos`);
      return Array.isArray(raw) ? (raw as Tipo[]) : [];
    },
    enabled: !!barbeariaId,
  });

  const filtrados = (data || []).filter((t) => t.categoria === tab);

  const reset = () => {
    setEditing(null);
    setNome("");
    setDescricao("");
    setAtivo(true);
  };

  const openCreate = () => {
    reset();
    setModalVisible(true);
  };

  const openEdit = (t: Tipo) => {
    setEditing(t);
    setNome(t.nome);
    setDescricao(t.descricao || "");
    setAtivo(t.ativo !== false);
    setModalVisible(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!barbeariaId) throw new Error("Barbearia não encontrada");
      const nomeT = nome.trim();
      if (!nomeT) throw new Error("Nome é obrigatório");
      const body = {
        nome: nomeT,
        descricao: descricao.trim() || null,
        ativo,
        categoria: tab,
      };
      const url = editing
        ? `/barbearias/${barbeariaId}/tipos/${editing.id}`
        : `/barbearias/${barbeariaId}/tipos`;
      return fetchJson(url, { method: editing ? "PUT" : "POST", body });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tipos-financeiro", barbeariaId] });
      reset();
      setModalVisible(false);
    },
    onError: (e) => Alert.alert("Erro", getErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      if (!barbeariaId) throw new Error("Barbearia não encontrada");
      return fetchJson(`/barbearias/${barbeariaId}/tipos/${id}`, { method: "DELETE" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tipos-financeiro", barbeariaId] }),
    onError: (e) => Alert.alert("Erro", getErrorMessage(e)),
  });

  const confirmDelete = (t: Tipo) => {
    Alert.alert("Excluir tipo", `Remover "${t.nome}"?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir", style: "destructive", onPress: () => deleteMutation.mutate(t.id) },
    ]);
  };

  const showCreateAction = canManage && catAtual.simpleCrud;

  return (
    <ScreenContainer
      title="Tipos"
      subtitle="Categorias e classificações"
      refreshing={isRefetching}
      onRefresh={refetch}
      rightAction={showCreateAction ? { icon: "plus", label: `Novo ${catAtual.label.toLowerCase()}`, onPress: openCreate } : undefined}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsRow}
      >
        {CATEGORIAS.map((c) => {
          const active = c.key === tab;
          return (
            <Pressable
              key={c.key}
              onPress={() => setTab(c.key)}
              style={[styles.tab, active && styles.tabActive]}
            >
              <Feather
                name={c.icon}
                size={14}
                color={active ? colors.invertedText : colors.textSecondary}
              />
              <Text style={[styles.tabText, active && { color: colors.invertedText }]}>
                {c.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {isLoading ? (
        <SkeletonList count={4} variant="row" />
      ) : isError ? (
        <ErrorView error={error} onRetry={refetch} />
      ) : filtrados.length === 0 ? (
        <EmptyState
          icon={catAtual.icon}
          title={`Sem ${catAtual.label.toLowerCase()}`}
          description={catAtual.simpleCrud
            ? "Crie a primeira categoria nesta seção."
            : "Esta categoria possui campos avançados — gerencie no painel web."}
          ctaLabel={showCreateAction ? "Criar agora" : undefined}
          onCtaPress={showCreateAction ? openCreate : undefined}
        />
      ) : (
        <View style={styles.card}>
          {filtrados.map((t) => (
            <ListRow
              key={t.id}
              icon={catAtual.icon}
              label={t.nome}
              description={t.descricao || undefined}
              badge={t.ativo === false ? "Inativo" : "Ativo"}
              badgeTone={t.ativo === false ? "default" : "success"}
              onPress={canManage && catAtual.simpleCrud ? () => openEdit(t) : undefined}
              trailing={canManage && catAtual.simpleCrud ? (
                <Pressable onPress={() => confirmDelete(t)} hitSlop={8} style={{ padding: 4 }}>
                  <Feather name="trash-2" size={16} color={colors.error} />
                </Pressable>
              ) : undefined}
            />
          ))}
        </View>
      )}

      {!catAtual.simpleCrud ? (
        <Text style={styles.hint}>
          Pagamentos e bandeiras possuem configurações específicas (taxa, dias, multiplicadores). Edite no painel web em glowupi.com.
        </Text>
      ) : null}

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editing ? `Editar ${catAtual.label.toLowerCase()}` : `Novo ${catAtual.label.toLowerCase()}`}
            </Text>

            <Text style={styles.label}>Nome</Text>
            <TextInput
              value={nome}
              onChangeText={setNome}
              placeholder="Ex: Aluguel, Serviços, Cartão..."
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              autoFocus
            />

            <Text style={styles.label}>Descrição (opcional)</Text>
            <TextInput
              value={descricao}
              onChangeText={setDescricao}
              placeholder="Detalhes adicionais"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { height: 60, textAlignVertical: "top" }]}
              multiline
            />

            <View style={styles.switchRow}>
              <Text style={styles.label}>Ativo</Text>
              <Switch
                value={ativo}
                onValueChange={setAtivo}
                trackColor={{ true: colors.accent, false: colors.surfaceBorder }}
                thumbColor={colors.invertedText}
              />
            </View>

            <View style={styles.actions}>
              <Pressable onPress={() => setModalVisible(false)} style={[styles.btn, styles.btnGhost]}>
                <Text style={styles.btnGhostText}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                style={[styles.btn, styles.btnPrimary, saveMutation.isPending && { opacity: 0.7 }]}
              >
                <Text style={styles.btnPrimaryText}>{saveMutation.isPending ? "Salvando…" : "Salvar"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
    tabsRow: { gap: 6, paddingBottom: 12, paddingRight: 8 },
    tab: {
      flexDirection: "row", alignItems: "center", gap: 6,
      paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
      backgroundColor: c.surface, borderWidth: 1, borderColor: c.surfaceBorder,
    },
    tabActive: { backgroundColor: c.accent, borderColor: c.accent },
    tabText: { color: c.textSecondary, fontFamily: "Inter_600SemiBold", fontSize: 12 },
    card: { backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.surfaceBorder, overflow: "hidden" },
    hint: { color: c.textMuted, fontFamily: "Inter_500Medium", fontSize: 11, textAlign: "center", marginTop: 16 },
    modalBackdrop: { flex: 1, backgroundColor: c.overlay, justifyContent: "flex-end" },
    modalCard: {
      backgroundColor: c.background, borderTopLeftRadius: 20, borderTopRightRadius: 20,
      padding: 20, paddingBottom: 32, borderTopWidth: 1, borderColor: c.surfaceBorder,
    },
    modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: c.text, marginBottom: 16 },
    label: { fontSize: 12, fontFamily: "Inter_500Medium", color: c.textSecondary, marginBottom: 6, marginTop: 8 },
    input: {
      backgroundColor: c.surface, borderWidth: 1, borderColor: c.surfaceBorder,
      borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
      color: c.text, fontFamily: "Inter_500Medium", fontSize: 14,
    },
    switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 },
    actions: { flexDirection: "row", gap: 10, marginTop: 18 },
    btn: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: 10 },
    btnGhost: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.surfaceBorder },
    btnGhostText: { color: c.text, fontFamily: "Inter_600SemiBold", fontSize: 14 },
    btnPrimary: { backgroundColor: c.accent },
    btnPrimaryText: { color: c.invertedText, fontFamily: "Inter_700Bold", fontSize: 14 },
  });
