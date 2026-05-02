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
  tipo: string;
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

function isGorjeta(c: ContaProf) {
  if (c.tipo === "gorjeta") return true;
  const d = (c.descricao || "").toLowerCase();
  return d.includes("gorjeta") || d.includes("caixinha");
}

export default function CaixinhaScreen() {
  const insets = useSafeAreaInsets();
  const { barbeariaId } = useAuth();
  const qc = useQueryClient();

  const [mes] = useState(defaultMes());
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [profId, setProfId] = useState("");
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("Gorjeta");
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

  const gorjetas = useMemo(() => (contasQ.data ?? []).filter(isGorjeta), [contasQ.data]);

  const grouped = useMemo(() => {
    return (profQ.data ?? [])
      .map(p => {
        const items = gorjetas.filter(g => g.profissionalId === p.id).sort((a, b) => (b.data || "").localeCompare(a.data || ""));
        return { ...p, items, total: items.reduce((s, g) => s + (g.valor || 0), 0) };
      })
      .filter(p => p.items.length > 0)
      .sort((a, b) => b.total - a.total);
  }, [profQ.data, gorjetas]);

  const totalMes = useMemo(() => gorjetas.reduce((s, g) => s + (g.valor || 0), 0), [gorjetas]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["contas-prof", barbeariaId, mes] });

  const submit = async () => {
    const id = parseInt(profId);
    const v = parseFloat(valor.replace(",", "."));
    if (!id) return Alert.alert("Campo obrigatório", "Selecione um profissional.");
    if (!v || v <= 0) return Alert.alert("Valor inválido", "Informe um valor maior que zero.");
    const prof = (profQ.data ?? []).find(p => p.id === id);
    setSubmitting(true);
    try {
      await fetchJson(`/barbearias/${barbeariaId}/contas-profissional`, {
        method: "POST",
        body: {
          profissionalId: id,
          profissionalNome: prof?.apelido || prof?.nomeExibicao || "",
          tipo: "gorjeta",
          descricao: descricao.trim() || "Gorjeta",
          valor: v,
          mesAno: mes,
          data: data || todayStr(),
        },
      });
      setOpen(false); setProfId(""); setValor(""); setDescricao("Gorjeta"); setData(todayStr());
      invalidate();
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      Alert.alert("Erro", getErrorMessage(e, "Tente novamente."));
    } finally {
      setSubmitting(false);
    }
  };

  const remove = (g: ContaProf) => {
    Alert.alert("Excluir gorjeta", `Excluir esta gorjeta de ${formatCurrency(g.valor)}?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          try {
            await fetchJson(`/barbearias/${barbeariaId}/contas-profissional/${g.id}`, { method: "DELETE" });
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
      title="Caixinha"
      subtitle={`Mês ${mes}`}
      refreshing={contasQ.isFetching && !contasQ.isLoading}
      onRefresh={() => contasQ.refetch()}
      rightAction={{ icon: "plus", label: "Nova gorjeta", onPress: () => setOpen(true) }}
    >
      <View style={styles.totalCard}>
        <View>
          <Text style={styles.totalLabel}>Total do mês</Text>
          <Text style={styles.totalSub}>{gorjetas.length} lançamento{gorjetas.length === 1 ? "" : "s"}</Text>
        </View>
        <Text style={styles.totalValue}>{formatCurrency(totalMes)}</Text>
      </View>

      {contasQ.isLoading ? (
        <SkeletonList count={3} />
      ) : contasQ.isError ? (
        <ErrorView error={contasQ.error} onRetry={() => contasQ.refetch()} />
      ) : grouped.length === 0 ? (
        <EmptyState
          icon="dollar-sign"
          title="Sem gorjetas"
          description="Ainda não há caixinha registrada este mês."
          ctaLabel="Registrar gorjeta"
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
                  <Text style={styles.profMeta}>{p.items.length} gorjeta{p.items.length === 1 ? "" : "s"}</Text>
                </View>
                <Text style={styles.profValue}>{formatCurrency(p.total)}</Text>
              </View>
              <View style={styles.list}>
                {p.items.map(g => (
                  <View key={g.id} style={styles.row}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.rowDesc} numberOfLines={1}>{g.descricao}</Text>
                      <Text style={styles.rowMeta}>{g.data}</Text>
                    </View>
                    <Text style={styles.rowValor}>{formatCurrency(g.valor)}</Text>
                    <TouchableOpacity style={styles.removeBtn} onPress={() => remove(g)}>
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
              <Text style={styles.modalTitle}>Nova gorjeta</Text>
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
            <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Valor (R$)</Text>
                <TextInput style={styles.input} value={valor} onChangeText={setValor} keyboardType="decimal-pad" placeholder="0,00" placeholderTextColor={Colors.textMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Data</Text>
                <TextInput style={styles.input} value={data} onChangeText={setData} placeholder="AAAA-MM-DD" placeholderTextColor={Colors.textMuted} />
              </View>
            </View>
            <Text style={styles.fieldLabel}>Descrição</Text>
            <TextInput style={styles.input} value={descricao} onChangeText={setDescricao} placeholder="Gorjeta" placeholderTextColor={Colors.textMuted} />
            <TouchableOpacity
              style={[styles.btnPrimary, { marginTop: 14, opacity: submitting ? 0.5 : 1 }]}
              disabled={submitting}
              onPress={submit}
            >
              {submitting ? <ActivityIndicator color="#000" /> : <Text style={styles.btnPrimaryText}>Registrar</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  totalCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, borderRadius: 12, backgroundColor: Colors.accent + "1a", borderWidth: 1, borderColor: Colors.accent + "44", marginBottom: 14 },
  totalLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.accent, textTransform: "uppercase", letterSpacing: 0.5 },
  totalSub: { fontSize: 11, color: Colors.textMuted, fontFamily: "Inter_400Regular", marginTop: 2 },
  totalValue: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.accent },
  profCard: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder, borderRadius: 14, overflow: "hidden" },
  profHeader: { flexDirection: "row", alignItems: "center", padding: 12, gap: 10 },
  profAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  profAvatarText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  profName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text },
  profMeta: { fontSize: 11, color: Colors.textSecondary, fontFamily: "Inter_400Regular", marginTop: 2 },
  profValue: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.accent },
  list: { borderTopWidth: 1, borderTopColor: Colors.surfaceBorder, padding: 8, gap: 4 },
  row: { flexDirection: "row", alignItems: "center", padding: 8, borderRadius: 8, backgroundColor: Colors.surfaceLight, gap: 8 },
  rowDesc: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.text },
  rowMeta: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginTop: 2 },
  rowValor: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.text },
  removeBtn: { width: 26, height: 26, borderRadius: 6, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder, alignItems: "center", justifyContent: "center" },
  modalBackdrop: { flex: 1, backgroundColor: "#000a", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: Colors.background, padding: 16, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, borderColor: Colors.surfaceBorder },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text },
  fieldLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 6 },
  input: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: Colors.text, fontSize: 14, fontFamily: "Inter_400Regular" },
  profChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder },
  profChipActive: { backgroundColor: Colors.accent + "22", borderColor: Colors.accent + "55" },
  profChipText: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  profChipTextActive: { color: Colors.accent, fontFamily: "Inter_600SemiBold" },
  btnPrimary: { backgroundColor: Colors.accent, borderRadius: 12, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  btnPrimaryText: { color: "#000", fontFamily: "Inter_600SemiBold", fontSize: 14 },
});
