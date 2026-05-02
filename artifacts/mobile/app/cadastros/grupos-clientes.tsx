import React, { useMemo, useState } from "react";
import { Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useColors, type ColorPalette } from "@/lib/theme";
import { ScreenContainer } from "@/components/ScreenContainer";
import { ListRow } from "@/components/ListRow";
import { EmptyState } from "@/components/EmptyState";
import { ErrorView } from "@/components/ErrorView";
import { SkeletonList } from "@/components/Skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { fetchJson, getErrorMessage } from "@/lib/api";

type Grupo = {
  id: number;
  nome: string;
  descricao?: string | null;
  filtroJson?: { descricao?: string | null } | null;
  totalClientes?: number;
};

function getGrupoDescricao(g: Grupo): string {
  if (g.descricao) return g.descricao;
  if (g.filtroJson && typeof g.filtroJson === "object" && g.filtroJson.descricao) {
    return g.filtroJson.descricao;
  }
  return "";
}

export default function GruposClientesScreen() {
  const { barbeariaId, user } = useAuth();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const qc = useQueryClient();
  const canManage = user?.role === "dono" || user?.role === "gerente";

  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Grupo | null>(null);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");

  const { data, isLoading, isError, refetch, isRefetching, error } = useQuery<Grupo[]>({
    queryKey: ["grupos-clientes", barbeariaId],
    queryFn: async () => {
      if (!barbeariaId) return [];
      const raw = await fetchJson<unknown>(`/barbearias/${barbeariaId}/noticias/grupos`);
      return Array.isArray(raw) ? (raw as Grupo[]) : [];
    },
    enabled: !!barbeariaId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!barbeariaId) throw new Error("Barbearia não encontrada");
      const body = { nome: nome.trim(), descricao: descricao.trim() || null };
      if (!body.nome) throw new Error("Nome é obrigatório");
      const url = editing
        ? `/barbearias/${barbeariaId}/noticias/grupos/${editing.id}`
        : `/barbearias/${barbeariaId}/noticias/grupos`;
      const payload = { nome: body.nome, filtroJson: { descricao: body.descricao } };
      return fetchJson(url, { method: editing ? "PUT" : "POST", body: payload });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["grupos-clientes", barbeariaId] });
      setModalVisible(false);
      setEditing(null);
      setNome("");
      setDescricao("");
    },
    onError: (e) => Alert.alert("Erro", getErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      if (!barbeariaId) throw new Error("Barbearia não encontrada");
      return fetchJson(`/barbearias/${barbeariaId}/noticias/grupos/${id}`, { method: "DELETE" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["grupos-clientes", barbeariaId] }),
    onError: (e) => Alert.alert("Erro", getErrorMessage(e)),
  });

  const openCreate = () => {
    setEditing(null);
    setNome("");
    setDescricao("");
    setModalVisible(true);
  };

  const openEdit = (g: Grupo) => {
    setEditing(g);
    setNome(g.nome);
    setDescricao(getGrupoDescricao(g));
    setModalVisible(true);
  };

  const confirmDelete = (g: Grupo) => {
    Alert.alert("Excluir grupo", `Remover o grupo "${g.nome}"?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir", style: "destructive", onPress: () => deleteMutation.mutate(g.id) },
    ]);
  };

  return (
    <ScreenContainer
      title="Grupos de clientes"
      subtitle="Segmentação para campanhas e relatórios"
      refreshing={isRefetching}
      onRefresh={refetch}
      rightAction={canManage ? { icon: "plus", label: "Novo grupo", onPress: openCreate } : undefined}
    >
      {isLoading ? (
        <SkeletonList count={3} variant="card" />
      ) : isError ? (
        <ErrorView error={error} onRetry={refetch} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon="users"
          title="Nenhum grupo cadastrado"
          description="Crie grupos para segmentar clientes em campanhas, promoções e relatórios."
          ctaLabel={canManage ? "Criar primeiro grupo" : undefined}
          onCtaPress={canManage ? openCreate : undefined}
        />
      ) : (
        <View style={styles.card}>
          {data.map((g) => (
            <ListRow
              key={g.id}
              icon="users"
              label={g.nome}
              description={getGrupoDescricao(g) || (g.totalClientes != null ? `${g.totalClientes} cliente(s)` : undefined)}
              onPress={canManage ? () => openEdit(g) : undefined}
              trailing={
                canManage ? (
                  <Pressable onPress={() => confirmDelete(g)} hitSlop={8} style={{ padding: 4 }}>
                    <Feather name="trash-2" size={16} color={colors.error} />
                  </Pressable>
                ) : undefined
              }
            />
          ))}
        </View>
      )}

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editing ? "Editar grupo" : "Novo grupo"}</Text>
            <Text style={styles.modalLabel}>Nome</Text>
            <TextInput
              value={nome}
              onChangeText={setNome}
              placeholder="Ex: VIP, Fiéis, Novos"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              autoFocus
            />
            <Text style={styles.modalLabel}>Descrição (opcional)</Text>
            <TextInput
              value={descricao}
              onChangeText={setDescricao}
              placeholder="Quem participa deste grupo?"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { height: 70, textAlignVertical: "top" }]}
              multiline
            />
            <View style={styles.modalActions}>
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
    card: { backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.surfaceBorder, overflow: "hidden" },
    modalBackdrop: { flex: 1, backgroundColor: c.overlay, justifyContent: "flex-end" },
    modalCard: {
      backgroundColor: c.background, borderTopLeftRadius: 20, borderTopRightRadius: 20,
      padding: 20, paddingBottom: 32, borderTopWidth: 1, borderColor: c.surfaceBorder,
    },
    modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: c.text, marginBottom: 16 },
    modalLabel: { fontSize: 12, fontFamily: "Inter_500Medium", color: c.textSecondary, marginBottom: 6, marginTop: 8 },
    input: {
      backgroundColor: c.surface, borderWidth: 1, borderColor: c.surfaceBorder,
      borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
      color: c.text, fontFamily: "Inter_500Medium", fontSize: 14,
    },
    modalActions: { flexDirection: "row", gap: 10, marginTop: 18 },
    btn: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: 10 },
    btnGhost: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.surfaceBorder },
    btnGhostText: { color: c.text, fontFamily: "Inter_600SemiBold", fontSize: 14 },
    btnPrimary: { backgroundColor: c.accent },
    btnPrimaryText: { color: c.invertedText, fontFamily: "Inter_700Bold", fontSize: 14 },
  });
