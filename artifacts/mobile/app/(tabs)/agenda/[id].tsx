import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import { fetchJson, formatCurrency, whatsappLink, strToDate, generateTimeSlots, dateToStr, todayStr, getErrorMessage } from "@/lib/api";

type Parametro = { chave: string; valor: string };
type AgendamentoDetail = {
  id: number;
  clienteId?: number | null;
  clienteNome: string;
  clienteTelefone?: string | null;
  profissionalId: number;
  profissionalNome: string;
  servicoId: number;
  servicoNome: string;
  data: string;
  horaInicio: string;
  horaFim: string;
  status: string;
  valor: number | string;
  pago: boolean;
  encaixe?: boolean;
  observacao?: string | null;
  atendimentoId?: number | null;
  pacoteClienteId?: number | null;
};
type PagamentoPayload = { metodo: string; valor: number; bandeira?: string };
import { ErrorView } from "@/components/ErrorView";

type Bandeira = { id: number; nome: string; categoria: string; ativo?: boolean };

const PAYMENT_METHODS = [
  { value: "pix", label: "PIX", icon: "smartphone" as const },
  { value: "dinheiro", label: "Dinheiro", icon: "dollar-sign" as const },
  { value: "credito", label: "Crédito", icon: "credit-card" as const },
  { value: "debito", label: "Débito", icon: "credit-card" as const },
];

const requiresBandeira = (m: string) => m === "credito" || m === "debito";

function statusColor(status: string, encaixe?: boolean): { color: string; label: string; bg: string } {
  if (encaixe) return { color: Colors.warning, label: "Encaixe", bg: Colors.warning + "20" };
  switch (status) {
    case "pago": return { color: Colors.success, label: "Pago", bg: Colors.success + "20" };
    case "confirmado": return { color: Colors.accent, label: "Confirmado", bg: Colors.accent + "20" };
    case "pendente_aprovacao": return { color: Colors.warning, label: "Pendente de aprovação", bg: Colors.warning + "20" };
    case "recusado": return { color: Colors.error, label: "Recusado", bg: Colors.error + "20" };
    case "cancelado": return { color: Colors.error, label: "Cancelado", bg: Colors.error + "20" };
    default: return { color: Colors.textMuted, label: status, bg: Colors.surfaceLight };
  }
}

