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

type Plano = {
  id: number;
  nome: string;
  descricao?: string | null;
  precoMensal: number | string;
  limiteUso?: number | null;
  ativo?: boolean;
};

type Assinante = {
  id: number;
  clienteNome: string;
  planoNome: string;
  planoId: number;
  status: string;
  dataInicio: string;
  dataFim?: string | null;
};

export default function ClubesAssinaturaScreen() {
  const { barbeariaId, user } = useAuth();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const qc = useQueryClient();
  const canManage = user?.role === "dono" || user?.role === "gerente";

  const [tab, setTab] = useState<"planos" | "assinantes">("planos");

  const [planoModalVisible, setPlanoModalVisible] = useState(false);
  const [editingPlano, setEditingPlano] = useState<Plano | null>(null);
  const [pNome, setPNome] = useState("");
  const [pDescricao, setPDescricao] = useState("");
  const [pPreco, setPPreco] = useState("");
  const [pLimite, setPLimite] = useState("");
  const [pAtivo, setPAtivo] = useState(true);

  const [assinModalVisible, setAssinModalVisible] = useState(false);
  const [aNome, setANome] = useState("");
  const [aPlano, setAPlano] = useState<number | null>(null);

  const planosQ = useQuery<Plano[]>({
    queryKey: ["assinaturas-planos", barbeariaId],
    queryFn: async () => {
      if (!barbeariaId) return [];
      const raw = await fetchJson<unknown>(`/barbearias/${barbeariaId}/assinaturas/planos`);
      return Array.isArray(raw) ? (raw as Plano[]) : [];
    },
    enabled: !!barbeariaId,
  });

  const assinantesQ = useQuery<Assinante[]>({
    queryKey: ["assinaturas-assinantes", barbeariaId],
    queryFn: async () => {
      if (!barbeariaId) return [];
      const raw = await fetchJson<unknown>(`/barbearias/${barbeariaId}/assinaturas/assinantes`);
      return Array.isArray(raw) ? (raw as Assinante[]) : [];
    },
    enabled: !!barbeariaId,
  });

  const resetPlano = () => {
    setEditingPlano(null);
    setPNome("");
    setPDescricao("");
    setPPreco("");
    setPLimite("");
    setPAtivo(true);
  };

  const openCreatePlano = () => { resetPlano(); setPlanoModalVisible(true); };
  const openEditPlano = (p: Plano) => {
    setEditingPlano(p);
    setPNome(p.nome);
    setPDescricao(p.descricao || "");
    setPPreco(String(typeof p.precoMensal === "string" ? Number(p.precoMensal) : p.precoMensal));
    setPLimite(p.limiteUso != null ? String(p.limiteUso) : "");
    setPAtivo(p.ativo !== false);
    setPlanoModalVisible(true);
  };

  const savePlano = useMutation({
    mutationFn: async () => {
      if (!barbeariaId) throw new Error("Barbearia não encontrada");
      const nome = pNome.trim();
      const preco = Number(pPreco.replace(",", "."));
      if (!nome) throw new Error("Nome é obrigatório");
      if (!isFinite(preco) || preco < 0) throw new Error("Preço inválido");
      const body: Record<string, unknown> = {
        nome,
        descricao: pDescricao.trim() || null,
        precoMensal: preco,
        ativo: pAtivo,
      };
      if (pLimite.trim()) body.limiteUso = parseInt(pLimite, 10);
      const url = editingPlano
        ? `/barbearias/${barbeariaId}/assinaturas/planos/${editingPlano.id}`
        : `/barbearias/${barbeariaId}/assinaturas/planos`;
      return fetchJson(url, { method: editingPlano ? "PUT" : "POST", body });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assinaturas-planos", barbeariaId] });
      setPlanoModalVisible(false);
      resetPlano();
    },
    onError: (e) => Alert.alert("Erro", getErrorMessage(e)),
  });

  const deletePlano = useMutation({
    mutationFn: async (id: number) => {
      if (!barbeariaId) throw new Error("Barbearia não encontrada");
      return fetchJson(`/barbearias/${barbeariaId}/assinaturas/planos/${id}`, { method: "DELETE" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assinaturas-planos", barbeariaId] }),
    onError: (e) => Alert.alert("Erro", getErrorMessage(e)),
  });

  const confirmDeletePlano = (p: Plano) => {
    Alert.alert("Excluir plano", `Remover "${p.nome}"?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir", style: "destructive", onPress: () => deletePlano.mutate(p.id) },
    ]);
  };

  const saveAssinante = useMutation({
    mutationFn: async () => {
      if (!barbeariaId) throw new Error("Barbearia não encontrada");
      if (!aNome.trim()) throw new Error("Informe o nome do cliente");
      if (!aPlano) throw new Error("Selecione um plano");
      const plano = planosQ.data?.find((p) => p.id === aPlano);
      return fetchJson(`/barbearias/${barbeariaId}/assinaturas/assinantes`, {
        method: "POST",
        body: {
          clienteNome: aNome.trim(),
          planoId: aPlano,
          planoNome: plano?.nome || "",
          status: "ativo",
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assinaturas-assinantes", barbeariaId] });
      setAssinModalVisible(false);
      setANome("");
      setAPlano(null);
    },
    onError: (e) => Alert.alert("Erro", getErrorMessage(e)),
  });

  const cancelAssinante = useMutation({
    mutationFn: async (id: number) => {
      if (!barbeariaId) throw new Error("Barbearia não encontrada");
      return fetchJson(`/barbearias/${barbeariaId}/assinaturas/assinantes/${id}`, {
        method: "PUT",
        body: { status: "cancelado", dataFim: new Date().toISOString() },
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assinaturas-assinantes", barbeariaId] }),
    onError: (e) => Alert.alert("Erro", getErrorMessage(e)),
  });

  const confirmCancel = (a: Assinante) => {
    Alert.alert("Cancelar assinatura", `Cancelar assinatura de "${a.clienteNome}"?`, [
      { text: "Voltar", style: "cancel" },
      { text: "Cancelar", style: "destructive", onPress: () => cancelAssinante.mutate(a.id) },
    ]);
  };

  const formatBRL = (v: number | string) => {
    const n = typeof v === "string" ? Number(v) : v;
    return `R$ ${(isNaN(n) ? 0 : n).toFixed(2).replace(".", ",")}`;
  };

  const action = canManage
    ? tab === "planos"
      ? { icon: "plus" as const, label: "Novo plano", onPress: openCreatePlano }
      : { icon: "plus" as const, label: "Novo assinante", onPress: () => setAssinModalVisible(true) }
    : undefined;

  return (
    <ScreenContainer
      title="Clubes de assinatura"
      subtitle="Planos mensais e assinantes"
      refreshing={planosQ.isRefetching || assinantesQ.isRefetching}
      onRefresh={() => { planosQ.refetch(); assinantesQ.refetch(); }}
      rightAction={action}
    >
      <View style={styles.tabsRow}>
        {(["planos", "assinantes"] as const).map((t) => {
          const active = t === tab;
          const count = t === "planos" ? planosQ.data?.length : assinantesQ.data?.length;
          return (
            <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, active && styles.tabActive]}>
              <Feather
                name={t === "planos" ? "credit-card" : "users"}
                size={14}
                color={active ? colors.invertedText : colors.textSecondary}
              />
              <Text style={[styles.tabText, active && { color: colors.invertedText }]}>
                {t === "planos" ? "Planos" : "Assinantes"} {count != null ? `(${count})` : ""}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {tab === "planos" ? (
        planosQ.isLoading ? (
          <SkeletonList count={3} variant="card" />
        ) : planosQ.isError ? (
          <ErrorView error={planosQ.error} onRetry={planosQ.refetch} />
        ) : !planosQ.data || planosQ.data.length === 0 ? (
          <EmptyState
            icon="award"
            title="Nenhum plano criado"
            description="Crie planos mensais para clientes assinarem."
            ctaLabel={canManage ? "Criar primeiro plano" : undefined}
            onCtaPress={canManage ? openCreatePlano : undefined}
          />
        ) : (
          <View style={styles.card}>
            {planosQ.data.map((p) => (
              <ListRow
                key={p.id}
                icon="award"
                label={p.nome}
                description={[p.descricao, p.limiteUso != null ? `Limite: ${p.limiteUso}/mês` : null].filter(Boolean).join(" • ") || undefined}
                badge={p.ativo === false ? "Inativo" : "Ativo"}
                badgeTone={p.ativo === false ? "default" : "success"}
                rightLabel={`${formatBRL(p.precoMensal)}/mês`}
                onPress={canManage ? () => openEditPlano(p) : undefined}
                trailing={canManage ? (
                  <Pressable onPress={() => confirmDeletePlano(p)} hitSlop={8} style={{ padding: 4 }}>
                    <Feather name="trash-2" size={16} color={colors.error} />
                  </Pressable>
                ) : undefined}
              />
            ))}
          </View>
        )
      ) : assinantesQ.isLoading ? (
        <SkeletonList count={3} variant="row" />
      ) : assinantesQ.isError ? (
        <ErrorView error={assinantesQ.error} onRetry={assinantesQ.refetch} />
      ) : !assinantesQ.data || assinantesQ.data.length === 0 ? (
        <EmptyState
          icon="users"
          title="Nenhum assinante"
          description={planosQ.data && planosQ.data.length === 0 ? "Crie um plano primeiro." : "Adicione clientes aos planos disponíveis."}
          ctaLabel={canManage && planosQ.data && planosQ.data.length > 0 ? "Adicionar assinante" : undefined}
          onCtaPress={canManage && planosQ.data && planosQ.data.length > 0 ? () => setAssinModalVisible(true) : undefined}
        />
      ) : (
        <View style={styles.card}>
          {assinantesQ.data.map((a) => {
            const ativo = a.status === "ativo";
            return (
              <ListRow
                key={a.id}
                icon="user"
                label={a.clienteNome}
                description={`${a.planoNome} • Início ${new Date(a.dataInicio).toLocaleDateString("pt-BR")}`}
                badge={ativo ? "Ativo" : a.status === "cancelado" ? "Cancelado" : a.status}
                badgeTone={ativo ? "success" : a.status === "cancelado" ? "error" : "default"}
                trailing={canManage && ativo ? (
                  <Pressable onPress={() => confirmCancel(a)} hitSlop={8} style={{ padding: 4 }}>
                    <Feather name="x-circle" size={16} color={colors.error} />
                  </Pressable>
                ) : undefined}
              />
            );
          })}
        </View>
      )}

      <Modal visible={planoModalVisible} transparent animationType="slide" onRequestClose={() => setPlanoModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>{editingPlano ? "Editar plano" : "Novo plano"}</Text>
              <Text style={styles.label}>Nome</Text>
              <TextInput value={pNome} onChangeText={setPNome} placeholder="Ex: Premium" placeholderTextColor={colors.textMuted} style={styles.input} />
              <Text style={styles.label}>Descrição</Text>
              <TextInput value={pDescricao} onChangeText={setPDescricao} placeholder="Detalhes do plano" placeholderTextColor={colors.textMuted} style={[styles.input, { height: 60, textAlignVertical: "top" }]} multiline />
              <View style={styles.row2}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Preço mensal (R$)</Text>
                  <TextInput value={pPreco} onChangeText={setPPreco} placeholder="0,00" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" style={styles.input} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Limite/mês</Text>
                  <TextInput value={pLimite} onChangeText={setPLimite} placeholder="Ilimitado" placeholderTextColor={colors.textMuted} keyboardType="number-pad" style={styles.input} />
                </View>
              </View>
              <View style={styles.switchRow}>
                <Text style={styles.label}>Ativo</Text>
                <Switch value={pAtivo} onValueChange={setPAtivo} trackColor={{ true: colors.accent, false: colors.surfaceBorder }} thumbColor={colors.invertedText} />
              </View>
              <View style={styles.actions}>
                <Pressable onPress={() => setPlanoModalVisible(false)} style={[styles.btn, styles.btnGhost]}>
                  <Text style={styles.btnGhostText}>Cancelar</Text>
                </Pressable>
                <Pressable
                  onPress={() => savePlano.mutate()}
                  disabled={savePlano.isPending}
                  style={[styles.btn, styles.btnPrimary, savePlano.isPending && { opacity: 0.7 }]}
                >
                  <Text style={styles.btnPrimaryText}>{savePlano.isPending ? "Salvando…" : "Salvar"}</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={assinModalVisible} transparent animationType="slide" onRequestClose={() => setAssinModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Novo assinante</Text>
              <Text style={styles.label}>Nome do cliente</Text>
              <TextInput value={aNome} onChangeText={setANome} placeholder="Ex: João Silva" placeholderTextColor={colors.textMuted} style={styles.input} />
              <Text style={styles.label}>Plano</Text>
              <View style={{ gap: 6 }}>
                {(planosQ.data || []).filter((p) => p.ativo !== false).map((p) => {
                  const sel = aPlano === p.id;
                  return (
                    <Pressable key={p.id} onPress={() => setAPlano(p.id)} style={[styles.planoOpt, sel && styles.planoOptActive]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.planoOptName, sel && { color: colors.invertedText }]}>{p.nome}</Text>
                        <Text style={[styles.planoOptPrice, sel && { color: colors.invertedText }]}>{formatBRL(p.precoMensal)}/mês</Text>
                      </View>
                      {sel ? <Feather name="check" size={18} color={colors.invertedText} /> : null}
                    </Pressable>
                  );
                })}
                {(!planosQ.data || planosQ.data.length === 0) ? (
                  <Text style={styles.hint}>Crie um plano antes de adicionar assinantes.</Text>
                ) : null}
              </View>
              <View style={styles.actions}>
                <Pressable onPress={() => setAssinModalVisible(false)} style={[styles.btn, styles.btnGhost]}>
                  <Text style={styles.btnGhostText}>Cancelar</Text>
                </Pressable>
                <Pressable
                  onPress={() => saveAssinante.mutate()}
                  disabled={saveAssinante.isPending}
                  style={[styles.btn, styles.btnPrimary, saveAssinante.isPending && { opacity: 0.7 }]}
                >
                  <Text style={styles.btnPrimaryText}>{saveAssinante.isPending ? "Salvando…" : "Adicionar"}</Text>
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
    tabsRow: { flexDirection: "row", gap: 6, marginBottom: 12 },
    tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: c.surface, borderWidth: 1, borderColor: c.surfaceBorder },
    tabActive: { backgroundColor: c.accent, borderColor: c.accent },
    tabText: { color: c.textSecondary, fontFamily: "Inter_600SemiBold", fontSize: 12 },
    card: { backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.surfaceBorder, overflow: "hidden" },
    modalBackdrop: { flex: 1, backgroundColor: c.overlay, justifyContent: "flex-end" },
    modalCard: { backgroundColor: c.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32, borderTopWidth: 1, borderColor: c.surfaceBorder, maxHeight: "85%" },
    modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: c.text, marginBottom: 16 },
    label: { fontSize: 12, fontFamily: "Inter_500Medium", color: c.textSecondary, marginBottom: 6, marginTop: 8 },
    input: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.surfaceBorder, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: c.text, fontFamily: "Inter_500Medium", fontSize: 14 },
    row2: { flexDirection: "row", gap: 10 },
    switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 },
    actions: { flexDirection: "row", gap: 10, marginTop: 18 },
    btn: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: 10 },
    btnGhost: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.surfaceBorder },
    btnGhostText: { color: c.text, fontFamily: "Inter_600SemiBold", fontSize: 14 },
    btnPrimary: { backgroundColor: c.accent },
    btnPrimaryText: { color: c.invertedText, fontFamily: "Inter_700Bold", fontSize: 14 },
    planoOpt: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 10, backgroundColor: c.surface, borderWidth: 1, borderColor: c.surfaceBorder },
    planoOptActive: { backgroundColor: c.accent, borderColor: c.accent },
    planoOptName: { color: c.text, fontFamily: "Inter_600SemiBold", fontSize: 14 },
    planoOptPrice: { color: c.textSecondary, fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 2 },
    hint: { color: c.textMuted, fontFamily: "Inter_500Medium", fontSize: 12, textAlign: "center", paddingVertical: 12 },
  });
