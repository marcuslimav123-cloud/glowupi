import React, { useMemo, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors, type ColorPalette } from "@/lib/theme";
import { ScreenContainer } from "@/components/ScreenContainer";
import { ListRow } from "@/components/ListRow";
import { EmptyState } from "@/components/EmptyState";
import { ErrorView } from "@/components/ErrorView";
import { SkeletonList } from "@/components/Skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { fetchJson, getErrorMessage } from "@/lib/api";

type Movimentacao = {
  id: number;
  tipo: "entrada" | "saida" | "sangria" | "vale" | string;
  valor: number | string;
  descricao?: string | null;
  createdAt?: string | null;
};

type Caixa = {
  id: number;
  status: "aberto" | "fechado" | string;
  valorAbertura: number | string;
  totalEntradas?: number | string | null;
  totalSaidas?: number | string | null;
  saldoFinal?: number | string | null;
  dataAbertura?: string | null;
  dataFechamento?: string | null;
  abertoPor?: string | null;
  fechadoPor?: string | null;
  observacao?: string | null;
  movimentacoes?: Movimentacao[];
};

function toNum(v: number | string | null | undefined): number {
  if (v == null) return 0;
  const n = typeof v === "string" ? Number(v) : v;
  return isFinite(n) ? n : 0;
}

function formatBRL(v: number | string | null | undefined) {
  return `R$ ${toNum(v).toFixed(2).replace(".", ",")}`;
}

function formatDateTime(s?: string | null) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString("pt-BR");
  } catch {
    return "—";
  }
}

