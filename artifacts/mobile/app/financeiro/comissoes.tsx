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

type Comissao = {
  id: number;
  profissionalId: number;
  profissionalNome: string;
  mesAno: string;
  valorBase: number;
  percentual: number;
  valorComissao: number;
  status: "pendente" | "pago" | string;
  dataPagamento: string | null;
};

type ReportRow = {
  profissionalId: number;
  nome: string;
  totalAtendimentos: number;
  faturamentoBruto: number;
  comissaoTotal: number;
  percentualMedio: number;
};

type Profissional = { id: number; nomeExibicao: string; apelido?: string | null };

type ComandaAtend = {
  id: number;
  profissionalId: number;
  clienteNome: string | null;
  dataFechamento: string | null;
  valorTotal: number;
  comissaoTotal: number;
};

function defaultMes() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMes(mes: string, delta: number) {
  const [y, m] = mes.split("-").map(Number);
  const d = new Date(y, (m - 1) + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatMesLabel(mes: string) {
  const [y, m] = mes.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

export default function ComissoesScreen() {
  const insets = useSafeAreaInsets();
  const { barbeariaId } = useAuth();
  const qc = useQueryClient();

  const [mes, setMes] = useState(defaultMes());
  const [showFechamento, setShowFechamento] = useState<{ prof: Profissional; report: ReportRow | null } | null>(null);
  const [fechValorBase, setFechValorBase] = useState("");
  const [fechPercentual, setFechPercentual] = useState("");
  const [fechValor, setFechValor] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const profQ = useQuery<Profissional[]>({
    queryKey: ["profissionais", barbeariaId],
    enabled: !!barbeariaId,
    queryFn: async () => {
      const r = await fetchJson<Profissional[]>(`/barbearias/${barbeariaId}/profissionais`);
      return Array.isArray(r) ? r : [];
    },
  });

  const reportQ = useQuery<ReportRow[]>({
    queryKey: ["report-comissoes", barbeariaId, mes],
    enabled: !!barbeariaId,
    queryFn: async () => {
      const r = await fetchJson<ReportRow[]>(`/barbearias/${barbeariaId}/relatorios/comissoes?mes=${mes}`);
      return Array.isArray(r) ? r : [];
    },
  });

  const lancQ = useQuery<Comissao[]>({
    queryKey: ["comissoes", barbeariaId, mes],
    enabled: !!barbeariaId,
    queryFn: async () => {
      const r = await fetchJson<Comissao[]>(`/barbearias/${barbeariaId}/comissoes?mesAno=${mes}`);
      return Array.isArray(r) ? r : [];
    },
  });

  const atendQ = useQuery<ComandaAtend[]>({
    queryKey: ["comissoes-atendimentos", barbeariaId, mes],
    enabled: !!barbeariaId,
    queryFn: async () => {
      const r = await fetchJson<ComandaAtend[]>(`/barbearias/${barbeariaId}/comandas?mes=${mes}`);
      return Array.isArray(r) ? r : [];
    },
  });

  const [expandedProf, setExpandedProf] = useState<number | null>(null);

  const isLoading = reportQ.isLoading || lancQ.isLoading;
  const isError = reportQ.isError || lancQ.isError;
  const error = reportQ.error || lancQ.error;

  const atendByProf = useMemo(() => {
    const map: Record<number, ComandaAtend[]> = {};
    (atendQ.data ?? []).forEach(c => {
      if (!map[c.profissionalId]) map[c.profissionalId] = [];
      map[c.profissionalId].push(c);
    });
    return map;
  }, [atendQ.data]);

  const totals = useMemo(() => {
    const list = lancQ.data ?? [];
    const pendente = list.filter(c => c.status === "pendente").reduce((s, c) => s + (c.valorComissao || 0), 0);
    const pago = list.filter(c => c.status === "pago").reduce((s, c) => s + (c.valorComissao || 0), 0);
    const aGerar = (reportQ.data ?? []).reduce((s, r) => s + (r.comissaoTotal || 0), 0);
    return { pendente, pago, aGerar };
  }, [lancQ.data, reportQ.data]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["comissoes", barbeariaId, mes] });
    qc.invalidateQueries({ queryKey: ["report-comissoes", barbeariaId, mes] });
  };

  const openFechamento = (prof: Profissional) => {
    const report = (reportQ.data ?? []).find(r => r.profissionalId === prof.id) || null;
    setShowFechamento({ prof, report });
    const base = report?.faturamentoBruto || 0;
    const valor = report?.comissaoTotal || 0;
    const pct = report?.percentualMedio || 0;
    setFechValorBase(base.toFixed(2));
    setFechPercentual(pct.toString());
    setFechValor(valor.toFixed(2));
  };

  const submitFechamento = async () => {
    if (!showFechamento) return;
    const valorBase = parseFloat(fechValorBase.replace(",", "."));
    const percentual = parseFloat(fechPercentual.replace(",", "."));
    const valorComissao = parseFloat(fechValor.replace(",", "."));
    if (!valorComissao || valorComissao <= 0) return Alert.alert("Valor inválido", "Informe o valor da comissão.");
    setSubmitting(true);
    try {
      await fetchJson(`/barbearias/${barbeariaId}/comissoes`, {
        method: "POST",
        body: {
          profissionalId: showFechamento.prof.id,
          profissionalNome: showFechamento.prof.apelido || showFechamento.prof.nomeExibicao,
          mesAno: mes,
          valorBase: valorBase || 0,
          percentual: percentual || 0,
          valorComissao,
          status: "pago",
          dataPagamento: todayStr(),
        },
      });
      setShowFechamento(null);
      invalidate();
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      Alert.alert("Erro", getErrorMessage(e, "Tente novamente."));
    } finally {
      setSubmitting(false);
    }
  };

  const marcarPago = async (c: Comissao) => {
    try {
      await fetchJson(`/barbearias/${barbeariaId}/comissoes/${c.id}`, {
        method: "PUT",
        body: { status: "pago", dataPagamento: todayStr() },
      });
      invalidate();
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      Alert.alert("Erro", getErrorMessage(e, "Tente novamente."));
    }
  };

  const removerComissao = (c: Comissao) => {
    Alert.alert("Excluir comissão", `Excluir comissão de ${c.profissionalNome}?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          try {
            await fetchJson(`/barbearias/${barbeariaId}/comissoes/${c.id}`, { method: "DELETE" });
            invalidate();
          } catch (e) {
            Alert.alert("Erro", getErrorMessage(e, "Tente novamente."));
          }
        },
      },
    ]);
  };

  const lancByProf = useMemo(() => {
    const map: Record<number, Comissao[]> = {};
    (lancQ.data ?? []).forEach(c => {
      if (!map[c.profissionalId]) map[c.profissionalId] = [];
      map[c.profissionalId].push(c);
    });
    return map;
  }, [lancQ.data]);

  return (
    <ScreenContainer
      title="Comissões"
      subtitle={formatMesLabel(mes)}
      refreshing={(reportQ.isFetching || lancQ.isFetching) && !isLoading}
      onRefresh={() => { reportQ.refetch(); lancQ.refetch(); }}
    >
      <View style={styles.mesRow}>
        <TouchableOpacity style={styles.mesBtn} onPress={() => setMes(shiftMes(mes, -1))}>
          <Feather name="chevron-left" size={18} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.mesPill}>
          <Text style={styles.mesText}>{formatMesLabel(mes)}</Text>
        </View>
        <TouchableOpacity style={styles.mesBtn} onPress={() => setMes(shiftMes(mes, 1))}>
          <Feather name="chevron-right" size={18} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.statRow}>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: Colors.accent }]}>{formatCurrency(totals.aGerar)}</Text>
          <Text style={styles.statLabel}>A gerar</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: Colors.warning }]}>{formatCurrency(totals.pendente)}</Text>
          <Text style={styles.statLabel}>Pendente</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: Colors.success }]}>{formatCurrency(totals.pago)}</Text>
          <Text style={styles.statLabel}>Pago</Text>
        </View>
      </View>

      {isLoading ? (
        <SkeletonList count={3} />
      ) : isError ? (
        <ErrorView error={error} onRetry={() => { reportQ.refetch(); lancQ.refetch(); }} />
      ) : (
        <>
          <Text style={styles.sectionTitle}>Por profissional</Text>
          {(reportQ.data ?? []).filter(r => r.totalAtendimentos > 0 || (lancByProf[r.profissionalId]?.length ?? 0) > 0).length === 0 ? (
            <EmptyState icon="percent" title="Sem dados" description="Ainda não há atendimentos com comissão neste mês." />
          ) : (
            <View style={{ gap: 10 }}>
              {(reportQ.data ?? []).map(r => {
                const lancs = lancByProf[r.profissionalId] ?? [];
                const atends = atendByProf[r.profissionalId] ?? [];
                if (r.totalAtendimentos === 0 && lancs.length === 0) return null;
                const fechado = lancs.length > 0;
                const expanded = expandedProf === r.profissionalId;
                return (
                  <View key={r.profissionalId} style={styles.profCard}>
                    <TouchableOpacity
                      style={styles.profHeader}
                      onPress={() => setExpandedProf(expanded ? null : r.profissionalId)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.profAvatar, { backgroundColor: Colors.accent + "22" }]}>
                        <Text style={[styles.profAvatarText, { color: Colors.accent }]}>{r.nome.charAt(0).toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.profName}>{r.nome}</Text>
                        <Text style={styles.profMeta}>
                          {r.totalAtendimentos} atend. · {formatCurrency(r.faturamentoBruto)} bruto
                        </Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={styles.profValue}>{formatCurrency(r.comissaoTotal)}</Text>
                        <Text style={styles.profPct}>{r.percentualMedio}% médio</Text>
                      </View>
                      <Feather name={expanded ? "chevron-up" : "chevron-down"} size={16} color={Colors.textMuted} style={{ marginLeft: 6 }} />
                    </TouchableOpacity>
                    {expanded && atends.length > 0 ? (
                      <View style={styles.atendList}>
                        <Text style={styles.atendHeader}>Atendimentos do mês</Text>
                        {atends
                          .slice()
                          .sort((a, b) => (b.dataFechamento ?? "").localeCompare(a.dataFechamento ?? ""))
                          .map(a => (
                            <View key={a.id} style={styles.atendRow}>
                              <View style={{ flex: 1, minWidth: 0 }}>
                                <Text style={styles.atendCli} numberOfLines={1}>#{a.id} · {a.clienteNome ?? "—"}</Text>
                                <Text style={styles.atendMeta}>
                                  {a.dataFechamento ? new Date(a.dataFechamento).toLocaleDateString("pt-BR") : "—"} · bruto {formatCurrency(a.valorTotal)}
                                </Text>
                              </View>
                              <Text style={[styles.atendCom, { color: Colors.accent }]}>{formatCurrency(a.comissaoTotal)}</Text>
                            </View>
                          ))}
                      </View>
                    ) : null}
                    {lancs.length > 0 ? (
                      <View style={styles.lancList}>
                        {lancs.map(l => (
                          <View key={l.id} style={styles.lancRow}>
                            <View style={[styles.statusBadge, { backgroundColor: (l.status === "pago" ? Colors.success : Colors.warning) + "22" }]}>
                              <Text style={[styles.statusBadgeText, { color: l.status === "pago" ? Colors.success : Colors.warning }]}>
                                {l.status === "pago" ? "Pago" : "Pendente"}
                              </Text>
                            </View>
                            <View style={{ flex: 1, marginHorizontal: 8 }}>
                              <Text style={styles.lancValor}>{formatCurrency(l.valorComissao)}</Text>
                              <Text style={styles.lancMeta}>
                                Base {formatCurrency(l.valorBase)} · {l.percentual}%
                                {l.dataPagamento ? ` · pago em ${l.dataPagamento}` : ""}
                              </Text>
                            </View>
                            <View style={{ flexDirection: "row", gap: 6 }}>
                              {l.status !== "pago" ? (
                                <TouchableOpacity
                                  style={[styles.smallBtn, { backgroundColor: Colors.success + "22", borderColor: Colors.success + "55" }]}
                                  onPress={() => marcarPago(l)}
                                >
                                  <Feather name="check" size={13} color={Colors.success} />
                                </TouchableOpacity>
                              ) : null}
                              <TouchableOpacity style={styles.smallBtn} onPress={() => removerComissao(l)}>
                                <Feather name="trash-2" size={13} color={Colors.error} />
                              </TouchableOpacity>
                            </View>
                          </View>
                        ))}
                      </View>
                    ) : null}
                    <TouchableOpacity
                      style={[styles.fecharBtn, fechado && { opacity: 0.7 }]}
                      onPress={() => {
                        const prof = (profQ.data ?? []).find(p => p.id === r.profissionalId) || { id: r.profissionalId, nomeExibicao: r.nome };
                        openFechamento(prof as Profissional);
                      }}
                    >
                      <Feather name={fechado ? "plus-circle" : "check-circle"} size={14} color={Colors.accent} />
                      <Text style={styles.fecharBtnText}>{fechado ? "Novo lançamento" : "Fechar comissão"}</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}
        </>
      )}

      {/* Modal Fechamento */}
      <Modal visible={!!showFechamento} animationType="slide" transparent onRequestClose={() => setShowFechamento(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { paddingBottom: 24 + insets.bottom }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Fechar comissão</Text>
              <TouchableOpacity onPress={() => setShowFechamento(null)}><Feather name="x" size={22} color={Colors.text} /></TouchableOpacity>
            </View>
            {showFechamento ? (
              <>
                <View style={styles.fechProfBox}>
                  <Text style={styles.fechProfName}>{showFechamento.prof.apelido || showFechamento.prof.nomeExibicao}</Text>
                  <Text style={styles.fechProfMeta}>{formatMesLabel(mes)}</Text>
                </View>
                <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={{ gap: 12 }}>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <Field label="Valor base (R$)" style={{ flex: 1 }}>
                      <TextInput
                        style={styles.input}
                        value={fechValorBase}
                        onChangeText={(v) => {
                          setFechValorBase(v);
                          const vb = parseFloat(v.replace(",", "."));
                          const pc = parseFloat(fechPercentual.replace(",", "."));
                          if (!isNaN(vb) && !isNaN(pc)) setFechValor(((vb * pc) / 100).toFixed(2));
                        }}
                        keyboardType="decimal-pad"
                        placeholderTextColor={Colors.textMuted}
                      />
                    </Field>
                    <Field label="Percentual (%)" style={{ flex: 1 }}>
                      <TextInput
                        style={styles.input}
                        value={fechPercentual}
                        onChangeText={(v) => {
                          setFechPercentual(v);
                          const vb = parseFloat(fechValorBase.replace(",", "."));
                          const pc = parseFloat(v.replace(",", "."));
                          if (!isNaN(vb) && !isNaN(pc)) setFechValor(((vb * pc) / 100).toFixed(2));
                        }}
                        keyboardType="decimal-pad"
                        placeholderTextColor={Colors.textMuted}
                      />
                    </Field>
                  </View>
                  <Field label="Valor comissão (R$)">
                    <TextInput style={[styles.input, { fontSize: 18, fontFamily: "Inter_700Bold" }]} value={fechValor} onChangeText={setFechValor} keyboardType="decimal-pad" placeholderTextColor={Colors.textMuted} />
                  </Field>
                </ScrollView>
                <TouchableOpacity
                  style={[styles.btnPrimary, { marginTop: 14, opacity: submitting ? 0.5 : 1 }]}
                  disabled={submitting}
                  onPress={submitFechamento}
                >
                  {submitting ? <ActivityIndicator color="#000" /> : <Text style={styles.btnPrimaryText}>Salvar lançamento</Text>}
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
  mesRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  mesBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder, alignItems: "center", justifyContent: "center" },
  mesPill: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder },
  mesText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text, textTransform: "capitalize" },
  statRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  statBox: { flex: 1, padding: 12, borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder },
  statValue: { fontSize: 15, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, color: Colors.textMuted, fontFamily: "Inter_500Medium", marginTop: 4, textTransform: "uppercase", letterSpacing: 0.5 },
  sectionTitle: { fontSize: 12, fontFamily: "Inter_700Bold", color: Colors.textMuted, textTransform: "uppercase", letterSpacing: 1.1, marginBottom: 8, paddingHorizontal: 4 },
  profCard: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder, borderRadius: 14, overflow: "hidden" },
  profHeader: { flexDirection: "row", alignItems: "center", padding: 12, gap: 10 },
  profAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  profAvatarText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  profName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text },
  profMeta: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2 },
  profValue: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.accent },
  profPct: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.textMuted, marginTop: 2 },
  atendList: { borderTopWidth: 1, borderTopColor: Colors.surfaceBorder, padding: 10, gap: 6 },
  atendHeader: { fontSize: 10, fontFamily: "Inter_700Bold", color: Colors.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 },
  atendRow: { flexDirection: "row", alignItems: "center", gap: 8, padding: 8, borderRadius: 8, backgroundColor: Colors.surfaceLight },
  atendCli: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.text },
  atendMeta: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginTop: 2 },
  atendCom: { fontSize: 13, fontFamily: "Inter_700Bold" },
  lancList: { borderTopWidth: 1, borderTopColor: Colors.surfaceBorder, padding: 8, gap: 6 },
  lancRow: { flexDirection: "row", alignItems: "center", padding: 8, borderRadius: 8, backgroundColor: Colors.surfaceLight },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.5 },
  lancValor: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.text },
  lancMeta: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginTop: 2 },
  smallBtn: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder },
  fecharBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderTopWidth: 1, borderTopColor: Colors.surfaceBorder, backgroundColor: Colors.accent + "0d" },
  fecharBtnText: { fontSize: 12, color: Colors.accent, fontFamily: "Inter_600SemiBold" },
  modalBackdrop: { flex: 1, backgroundColor: "#000a", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: Colors.background, padding: 16, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, borderColor: Colors.surfaceBorder },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text },
  fechProfBox: { padding: 12, borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder, marginBottom: 12 },
  fechProfName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text },
  fechProfMeta: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2, textTransform: "capitalize" },
  fieldLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: Colors.text, fontSize: 14, fontFamily: "Inter_400Regular" },
  btnPrimary: { backgroundColor: Colors.accent, borderRadius: 12, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  btnPrimaryText: { color: "#000", fontFamily: "Inter_600SemiBold", fontSize: 14 },
});
