import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import { ScreenContainer } from "@/components/ScreenContainer";
import { ErrorView } from "@/components/ErrorView";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonList } from "@/components/Skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { fetchJson, formatCurrency, getErrorMessage, todayStr } from "@/lib/api";

export type Conta = {
  id: number;
  tipo: "pagar" | "receber";
  categoria: string | null;
  descricao: string;
  valor: number;
  dataVencimento: string | null;
  dataPagamento: string | null;
  formaPagamento: string | null;
  status: "pendente" | "paga" | "vencida" | string;
  observacao?: string | null;
  createdAt?: string;
  isComanda?: boolean;
  comandaId?: number;
};

type ComandaRow = {
  id: number;
  clienteNome: string | null;
  dataFechamento: string | null;
  valorTotal: number;
  status?: string;
};

type ContasScreenProps = {
  tipo: "pagar" | "receber";
  headerExtra?: React.ReactNode;
};

const FORMAS = ["dinheiro", "pix", "credito", "debito", "transferencia"];

function statusTone(s: string): { bg: string; fg: string; label: string } {
  if (s === "paga") return { bg: Colors.success + "22", fg: Colors.success, label: "Paga" };
  if (s === "vencida") return { bg: Colors.error + "22", fg: Colors.error, label: "Vencida" };
  return { bg: Colors.warning + "22", fg: Colors.warning, label: "Pendente" };
}

function effectiveStatus(c: Conta): string {
  if (c.status === "pendente" && c.dataVencimento && c.dataVencimento < todayStr()) {
    return "vencida";
  }
  return c.status;
}

function formatDateBr(d: string | null) {
  if (!d) return "Sem data";
  try {
    return new Date(d + "T12:00:00").toLocaleDateString("pt-BR");
  } catch {
    return d;
  }
}

