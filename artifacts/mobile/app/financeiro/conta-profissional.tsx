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

type ContaProf = {
  id: number;
  profissionalId: number;
  profissionalNome: string;
  tipo: "credito" | "debito" | string;
  descricao: string;
  valor: number;
  data: string;
  mesAno: string;
};

type Profissional = { id: number; nomeExibicao: string; apelido?: string | null };

function defaultMes() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMes(mes: string, delta: number) {
  const [y, m] = mes.split("-").map(Number);
  const d = new Date(y, (m - 1) + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function ContaProfissionalScreen() {
  const insets = useSafeAreaInsets();
  const { barbeariaId } = useAuth();
  const qc = useQueryClient();

  const [mes, setMes] = useState(defaultMes());
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [profId, setProfId] = useState("");
  const [tipo, setTipo] = useState<"credito" | "debito">("credito");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(todayStr());

  const profQ = useQuery<Profissional[]>({
    queryKey: ["profissionais", barbeariaId],
    enabled: !!barbeariaId,
    queryFn: async () => {
      const r = await fetchJson<Profissional[]>(`/barbearias/${barbeariaId}/profissionais`);
      return Array.isArray(r) ? r : [];
    },
  });

  const contasQ = useQuery<ContaProf[]>({
    queryKey: ["contas-prof", barbeariaId, mes],
    enabled: !!barbeariaId,
    queryFn: async () => {
      const r = await fetchJson<ContaProf[]>(`/barbearias/${barbeariaId}/contas-profissional?mesAno=${mes}`);
      return Array.isArray(r) ? r : [];
    },
  });

  const grouped = useMemo(() => {
    const list = contasQ.data ?? [];
    return (profQ.data ?? [])
      .map(p => {
        const items = list.filter(c => c.profissionalId === p.id).sort((a, b) => (b.data || "").localeCompare(a.data || ""));
        const saldo = items.reduce((s, c) => s + (c.tipo === "credito" ? c.valor : -c.valor), 0);
        return { ...p, items, saldo };
      })
      .filter(p => p.items.length > 0)
      .sort((a, b) => Math.abs(b.saldo) - Math.abs(a.saldo));
  }, [profQ.data, contasQ.data]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["contas-prof", barbeariaId, mes] });

  const submit = async () => {
    const id = parseInt(profId);
    const v = parseFloat(valor.replace(",", "."));
    if (!id) return Alert.alert("Campo obrigatório", "Selecione um profissional.");
    if (!descricao.trim()) return Alert.alert("Campo obrigatório", "Informe a descrição.");
    if (!v || v <= 0) return Alert.alert("Valor inválido", "Informe um valor maior que zero.");
    const prof = (profQ.data ?? []).find(p => p.id === id);
    setSubmitting(true);
    try {
      await fetchJson(`/barbearias/${barbeariaId}/contas-profissional`, {
        method: "POST",
        body: {
          profissionalId: id,
          profissionalNome: prof?.apelido || prof?.nomeExibicao || "",
          tipo,
          descricao: descricao.trim(),
          valor: v,
          mesAno: mes,
          data: data || todayStr(),
        },
      });
      setOpen(false); setProfId(""); setDescricao(""); setValor(""); setTipo("credito"); setData(todayStr());
      invalidate();
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      Alert.alert("Erro", getErrorMessage(e, "Tente novamente."));
    } finally {
      setSubmitting(false);
    }
  };

  const remove = (c: ContaProf) => {
    Alert.alert("Excluir lançamento", `Excluir "${c.descricao}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          try {
            await fetchJson(`/barbearias/${barbeariaId}/contas-profissional/${c.id}`, { method: "DELETE" });
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
      title="Conta do profissional"
      subtitle={`Mês ${mes}`}
      refreshing={contasQ.isFetching && !contasQ.isLoading}
      onRefresh={() => contasQ.refetch()}
      rightAction={{ icon: "plus", label: "Novo lançamento", onPress: () => setOpen(true) }}
    >
      <View style={styles.mesRow}>
        <TouchableOpacity style={styles.mesBtn} onPress={() => setMes(shiftMes(mes, -1))}>
          <Feather name="chevron-left" size={18} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.mesPill}>
          <Text style={styles.mesText}>{mes}</Text>
        </View>
        <TouchableOpacity style={styles.mesBtn} onPress={() => setMes(shiftMes(mes, 1))}>
          <Feather name="chevron-right" size={18} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {contasQ.isLoading ? (
        <SkeletonList count={3} />
      ) : contasQ.isError ? (
        <ErrorView error={contasQ.error} onRetry={() => contasQ.refetch()} />
      ) : grouped.length === 0 ? (
        <EmptyState
          icon="user-check"
          title="Sem lançamentos"
          description="Não há créditos ou débitos por profissional neste mês."
          ctaLabel="Novo lançamento"
          onCtaPress={() => setOpen(true)}
        />
      ) : (
        <View style={{ gap: 10 }}>
          {grouped.map(p => (
            <View key={p.id} style={styles.profCard}>
              <View style={styles.profHeader}>
                <View style={[styles.profAvatar, { backgroundColor: Colors.accent + "22" }]}>
                  <Text style={[styles.profAvatarText, { color: Colors.accent }]}>{(p.apelido || p.nomeExibicao).charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.profName}>{p.apelido || p.nomeExibicao}</Text>
                  <Text style={styles.profMeta}>{p.items.length} lançamento{p.items.length === 1 ? "" : "s"}</Text>
                </View>
                <Text style={[styles.profSaldo, { color: p.saldo >= 0 ? Colors.success : Colors.error }]}>
                  {p.saldo >= 0 ? "+" : "−"}{formatCurrency(Math.abs(p.saldo))}
                </Text>
              </View>
              <View style={styles.list}>
                {p.items.map(c => (
                  <View key={c.id} style={styles.row}>
                    <Feather
                      name={c.tipo === "credito" ? "plus-circle" : "minus-circle"}
                      size={14}
                      color={c.tipo === "credito" ? Colors.success : Colors.error}
                    />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.rowDesc} numberOfLines={1}>{c.descricao}</Text>
                      <Text style={styles.rowMeta}>{c.data}</Text>
                    </View>
                    <Text style={[styles.rowValor, { color: c.tipo === "credito" ? Colors.success : Colors.error }]}>
                      {c.tipo === "credito" ? "+" : "−"}{formatCurrency(c.valor)}
                    </Text>
                    <TouchableOpacity style={styles.removeBtn} onPress={() => remove(c)}>
                      <Feather name="trash-2" size={13} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      )}

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { paddingBottom: 24 + insets.bottom }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Novo lançamento</Text>
              <TouchableOpacity onPress={() => setOpen(false)}><Feather name="x" size={22} color={Colors.text} /></TouchableOpacity>
            </View>
            <Text style={styles.fieldLabel}>Profissional</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {(profQ.data ?? []).map(p => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.profChip, profId === String(p.id) && styles.profChipActive]}
                  onPress={() => setProfId(String(p.id))}
                >
                  <Text style={[styles.profChipText, profId === String(p.id) && styles.profChipTextActive]} numberOfLines={1}>
                    {p.apelido || p.nomeExibicao}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.fieldLabel}>Tipo</Text>
            <View style={styles.segmentRow}>
              {(["credito", "debito"] as const).map(t => (
                <TouchableOpacity key={t} style={[styles.segmentBtn, tipo === t && styles.segmentBtnActive]} onPress={() => setTipo(t)}>
                  <Text style={[styles.segmentText, tipo === t && styles.segmentTextActive]}>{t === "credito" ? "Crédito" : "Débito"}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.fieldLabel}>Descrição</Text>
            <TextInput style={styles.input} value={descricao} onChangeText={setDescricao} placeholder="Ex: Adiantamento" placeholderTextColor={Colors.textMuted} />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Valor (R$)</Text>
                <TextInput style={styles.input} value={valor} onChangeText={setValor} keyboardType="decimal-pad" placeholder="0,00" placeholderTextColor={Colors.textMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Data</Text>
                <TextInput style={styles.input} value={data} onChangeText={setData} placeholder="AAAA-MM-DD" placeholderTextColor={Colors.textMuted} />
              </View>
            </View>
            <TouchableOpacity
              style={[styles.btnPrimary, { marginTop: 14, opacity: submitting ? 0.5 : 1 }]}
              disabled={submitting}
              onPress={submit}
            >
              {submitting ? <ActivityIndicator color="#000" /> : <Text style={styles.btnPrimaryText}>Salvar</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  mesRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  mesBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder, alignItems: "center", justifyContent: "center" },
  mesPill: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder },
  mesText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text },
  profCard: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder, borderRadius: 14, overflow: "hidden" },
  profHeader: { flexDirection: "row", alignItems: "center", padding: 12, gap: 10 },
  profAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  profAvatarText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  profName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text },
  profMeta: { fontSize: 11, color: Colors.textSecondary, fontFamily: "Inter_400Regular", marginTop: 2 },
  profSaldo: { fontSize: 16, fontFamily: "Inter_700Bold" },
  list: { borderTopWidth: 1, borderTopColor: Colors.surfaceBorder, padding: 8, gap: 4 },
  row: { flexDirection: "row", alignItems: "center", padding: 8, borderRadius: 8, backgroundColor: Colors.surfaceLight, gap: 8 },
  rowDesc: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.text },
  rowMeta: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginTop: 2 },
  rowValor: { fontSize: 13, fontFamily: "Inter_700Bold" },
  removeBtn: { width: 26, height: 26, borderRadius: 6, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder, alignItems: "center", justifyContent: "center" },
  modalBackdrop: { flex: 1, backgroundColor: "#000a", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: Colors.background, padding: 16, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, borderColor: Colors.surfaceBorder },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text },
  fieldLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 8 },
  input: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: Colors.text, fontSize: 14, fontFamily: "Inter_400Regular" },
  profChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder },
  profChipActive: { backgroundColor: Colors.accent + "22", borderColor: Colors.accent + "55" },
  profChipText: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  profChipTextActive: { color: Colors.accent, fontFamily: "Inter_600SemiBold" },
  segmentRow: { flexDirection: "row", gap: 6 },
  segmentBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder, alignItems: "center" },
  segmentBtnActive: { backgroundColor: Colors.accent + "22", borderColor: Colors.accent + "55" },
  segmentText: { fontSize: 13, color: Colors.textSecondary, fontFamily: "Inter_500Medium" },
  segmentTextActive: { color: Colors.accent, fontFamily: "Inter_600SemiBold" },
  btnPrimary: { backgroundColor: Colors.accent, borderRadius: 12, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  btnPrimaryText: { color: "#000", fontFamily: "Inter_600SemiBold", fontSize: 14 },
});
