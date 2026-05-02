import React, { useMemo, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useColors, type ColorPalette } from "@/lib/theme";
import { ScreenContainer } from "@/components/ScreenContainer";
import { ListRow } from "@/components/ListRow";
import { EmptyState } from "@/components/EmptyState";
import { ErrorView } from "@/components/ErrorView";
import { SkeletonList } from "@/components/Skeleton";
import { SectionHeader } from "@/components/SectionHeader";
import { useAuth } from "@/contexts/AuthContext";
import { fetchJson, getErrorMessage } from "@/lib/api";

type Pacote = {
  id: number;
  nome: string;
  descricao?: string | null;
  preco: number | string;
  sessoesTotal?: number | null;
  validade?: number | null;
  validadeDias?: number | null;
  ativo?: boolean;
};

function formatBRL(v: number | string | null | undefined) {
  const n = typeof v === "string" ? Number(v) : (v ?? 0);
  return `R$ ${(isNaN(n) ? 0 : n).toFixed(2).replace(".", ",")}`;
}

function pacoteValidade(p: Pacote): number | null {
  return p.validadeDias ?? p.validade ?? null;
}

export default function PacotesScreen() {
  const { barbeariaId, user } = useAuth();
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const qc = useQueryClient();
  const canManage = user?.role === "dono" || user?.role === "gerente";

  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Pacote | null>(null);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [preco, setPreco] = useState("");
  const [sessoes, setSessoes] = useState("");
  const [validade, setValidade] = useState("");
  const [ativo, setAtivo] = useState(true);

  const { data, isLoading, isError, refetch, isRefetching, error } = useQuery<Pacote[]>({
    queryKey: ["pacotes", barbeariaId],
    queryFn: async () => {
      if (!barbeariaId) return [];
      const raw = await fetchJson<unknown>(`/barbearias/${barbeariaId}/pacotes`);
      return Array.isArray(raw) ? (raw as Pacote[]) : [];
    },
    enabled: !!barbeariaId,
  });

  const reset = () => {
    setEditing(null);
    setNome("");
    setDescricao("");
    setPreco("");
    setSessoes("");
    setValidade("");
    setAtivo(true);
  };

  const openCreate = () => {
    reset();
    setModalVisible(true);
  };

  const openEdit = (p: Pacote) => {
    setEditing(p);
    setNome(p.nome);
    setDescricao(p.descricao || "");
    setPreco(String(typeof p.preco === "string" ? Number(p.preco) : p.preco));
    setSessoes(p.sessoesTotal != null ? String(p.sessoesTotal) : "");
    const v = pacoteValidade(p);
    setValidade(v != null ? String(v) : "");
    setAtivo(p.ativo !== false);
    setModalVisible(true);
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      if (!barbeariaId) throw new Error("Barbearia não encontrada");
      return fetchJson(`/barbearias/${barbeariaId}/pacotes/${id}`, { method: "DELETE" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pacotes", barbeariaId] }),
    onError: (e) => Alert.alert("Erro", getErrorMessage(e)),
  });

  const confirmDelete = (p: Pacote) => {
    Alert.alert("Excluir pacote", `Remover "${p.nome}"?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir", style: "destructive", onPress: () => deleteMutation.mutate(p.id) },
    ]);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!barbeariaId) throw new Error("Barbearia não encontrada");
      const nomeT = nome.trim();
      const precoNum = Number(preco.replace(",", "."));
      if (!nomeT) throw new Error("Nome é obrigatório");
      if (!isFinite(precoNum) || precoNum < 0) throw new Error("Preço inválido");
      const body: Record<string, unknown> = {
        nome: nomeT,
        descricao: descricao.trim() || null,
        preco: precoNum,
        ativo,
      };
      if (sessoes.trim()) body.sessoesTotal = parseInt(sessoes, 10);
      if (validade.trim()) body.validadeDias = parseInt(validade, 10);
      const url = editing
        ? `/barbearias/${barbeariaId}/pacotes/${editing.id}`
        : `/barbearias/${barbeariaId}/pacotes`;
      return fetchJson(url, { method: editing ? "PUT" : "POST", body });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pacotes", barbeariaId] });
      reset();
      setModalVisible(false);
    },
    onError: (e) => Alert.alert("Erro", getErrorMessage(e)),
  });

  return (
    <ScreenContainer
      title="Pacotes"
      subtitle="Crie pacotes de serviços com desconto"
      refreshing={isRefetching}
      onRefresh={refetch}
      rightAction={canManage ? { icon: "plus", label: "Novo pacote", onPress: openCreate } : undefined}
    >
      <View style={styles.card}>
        <ListRow
          icon="shopping-bag"
          label="Vendas e clientes"
          description="Veja quem comprou e o saldo de sessões"
          onPress={() => router.push("/pacotes/vendas")}
        />
      </View>

      <SectionHeader label="Pacotes disponíveis" />

      {isLoading ? (
        <SkeletonList count={3} variant="card" />
      ) : isError ? (
        <ErrorView error={error} onRetry={refetch} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon="gift"
          title="Nenhum pacote criado"
          description="Pacotes permitem vender combos de sessões com desconto."
          ctaLabel={canManage ? "Criar primeiro pacote" : undefined}
          onCtaPress={canManage ? openCreate : undefined}
        />
      ) : (
        <View style={styles.card}>
          {data.map((p) => {
            const v = pacoteValidade(p);
            const desc = [
              p.descricao,
              p.sessoesTotal != null ? `${p.sessoesTotal} sessões` : null,
              v != null ? `${v} dias` : null,
            ].filter(Boolean).join(" • ") || undefined;
            return (
              <ListRow
                key={p.id}
                icon="gift"
                label={p.nome}
                description={desc}
                badge={p.ativo === false ? "Inativo" : "Ativo"}
                badgeTone={p.ativo === false ? "default" : "success"}
                rightLabel={formatBRL(p.preco)}
                onPress={canManage ? () => openEdit(p) : undefined}
                trailing={canManage ? (
                  <Pressable onPress={() => confirmDelete(p)} hitSlop={8} style={{ padding: 4 }}>
                    <Feather name="trash-2" size={16} color={colors.error} />
                  </Pressable>
                ) : undefined}
              />
            );
          })}
        </View>
      )}

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>{editing ? "Editar pacote" : "Novo pacote"}</Text>

              <Text style={styles.label}>Nome</Text>
              <TextInput
                value={nome}
                onChangeText={setNome}
                placeholder="Ex: Pacote 5 cortes"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
              />

              <Text style={styles.label}>Descrição (opcional)</Text>
              <TextInput
                value={descricao}
                onChangeText={setDescricao}
                placeholder="Detalhes do pacote"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, { height: 60, textAlignVertical: "top" }]}
                multiline
              />

              <View style={styles.row2}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Preço (R$)</Text>
                  <TextInput
                    value={preco}
                    onChangeText={setPreco}
                    placeholder="0,00"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                    style={styles.input}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Sessões</Text>
                  <TextInput
                    value={sessoes}
                    onChangeText={setSessoes}
                    placeholder="Ex: 5"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    style={styles.input}
                  />
                </View>
              </View>

              <Text style={styles.label}>Validade (dias)</Text>
              <TextInput
                value={validade}
                onChangeText={setValidade}
                placeholder="Ex: 90"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                style={styles.input}
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
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
    card: { backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.surfaceBorder, overflow: "hidden", marginBottom: 8 },
    modalBackdrop: { flex: 1, backgroundColor: c.overlay, justifyContent: "flex-end" },
    modalCard: {
      backgroundColor: c.background, borderTopLeftRadius: 20, borderTopRightRadius: 20,
      padding: 20, paddingBottom: 32, borderTopWidth: 1, borderColor: c.surfaceBorder, maxHeight: "85%",
    },
    modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: c.text, marginBottom: 16 },
    label: { fontSize: 12, fontFamily: "Inter_500Medium", color: c.textSecondary, marginBottom: 6, marginTop: 8 },
    input: {
      backgroundColor: c.surface, borderWidth: 1, borderColor: c.surfaceBorder,
      borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
      color: c.text, fontFamily: "Inter_500Medium", fontSize: 14,
    },
    row2: { flexDirection: "row", gap: 10 },
    switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 },
    actions: { flexDirection: "row", gap: 10, marginTop: 18 },
    btn: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: 10 },
    btnGhost: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.surfaceBorder },
    btnGhostText: { color: c.text, fontFamily: "Inter_600SemiBold", fontSize: 14 },
    btnPrimary: { backgroundColor: c.accent },
    btnPrimaryText: { color: c.invertedText, fontFamily: "Inter_700Bold", fontSize: 14 },
  });
