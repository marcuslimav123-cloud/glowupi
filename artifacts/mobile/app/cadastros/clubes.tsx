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

type Vantagem = {
  id: number;
  nome: string;
  descricao?: string | null;
  tipo?: string | null;
  valorDesconto?: number | null;
  percentualDesconto?: number | null;
  pontosNecessarios?: number | null;
  ativo?: boolean;
};

export default function ClubesScreen() {
  const { barbeariaId, user } = useAuth();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const qc = useQueryClient();
  const canManage = user?.role === "dono" || user?.role === "gerente";

  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Vantagem | null>(null);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo] = useState<"percentual" | "valor" | "brinde">("percentual");
  const [valor, setValor] = useState("");
  const [pontos, setPontos] = useState("");
  const [ativo, setAtivo] = useState(true);

  const { data, isLoading, isError, refetch, isRefetching, error } = useQuery<Vantagem[]>({
    queryKey: ["clube-vantagens", barbeariaId],
    queryFn: async () => {
      if (!barbeariaId) return [];
      const raw = await fetchJson<unknown>(`/barbearias/${barbeariaId}/clube-vantagens`);
      return Array.isArray(raw) ? (raw as Vantagem[]) : [];
    },
    enabled: !!barbeariaId,
  });

  const reset = () => {
    setEditing(null);
    setNome("");
    setDescricao("");
    setTipo("percentual");
    setValor("");
    setPontos("");
    setAtivo(true);
  };

  const openCreate = () => {
    reset();
    setModalVisible(true);
  };

  const openEdit = (v: Vantagem) => {
    setEditing(v);
    setNome(v.nome);
    setDescricao(v.descricao || "");
    const t = (v.tipo as any) || "percentual";
    setTipo(t === "valor" || t === "brinde" ? t : "percentual");
    if (v.percentualDesconto != null) setValor(String(v.percentualDesconto));
    else if (v.valorDesconto != null) setValor(String(v.valorDesconto));
    else setValor("");
    setPontos(v.pontosNecessarios != null ? String(v.pontosNecessarios) : "");
    setAtivo(v.ativo !== false);
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
        tipo,
        ativo,
      };
      const valorNum = valor.trim() ? Number(valor.replace(",", ".")) : null;
      if (tipo === "percentual") {
        body.percentualDesconto = valorNum;
        body.valorDesconto = null;
      } else if (tipo === "valor") {
        body.valorDesconto = valorNum;
        body.percentualDesconto = null;
      } else {
        body.valorDesconto = null;
        body.percentualDesconto = null;
      }
      if (pontos.trim()) body.pontosNecessarios = parseInt(pontos, 10);
      const url = editing
        ? `/barbearias/${barbeariaId}/clube-vantagens/${editing.id}`
        : `/barbearias/${barbeariaId}/clube-vantagens`;
      return fetchJson(url, { method: editing ? "PUT" : "POST", body });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clube-vantagens", barbeariaId] });
      reset();
      setModalVisible(false);
    },
    onError: (e) => Alert.alert("Erro", getErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      if (!barbeariaId) throw new Error("Barbearia não encontrada");
      return fetchJson(`/barbearias/${barbeariaId}/clube-vantagens/${id}`, { method: "DELETE" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clube-vantagens", barbeariaId] }),
    onError: (e) => Alert.alert("Erro", getErrorMessage(e)),
  });

  const confirmDelete = (v: Vantagem) => {
    Alert.alert("Excluir vantagem", `Remover "${v.nome}"?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir", style: "destructive", onPress: () => deleteMutation.mutate(v.id) },
    ]);
  };

  return (
    <ScreenContainer
      title="Clube de vantagens"
      subtitle="Recompensas e benefícios para clientes"
      refreshing={isRefetching}
      onRefresh={refetch}
      rightAction={canManage ? { icon: "plus", label: "Nova vantagem", onPress: openCreate } : undefined}
    >
      {isLoading ? (
        <SkeletonList count={3} variant="card" />
      ) : isError ? (
        <ErrorView error={error} onRetry={refetch} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon="award"
          title="Nenhuma vantagem cadastrada"
          description="Crie recompensas que clientes podem trocar por pontos."
          ctaLabel={canManage ? "Criar primeira vantagem" : undefined}
          onCtaPress={canManage ? openCreate : undefined}
        />
      ) : (
        <View style={styles.card}>
          {data.map((v) => {
            const desconto = v.percentualDesconto != null
              ? `${v.percentualDesconto}%`
              : v.valorDesconto != null
                ? `R$ ${Number(v.valorDesconto).toFixed(2).replace(".", ",")}`
                : v.tipo === "brinde" ? "Brinde" : "—";
            const desc = [
              v.descricao,
              v.pontosNecessarios != null ? `${v.pontosNecessarios} pts` : null,
            ].filter(Boolean).join(" • ") || undefined;
            return (
              <ListRow
                key={v.id}
                icon="award"
                label={v.nome}
                description={desc}
                badge={v.ativo === false ? "Inativo" : "Ativo"}
                badgeTone={v.ativo === false ? "default" : "success"}
                rightLabel={desconto}
                onPress={canManage ? () => openEdit(v) : undefined}
                trailing={canManage ? (
                  <Pressable onPress={() => confirmDelete(v)} hitSlop={8} style={{ padding: 4 }}>
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
              <Text style={styles.modalTitle}>{editing ? "Editar vantagem" : "Nova vantagem"}</Text>

              <Text style={styles.label}>Nome</Text>
              <TextInput
                value={nome}
                onChangeText={setNome}
                placeholder="Ex: 10% no próximo corte"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
              />

              <Text style={styles.label}>Descrição</Text>
              <TextInput
                value={descricao}
                onChangeText={setDescricao}
                placeholder="Detalhes da vantagem"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, { height: 60, textAlignVertical: "top" }]}
                multiline
              />

              <Text style={styles.label}>Tipo</Text>
              <View style={styles.tabRow}>
                {(["percentual", "valor", "brinde"] as const).map((opt) => (
                  <Pressable
                    key={opt}
                    onPress={() => setTipo(opt)}
                    style={[styles.tabBtn, tipo === opt && styles.tabBtnActive]}
                  >
                    <Text style={[styles.tabText, tipo === opt && { color: colors.invertedText }]}>
                      {opt === "percentual" ? "% Desconto" : opt === "valor" ? "R$ Desconto" : "Brinde"}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {tipo !== "brinde" ? (
                <>
                  <Text style={styles.label}>{tipo === "percentual" ? "Percentual (%)" : "Valor (R$)"}</Text>
                  <TextInput
                    value={valor}
                    onChangeText={setValor}
                    placeholder={tipo === "percentual" ? "Ex: 10" : "Ex: 25,00"}
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                    style={styles.input}
                  />
                </>
              ) : null}

              <Text style={styles.label}>Pontos necessários</Text>
              <TextInput
                value={pontos}
                onChangeText={setPontos}
                placeholder="Ex: 100"
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
    card: { backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.surfaceBorder, overflow: "hidden" },
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
    tabRow: { flexDirection: "row", gap: 6 },
    tabBtn: {
      flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center",
      backgroundColor: c.surface, borderWidth: 1, borderColor: c.surfaceBorder,
    },
    tabBtnActive: { backgroundColor: c.accent, borderColor: c.accent },
    tabText: { color: c.text, fontFamily: "Inter_600SemiBold", fontSize: 12 },
    switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 },
    actions: { flexDirection: "row", gap: 10, marginTop: 18 },
    btn: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: 10 },
    btnGhost: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.surfaceBorder },
    btnGhostText: { color: c.text, fontFamily: "Inter_600SemiBold", fontSize: 14 },
    btnPrimary: { backgroundColor: c.accent },
    btnPrimaryText: { color: c.invertedText, fontFamily: "Inter_700Bold", fontSize: 14 },
  });