export default function CaixaDiarioScreen() {
  const { barbeariaId } = useAuth();
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const qc = useQueryClient();

  const [abrirModal, setAbrirModal] = useState(false);
  const [valorAbertura, setValorAbertura] = useState("");
  const [obsAbertura, setObsAbertura] = useState("");

  const [fecharModal, setFecharModal] = useState(false);
  const [valorFechamento, setValorFechamento] = useState("");
  const [obsFechamento, setObsFechamento] = useState("");

  const [movModal, setMovModal] = useState<null | "entrada" | "saida" | "sangria" | "vale">(null);
  const [movValor, setMovValor] = useState("");
  const [movDescricao, setMovDescricao] = useState("");

  const atualQ = useQuery<Caixa | null>({
    queryKey: ["caixa-atual", barbeariaId],
    queryFn: async () => {
      if (!barbeariaId) return null;
      const raw = await fetchJson<unknown>(`/barbearias/${barbeariaId}/caixa-diario/atual`);
      return raw as Caixa | null;
    },
    enabled: !!barbeariaId,
  });

  const caixa = atualQ.data;

  const abrirMutation = useMutation({
    mutationFn: async () => {
      if (!barbeariaId) throw new Error("Barbearia não encontrada");
      const valor = Number(valorAbertura.replace(",", "."));
      if (!isFinite(valor) || valor < 0) throw new Error("Valor de abertura inválido");
      return fetchJson(`/barbearias/${barbeariaId}/caixa-diario/abrir`, {
        method: "POST",
        body: { valorAbertura: valor, observacao: obsAbertura.trim() || null },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["caixa-atual", barbeariaId] });
      setAbrirModal(false);
      setValorAbertura("");
      setObsAbertura("");
    },
    onError: (e) => Alert.alert("Erro ao abrir caixa", getErrorMessage(e)),
  });

  const fecharMutation = useMutation({
    mutationFn: async () => {
      if (!barbeariaId || !caixa) throw new Error("Caixa não encontrado");
      const valor = valorFechamento.trim() ? Number(valorFechamento.replace(",", ".")) : undefined;
      return fetchJson(`/barbearias/${barbeariaId}/caixa-diario/${caixa.id}/fechar`, {
        method: "PUT",
        body: { valorFechamento: valor, observacao: obsFechamento.trim() || undefined },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["caixa-atual", barbeariaId] });
      setFecharModal(false);
      setValorFechamento("");
      setObsFechamento("");
    },
    onError: (e) => Alert.alert("Erro ao fechar caixa", getErrorMessage(e)),
  });

  const movMutation = useMutation({
    mutationFn: async () => {
      if (!barbeariaId || !caixa || !movModal) throw new Error("Caixa não encontrado");
      const valor = Number(movValor.replace(",", "."));
      if (!isFinite(valor) || valor <= 0) throw new Error("Valor inválido");
      const path =
        movModal === "sangria" ? "sangria" : movModal === "vale" ? "vale" : "movimentacoes";
      const body: Record<string, unknown> = { valor, descricao: movDescricao.trim() || null };
      if (movModal === "entrada" || movModal === "saida") body.tipo = movModal;
      return fetchJson(`/barbearias/${barbeariaId}/caixa-diario/${caixa.id}/${path}`, {
        method: "POST",
        body,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["caixa-atual", barbeariaId] });
      setMovModal(null);
      setMovValor("");
      setMovDescricao("");
    },
    onError: (e) => Alert.alert("Erro", getErrorMessage(e)),
  });

  const saldoEsperado = caixa
    ? toNum(caixa.valorAbertura) + toNum(caixa.totalEntradas) - toNum(caixa.totalSaidas)
    : 0;

  return (
    <ScreenContainer
      title="Caixa diário"
      subtitle="Abertura, movimentações e fechamento"
      refreshing={atualQ.isRefetching}
      onRefresh={atualQ.refetch}
      rightAction={{ icon: "list", label: "Comandas do caixa", onPress: () => router.push("/caixa") }}
    >
      {atualQ.isLoading ? (
        <SkeletonList count={3} variant="card" />
      ) : atualQ.isError ? (
        <ErrorView error={atualQ.error} onRetry={atualQ.refetch} />
      ) : !caixa ? (
        <EmptyState
          icon="dollar-sign"
          title="Nenhum caixa aberto"
          description="Abra um caixa para começar a registrar movimentações do dia."
          ctaLabel="Abrir caixa"
          onCtaPress={() => setAbrirModal(true)}
        />
      ) : (
        <>
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Status</Text>
              <View style={[styles.badge, { backgroundColor: caixa.status === "aberto" ? colors.success + "22" : colors.surfaceLight }]}>
                <Text style={[styles.badgeText, { color: caixa.status === "aberto" ? colors.success : colors.textSecondary }]}>
                  {caixa.status === "aberto" ? "Aberto" : "Fechado"}
                </Text>
              </View>
            </View>
            <Text style={styles.statusMeta}>Aberto por {caixa.abertoPor || "—"} em {formatDateTime(caixa.dataAbertura)}</Text>
            {caixa.fechadoPor ? (
              <Text style={styles.statusMeta}>Fechado por {caixa.fechadoPor} em {formatDateTime(caixa.dataFechamento)}</Text>
            ) : null}
          </View>

          <View style={styles.totalsCard}>
            <View style={styles.totalRow}>
              <View style={styles.totalCell}>
                <Text style={styles.totalLabel}>Abertura</Text>
                <Text style={styles.totalValue}>{formatBRL(caixa.valorAbertura)}</Text>
              </View>
              <View style={styles.totalCell}>
                <Text style={styles.totalLabel}>Entradas</Text>
                <Text style={[styles.totalValue, { color: colors.success }]}>{formatBRL(caixa.totalEntradas)}</Text>
              </View>
              <View style={styles.totalCell}>
                <Text style={styles.totalLabel}>Saídas</Text>
                <Text style={[styles.totalValue, { color: colors.error }]}>{formatBRL(caixa.totalSaidas)}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.totalRow}>
              <View style={styles.totalCell}>
                <Text style={styles.totalLabel}>Saldo esperado</Text>
                <Text style={[styles.totalValueBig, { color: colors.accent }]}>{formatBRL(saldoEsperado)}</Text>
              </View>
            </View>
          </View>

          {caixa.status === "aberto" ? (
            <View style={styles.actionsRow}>
              <Pressable onPress={() => setMovModal("entrada")} style={[styles.actionBtn, { backgroundColor: colors.success + "22" }]}>
                <Feather name="plus-circle" size={16} color={colors.success} />
                <Text style={[styles.actionText, { color: colors.success }]}>Entrada</Text>
              </Pressable>
              <Pressable onPress={() => setMovModal("saida")} style={[styles.actionBtn, { backgroundColor: colors.error + "22" }]}>
                <Feather name="minus-circle" size={16} color={colors.error} />
                <Text style={[styles.actionText, { color: colors.error }]}>Saída</Text>
              </Pressable>
              <Pressable onPress={() => setMovModal("sangria")} style={[styles.actionBtn, { backgroundColor: colors.surfaceLight }]}>
                <Feather name="arrow-up-right" size={16} color={colors.text} />
                <Text style={[styles.actionText, { color: colors.text }]}>Sangria</Text>
              </Pressable>
              <Pressable onPress={() => setMovModal("vale")} style={[styles.actionBtn, { backgroundColor: colors.surfaceLight }]}>
                <Feather name="user" size={16} color={colors.text} />
                <Text style={[styles.actionText, { color: colors.text }]}>Vale</Text>
              </Pressable>
            </View>
          ) : null}

          {caixa.movimentacoes && caixa.movimentacoes.length > 0 ? (
            <View style={styles.card}>
              {caixa.movimentacoes.map((m) => {
                const isOut = m.tipo === "saida" || m.tipo === "sangria" || m.tipo === "vale";
                return (
                  <ListRow
                    key={m.id}
                    icon={isOut ? "arrow-down-circle" : "arrow-up-circle"}
                    label={m.descricao || m.tipo}
                    description={`${m.tipo} • ${formatDateTime(m.createdAt)}`}
                    rightLabel={`${isOut ? "−" : "+"} ${formatBRL(m.valor)}`}
                  />
                );
              })}
            </View>
          ) : null}

          {caixa.status === "aberto" ? (
            <Pressable
              onPress={() => { setValorFechamento(saldoEsperado.toFixed(2)); setFecharModal(true); }}
              style={[styles.bigBtn, { backgroundColor: colors.error }]}
            >
              <Feather name="lock" size={16} color={colors.invertedText} />
              <Text style={styles.bigBtnText}>Fechar caixa</Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => setAbrirModal(true)} style={[styles.bigBtn, { backgroundColor: colors.accent }]}>
              <Feather name="unlock" size={16} color={colors.invertedText} />
              <Text style={styles.bigBtnText}>Abrir novo caixa</Text>
            </Pressable>
          )}
        </>
      )}

      <Modal visible={abrirModal} transparent animationType="slide" onRequestClose={() => setAbrirModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Abrir caixa</Text>
              <Text style={styles.label}>Valor de abertura (R$)</Text>
              <TextInput value={valorAbertura} onChangeText={setValorAbertura} placeholder="0,00" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" style={styles.input} autoFocus />
              <Text style={styles.label}>Observação</Text>
              <TextInput value={obsAbertura} onChangeText={setObsAbertura} placeholder="Opcional" placeholderTextColor={colors.textMuted} style={[styles.input, { height: 60, textAlignVertical: "top" }]} multiline />
              <View style={styles.actions}>
                <Pressable onPress={() => setAbrirModal(false)} style={[styles.btn, styles.btnGhost]}>
                  <Text style={styles.btnGhostText}>Cancelar</Text>
                </Pressable>
                <Pressable onPress={() => abrirMutation.mutate()} disabled={abrirMutation.isPending} style={[styles.btn, styles.btnPrimary, abrirMutation.isPending && { opacity: 0.7 }]}>
                  <Text style={styles.btnPrimaryText}>{abrirMutation.isPending ? "Abrindo…" : "Abrir caixa"}</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={fecharModal} transparent animationType="slide" onRequestClose={() => setFecharModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Fechar caixa</Text>
              <Text style={styles.hint}>Saldo esperado: {formatBRL(saldoEsperado)}</Text>
              <Text style={styles.label}>Valor informado (R$)</Text>
              <TextInput value={valorFechamento} onChangeText={setValorFechamento} placeholder="0,00" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" style={styles.input} autoFocus />
              <Text style={styles.label}>Observação</Text>
              <TextInput value={obsFechamento} onChangeText={setObsFechamento} placeholder="Opcional" placeholderTextColor={colors.textMuted} style={[styles.input, { height: 60, textAlignVertical: "top" }]} multiline />
              <View style={styles.actions}>
                <Pressable onPress={() => setFecharModal(false)} style={[styles.btn, styles.btnGhost]}>
                  <Text style={styles.btnGhostText}>Cancelar</Text>
                </Pressable>
                <Pressable onPress={() => fecharMutation.mutate()} disabled={fecharMutation.isPending} style={[styles.btn, styles.btnPrimary, fecharMutation.isPending && { opacity: 0.7 }]}>
                  <Text style={styles.btnPrimaryText}>{fecharMutation.isPending ? "Fechando…" : "Confirmar fechamento"}</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={!!movModal} transparent animationType="slide" onRequestClose={() => setMovModal(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>
                {movModal === "entrada" ? "Nova entrada" :
                 movModal === "saida" ? "Nova saída" :
                 movModal === "sangria" ? "Sangria" : "Vale"}
              </Text>
              <Text style={styles.label}>Valor (R$)</Text>
              <TextInput value={movValor} onChangeText={setMovValor} placeholder="0,00" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" style={styles.input} autoFocus />
              <Text style={styles.label}>Descrição</Text>
              <TextInput value={movDescricao} onChangeText={setMovDescricao} placeholder="Detalhes da movimentação" placeholderTextColor={colors.textMuted} style={styles.input} />
              <View style={styles.actions}>
                <Pressable onPress={() => setMovModal(null)} style={[styles.btn, styles.btnGhost]}>
                  <Text style={styles.btnGhostText}>Cancelar</Text>
                </Pressable>
                <Pressable onPress={() => movMutation.mutate()} disabled={movMutation.isPending} style={[styles.btn, styles.btnPrimary, movMutation.isPending && { opacity: 0.7 }]}>
                  <Text style={styles.btnPrimaryText}>{movMutation.isPending ? "Salvando…" : "Registrar"}</Text>
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
    statusCard: { backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.surfaceBorder, padding: 14, marginBottom: 10 },
    statusRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
    statusLabel: { color: c.textSecondary, fontFamily: "Inter_600SemiBold", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 },
    statusMeta: { color: c.textMuted, fontFamily: "Inter_500Medium", fontSize: 11, marginTop: 2 },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
    badgeText: { fontFamily: "Inter_700Bold", fontSize: 11 },
    totalsCard: { backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.surfaceBorder, padding: 14, marginBottom: 10 },
    totalRow: { flexDirection: "row", justifyContent: "space-between" },
    totalCell: { flex: 1, alignItems: "flex-start" },
    totalLabel: { color: c.textSecondary, fontFamily: "Inter_500Medium", fontSize: 11, marginBottom: 4 },
    totalValue: { color: c.text, fontFamily: "Inter_700Bold", fontSize: 14 },
    totalValueBig: { fontFamily: "Inter_700Bold", fontSize: 22 },
    divider: { height: 1, backgroundColor: c.surfaceBorder, marginVertical: 10 },
    actionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
    actionBtn: { flexGrow: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10 },
    actionText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
    card: { backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.surfaceBorder, overflow: "hidden", marginBottom: 10 },
    bigBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 12, marginTop: 8 },
    bigBtnText: { color: c.invertedText, fontFamily: "Inter_700Bold", fontSize: 14 },
    modalBackdrop: { flex: 1, backgroundColor: c.overlay, justifyContent: "flex-end" },
    modalCard: { backgroundColor: c.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32, borderTopWidth: 1, borderColor: c.surfaceBorder, maxHeight: "85%" },
    modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: c.text, marginBottom: 12 },
    label: { fontSize: 12, fontFamily: "Inter_500Medium", color: c.textSecondary, marginBottom: 6, marginTop: 8 },
    input: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.surfaceBorder, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: c.text, fontFamily: "Inter_500Medium", fontSize: 14 },
    actions: { flexDirection: "row", gap: 10, marginTop: 18 },
    btn: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: 10 },
    btnGhost: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.surfaceBorder },
    btnGhostText: { color: c.text, fontFamily: "Inter_600SemiBold", fontSize: 14 },
    btnPrimary: { backgroundColor: c.accent },
    btnPrimaryText: { color: c.invertedText, fontFamily: "Inter_700Bold", fontSize: 14 },
    hint: { color: c.textMuted, fontFamily: "Inter_500Medium", fontSize: 12, marginBottom: 4 },
  });
