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
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useColors, type ColorPalette } from "@/lib/theme";
import { useAuth } from "@/contexts/AuthContext";
import { fetchJson, todayStr, strToDate, generateTimeSlots, getHorizontalRange, getErrorMessage } from "@/lib/api";
import { EmptyState } from "@/components/EmptyState";
import { ErrorView } from "@/components/ErrorView";

const MANAGER_ROLES = new Set(["dono", "gerente", "admin", "owner"]);

type Bloqueio = {
  id: number;
  profissionalId: number;
  data: string;
  horaInicio: string;
  horaFim: string;
  motivo: string | null;
};

type Profissional = { id: number; nomeExibicao: string; apelido?: string | null; ativo?: boolean };

export default function BloqueiosScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string }>();
  const { barbeariaId, user } = useAuth();
  const qc = useQueryClient();
  const canManage = !!user?.role && MANAGER_ROLES.has(user.role);

  const [date, setDate] = useState(params.date || todayStr());
  const [open, setOpen] = useState(false);
  const [profId, setProfId] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFim, setHoraFim] = useState("");
  const [motivo, setMotivo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const horizontalDates = useMemo(() => getHorizontalRange(date, 3, 10), [date]);
  const slots = useMemo(() => generateTimeSlots("06:00", "23:00", 30), []);

  const { data: profissionais = [] } = useQuery<Profissional[]>({
    queryKey: ["profissionais", barbeariaId],
    queryFn: async () => {
      if (!barbeariaId) return [];
      const data = await fetchJson<Profissional[]>(`/barbearias/${barbeariaId}/profissionais`);
      return Array.isArray(data) ? data : [];
    },
    enabled: !!barbeariaId,
  });

  const { data: bloqueios = [], refetch, isLoading, isError, error } = useQuery<Bloqueio[]>({
    queryKey: ["bloqueios", barbeariaId, date],
    queryFn: async () => {
      if (!barbeariaId) return [];
      const data = await fetchJson<Bloqueio[]>(`/barbearias/${barbeariaId}/bloqueios?data=${date}`);
      return Array.isArray(data) ? data : [];
    },
    enabled: !!barbeariaId,
  });

  const profMap = useMemo(() => {
    const m: Record<number, string> = {};
    (profissionais as Profissional[]).forEach(p => { m[p.id] = p.apelido || p.nomeExibicao; });
    return m;
  }, [profissionais]);

  const submit = async () => {
    if (!profId || !horaInicio || !horaFim) {
      Alert.alert("Campos obrigatórios", "Selecione profissional, hora de início e hora de fim.");
      return;
    }
    if (horaFim <= horaInicio) {
      Alert.alert("Período inválido", "O fim deve ser após o início.");
      return;
    }
    setSubmitting(true);
    try {
      await fetchJson(`/barbearias/${barbeariaId}/bloqueios`, {
        method: "POST",
        body: { profissionalId: Number(profId), data: date, horaInicio, horaFim, motivo: motivo || null },
      });
      qc.invalidateQueries({ queryKey: ["bloqueios"] });
      qc.invalidateQueries({ queryKey: ["agendamentos"] });
      setOpen(false);
      setProfId(""); setHoraInicio(""); setHoraFim(""); setMotivo("");
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: unknown) {
      Alert.alert("Erro", getErrorMessage(e, "Tente novamente."));
    } finally {
      setSubmitting(false);
    }
  };

  const remove = (b: Bloqueio) => {
    Alert.alert("Remover bloqueio", "Deseja liberar este horário?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remover",
        style: "destructive",
        onPress: async () => {
          try {
            await fetchJson(`/barbearias/${barbeariaId}/bloqueios/${b.id}`, { method: "DELETE" });
            qc.invalidateQueries({ queryKey: ["bloqueios"] });
            qc.invalidateQueries({ queryKey: ["agendamentos"] });
          } catch (e: unknown) {
            Alert.alert("Erro", getErrorMessage(e, "Tente novamente."));
          }
        },
      },
    ]);
  };

  const webTopPad = Platform.OS === "web" ? 67 : insets.top + 8;

  return (
    <View style={[styles.container, { paddingTop: webTopPad }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Bloqueios de horário</Text>
          <Text style={styles.subtitle}>Reserve períodos para folgas, almoços ou imprevistos</Text>
        </View>
        {canManage && (
          <TouchableOpacity style={styles.addBtn} onPress={() => setOpen(true)}>
            <Feather name="plus" size={18} color="#000" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateStrip} contentContainerStyle={{ paddingHorizontal: 12, gap: 6 }}>
        {horizontalDates.map(d => {
          const dd = strToDate(d);
          const isSel = d === date;
          return (
            <TouchableOpacity
              key={d}
              style={[styles.dayChip, isSel && styles.dayChipActive]}
              onPress={() => setDate(d)}
            >
              <Text style={[styles.dayWeek, isSel && { color: colors.invertedText }]}>
                {dd.toLocaleDateString("pt-BR", { weekday: "short" }).slice(0, 3)}
              </Text>
              <Text style={[styles.dayNum, isSel && { color: colors.invertedText }]}>{dd.getDate()}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 + insets.bottom }}>
        {isLoading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
        ) : isError ? (
          <ErrorView
            title="Não foi possível carregar os bloqueios"
            error={error}
            onRetry={() => refetch()}
          />
        ) : bloqueios.length === 0 ? (
          <EmptyState
            icon="lock"
            title="Nenhum bloqueio"
            description="Toque em + para reservar um horário."
          />
        ) : (
          bloqueios.map(b => (
            <View key={b.id} style={styles.blockCard}>
              <View style={styles.blockIcon}>
                <Feather name="lock" size={16} color={colors.textMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.blockTitle}>{b.horaInicio.slice(0,5)} – {b.horaFim.slice(0,5)}</Text>
                <Text style={styles.blockSub}>{profMap[b.profissionalId] || `Profissional ${b.profissionalId}`}</Text>
                {b.motivo && <Text style={styles.blockMotivo}>{b.motivo}</Text>}
              </View>
              {canManage && (
                <TouchableOpacity style={styles.removeBtn} onPress={() => remove(b)}>
                  <Feather name="trash-2" size={16} color={colors.error} />
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { paddingBottom: 24 + insets.bottom }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Novo bloqueio</Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Feather name="x" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 480 }} keyboardShouldPersistTaps="handled">
              <Text style={styles.section}>Profissional *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {(profissionais as Profissional[]).filter(p => p.ativo !== false).map(p => (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.miniChip, profId === String(p.id) && styles.miniChipActive]}
                    onPress={() => setProfId(String(p.id))}
                  >
                    <Text style={[styles.miniChipText, profId === String(p.id) && { color: colors.invertedText }]}>
                      {p.apelido || p.nomeExibicao}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.section}>Início *</Text>
              <View style={styles.slotsGrid}>
                {slots.map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.slot, horaInicio === t && styles.slotActive]}
                    onPress={() => setHoraInicio(t)}
                  >
                    <Text style={[styles.slotText, horaInicio === t && { color: colors.invertedText }]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.section}>Fim *</Text>
              <View style={styles.slotsGrid}>
                {slots.map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.slot, horaFim === t && styles.slotActive]}
                    onPress={() => setHoraFim(t)}
                  >
                    <Text style={[styles.slotText, horaFim === t && { color: colors.invertedText }]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.section}>Motivo <Text style={{ color: colors.textMuted }}>(opcional)</Text></Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: almoço, folga, consulta médica"
                placeholderTextColor={colors.textMuted}
                value={motivo}
                onChangeText={setMotivo}
              />
            </ScrollView>

            <TouchableOpacity
              style={[styles.btnPrimary, { marginTop: 14, opacity: submitting ? 0.5 : 1 }]}
              disabled={submitting}
              onPress={submit}
            >
              {submitting ? <ActivityIndicator color={colors.invertedText} /> : <Text style={styles.btnPrimaryText}>Bloquear horário</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingBottom: 8, gap: 8 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: c.surface, borderWidth: 1, borderColor: c.surfaceBorder, alignItems: "center", justifyContent: "center" },
  addBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: c.accent, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontFamily: "Inter_700Bold", color: c.text },
  subtitle: { fontSize: 12, color: c.textSecondary, fontFamily: "Inter_400Regular", marginTop: 2 },
  dateStrip: { maxHeight: 80, marginTop: 8, marginBottom: 8 },
  dayChip: { minWidth: 52, paddingVertical: 8, paddingHorizontal: 6, borderRadius: 12, backgroundColor: c.surface, borderWidth: 1, borderColor: c.surfaceBorder, alignItems: "center" },
  dayChipActive: { backgroundColor: c.accent, borderColor: c.accent },
  dayWeek: { fontSize: 10, fontFamily: "Inter_500Medium", color: c.textSecondary, textTransform: "capitalize" },
  dayNum: { fontSize: 17, fontFamily: "Inter_700Bold", color: c.text, marginTop: 2 },
  blockCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 12, backgroundColor: c.surface, borderWidth: 1, borderColor: c.surfaceBorder, marginBottom: 8 },
  blockIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: c.surfaceLight, alignItems: "center", justifyContent: "center" },
  blockTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: c.text },
  blockSub: { fontSize: 12, color: c.textSecondary, fontFamily: "Inter_400Regular", marginTop: 2 },
  blockMotivo: { fontSize: 11, color: c.textMuted, fontFamily: "Inter_400Regular", marginTop: 2, fontStyle: "italic" },
  removeBtn: { padding: 8 },
  modalBackdrop: { flex: 1, backgroundColor: "#000a", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: c.background, padding: 16, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, borderColor: c.surfaceBorder },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: c.text },
  section: { fontSize: 11, fontFamily: "Inter_700Bold", color: c.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginTop: 14, marginBottom: 8 },
  miniChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: c.surface, borderWidth: 1, borderColor: c.surfaceBorder, marginRight: 6 },
  miniChipActive: { backgroundColor: c.accent, borderColor: c.accent },
  miniChipText: { fontSize: 12, fontFamily: "Inter_500Medium", color: c.text },
  slotsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  slot: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: c.surfaceBorder, backgroundColor: c.surface, minWidth: 60, alignItems: "center" },
  slotActive: { backgroundColor: c.accent, borderColor: c.accent },
  slotText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: c.text },
  input: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.surfaceBorder, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: c.text, fontSize: 14, fontFamily: "Inter_400Regular" },
  btnPrimary: { backgroundColor: c.accent, borderRadius: 12, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  btnPrimaryText: { color: c.invertedText, fontFamily: "Inter_600SemiBold", fontSize: 14 },
});