export default function AgendamentoDetail() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { barbeariaId } = useAuth();
  const qc = useQueryClient();

  const [busy, setBusy] = useState<string | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [metodo, setMetodo] = useState("pix");
  const [bandeira, setBandeira] = useState("");
  const [observacao, setObservacao] = useState("");
  const [desconto, setDesconto] = useState("");
  const [descontoTipo, setDescontoTipo] = useState<"valor" | "percentual">("valor");
  const [reagendarOpen, setReagendarOpen] = useState(false);
  const [novaData, setNovaData] = useState("");
  const [novaHora, setNovaHora] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelMotivo, setCancelMotivo] = useState("");

  const { data: parametros = {} } = useQuery<Record<string, string>>({
    queryKey: ["parametros", barbeariaId],
    queryFn: async () => {
      if (!barbeariaId) return {};
      const arr = await fetchJson<Parametro[]>(`/barbearias/${barbeariaId}/parametros`);
      const map: Record<string, string> = {};
      if (Array.isArray(arr)) for (const p of arr) if (p?.chave) map[p.chave] = p.valor;
      return map;
    },
    enabled: !!barbeariaId,
  });

  const { data: bandeiras = [] } = useQuery<Bandeira[]>({
    queryKey: ["tipos-bandeira", barbeariaId],
    queryFn: async () => {
      if (!barbeariaId) return [];
      const arr = await fetchJson<Bandeira[]>(`/barbearias/${barbeariaId}/tipos?categoria=bandeira`);
      return Array.isArray(arr) ? arr.filter(b => b.ativo !== false) : [];
    },
    enabled: !!barbeariaId,
  });

  const bandeiraObrigatoria = parametros["comanda_obrigatoriedade_bandeira"] === "Sim";

  const { data: agend, isLoading, isError, refetch } = useQuery<AgendamentoDetail | null>({
    queryKey: ["agendamento", barbeariaId, id],
    queryFn: async () => {
      if (!barbeariaId || !id) return null;
      return await fetchJson<AgendamentoDetail>(`/barbearias/${barbeariaId}/agendamentos/${id}`);
    },
    enabled: !!barbeariaId && !!id,
  });

  const valor = useMemo(() => agend ? Number(agend.valor) : 0, [agend]);
  const valorFinal = useMemo(() => {
    const d = parseFloat(desconto) || 0;
    if (d <= 0) return valor;
    if (descontoTipo === "percentual") return valor * (1 - Math.min(d, 100) / 100);
    return Math.max(0, valor - d);
  }, [valor, desconto, descontoTipo]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["agendamentos"] });
    qc.invalidateQueries({ queryKey: ["agendamento"] });
    qc.invalidateQueries({ queryKey: ["agendamentos-pendentes-count"] });
  };

  const doConfirm = async () => {
    if (!agend) return;
    setBusy("confirmar");
    try {
      const res = await fetchJson<{ waUrl?: string }>(
        `/barbearias/${barbeariaId}/agendamentos/${agend.id}/confirmar`,
        { method: "POST" }
      );
      invalidate();
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (res?.waUrl) {
        Alert.alert("Confirmado", "Abrindo WhatsApp para enviar a confirmação.", [
          { text: "Abrir WhatsApp", onPress: () => Linking.openURL(res.waUrl as string) },
          { text: "Fechar", style: "cancel" },
        ]);
      }
      router.back();
    } catch (e: unknown) {
      Alert.alert("Erro ao confirmar", getErrorMessage(e, "Tente novamente."));
    } finally {
      setBusy(null);
    }
  };

  const doRefuse = async () => {
    if (!agend) return;
    Alert.prompt
      ? Alert.prompt(
          "Recusar agendamento",
          "Motivo (opcional, será enviado ao cliente):",
          async (motivo) => {
            await sendRefuse(motivo || "Horário indisponível");
          },
          "plain-text",
          "Horário indisponível"
        )
      : await sendRefuse("Horário indisponível");
  };

  const sendRefuse = async (motivo: string) => {
    if (!agend) return;
    setBusy("recusar");
    try {
      const res = await fetchJson<{ waUrl?: string }>(
        `/barbearias/${barbeariaId}/agendamentos/${agend.id}/recusar`,
        { method: "POST", body: { motivo: motivo || undefined } }
      );
      invalidate();
      if (res?.waUrl) {
        Alert.alert("Recusado", "Abrindo WhatsApp para avisar o cliente.", [
          { text: "Abrir WhatsApp", onPress: () => Linking.openURL(res.waUrl as string) },
          { text: "Fechar", style: "cancel" },
        ]);
      }
      router.back();
    } catch (e: unknown) {
      Alert.alert("Erro ao recusar", getErrorMessage(e, "Tente novamente."));
    } finally {
      setBusy(null);
    }
  };

  const doCancel = () => {
    if (!agend) return;
    setCancelMotivo("");
    setCancelOpen(true);
  };

  const sendCancel = async () => {
    if (!agend) return;
    setBusy("cancelar");
    try {
      await fetchJson(`/barbearias/${barbeariaId}/agendamentos/${agend.id}`, {
        method: "DELETE",
        body: cancelMotivo ? { motivo: cancelMotivo } : undefined,
      });
      invalidate();
      setCancelOpen(false);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      if (cancelMotivo && agend.clienteTelefone) {
        const phoneDigits = (agend.clienteTelefone || "").replace(/\D/g, "");
        if (phoneDigits.length >= 10) {
          const dt = strToDate(agend.data).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });
          const tpl = `Olá ${agend.clienteNome.split(" ")[0]}, infelizmente precisamos cancelar seu agendamento de ${agend.servicoNome} em ${dt} às ${agend.horaInicio.slice(0,5)}.\n\nMotivo: ${cancelMotivo}\n\nPara reagendar, entre em contato.`;
          Alert.alert("Cancelado", "Avisar o cliente pelo WhatsApp?", [
            { text: "Não", style: "cancel", onPress: () => router.back() },
            {
              text: "Abrir WhatsApp",
              onPress: () => {
                Linking.openURL(whatsappLink(agend.clienteTelefone, tpl));
                router.back();
              },
            },
          ]);
          return;
        }
      }
      router.back();
    } catch (e: unknown) {
      Alert.alert("Erro ao cancelar", getErrorMessage(e, "Tente novamente."));
    } finally {
      setBusy(null);
    }
  };

  const openReagendar = () => {
    if (!agend) return;
    setNovaData(agend.data);
    setNovaHora(agend.horaInicio.slice(0, 5));
    setReagendarOpen(true);
  };

  const sendReagendar = async () => {
    if (!agend) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(novaData) || !/^\d{2}:\d{2}$/.test(novaHora)) {
      Alert.alert("Dados inválidos", "Informe data (AAAA-MM-DD) e horário (HH:MM).");
      return;
    }
    setBusy("reagendar");
    try {
      await fetchJson(`/barbearias/${barbeariaId}/agendamentos/${agend.id}`, {
        method: "PUT",
        body: { data: novaData, horaInicio: novaHora, profissionalId: agend.profissionalId },
      });
      invalidate();
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setReagendarOpen(false);
      const phoneDigits = (agend.clienteTelefone || "").replace(/\D/g, "");
      if (phoneDigits.length >= 10) {
        const dt = strToDate(novaData).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });
        const tpl = `Olá ${agend.clienteNome.split(" ")[0]}, seu agendamento de ${agend.servicoNome} foi reagendado para ${dt} às ${novaHora}. Confirma?`;
        Alert.alert("Reagendado", "Avisar o cliente pelo WhatsApp?", [
          { text: "Não", style: "cancel", onPress: () => router.back() },
          {
            text: "Abrir WhatsApp",
            onPress: () => {
              Linking.openURL(whatsappLink(agend.clienteTelefone, tpl));
              router.back();
            },
          },
        ]);
      } else {
        router.back();
      }
    } catch (e: unknown) {
      Alert.alert("Erro ao reagendar", getErrorMessage(e, "Tente novamente."));
    } finally {
      setBusy(null);
    }
  };

  const sendLembrete = () => {
    if (!agend) return;
    const phoneDigits = (agend.clienteTelefone || "").replace(/\D/g, "");
    if (phoneDigits.length < 10) {
      Alert.alert("WhatsApp ausente", "Cliente sem WhatsApp cadastrado.");
      return;
    }
    const dt = strToDate(agend.data).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });
    const tpl = `Olá ${agend.clienteNome.split(" ")[0]}, lembrando do seu agendamento de ${agend.servicoNome} com ${agend.profissionalNome} em ${dt} às ${agend.horaInicio.slice(0,5)}. Aguardamos você!`;
    Linking.openURL(whatsappLink(agend.clienteTelefone, tpl));
  };

  const doCheckout = async () => {
    if (bandeiraObrigatoria && requiresBandeira(metodo) && !bandeira) {
      Alert.alert("Bandeira obrigatória", "Selecione a bandeira do cartão para concluir o checkout.");
      return;
    }
    if (!agend) return;
    setBusy("checkout");
    try {
      const pagamento: PagamentoPayload = { metodo, valor: valorFinal };
      if (requiresBandeira(metodo) && bandeira) pagamento.bandeira = bandeira;
      await fetchJson(`/barbearias/${barbeariaId}/agendamentos/${agend.id}/checkout`, {
        method: "POST",
        body: {
          pagamentos: [pagamento],
          observacao: observacao || undefined,
          desconto: parseFloat(desconto) || 0,
          descontoTipo,
        },
      });
      invalidate();
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCheckoutOpen(false);
      router.back();
    } catch (e: unknown) {
      Alert.alert("Erro no checkout", getErrorMessage(e, "Tente novamente."));
    } finally {
      setBusy(null);
    }
  };

  const webTopPad = Platform.OS === "web" ? 67 : insets.top + 8;

  if (isLoading || !agend) {
    return (
      <View style={[styles.container, { paddingTop: webTopPad }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="chevron-left" size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Detalhes</Text>
        </View>
        <View style={{ paddingTop: 80, alignItems: "center" }}>
          {isError ? (
            <ErrorView title="Não foi possível carregar" onRetry={() => refetch()} />
          ) : (
            <ActivityIndicator color={Colors.accent} />
          )}
        </View>
      </View>
    );
  }

  const info = statusColor(agend.status, agend.encaixe);
  const phoneDigits = (agend.clienteTelefone || "").replace(/\D/g, "");
  const hasWa = phoneDigits.length >= 10;
  const isPending = agend.status === "pendente_aprovacao";
  const isCancellable = ["confirmado", "pendente_aprovacao"].includes(agend.status);
  const canCheckout = agend.status === "confirmado" && !agend.pago;
  const canReschedule = ["confirmado", "pendente_aprovacao"].includes(agend.status);
  const canRemind = agend.status === "confirmado" && hasWa;

  return (
    <View style={[styles.container, { paddingTop: webTopPad }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Detalhes do agendamento</Text>
          <Text style={styles.subtitle}>
            {strToDate(agend.data).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140 + insets.bottom }}>
        <View style={styles.statusRow}>
          <View style={[styles.statusBadge, { backgroundColor: info.bg }]}>
            {agend.encaixe && <Feather name="zap" size={12} color={info.color} />}
            <Text style={[styles.statusText, { color: info.color }]}>{info.label}</Text>
          </View>
          {agend.atendimentoId && (
            <View style={styles.tag}>
              <Feather name="users" size={11} color="#a78bfa" />
              <Text style={styles.tagText}>Atendimento conjunto</Text>
            </View>
          )}
          {agend.pacoteClienteId && (
            <View style={styles.tag}>
              <Feather name="package" size={11} color={Colors.accent} />
              <Text style={[styles.tagText, { color: Colors.accent }]}>Pacote</Text>
            </View>
          )}
        </View>

        <View style={styles.bigCard}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View>
              <Text style={styles.timeBig}>{agend.horaInicio.slice(0, 5)} – {agend.horaFim.slice(0, 5)}</Text>
              <Text style={styles.dateLine}>
                {strToDate(agend.data).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
              </Text>
            </View>
            <Text style={styles.valueBig}>{formatCurrency(valor)}</Text>
          </View>
        </View>

        <SectionTitle label="Cliente" />
        <View style={styles.card}>
          <Row label={agend.clienteNome} value="" icon="user" />
          {agend.clienteTelefone && <Row label="WhatsApp" value={agend.clienteTelefone} icon="phone" />}
          {hasWa && (
            <TouchableOpacity
              style={styles.waActionBtn}
              onPress={() => Linking.openURL(whatsappLink(agend.clienteTelefone))}
            >
              <Feather name="message-circle" size={16} color={Colors.success} />
              <Text style={styles.waActionText}>Abrir conversa no WhatsApp</Text>
            </TouchableOpacity>
          )}
        </View>

        <SectionTitle label="Atendimento" />
        <View style={styles.card}>
          <Row label="Serviço" value={agend.servicoNome} />
          <Row label="Profissional" value={agend.profissionalNome} />
          {agend.observacao && <Row label="Observação" value={agend.observacao} />}
        </View>

        {isPending && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionPrimary, busy === "confirmar" && { opacity: 0.5 }]}
              disabled={!!busy}
              onPress={doConfirm}
            >
              {busy === "confirmar" ? <ActivityIndicator color="#000" /> : <Text style={styles.actionPrimaryText}>Confirmar</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionDanger, busy === "recusar" && { opacity: 0.5 }]}
              disabled={!!busy}
              onPress={doRefuse}
            >
              {busy === "recusar" ? <ActivityIndicator color={Colors.error} /> : <Text style={styles.actionDangerText}>Recusar</Text>}
            </TouchableOpacity>
          </View>
        )}

        {canCheckout && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionPrimary, { marginTop: 16 }]}
            onPress={() => setCheckoutOpen(true)}
          >
            <Feather name="dollar-sign" size={16} color="#000" />
            <Text style={[styles.actionPrimaryText, { marginLeft: 6 }]}>Realizar checkout</Text>
          </TouchableOpacity>
        )}

        {canRemind && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionGhost, { marginTop: 12, borderColor: Colors.success + "55", backgroundColor: Colors.success + "0d" }]}
            onPress={sendLembrete}
          >
            <Feather name="message-circle" size={16} color={Colors.success} />
            <Text style={[styles.actionGhostText, { color: Colors.success, marginLeft: 6 }]}>Enviar lembrete WhatsApp</Text>
          </TouchableOpacity>
        )}

        {canReschedule && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionGhost, { marginTop: 12 }]}
            disabled={!!busy}
            onPress={openReagendar}
          >
            <Feather name="calendar" size={16} color={Colors.accent} />
            <Text style={[styles.actionGhostText, { color: Colors.accent, marginLeft: 6 }]}>Reagendar</Text>
          </TouchableOpacity>
        )}

        {isCancellable && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionGhost, { marginTop: 12 }]}
            disabled={!!busy}
            onPress={doCancel}
          >
            {busy === "cancelar" ? <ActivityIndicator color={Colors.error} /> : (
              <>
                <Feather name="x-circle" size={16} color={Colors.error} />
                <Text style={[styles.actionGhostText, { color: Colors.error, marginLeft: 6 }]}>Cancelar agendamento</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>

      <Modal visible={reagendarOpen} animationType="slide" transparent onRequestClose={() => setReagendarOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { paddingBottom: 24 + insets.bottom }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reagendar</Text>
              <TouchableOpacity onPress={() => setReagendarOpen(false)}>
                <Feather name="x" size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSection}>Nova data</Text>
            <TextInput
              style={styles.input}
              value={novaData}
              onChangeText={(v) => {
                const digits = v.replace(/\D/g, "").slice(0, 8);
                let out = digits;
                if (digits.length > 4) out = `${digits.slice(0, 4)}-${digits.slice(4, 6)}${digits.length > 6 ? "-" + digits.slice(6) : ""}`;
                else if (digits.length > 0) out = digits;
                setNovaData(out);
              }}
              placeholder="AAAA-MM-DD"
              placeholderTextColor={Colors.textMuted}
              keyboardType="number-pad"
            />
            <View style={{ flexDirection: "row", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
              {[0, 1, 2, 7, 14].map(off => {
                const dt = new Date(); dt.setDate(dt.getDate() + off);
                const ds = dateToStr(dt);
                return (
                  <TouchableOpacity key={off} style={[styles.payChip, novaData === ds && styles.payChipActive]} onPress={() => setNovaData(ds)}>
                    <Text style={[styles.payChipText, novaData === ds && { color: "#000" }]}>
                      {off === 0 ? "Hoje" : off === 1 ? "Amanhã" : dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.modalSection}>Novo horário</Text>
            <TextInput
              style={styles.input}
              value={novaHora}
              onChangeText={(v) => {
                const digits = v.replace(/\D/g, "").slice(0, 4);
                const fmt = digits.length >= 3 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;
                setNovaHora(fmt);
              }}
              placeholder="HH:MM"
              placeholderTextColor={Colors.textMuted}
              keyboardType="number-pad"
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
              {generateTimeSlots("08:00", "20:00", 30).map(t => (
                <TouchableOpacity key={t} style={[styles.payChip, { marginRight: 6 }, novaHora === t && styles.payChipActive]} onPress={() => setNovaHora(t)}>
                  <Text style={[styles.payChipText, novaHora === t && { color: "#000" }]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionPrimary, { marginTop: 16 }, busy === "reagendar" && { opacity: 0.6 }]}
              disabled={busy === "reagendar"}
              onPress={sendReagendar}
            >
              {busy === "reagendar" ? <ActivityIndicator color="#000" /> : <Text style={styles.actionPrimaryText}>Confirmar reagendamento</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={cancelOpen} animationType="slide" transparent onRequestClose={() => setCancelOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { paddingBottom: 24 + insets.bottom }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cancelar agendamento</Text>
              <TouchableOpacity onPress={() => setCancelOpen(false)}>
                <Feather name="x" size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalSection, { marginTop: 4 }]}>
              Cancelar o atendimento de {agend.clienteNome} em {agend.data} às {agend.horaInicio.slice(0,5)}?
            </Text>
            <Text style={styles.modalSection}>Motivo (opcional)</Text>
            <TextInput
              style={[styles.input, { minHeight: 80, textAlignVertical: "top" }]}
              value={cancelMotivo}
              onChangeText={setCancelMotivo}
              placeholder="Ex: imprevisto do profissional, cliente pediu remarcar…"
              placeholderTextColor={Colors.textMuted}
              multiline
            />
            <View style={{ flexDirection: "row", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
              {["Cliente desmarcou", "Imprevisto do profissional", "Sem comparecimento"].map(opt => (
                <TouchableOpacity key={opt} style={[styles.payChip, cancelMotivo === opt && styles.payChipActive]} onPress={() => setCancelMotivo(opt)}>
                  <Text style={[styles.payChipText, cancelMotivo === opt && { color: "#000" }]}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionDanger, { marginTop: 16 }, busy === "cancelar" && { opacity: 0.6 }]}
              disabled={busy === "cancelar"}
              onPress={sendCancel}
            >
              {busy === "cancelar" ? <ActivityIndicator color={Colors.error} /> : <Text style={styles.actionDangerText}>Confirmar cancelamento</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={checkoutOpen} animationType="slide" transparent onRequestClose={() => setCheckoutOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { paddingBottom: 24 + insets.bottom }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Checkout</Text>
              <TouchableOpacity onPress={() => setCheckoutOpen(false)}>
                <Feather name="x" size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 480 }}>
              <Text style={styles.modalSection}>Forma de pagamento</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {PAYMENT_METHODS.map(p => (
                  <TouchableOpacity
                    key={p.value}
                    style={[styles.payChip, metodo === p.value && styles.payChipActive]}
                    onPress={() => { setMetodo(p.value); if (!requiresBandeira(p.value)) setBandeira(""); }}
                  >
                    <Feather name={p.icon} size={14} color={metodo === p.value ? "#000" : Colors.text} />
                    <Text style={[styles.payChipText, metodo === p.value && { color: "#000" }]}>{p.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {requiresBandeira(metodo) && (
                <>
                  <Text style={styles.modalSection}>
                    Bandeira do cartão {bandeiraObrigatoria ? "*" : <Text style={{ color: Colors.textMuted }}>(opcional)</Text>}
                  </Text>
                  {bandeiras.length === 0 ? (
                    <Text style={{ color: Colors.textMuted, fontSize: 12, fontFamily: "Inter_400Regular" }}>
                      Nenhuma bandeira cadastrada. Cadastre em Configurações para registrar taxas e prazos.
                    </Text>
                  ) : (
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                      {bandeiras.map(b => (
                        <TouchableOpacity
                          key={b.id}
                          style={[styles.payChip, bandeira === b.nome && styles.payChipActive]}
                          onPress={() => setBandeira(b.nome)}
                        >
                          <Text style={[styles.payChipText, bandeira === b.nome && { color: "#000" }]}>{b.nome}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </>
              )}

              <Text style={styles.modalSection}>Desconto</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="0,00"
                  placeholderTextColor={Colors.textMuted}
                  value={desconto}
                  onChangeText={setDesconto}
                  keyboardType="decimal-pad"
                />
                <TouchableOpacity
                  style={[styles.payChip, descontoTipo === "valor" && styles.payChipActive]}
                  onPress={() => setDescontoTipo("valor")}
                >
                  <Text style={[styles.payChipText, descontoTipo === "valor" && { color: "#000" }]}>R$</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.payChip, descontoTipo === "percentual" && styles.payChipActive]}
                  onPress={() => setDescontoTipo("percentual")}
                >
                  <Text style={[styles.payChipText, descontoTipo === "percentual" && { color: "#000" }]}>%</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSection}>Observação</Text>
              <TextInput
                style={[styles.input, { minHeight: 60, textAlignVertical: "top" }]}
                placeholder="Opcional"
                placeholderTextColor={Colors.textMuted}
                value={observacao}
                onChangeText={setObservacao}
                multiline
              />

              <View style={styles.totalBox}>
                <Text style={styles.totalLabel}>Total a receber</Text>
                <Text style={styles.totalValue}>{formatCurrency(valorFinal)}</Text>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.actionBtn, styles.actionPrimary, { marginTop: 14 }, busy === "checkout" && { opacity: 0.6 }]}
              disabled={busy === "checkout"}
              onPress={doCheckout}
            >
              {busy === "checkout" ? <ActivityIndicator color="#000" /> : <Text style={styles.actionPrimaryText}>Confirmar pagamento</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function SectionTitle({ label }: { label: string }) {
  return <Text style={styles.sectionTitle}>{label}</Text>;
}

function Row({ label, value, icon }: { label: string; value?: string; icon?: keyof typeof Feather.glyphMap }) {
  return (
    <View style={styles.row}>
      {icon && <Feather name={icon} size={14} color={Colors.textMuted} style={{ marginRight: 8 }} />}
      <Text style={styles.rowLabel}>{label}</Text>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingBottom: 8, gap: 8 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text },
  subtitle: { fontSize: 12, color: Colors.textSecondary, fontFamily: "Inter_400Regular", marginTop: 2, textTransform: "capitalize" },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  statusText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  tag: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: "#7c3aed22", borderWidth: 1, borderColor: "#a78bfa55" },
  tagText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#a78bfa" },
  bigCard: { padding: 16, borderRadius: 14, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder, marginBottom: 8 },
  timeBig: { fontSize: 24, fontFamily: "Inter_700Bold", color: Colors.text },
  dateLine: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 4, textTransform: "capitalize" },
  valueBig: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.accent },
  sectionTitle: { fontSize: 11, fontFamily: "Inter_700Bold", color: Colors.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginTop: 18, marginBottom: 8 },
  card: { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.surfaceBorder, paddingHorizontal: 14, paddingVertical: 6 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder },
  rowLabel: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.text },
  rowValue: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary, maxWidth: "50%", textAlign: "right" },
  waActionBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12 },
  waActionText: { color: Colors.success, fontFamily: "Inter_600SemiBold", fontSize: 13 },
  actions: { flexDirection: "row", gap: 10, marginTop: 18 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: 12 },
  actionPrimary: { backgroundColor: Colors.accent },
  actionPrimaryText: { color: "#000", fontFamily: "Inter_600SemiBold", fontSize: 14 },
  actionDanger: { backgroundColor: Colors.error + "12", borderWidth: 1, borderColor: Colors.error + "55" },
  actionDangerText: { color: Colors.error, fontFamily: "Inter_600SemiBold", fontSize: 14 },
  actionGhost: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder },
  actionGhostText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  modalBackdrop: { flex: 1, backgroundColor: "#000a", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: Colors.background, padding: 16, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, borderColor: Colors.surfaceBorder },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text },
  modalSection: { fontSize: 11, fontFamily: "Inter_700Bold", color: Colors.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginTop: 16, marginBottom: 8 },
  payChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder },
  payChipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  payChipText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.text },
  input: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: Colors.text, fontSize: 14, fontFamily: "Inter_400Regular" },
  totalBox: { marginTop: 18, padding: 14, borderRadius: 12, backgroundColor: Colors.accent + "12", borderWidth: 1, borderColor: Colors.accent + "55", flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalLabel: { fontSize: 12, color: Colors.textSecondary, fontFamily: "Inter_500Medium" },
  totalValue: { fontSize: 22, color: Colors.accent, fontFamily: "Inter_700Bold" },
});
