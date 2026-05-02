import React, { useState, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
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
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useColors, type ColorPalette } from "@/lib/theme";
import { useAuth } from "@/contexts/AuthContext";
import { fetchJson, formatPhone, stripPhone, todayStr, whatsappLink, getErrorMessage } from "@/lib/api";
import { EmptyState } from "@/components/EmptyState";
import { ErrorView } from "@/components/ErrorView";

type Item = {
  id: number;
  clienteNome: string;
  clienteTelefone: string | null;
  data: string;
  status: string;
  observacao: string | null;
  servicoId?: number | null;
  profissionalId?: number | null;
  createdAt?: string;
};

export default function ListaEsperaScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { barbeariaId } = useAuth();
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [tel, setTel] = useState("");
  const [data, setData] = useState(todayStr());
  const [obs, setObs] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: itens = [], isLoading, isError, error, refetch } = useQuery<Item[]>({
    queryKey: ["lista-espera", barbeariaId],
    queryFn: async () => {
      if (!barbeariaId) return [];
      const data = await fetchJson<Item[]>(`/barbearias/${barbeariaId}/lista-espera`);
      return Array.isArray(data) ? data : [];
    },
    enabled: !!barbeariaId,
  });

  const pendentes = (itens as Item[]).filter(i => i.status === "esperando");
  const outros = (itens as Item[]).filter(i => i.status !== "esperando");

  const invalidate = () => qc.invalidateQueries({ queryKey: ["lista-espera", barbeariaId] });

  const submit = async () => {
    if (!nome.trim()) {
      Alert.alert("Campo obrigatório", "Informe o nome do cliente.");
      return;
    }
    const telDigits = stripPhone(tel);
    if (!telDigits || telDigits.length < 10) {
      Alert.alert("Campo obrigatório", "Informe o WhatsApp do cliente (com DDD).");
      return;
    }
    setSubmitting(true);
    try {
      await fetchJson(`/barbearias/${barbeariaId}/lista-espera`, {
        method: "POST",
        body: {
          clienteNome: nome.trim(),
          clienteTelefone: telDigits,
          data,
          status: "esperando",
          observacao: obs.trim() || null,
        },
      });
      invalidate();
      setOpen(false);
      setNome(""); setTel(""); setObs(""); setData(todayStr());
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: unknown) {
      Alert.alert("Erro", getErrorMessage(e, "Tente novamente."));
    } finally {
      setSubmitting(false);
    }
  };

  const setStatus = async (item: Item, status: string) => {
    try {
      await fetchJson(`/barbearias/${barbeariaId}/lista-espera/${item.id}`, {
        method: "PUT",
        body: { status },
      });
      invalidate();
    } catch (e: unknown) {
      Alert.alert("Erro", getErrorMessage(e, "Tente novamente."));
    }
  };

  const remove = (item: Item) => {
    Alert.alert("Remover", `Remover ${item.clienteNome} da lista?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remover",
        style: "destructive",
        onPress: async () => {
          try {
            await fetchJson(`/barbearias/${barbeariaId}/lista-espera/${item.id}`, { method: "DELETE" });
            invalidate();
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
          <Text style={styles.title}>Lista de espera</Text>
          <Text style={styles.subtitle}>Clientes aguardando horário</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setOpen(true)}>
          <Feather name="plus" size={18} color="#000" />
        </TouchableOpacity>
      </View>

      <View style={styles.statRow}>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: colors.warning }]}>{pendentes.length}</Text>
          <Text style={styles.statLabel}>Aguardando</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: colors.success }]}>
            {(itens as Item[]).filter(i => i.status === "atendido").length}
          </Text>
          <Text style={styles.statLabel}>Atendidos</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: colors.accent }]}>{(itens as Item[]).length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 + insets.bottom }}>
        {isLoading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
        ) : isError ? (
          <ErrorView
            title="Não foi possível carregar a lista de espera"
            error={error}
            onRetry={() => refetch()}
          />
        ) : (itens as Item[]).length === 0 ? (
          <EmptyState
            icon="clipboard"
            title="Lista vazia"
            description="Adicione clientes que estão aguardando um horário."
          />
        ) : (
          <>
            {pendentes.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Aguardando ({pendentes.length})</Text>
                {pendentes.map(item => (
                  <View key={item.id} style={styles.card}>
                    <View style={styles.cardLeft}>
                      <View style={[styles.avatar, { backgroundColor: colors.warning + "22" }]}>
                        <Text style={[styles.avatarText, { color: colors.warning }]}>
                          {item.clienteNome.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardName}>{item.clienteNome}</Text>
                      {item.clienteTelefone && (
                        <Text style={styles.cardSub}>
                          <Feather name="phone" size={11} /> {formatPhone(item.clienteTelefone)}
                        </Text>
                      )}
                      {item.data && <Text style={styles.cardSub}>Para: {item.data}</Text>}
                      {item.observacao && <Text style={styles.cardObs}>{item.observacao}</Text>}
                    </View>
                    <View style={styles.cardActions}>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: colors.success + "20", borderColor: colors.success + "55" }]}
                        onPress={() => setStatus(item, "atendido")}
                        accessibilityLabel="Marcar como atendido"
                      >
                        <Feather name="check" size={14} color={colors.success} />
                      </TouchableOpacity>
                      {item.clienteTelefone && (
                        <TouchableOpacity
                          style={[styles.actionBtn, { backgroundColor: colors.success + "10" }]}
                          onPress={() => Linking.openURL(whatsappLink(item.clienteTelefone))}
                          accessibilityLabel="Avisar pelo WhatsApp"
                        >
                          <Feather name="message-circle" size={14} color={colors.success} />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity style={styles.actionBtn} onPress={() => remove(item)} accessibilityLabel="Remover da lista">
                        <Feather name="trash-2" size={14} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </>
            )}

            {outros.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Histórico</Text>
                {outros.map(item => (
                  <View key={item.id} style={[styles.card, { opacity: 0.7 }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardName}>{item.clienteNome}</Text>
                      <Text style={styles.cardSub}>{item.data} · {item.status}</Text>
                    </View>
                    <TouchableOpacity onPress={() => remove(item)}>
                      <Feather name="trash-2" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { paddingBottom: 24 + insets.bottom }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Adicionar à lista</Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Feather name="x" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 12 }}>
              <View>
                <Text style={styles.fieldLabel}>Nome do cliente *</Text>
                <TextInput style={styles.input} value={nome} onChangeText={setNome} placeholder="Ex: Mariana" placeholderTextColor={colors.textMuted} />
              </View>
              <View>
                <Text style={styles.fieldLabel}>WhatsApp *</Text>
                <TextInput
                  style={styles.input}
                  value={tel}
                  onChangeText={(v) => setTel(formatPhone(v))}
                  placeholder="(11) 99999-9999"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="phone-pad"
                />
              </View>
              <View>
                <Text style={styles.fieldLabel}>Data desejada</Text>
                <TextInput style={styles.input} value={data} onChangeText={setData} placeholder="AAAA-MM-DD" placeholderTextColor={colors.textMuted} />
              </View>
              <View>
                <Text style={styles.fieldLabel}>Observação</Text>
                <TextInput style={[styles.input, { minHeight: 60, textAlignVertical: "top" }]} value={obs} onChangeText={setObs} multiline placeholder="Preferência de horário, etc." placeholderTextColor={colors.textMuted} />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.btnPrimary, { marginTop: 14, opacity: submitting ? 0.5 : 1 }]}
              disabled={submitting}
              onPress={submit}
            >
              {submitting ? <ActivityIndicator color={colors.invertedText} /> : <Text style={styles.btnPrimaryText}>Adicionar</Text>}
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
  statRow: { flexDirection: "row", paddingHorizontal: 16, gap: 8, marginVertical: 12 },
  statBox: { flex: 1, padding: 12, borderRadius: 12, backgroundColor: c.surface, borderWidth: 1, borderColor: c.surfaceBorder, alignItems: "center" },
  statValue: { fontSize: 22, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_500Medium", color: c.textSecondary, marginTop: 4 },
  sectionTitle: { fontSize: 12, fontFamily: "Inter_700Bold", color: c.textMuted, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 },
  card: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, backgroundColor: c.surface, borderWidth: 1, borderColor: c.surfaceBorder, marginBottom: 8 },
  cardLeft: {},
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  cardName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: c.text },
  cardSub: { fontSize: 11, color: c.textSecondary, fontFamily: "Inter_400Regular", marginTop: 2 },
  cardObs: { fontSize: 11, color: c.textMuted, fontFamily: "Inter_400Regular", marginTop: 4, fontStyle: "italic" },
  cardActions: { flexDirection: "row", gap: 6 },
  actionBtn: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: c.surfaceLight, borderWidth: 1, borderColor: c.surfaceBorder },
  modalBackdrop: { flex: 1, backgroundColor: "#000a", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: c.background, padding: 16, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, borderColor: c.surfaceBorder },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: c.text },
  fieldLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: c.textSecondary, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.surfaceBorder, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: c.text, fontSize: 14, fontFamily: "Inter_400Regular" },
  btnPrimary: { backgroundColor: c.accent, borderRadius: 12, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  btnPrimaryText: { color: c.invertedText, fontFamily: "Inter_600SemiBold", fontSize: 14 },
});