export default function ContasScreen({ tipo, headerExtra }: ContasScreenProps) {
  const insets = useSafeAreaInsets();
  const { barbeariaId } = useAuth();
  const qc = useQueryClient();

  const titulo = tipo === "pagar" ? "Contas a pagar" : "Contas a receber";
  const heroColor = tipo === "pagar" ? Colors.error : Colors.success;

  const [filterStatus, setFilterStatus] = useState<"todas" | "pendente" | "paga" | "vencida">("todas");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Conta | null>(null);
  const [baixaTarget, setBaixaTarget] = useState<Conta | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // form de criação/edição
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [categoria, setCategoria] = useState("");
  const [dataVencimento, setDataVencimento] = useState(todayStr());
  const [observacao, setObservacao] = useState("");
  const [recorrente, setRecorrente] = useState(false);

  // form da baixa
  const [baixaData, setBaixaData] = useState(todayStr());
  const [baixaForma, setBaixaForma] = useState("dinheiro");

  const { data: contas = [], isLoading: loadingContas, isError: errContas, error: errorContas, refetch: refetchContas, isFetching: fetchingContas } = useQuery<Conta[]>({
    queryKey: ["financeiro-contas", barbeariaId],
    enabled: !!barbeariaId,
    queryFn: async () => {
      const r = await fetchJson<Conta[]>(`/barbearias/${barbeariaId}/financeiro`);
      return Array.isArray(r) ? r : [];
    },
  });

  const { data: comandasReceb = [], isLoading: loadingCom, isError: errCom, error: errorCom, refetch: refetchCom, isFetching: fetchingCom } = useQuery<ComandaRow[]>({
    queryKey: ["financeiro-comandas-aberto", barbeariaId],
    enabled: !!barbeariaId && tipo === "receber",
    queryFn: async () => {
      const r = await fetchJson<ComandaRow[]>(`/barbearias/${barbeariaId}/comandas`);
      return Array.isArray(r) ? r : [];
    },
  });

  const isLoading = loadingContas || (tipo === "receber" && loadingCom);
  const isError = errContas || (tipo === "receber" && errCom);
  const error = errorContas || errorCom;
  const isFetching = fetchingContas || (tipo === "receber" && fetchingCom);
  const refetch = () => { refetchContas(); if (tipo === "receber") refetchCom(); };

  const comandasAsContas = useMemo<Conta[]>(() => {
    if (tipo !== "receber") return [];
    return comandasReceb
      .filter(c => c.status && c.status !== "paga")
      .map(c => ({
        id: c.id + 1_000_000_000,
        comandaId: c.id,
        isComanda: true,
        tipo: "receber",
        categoria: "Comanda",
        descricao: `Comanda #${c.id} · ${c.clienteNome ?? "—"}`,
        valor: c.valorTotal || 0,
        dataVencimento: c.dataFechamento ? c.dataFechamento.slice(0, 10) : null,
        dataPagamento: null,
        formaPagamento: null,
        status: c.status === "vencida" ? "vencida" : "pendente",
      }));
  }, [comandasReceb, tipo]);

  const allContas = useMemo(() => [...contas, ...comandasAsContas], [contas, comandasAsContas]);

  const list = useMemo(() => {
    const base = allContas.filter(c => c.tipo === tipo);
    if (filterStatus === "todas") return base;
    return base.filter(c => effectiveStatus(c) === filterStatus);
  }, [allContas, tipo, filterStatus]);

  const totals = useMemo(() => {
    const base = allContas.filter(c => c.tipo === tipo);
    const pendente = base.filter(c => effectiveStatus(c) === "pendente").reduce((s, c) => s + (c.valor || 0), 0);
    const paga = base.filter(c => effectiveStatus(c) === "paga").reduce((s, c) => s + (c.valor || 0), 0);
    const vencida = base.filter(c => effectiveStatus(c) === "vencida").reduce((s, c) => s + (c.valor || 0), 0);
    return { pendente, paga, vencida, total: base.length };
  }, [allContas, tipo]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["financeiro-contas", barbeariaId] });
    qc.invalidateQueries({ queryKey: ["financeiro-comandas-aberto", barbeariaId] });
  };

  const resetCreate = () => {
    setDescricao(""); setValor(""); setCategoria(""); setDataVencimento(todayStr()); setObservacao(""); setRecorrente(false);
  };

  const openEdit = (c: Conta) => {
    setEditTarget(c);
    setDescricao(c.descricao || "");
    setValor(String(c.valor ?? "").replace(".", ","));
    setCategoria(c.categoria || "");
    setDataVencimento(c.dataVencimento || todayStr());
    setObservacao(c.observacao || "");
    setRecorrente(false);
    setCreateOpen(true);
  };

  const closeCreate = () => {
    setCreateOpen(false);
    setEditTarget(null);
    resetCreate();
  };

  const submitCreate = async () => {
    if (!descricao.trim()) return Alert.alert("Campo obrigatório", "Informe a descrição.");
    const valorNum = parseFloat(valor.replace(",", "."));
    if (!valorNum || valorNum <= 0) return Alert.alert("Valor inválido", "Informe um valor maior que zero.");
    if (!categoria.trim()) return Alert.alert("Campo obrigatório", "Informe a categoria.");
    if (!dataVencimento.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(dataVencimento.trim())) {
      return Alert.alert("Vencimento inválido", "Informe a data de vencimento no formato AAAA-MM-DD.");
    }
    setSubmitting(true);
    try {
      if (editTarget) {
        await fetchJson(`/barbearias/${barbeariaId}/financeiro/${editTarget.id}`, {
          method: "PUT",
          body: {
            categoria: categoria.trim() || null,
            descricao: descricao.trim(),
            valor: valorNum,
            dataVencimento: dataVencimento || null,
            observacao: observacao.trim() || null,
          },
        });
      } else {
        await fetchJson(`/barbearias/${barbeariaId}/financeiro`, {
          method: "POST",
          body: {
            tipo,
            categoria: categoria.trim() || null,
            descricao: descricao.trim(),
            valor: valorNum,
            dataVencimento: dataVencimento || null,
            status: "pendente",
            recorrente,
            observacao: observacao.trim() || null,
          },
        });
      }
      invalidate();
      resetCreate();
      setEditTarget(null);
      setCreateOpen(false);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      Alert.alert("Erro", getErrorMessage(e, "Não foi possível salvar."));
    } finally {
      setSubmitting(false);
    }
  };

  const submitBaixa = async () => {
    if (!baixaTarget) return;
    if (!baixaData) return Alert.alert("Campo obrigatório", "Informe a data de pagamento.");
    setSubmitting(true);
    try {
      if (baixaTarget.isComanda && baixaTarget.comandaId) {
        await fetchJson(`/barbearias/${barbeariaId}/comandas/${baixaTarget.comandaId}/pagar`, {
          method: "PUT",
          body: { dataPagamento: baixaData, formaPagamento: baixaForma },
        });
      } else {
        await fetchJson(`/barbearias/${barbeariaId}/financeiro/${baixaTarget.id}/baixa`, {
          method: "PUT",
          body: { dataPagamento: baixaData, formaPagamento: baixaForma },
        });
      }
      invalidate();
      setBaixaTarget(null);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      Alert.alert("Erro", getErrorMessage(e, "Não foi possível dar baixa."));
    } finally {
      setSubmitting(false);
    }
  };

  const removeConta = (c: Conta) => {
    Alert.alert("Excluir conta", `Excluir "${c.descricao}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          try {
            await fetchJson(`/barbearias/${barbeariaId}/financeiro/${c.id}`, { method: "DELETE" });
            invalidate();
          } catch (e) {
            Alert.alert("Erro", getErrorMessage(e, "Tente novamente."));
          }
        },
      },
    ]);
  };

  return (
    <ScreenContainer
      title={titulo}
      subtitle={`${totals.total} lançamento${totals.total === 1 ? "" : "s"}`}
      refreshing={isFetching && !isLoading}
      onRefresh={() => refetch()}
      rightAction={{ icon: "plus", label: "Nova conta", onPress: () => setCreateOpen(true) }}
    >
      {headerExtra}
      <View style={styles.statRow}>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: Colors.warning }]}>{formatCurrency(totals.pendente)}</Text>
          <Text style={styles.statLabel}>Pendente</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: Colors.error }]}>{formatCurrency(totals.vencida)}</Text>
          <Text style={styles.statLabel}>Vencida</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: Colors.success }]}>{formatCurrency(totals.paga)}</Text>
          <Text style={styles.statLabel}>Paga</Text>
        </View>
      </View>

      <View style={styles.tabRow}>
        {(["todas", "pendente", "vencida", "paga"] as const).map(opt => (
          <TouchableOpacity
            key={opt}
            style={[styles.tab, filterStatus === opt && styles.tabActive]}
            onPress={() => setFilterStatus(opt)}
          >
            <Text style={[styles.tabText, filterStatus === opt && styles.tabTextActive]}>
              {opt === "todas" ? "Todas" : opt === "pendente" ? "Pendentes" : opt === "vencida" ? "Vencidas" : "Pagas"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <SkeletonList count={4} variant="row" />
      ) : isError ? (
        <ErrorView error={error} onRetry={() => refetch()} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={tipo === "pagar" ? "arrow-down-circle" : "arrow-up-circle"}
          title="Nenhuma conta"
          description={`Não há contas a ${tipo === "pagar" ? "pagar" : "receber"} neste filtro.`}
          ctaLabel="Nova conta"
          onCtaPress={() => setCreateOpen(true)}
        />
      ) : (
        <View style={{ gap: 8 }}>
          {list.map(c => {
            const eff = effectiveStatus(c);
            const tone = statusTone(eff);
            return (
              <View key={c.id} style={styles.card}>
                <View style={[styles.cardIcon, { backgroundColor: heroColor + "1f" }]}>
                  <Feather name={tipo === "pagar" ? "arrow-down-circle" : "arrow-up-circle"} size={18} color={heroColor} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{c.descricao}</Text>
                  <Text style={styles.cardSub} numberOfLines={1}>
                    {c.categoria || "Sem categoria"} · venc. {formatDateBr(c.dataVencimento)}
                  </Text>
                  <View style={styles.cardBadges}>
                    <View style={[styles.badge, { backgroundColor: tone.bg }]}>
                      <Text style={[styles.badgeText, { color: tone.fg }]}>{tone.label}</Text>
                    </View>
                    {eff === "paga" && c.dataPagamento ? (
                      <Text style={styles.cardMeta}>Pago em {formatDateBr(c.dataPagamento)}</Text>
                    ) : null}
                  </View>
                </View>
                <View style={{ alignItems: "flex-end", gap: 8 }}>
                  <Text style={[styles.cardValue, { color: heroColor }]}>{formatCurrency(c.valor)}</Text>
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    {eff !== "paga" ? (
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: Colors.success + "22", borderColor: Colors.success + "55" }]}
                        onPress={() => {
                          setBaixaTarget(c);
                          setBaixaData(todayStr());
                          setBaixaForma("dinheiro");
                        }}
                      >
                        <Feather name="check" size={14} color={Colors.success} />
                      </TouchableOpacity>
                    ) : null}
                    {!c.isComanda ? (
                      <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(c)}>
                        <Feather name="edit-2" size={14} color={Colors.accent} />
                      </TouchableOpacity>
                    ) : null}
                    {!c.isComanda ? (
                      <TouchableOpacity style={styles.actionBtn} onPress={() => removeConta(c)}>
                        <Feather name="trash-2" size={14} color={Colors.error} />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Modal nova conta */}
      <Modal visible={createOpen} animationType="slide" transparent onRequestClose={closeCreate}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { paddingBottom: 24 + insets.bottom }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editTarget ? "Editar conta" : `Nova conta a ${tipo === "pagar" ? "pagar" : "receber"}`}</Text>
              <TouchableOpacity onPress={closeCreate}>
                <Feather name="x" size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ gap: 12 }}>
              <Field label="Descrição *">
                <TextInput style={styles.input} value={descricao} onChangeText={setDescricao} placeholder="Ex: Aluguel de junho" placeholderTextColor={Colors.textMuted} />
              </Field>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Field label="Valor (R$) *" style={{ flex: 1 }}>
                  <TextInput style={styles.input} value={valor} onChangeText={setValor} keyboardType="decimal-pad" placeholder="0,00" placeholderTextColor={Colors.textMuted} />
                </Field>
                <Field label="Categoria *" style={{ flex: 1 }}>
                  <TextInput style={styles.input} value={categoria} onChangeText={setCategoria} placeholder="Ex: aluguel" placeholderTextColor={Colors.textMuted} />
                </Field>
              </View>
              <Field label="Vencimento * (AAAA-MM-DD)">
                <TextInput style={styles.input} value={dataVencimento} onChangeText={setDataVencimento} placeholder={todayStr()} placeholderTextColor={Colors.textMuted} />
              </Field>
              {!editTarget ? (
                <TouchableOpacity
                  style={styles.checkRow}
                  onPress={() => setRecorrente(v => !v)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, recorrente && styles.checkboxOn]}>
                    {recorrente ? <Feather name="check" size={14} color="#000" /> : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.checkLabel}>Conta recorrente</Text>
                    <Text style={styles.checkSub}>Será marcada como recorrente para controle.</Text>
                  </View>
                </TouchableOpacity>
              ) : null}
              <Field label="Observação">
                <TextInput
                  style={[styles.input, { minHeight: 60, textAlignVertical: "top" }]}
                  value={observacao}
                  onChangeText={setObservacao}
                  multiline
                  placeholder="Opcional"
                  placeholderTextColor={Colors.textMuted}
                />
              </Field>
            </ScrollView>
            <TouchableOpacity
              style={[styles.btnPrimary, { marginTop: 14, opacity: submitting ? 0.5 : 1 }]}
              disabled={submitting}
              onPress={submitCreate}
            >
              {submitting ? <ActivityIndicator color="#000" /> : <Text style={styles.btnPrimaryText}>{editTarget ? "Salvar alterações" : "Salvar conta"}</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal de baixa */}
      <Modal visible={!!baixaTarget} animationType="slide" transparent onRequestClose={() => setBaixaTarget(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { paddingBottom: 24 + insets.bottom }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Dar baixa</Text>
              <TouchableOpacity onPress={() => setBaixaTarget(null)}>
                <Feather name="x" size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>
            {baixaTarget ? (
              <>
                <View style={styles.baixaSummary}>
                  <Text style={styles.baixaSummaryDesc} numberOfLines={2}>{baixaTarget.descricao}</Text>
                  <Text style={[styles.baixaSummaryValue, { color: heroColor }]}>{formatCurrency(baixaTarget.valor)}</Text>
                </View>
                <Field label="Data do pagamento">
                  <TextInput style={styles.input} value={baixaData} onChangeText={setBaixaData} placeholder="AAAA-MM-DD" placeholderTextColor={Colors.textMuted} />
                </Field>
                <Text style={styles.fieldLabel}>Forma de pagamento</Text>
                <View style={styles.formasRow}>
                  {FORMAS.map(f => (
                    <TouchableOpacity
                      key={f}
                      style={[styles.formaChip, baixaForma === f && styles.formaChipActive]}
                      onPress={() => setBaixaForma(f)}
                    >
                      <Text style={[styles.formaChipText, baixaForma === f && styles.formaChipTextActive]}>{f}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity
                  style={[styles.btnPrimary, { marginTop: 16, opacity: submitting ? 0.5 : 1 }]}
                  disabled={submitting}
                  onPress={submitBaixa}
                >
                  {submitting ? <ActivityIndicator color="#000" /> : <Text style={styles.btnPrimaryText}>Confirmar baixa</Text>}
                </TouchableOpacity>
              </>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenContainer>
  );
}

function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: any }) {
  return (
    <View style={style}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  statRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  statBox: { flex: 1, padding: 12, borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder },
  statValue: { fontSize: 16, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, color: Colors.textMuted, fontFamily: "Inter_500Medium", marginTop: 4, textTransform: "uppercase", letterSpacing: 0.5 },
  tabRow: { flexDirection: "row", gap: 6, marginBottom: 14, flexWrap: "wrap" },
  tab: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder },
  tabActive: { backgroundColor: Colors.accent + "22", borderColor: Colors.accent + "55" },
  tabText: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  tabTextActive: { color: Colors.accent, fontFamily: "Inter_600SemiBold" },
  card: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 12, backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.surfaceBorder },
  cardIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text },
  cardSub: { fontSize: 11, color: Colors.textSecondary, fontFamily: "Inter_400Regular", marginTop: 2 },
  cardBadges: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  badgeText: { fontSize: 10, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.5 },
  cardMeta: { fontSize: 10, color: Colors.textMuted, fontFamily: "Inter_400Regular" },
  cardValue: { fontSize: 15, fontFamily: "Inter_700Bold" },
  actionBtn: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: Colors.surfaceLight, borderWidth: 1, borderColor: Colors.surfaceBorder },
  modalBackdrop: { flex: 1, backgroundColor: "#000a", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: Colors.background, padding: 16, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, borderColor: Colors.surfaceBorder },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text },
  fieldLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: Colors.text, fontSize: 14, fontFamily: "Inter_400Regular" },
  baixaSummary: { padding: 12, borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder, marginBottom: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  baixaSummaryDesc: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.text },
  baixaSummaryValue: { fontSize: 16, fontFamily: "Inter_700Bold" },
  formasRow: { flexDirection: "row", gap: 6, flexWrap: "wrap", marginBottom: 4 },
  formaChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder },
  formaChipActive: { backgroundColor: Colors.accent + "22", borderColor: Colors.accent + "55" },
  formaChipText: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textSecondary, textTransform: "capitalize" },
  formaChipTextActive: { color: Colors.accent },
  btnPrimary: { backgroundColor: Colors.accent, borderRadius: 12, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  btnPrimaryText: { color: "#000", fontFamily: "Inter_600SemiBold", fontSize: 14 },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 10, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: Colors.surfaceBorder, alignItems: "center", justifyContent: "center", backgroundColor: Colors.surfaceLight },
  checkboxOn: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  checkLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.text },
  checkSub: { fontSize: 11, color: Colors.textMuted, fontFamily: "Inter_400Regular", marginTop: 2 },
});
