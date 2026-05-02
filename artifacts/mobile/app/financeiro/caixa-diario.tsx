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
import { fetchJson, formatCurrency, getErrorMessage } from "@/lib/api";

type Movimentacao = {
  id: number;
  caixaId: number;
  tipo: "entrada" | "saida";
  categoria: string | null;
  descricao: string;
  valor: number;
  formaPagamento: string | null;
  createdAt: string;
};

type Caixa = {
  id: number;
  status: "aberto" | "fechado";
  dataAbertura: string;
  dataFechamento: string | null;
  abertoPor: string | null;
  fechadoPor: string | null;
  observacao: string | null;
  valorAbertura: number;
  totalEntradas: number;
  totalSaidas: number;
  saldoFinal: number | null;
  movimentacoes?: Movimentacao[];
};

type Profissional = { id: number; nomeExibicao: string; apelido?: string | null };

const FORMAS = ["dinheiro", "pix", "credito", "debito", "transferencia"];

export default function CaixaDiarioScreen() {
  const insets = useSafeAreaInsets();
  const { barbeariaId } = useAuth();
  const qc = useQueryClient();

  const [showAbrir, setShowAbrir] = useState(false);
  const [showFechar, setShowFechar] = useState(false);
  const [showMov, setShowMov] = useState(false);
  const [showSangria, setShowSangria] = useState(false);
  const [showVale, setShowVale] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [valorAbertura, setValorAbertura] = useState("0");
  const [obsAbertura, setObsAbertura] = useState("");
  const [valorFechamento, setValorFechamento] = useState("");

  const [movTipo, setMovTipo] = useState<"entrada" | "saida">("entrada");
  const [movDescricao, setMovDescricao] = useState("");
  const [movValor, setMovValor] = useState("");
  const [movCategoria, setMovCategoria] = useState("");
  const [movForma, setMovForma] = useState("dinheiro");

  const [sangriaValor, setSangriaValor] = useState("");
  const [sangriaMotivo, setSangriaMotivo] = useState("");

  const [valeValor, setValeValor] = useState("");
  const [valeProfId, setValeProfId] = useState<string>("");
  const [valeObs, setValeObs] = useState("");

  const caixaQ = useQuery<Caixa | null>({
    queryKey: ["caixa-atual", barbeariaId],
    enabled: !!barbeariaId,
    queryFn: () => fetchJson<Caixa | null>(`/barbearias/${barbeariaId}/caixa-diario/atual`),
  });

  const profQ = useQuery<Profissional[]>({
    queryKey: ["profissionais", barbeariaId],
    enabled: !!barbeariaId,
    queryFn: async () => {
      const r = await fetchJson<Profissional[]>(`/barbearias/${barbeariaId}/profissionais`);
      return Array.isArray(r) ? r : [];
    },
  });

  const caixa = caixaQ.data ?? null;

  const saldoEsperado = useMemo(() => {
    if (!caixa) return 0;
    return (caixa.valorAbertura || 0) + (caixa.totalEntradas || 0) - (caixa.totalSaidas || 0);
  }, [caixa]);

  const diferenca = useMemo(() => {
    const v = parseFloat((valorFechamento || "0").replace(",", "."));
    return (Number.isFinite(v) ? v : 0) - saldoEsperado;
  }, [valorFechamento, saldoEsperado]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["caixa-atual", barbeariaId] });

  const abrir = async () => {
    setSubmitting(true);
    try {
      await fetchJson(`/barbearias/${barbeariaId}/caixa-diario/abrir`, {
        method: "POST",
        body: { valorAbertura: parseFloat(valorAbertura.replace(",", ".")) || 0, observacao: obsAbertura.trim() || null },
      });
      setShowAbrir(false); setValorAbertura("0"); setObsAbertura("");
      invalidate();
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      Alert.alert("Erro", getErrorMessage(e, "Não foi possível abrir."));
    } finally {
      setSubmitting(false);
    }
  };

  const fechar = async () => {
    if (!caixa) return;
    setSubmitting(true);
    try {
      await fetchJson(`/barbearias/${barbeariaId}/caixa-diario/${caixa.id}/fechar`, {
        method: "PUT",
        body: { valorFechamento: parseFloat(valorFechamento.replace(",", ".")) || 0 },
      });
      setShowFechar(false); setValorFechamento("");
      invalidate();
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      Alert.alert("Erro", getErrorMessage(e, "Não foi possível fechar."));
    } finally {
      setSubmitting(false);
    }
  };

  const addMov = async () => {
    if (!caixa) return;
    if (!movDescricao.trim()) return Alert.alert("Campo obrigatório", "Informe a descrição.");
    const v = parseFloat(movValor.replace(",", "."));
    if (!v || v <= 0) return Alert.alert("Valor inválido", "Informe um valor maior que zero.");
    setSubmitting(true);
    try {
      await fetchJson(`/barbearias/${barbeariaId}/caixa-diario/${caixa.id}/movimentacoes`, {
        method: "POST",
        body: { tipo: movTipo, descricao: movDescricao.trim(), valor: v, categoria: movCategoria.trim() || null, formaPagamento: movForma },
      });
      setShowMov(false); setMovDescricao(""); setMovValor(""); setMovCategoria(""); setMovTipo("entrada"); setMovForma("dinheiro");
      invalidate();
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      Alert.alert("Erro", getErrorMessage(e, "Tente novamente."));
    } finally {
      setSubmitting(false);
    }
  };

  const sangria = async () => {
    if (!caixa) return;
    const v = parseFloat(sangriaValor.replace(",", "."));
    if (!v || v <= 0) return Alert.alert("Valor inválido", "Informe um valor maior que zero.");
    setSubmitting(true);
    try {
      await fetchJson(`/barbearias/${barbeariaId}/caixa-diario/${caixa.id}/sangria`, {
        method: "POST",
        body: { valor: v, motivo: sangriaMotivo.trim() || "Sangria" },
      });
      setShowSangria(false); setSangriaValor(""); setSangriaMotivo("");
      invalidate();
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      Alert.alert("Erro", getErrorMessage(e, "Tente novamente."));
    } finally {
      setSubmitting(false);
    }
  };

  const vale = async () => {
    if (!caixa) return;
    const v = parseFloat(valeValor.replace(",", "."));
    const profId = parseInt(valeProfId);
    if (!profId) return Alert.alert("Campo obrigatório", "Selecione um profissional.");
    if (!v || v <= 0) return Alert.alert("Valor inválido", "Informe um valor maior que zero.");
    setSubmitting(true);
    try {
      await fetchJson(`/barbearias/${barbeariaId}/caixa-diario/${caixa.id}/vale`, {
        method: "POST",
        body: { valor: v, profissionalId: profId, observacao: valeObs.trim() || null },
      });
      setShowVale(false); setValeValor(""); setValeProfId(""); setValeObs("");
      invalidate();
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      Alert.alert("Erro", getErrorMessage(e, "Tente novamente."));
    } finally {
      setSubmitting(false);
    }
  };

  const action = caixa
    ? { icon: "lock" as const, label: "Fechar caixa", onPress: () => { setValorFechamento(saldoEsperado.toFixed(2)); setShowFechar(true); } }
    : { icon: "unlock" as const, label: "Abrir caixa", onPress: () => setShowAbrir(true) };

  return (
    <ScreenContainer
      title="Caixa diário"
      subtitle={caixa ? `Aberto por ${caixa.abertoPor || "—"}` : "Nenhum caixa aberto"}
      refreshing={caixaQ.isFetching && !caixaQ.isLoading}
      onRefresh={() => caixaQ.refetch()}
      rightAction={action}
    >
      {caixaQ.isLoading ? (
        <SkeletonList count={3} />
      ) : caixaQ.isError ? (
        <ErrorView error={caixaQ.error} onRetry={() => caixaQ.refetch()} />
      ) : !caixa ? (
        <EmptyState
          icon="dollar-sign"
          title="Nenhum caixa aberto"
          description="Abra um caixa para começar a registrar entradas e saídas."
          ctaLabel="Abrir caixa"
          onCtaPress={() => setShowAbrir(true)}
        />
      ) : (
        <>
          <View style={styles.kpiGrid}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Abertura</Text>
              <Text style={styles.kpiValue}>{formatCurrency(caixa.valorAbertura)}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={[styles.kpiLabel, { color: Colors.success }]}>Entradas</Text>
              <Text style={[styles.kpiValue, { color: Colors.success }]}>{formatCurrency(caixa.totalEntradas)}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={[styles.kpiLabel, { color: Colors.error }]}>Saídas</Text>
              <Text style={[styles.kpiValue, { color: Colors.error }]}>{formatCurrency(caixa.totalSaidas)}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={[styles.kpiLabel, { color: Colors.accent }]}>Saldo atual</Text>
              <Text style={[styles.kpiValue, { color: Colors.accent }]}>{formatCurrency(saldoEsperado)}</Text>
            </View>
          </View>

          <View style={styles.actionsRow}>
            <ActionPill icon="plus" label="Movimentação" onPress={() => setShowMov(true)} />
            <ActionPill icon="minus-circle" label="Sangria" onPress={() => setShowSangria(true)} tone={Colors.warning} />
            <ActionPill icon="user" label="Vale" onPress={() => setShowVale(true)} tone={Colors.info} />
          </View>

          <Text style={styles.sectionTitle}>Movimentações ({(caixa.movimentacoes ?? []).length})</Text>
          {(caixa.movimentacoes ?? []).length === 0 ? (
            <EmptyState icon="list" title="Nenhuma movimentação" description="As entradas e saídas do caixa aparecem aqui." />
          ) : (
            <View style={{ gap: 6 }}>
              {(caixa.movimentacoes ?? []).map(m => (
                <View key={m.id} style={styles.movRow}>
                  <View style={[styles.movIcon, { backgroundColor: (m.tipo === "entrada" ? Colors.success : Colors.error) + "1f" }]}>
                    <Feather
                      name={m.tipo === "entrada" ? "arrow-up-circle" : "arrow-down-circle"}
                      size={16}
                      color={m.tipo === "entrada" ? Colors.success : Colors.error}
                    />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.movDesc} numberOfLines={1}>{m.descricao}</Text>
                    <Text style={styles.movMeta} numberOfLines={1}>
                      {(m.categoria || m.formaPagamento || "—")} · {new Date(m.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </Text>
                  </View>
                  <Text style={[styles.movValue, { color: m.tipo === "entrada" ? Colors.success : Colors.error }]}>
                    {m.tipo === "entrada" ? "+" : "−"}{formatCurrency(m.valor)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </>
      )}

      {/* Modal Abrir */}
      <Modal visible={showAbrir} animationType="slide" transparent onRequestClose={() => setShowAbrir(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { paddingBottom: 24 + insets.bottom }]}>
            <ModalHeader title="Abrir caixa" onClose={() => setShowAbrir(false)} />
            <Field label="Valor de abertura (R$)">
              <TextInput style={styles.input} value={valorAbertura} onChangeText={setValorAbertura} keyboardType="decimal-pad" placeholder="0,00" placeholderTextColor={Colors.textMuted} />
            </Field>
            <Field label="Observação">
              <TextInput style={styles.input} value={obsAbertura} onChangeText={setObsAbertura} placeholder="Opcional" placeholderTextColor={Colors.textMuted} />
            </Field>
            <PrimaryBtn onPress={abrir} disabled={submitting} label={submitting ? "Abrindo..." : "Confirmar abertura"} />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Fechar */}
      <Modal visible={showFechar} animationType="slide" transparent onRequestClose={() => setShowFechar(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { paddingBottom: 24 + insets.bottom }]}>
            <ModalHeader title="Fechar caixa" onClose={() => setShowFechar(false)} />
            <View style={styles.fecharResumo}>
              <View style={styles.fecharCol}><Text style={styles.fecharLabel}>Abertura</Text><Text style={styles.fecharValue}>{formatCurrency(caixa?.valorAbertura ?? 0)}</Text></View>
              <View style={styles.fecharCol}><Text style={[styles.fecharLabel, { color: Colors.success }]}>Entradas</Text><Text style={[styles.fecharValue, { color: Colors.success }]}>{formatCurrency(caixa?.totalEntradas ?? 0)}</Text></View>
              <View style={styles.fecharCol}><Text style={[styles.fecharLabel, { color: Colors.error }]}>Saídas</Text><Text style={[styles.fecharValue, { color: Colors.error }]}>{formatCurrency(caixa?.totalSaidas ?? 0)}</Text></View>
            </View>
            <View style={styles.fecharBlock}>
              <Text style={styles.fecharBlockLabel}>Valor esperado em caixa</Text>
              <Text style={styles.fecharBlockValue}>{formatCurrency(saldoEsperado)}</Text>
            </View>
            <Field label="Valor informado (R$)">
              <TextInput style={[styles.input, { textAlign: "center", fontSize: 20, fontFamily: "Inter_700Bold" }]} value={valorFechamento} onChangeText={setValorFechamento} keyboardType="decimal-pad" placeholderTextColor={Colors.textMuted} />
            </Field>
            {valorFechamento ? (
              <View style={[styles.diffBlock, { backgroundColor: (diferenca === 0 ? Colors.success : diferenca > 0 ? Colors.warning : Colors.error) + "22" }]}>
                <Text style={styles.diffLabel}>Diferença</Text>
                <Text style={[styles.diffValue, { color: diferenca === 0 ? Colors.success : diferenca > 0 ? Colors.warning : Colors.error }]}>
                  {diferenca > 0 ? "+" : ""}{formatCurrency(diferenca)}
                  {diferenca === 0 ? "  ✓" : diferenca > 0 ? "  (sobra)" : "  (falta)"}
                </Text>
              </View>
            ) : null}
            <PrimaryBtn onPress={fechar} disabled={submitting} label={submitting ? "Fechando..." : "Confirmar fechamento"} />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Movimentação */}
      <Modal visible={showMov} animationType="slide" transparent onRequestClose={() => setShowMov(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { paddingBottom: 24 + insets.bottom }]}>
            <ModalHeader title="Nova movimentação" onClose={() => setShowMov(false)} />
            <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ gap: 12 }}>
              <Text style={styles.fieldLabel}>Tipo</Text>
              <View style={styles.segmentRow}>
                {(["entrada", "saida"] as const).map(t => (
                  <TouchableOpacity key={t} style={[styles.segmentBtn, movTipo === t && styles.segmentBtnActive]} onPress={() => setMovTipo(t)}>
                    <Text style={[styles.segmentText, movTipo === t && styles.segmentTextActive]}>{t === "entrada" ? "Entrada" : "Saída"}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Field label="Descrição">
                <TextInput style={styles.input} value={movDescricao} onChangeText={setMovDescricao} placeholder="Ex: Venda de produto" placeholderTextColor={Colors.textMuted} />
              </Field>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Field label="Valor (R$)" style={{ flex: 1 }}>
                  <TextInput style={styles.input} value={movValor} onChangeText={setMovValor} keyboardType="decimal-pad" placeholder="0,00" placeholderTextColor={Colors.textMuted} />
                </Field>
                <Field label="Categoria" style={{ flex: 1 }}>
                  <TextInput style={styles.input} value={movCategoria} onChangeText={setMovCategoria} placeholder="Opcional" placeholderTextColor={Colors.textMuted} />
                </Field>
              </View>
              <Text style={styles.fieldLabel}>Forma de pagamento</Text>
              <View style={styles.formasRow}>
                {FORMAS.map(f => (
                  <TouchableOpacity key={f} style={[styles.formaChip, movForma === f && styles.formaChipActive]} onPress={() => setMovForma(f)}>
                    <Text style={[styles.formaChipText, movForma === f && styles.formaChipTextActive]}>{f}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <PrimaryBtn onPress={addMov} disabled={submitting} label={submitting ? "Registrando..." : "Registrar"} />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Sangria */}
      <Modal visible={showSangria} animationType="slide" transparent onRequestClose={() => setShowSangria(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { paddingBottom: 24 + insets.bottom }]}>
            <ModalHeader title="Sangria de caixa" onClose={() => setShowSangria(false)} />
            <Text style={styles.helpText}>Retirar dinheiro do caixa durante o expediente.</Text>
            <Field label="Valor (R$)">
              <TextInput style={styles.input} value={sangriaValor} onChangeText={setSangriaValor} keyboardType="decimal-pad" placeholder="0,00" placeholderTextColor={Colors.textMuted} />
            </Field>
            <Field label="Motivo">
              <TextInput style={styles.input} value={sangriaMotivo} onChangeText={setSangriaMotivo} placeholder="Ex: pagamento de fornecedor" placeholderTextColor={Colors.textMuted} />
            </Field>
            <PrimaryBtn onPress={sangria} disabled={submitting} label={submitting ? "Registrando..." : "Registrar sangria"} />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Vale */}
      <Modal visible={showVale} animationType="slide" transparent onRequestClose={() => setShowVale(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { paddingBottom: 24 + insets.bottom }]}>
            <ModalHeader title="Vale para profissional" onClose={() => setShowVale(false)} />
            <Text style={styles.helpText}>Saída do caixa + débito na conta do profissional.</Text>
            <Text style={styles.fieldLabel}>Profissional</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {(profQ.data ?? []).map(p => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.profChip, valeProfId === String(p.id) && styles.profChipActive]}
                  onPress={() => setValeProfId(String(p.id))}
                >
                  <Text style={[styles.profChipText, valeProfId === String(p.id) && styles.profChipTextActive]} numberOfLines={1}>
                    {p.apelido || p.nomeExibicao}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Field label="Valor (R$)" style={{ marginTop: 12 }}>
              <TextInput style={styles.input} value={valeValor} onChangeText={setValeValor} keyboardType="decimal-pad" placeholder="0,00" placeholderTextColor={Colors.textMuted} />
            </Field>
            <Field label="Observação">
              <TextInput style={styles.input} value={valeObs} onChangeText={setValeObs} placeholder="Opcional" placeholderTextColor={Colors.textMuted} />
            </Field>
            <PrimaryBtn onPress={vale} disabled={submitting} label={submitting ? "Registrando..." : "Registrar vale"} />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenContainer>
  );
}

function ActionPill({ icon, label, onPress, tone }: { icon: keyof typeof Feather.glyphMap; label: string; onPress: () => void; tone?: string }) {
  const c = tone || Colors.accent;
  return (
    <TouchableOpacity style={[styles.actionPill, { backgroundColor: c + "1a", borderColor: c + "55" }]} onPress={onPress}>
      <Feather name={icon} size={14} color={c} />
      <Text style={[styles.actionPillText, { color: c }]}>{label}</Text>
    </TouchableOpacity>
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

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <View style={styles.modalHeader}>
      <Text style={styles.modalTitle}>{title}</Text>
      <TouchableOpacity onPress={onClose}><Feather name="x" size={22} color={Colors.text} /></TouchableOpacity>
    </View>
  );
}

function PrimaryBtn({ onPress, label, disabled }: { onPress: () => void; label: string; disabled?: boolean }) {
  return (
    <TouchableOpacity style={[styles.btnPrimary, { marginTop: 14, opacity: disabled ? 0.5 : 1 }]} disabled={disabled} onPress={onPress}>
      {disabled ? <ActivityIndicator color="#000" /> : <Text style={styles.btnPrimaryText}>{label}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  kpiCard: { flexBasis: "48%", flexGrow: 1, padding: 12, borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder },
  kpiLabel: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 },
  kpiValue: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.text, marginTop: 4 },
  actionsRow: { flexDirection: "row", gap: 8, marginTop: 12, marginBottom: 4, flexWrap: "wrap" },
  actionPill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999, borderWidth: 1 },
  actionPillText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  sectionTitle: { fontSize: 12, fontFamily: "Inter_700Bold", color: Colors.textMuted, textTransform: "uppercase", letterSpacing: 1.1, marginTop: 18, marginBottom: 8, paddingHorizontal: 4 },
  movRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder },
  movIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  movDesc: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.text },
  movMeta: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2 },
  movValue: { fontSize: 13, fontFamily: "Inter_700Bold" },
  modalBackdrop: { flex: 1, backgroundColor: "#000a", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: Colors.background, padding: 16, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, borderColor: Colors.surfaceBorder },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text },
  fieldLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 6 },
  helpText: { fontSize: 12, color: Colors.textMuted, fontFamily: "Inter_400Regular", marginBottom: 6 },
  input: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: Colors.text, fontSize: 14, fontFamily: "Inter_400Regular" },
  segmentRow: { flexDirection: "row", gap: 6 },
  segmentBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder, alignItems: "center" },
  segmentBtnActive: { backgroundColor: Colors.accent + "22", borderColor: Colors.accent + "55" },
  segmentText: { fontSize: 13, color: Colors.textSecondary, fontFamily: "Inter_500Medium" },
  segmentTextActive: { color: Colors.accent, fontFamily: "Inter_600SemiBold" },
  formasRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  formaChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder },
  formaChipActive: { backgroundColor: Colors.accent + "22", borderColor: Colors.accent + "55" },
  formaChipText: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textSecondary, textTransform: "capitalize" },
  formaChipTextActive: { color: Colors.accent },
  profChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder },
  profChipActive: { backgroundColor: Colors.accent + "22", borderColor: Colors.accent + "55" },
  profChipText: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  profChipTextActive: { color: Colors.accent, fontFamily: "Inter_600SemiBold" },
  fecharResumo: { flexDirection: "row", gap: 8, marginBottom: 12 },
  fecharCol: { flex: 1, padding: 10, backgroundColor: Colors.surface, borderRadius: 10, borderWidth: 1, borderColor: Colors.surfaceBorder, alignItems: "center" },
  fecharLabel: { fontSize: 10, fontFamily: "Inter_500Medium", color: Colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 },
  fecharValue: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.text, marginTop: 4 },
  fecharBlock: { padding: 14, backgroundColor: Colors.accent + "1a", borderRadius: 12, borderWidth: 1, borderColor: Colors.accent + "44", alignItems: "center", marginBottom: 4 },
  fecharBlockLabel: { fontSize: 11, color: Colors.accent, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  fecharBlockValue: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.accent, marginTop: 4 },
  diffBlock: { padding: 12, borderRadius: 12, alignItems: "center", marginTop: 4 },
  diffLabel: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 },
  diffValue: { fontSize: 16, fontFamily: "Inter_700Bold", marginTop: 4 },
  btnPrimary: { backgroundColor: Colors.accent, borderRadius: 12, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  btnPrimaryText: { color: "#000", fontFamily: "Inter_600SemiBold", fontSize: 14 },
});
