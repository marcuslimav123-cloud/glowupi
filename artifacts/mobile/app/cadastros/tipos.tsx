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
  isCartao?: boolean | null;
  multiplicadorPontos?: number | string | null;
  taxaOperadora?: number | string | null;
  tipoBandeira?: string | null;
  diasRecebimento?: number | null;
  diasUteis?: boolean | null;
};

type CategoriaInfo = {
  key: string;
  label: string;
  icon: keyof typeof Feather.glyphMap;
};

const CATEGORIAS: CategoriaInfo[] = [
  { key: "tipo_receita", label: "Receitas", icon: "trending-up" },
  { key: "tipo_despesa", label: "Despesas", icon: "trending-down" },
  { key: "categoria_servico", label: "Serviços", icon: "scissors" },
  { key: "categoria_produto", label: "Produtos", icon: "package" },
  { key: "categoria_profissional", label: "Profissionais", icon: "users" },
  { key: "subconta", label: "Subcontas", icon: "layers" },
  { key: "equipamento", label: "Equipamentos", icon: "tool" },
  { key: "fornecedor", label: "Fornecedores", icon: "truck" },
  { key: "anamnese", label: "Anamnese", icon: "clipboard" },
  { key: "remuneracao", label: "Remunerações", icon: "dollar-sign" },
  { key: "deducao", label: "Deduções", icon: "minus-circle" },
  { key: "forma_pagamento", label: "Pagamentos", icon: "credit-card" },
  { key: "bandeira", label: "Bandeiras", icon: "credit-card" },
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
  const [isCartao, setIsCartao] = useState(false);
  const [multiplicador, setMultiplicador] = useState("");
  const [taxa, setTaxa] = useState("");
  const [tipoBandeira, setTipoBandeira] = useState<"credito" | "debito" | "voucher" | "outro">("credito");
  const [diasReceb, setDiasReceb] = useState("");
  const [diasUteis, setDiasUteis] = useState(false);

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
    setIsCartao(false);
    setMultiplicador("");
    setTaxa("");
    setTipoBandeira("credito");
    setDiasReceb("");
    setDiasUteis(false);
  };

  const openCreate = () => { reset(); setModalVisible(true); };

  const openEdit = (t: Tipo) => {
    setEditing(t);
    setNome(t.nome);
    setDescricao(t.descricao || "");
    setAtivo(t.ativo !== false);
    setIsCartao(!!t.isCartao);
    setMultiplicador(t.multiplicadorPontos != null ? String(t.multiplicadorPontos) : "");
    setTaxa(t.taxaOperadora != null ? String(t.taxaOperadora) : "");
    const tb = t.tipoBandeira;
    setTipoBandeira(tb === "debito" || tb === "voucher" || tb === "outro" ? tb : "credito");
    setDiasReceb(t.diasRecebimento != null ? String(t.diasRecebimento) : "");
    setDiasUteis(!!t.diasUteis);
    setModalVisible(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!barbeariaId) throw new Error("Barbearia não encontrada");
      const nomeT = nome.trim();
      if (!nomeT) throw new Error("Nome é obrigatório");
      const body: Record<string, unknown> = {
        nome: nomeT,
        descricao: descricao.trim() || null,
        ativo,
        categoria: tab,
      };
      if (tab === "forma_pagamento") {
        body.isCartao = isCartao;
        body.multiplicadorPontos = multiplicador.trim() ? Number(multiplicador.replace(",", ".")) : null;
      }
      if (tab === "bandeira") {
        body.taxaOperadora = taxa.trim() ? Number(taxa.replace(",", ".")) : null;
        body.tipoBandeira = tipoBandeira;
        body.diasRecebimento = diasReceb.trim() ? parseInt(diasReceb, 10) : null;
        body.diasUteis = diasUteis;
      }
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

  const itemDescription = (t: Tipo) => {
    const parts: string[] = [];
    if (t.descricao) parts.push(t.descricao);
    if (tab === "forma_pagamento" && t.isCartao) parts.push("Cartão");
    if (tab === "forma_pagamento" && t.multiplicadorPontos != null) parts.push(`x${t.multiplicadorPontos} pts`);
    if (tab === "bandeira" && t.taxaOperadora != null) parts.push(`Taxa ${t.taxaOperadora}%`);
    if (tab === "bandeira" && t.diasRecebimento != null) parts.push(`${t.diasRecebimento} dias${t.diasUteis ? " úteis" : ""}`);
    if (tab === "bandeira" && t.tipoBandeira) parts.push(t.tipoBandeira);
    return parts.join(" • ") || undefined;
  };

  return (
    <ScreenContainer
      title="Tipos"
      subtitle="Categorias e classificações"
      refreshing={isRefetching}
      onRefresh={refetch}
      rightAction={canManage ? { icon: "plus", label: `Novo ${catAtual.label.toLowerCase()}`, onPress: openCreate } : undefined}
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
        {CATEGORIAS.map((c) => {
          const active = c.key === tab;
          return (
            <Pressable key={c.key} onPress={() => setTab(c.key)} style={[styles.tab, active && styles.tabActive]}>
              <Feather name={c.icon} size={14} color={active ? colors.invertedText : colors.textSecondary} />
              <Text style={[styles.tabText, active && { color: colors.invertedText }]}>{c.label}</Text>
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
          description="Crie a primeira categoria nesta seção."
          ctaLabel={canManage ? "Criar agora" : undefined}
          onCtaPress={canManage ? openCreate : undefined}
        />
      ) : (
        <View style={styles.card}>
          {filtrados.map((t) => (
            <ListRow
              key={t.id}
              icon={catAtual.icon}
              label={t.nome}
              description={itemDescription(t)}
              badge={t.ativo === false ? "Inativo" : "Ativo"}
              badgeTone={t.ativo === false ? "default" : "success"}
              onPress={canManage ? () => openEdit(t) : undefined}
              trailing={canManage ? (
                <Pressable onPress={() => confirmDelete(t)} hitSlop={8} style={{ padding: 4 }}>
                  <Feather name="trash-2" size={16} color={colors.error} />
                </Pressable>
              ) : undefined}
            />
          ))}
        </View>
      )}

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>
                {editing ? `Editar ${catAtual.label.toLowerCase()}` : `Novo ${catAtual.label.toLowerCase()}`}
              </Text>

              <Text style={styles.label}>Nome</Text>
              <TextInput
                value={nome}
                onChangeText={setNome}
                placeholder="Ex: Aluguel, Cartão, Visa..."
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

              {tab === "forma_pagamento" ? (
                <>
                  <View style={styles.switchRow}>
                    <Text style={styles.label}>É cartão?</Text>
                    <Switch
                      value={isCartao}
                      onValueChange={setIsCartao}
                      trackColor={{ true: colors.accent, false: colors.surfaceBorder }}
                      thumbColor={colors.invertedText}
                    />
                  </View>
                  <Text style={styles.label}>Multiplicador de pontos</Text>
                  <TextInput
                    value={multiplicador}
                    onChangeText={setMultiplicador}
                    placeholder="Ex: 1, 1.5, 2"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                    style={styles.input}
                  />
                </>
              ) : null}

              {tab === "bandeira" ? (
                <>
                  <Text style={styles.label}>Tipo</Text>
                  <View style={styles.tabRow}>
                    {(["credito", "debito", "voucher", "outro"] as const).map((opt) => (
                      <Pressable
                        key={opt}
                        onPress={() => setTipoBandeira(opt)}
                        style={[styles.tabSm, tipoBandeira === opt && styles.tabSmActive]}
                      >
                        <Text style={[styles.tabSmText, tipoBandeira === opt && { color: colors.invertedText }]}>
                          {opt === "credito" ? "Crédito" : opt === "debito" ? "Débito" : opt === "voucher" ? "Voucher" : "Outro"}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <Text style={styles.label}>Taxa operadora (%)</Text>
                  <TextInput
                    value={taxa}
                    onChangeText={setTaxa}
                    placeholder="Ex: 2.5"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                    style={styles.input}
                  />
                  <Text style={styles.label}>Dias para recebimento</Text>
                  <TextInput
                    value={diasReceb}
                    onChangeText={setDiasReceb}
                    placeholder="Ex: 30"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    style={styles.input}
                  />
                  <View style={styles.switchRow}>
                    <Text style={styles.label}>Dias úteis</Text>
                    <Switch
                      value={diasUteis}
                      onValueChange={setDiasUteis}
                      trackColor={{ true: colors.accent, false: colors.surfaceBorder }}
                      thumbColor={colors.invertedText}
                    />
                  </View>
                </>
              ) : null}

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
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
    tabsRow: { gap: 6, paddingBottom: 12, paddingRight: 8 },
    tab: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: c.surface, borderWidth: 1, borderColor: c.surfaceBorder },
    tabActive: { backgroundColor: c.accent, borderColor: c.accent },
    tabText: { color: c.textSecondary, fontFamily: "Inter_600SemiBold", fontSize: 12 },
    tabRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
    tabSm: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: c.surface, borderWidth: 1, borderColor: c.surfaceBorder },
    tabSmActive: { backgroundColor: c.accent, borderColor: c.accent },
    tabSmText: { color: c.text, fontFamily: "Inter_600SemiBold", fontSize: 11 },
    card: { backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.surfaceBorder, overflow: "hidden" },
    modalBackdrop: { flex: 1, backgroundColor: c.overlay, justifyContent: "flex-end" },
    modalCard: { backgroundColor: c.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32, borderTopWidth: 1, borderColor: c.surfaceBorder, maxHeight: "90%" },
    modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: c.text, marginBottom: 16 },
    label: { fontSize: 12, fontFamily: "Inter_500Medium", color: c.textSecondary, marginBottom: 6, marginTop: 8 },
    input: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.surfaceBorder, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: c.text, fontFamily: "Inter_500Medium", fontSize: 14 },
    switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 },
    actions: { flexDirection: "row", gap: 10, marginTop: 18 },
    btn: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: 10 },
    btnGhost: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.surfaceBorder },
    btnGhostText: { color: c.text, fontFamily: "Inter_600SemiBold", fontSize: 14 },
    btnPrimary: { backgroundColor: c.accent },
    btnPrimaryText: { color: c.invertedText, fontFamily: "Inter_700Bold", fontSize: 14 },
  });
