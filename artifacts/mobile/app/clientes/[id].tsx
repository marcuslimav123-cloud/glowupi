import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Alert,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/ScreenContainer";
import { EmptyState } from "@/components/EmptyState";
import { ErrorView } from "@/components/ErrorView";
import { SkeletonList } from "@/components/Skeleton";
import { useAuth } from "@/contexts/AuthContext";
import Colors from "@/constants/colors";
import { fetchJson, formatCurrency, formatPhone, stripPhone, whatsappLink } from "@/lib/api";

type Cliente = {
  id: number;
  nome: string;
  telefone: string;
  email: string | null;
  aniversario: string | null;
  observacoes: string | null;
  vip: boolean;
  totalGasto: number;
  pontosFidelidade: number;
  ultimaVisita: string | null;
};

type Dashboard = {
  cliente: Cliente;
  servicoMaisRealizado: { nome: string; vezes: number } | null;
  produtoMaisComprado: { nome: string; vezes: number } | null;
  diasSemAgendar: number | null;
  totalGasto: number;
  pontosFidelidade: number;
  totalAgendamentos: number;
  totalComandas: number;
};

type Agendamento = {
  id: number;
  data: string;
  horaInicio: string;
  horaFim: string;
  servicoNome: string;
  profissionalNome: string;
  status: string;
  valor: number;
};

type Comanda = {
  id: number;
  dataFechamento: string;
  profissionalNome: string;
  valorTotal: number;
};

type TabId = "resumo" | "agendamentos" | "comandas";

const TABS: { id: TabId; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { id: "resumo", label: "Resumo", icon: "user" },
  { id: "agendamentos", label: "Agendamentos", icon: "calendar" },
  { id: "comandas", label: "Comandas", icon: "file-text" },
];

function fmtDateBR(s: string | null | undefined) {
  if (!s) return "-";
  const date = s.length >= 10 ? s.slice(0, 10) : s;
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}

export default function ClienteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { barbeariaId } = useAuth();
  const qc = useQueryClient();
  const clienteId = Number(id);
  const [tab, setTab] = useState<TabId>("resumo");
  const [editOpen, setEditOpen] = useState(false);

  const dashQ = useQuery<Dashboard>({
    queryKey: ["cliente-dash", barbeariaId, clienteId],
    queryFn: () => fetchJson(`/barbearias/${barbeariaId}/clientes/${clienteId}/dashboard`),
    enabled: !!barbeariaId && !!clienteId,
  });

  const agendQ = useQuery<{ items: Agendamento[]; total: number }>({
    queryKey: ["cliente-agend", barbeariaId, clienteId],
    queryFn: () => fetchJson(`/barbearias/${barbeariaId}/clientes/${clienteId}/agendamentos?limit=50`),
    enabled: !!barbeariaId && !!clienteId && tab === "agendamentos",
  });

  const comQ = useQuery<{ items: Comanda[]; total: number }>({
    queryKey: ["cliente-comandas", barbeariaId, clienteId],
    queryFn: () => fetchJson(`/barbearias/${barbeariaId}/clientes/${clienteId}/comandas?limit=50`),
    enabled: !!barbeariaId && !!clienteId && tab === "comandas",
  });

  const cliente = dashQ.data?.cliente;

  const updateMut = useMutation({
    mutationFn: (data: Partial<Cliente>) =>
      fetchJson(`/barbearias/${barbeariaId}/clientes/${clienteId}`, { method: "PUT", body: data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cliente-dash", barbeariaId, clienteId] });
      qc.invalidateQueries({ queryKey: ["clientes"] });
      setEditOpen(false);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (e: Error) => Alert.alert("Erro", e.message),
  });

  const subtitle = cliente ? `${cliente.telefone ? formatPhone(cliente.telefone) : "Sem telefone"}` : "";

  if (dashQ.isLoading) {
    return (
      <ScreenContainer title="Cliente">
        <SkeletonList count={4} />
      </ScreenContainer>
    );
  }

  if (dashQ.isError || !cliente) {
    return (
      <ScreenContainer title="Cliente">
        <ErrorView title="Cliente não encontrado" error={dashQ.error} onRetry={() => dashQ.refetch()} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      title={cliente.nome}
      subtitle={subtitle}
      rightAction={{ icon: "edit-2", label: "Editar", onPress: () => setEditOpen(true) }}
    >
      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.avatarLg}>
          <Text style={styles.avatarLgText}>{cliente.nome.charAt(0).toUpperCase()}</Text>
        </View>
        {cliente.vip && (
          <View style={styles.vipBadge}>
            <Feather name="star" size={12} color="#000" />
            <Text style={styles.vipBadgeText}>VIP</Text>
          </View>
        )}
      </View>

      {/* Quick actions */}
      <View style={styles.actions}>
        {cliente.telefone && (
          <>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => Linking.openURL(`tel:${cliente.telefone}`)}
            >
              <Feather name="phone" size={16} color={Colors.accent} />
              <Text style={styles.actionText}>Ligar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => Linking.openURL(whatsappLink(cliente.telefone))}
            >
              <Feather name="message-circle" size={16} color={Colors.success} />
              <Text style={styles.actionText}>WhatsApp</Text>
            </TouchableOpacity>
          </>
        )}
        {cliente.email && (
          <TouchableOpacity style={styles.actionBtn} onPress={() => Linking.openURL(`mailto:${cliente.email}`)}>
            <Feather name="mail" size={16} color={Colors.info} />
            <Text style={styles.actionText}>E-mail</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[styles.tab, tab === t.id && styles.tabActive]}
            onPress={() => {
              if (Platform.OS !== "web") Haptics.selectionAsync();
              setTab(t.id);
            }}
          >
            <Feather name={t.icon} size={14} color={tab === t.id ? Colors.accent : Colors.textSecondary} />
            <Text style={[styles.tabText, tab === t.id && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === "resumo" && <ResumoTab dash={dashQ.data!} cliente={cliente} />}
      {tab === "agendamentos" && (
        <AgendList items={agendQ.data?.items ?? []} loading={agendQ.isLoading} error={agendQ.isError} onRetry={() => agendQ.refetch()} />
      )}
      {tab === "comandas" && (
        <ComandasList items={comQ.data?.items ?? []} loading={comQ.isLoading} error={comQ.isError} onRetry={() => comQ.refetch()} />
      )}

      <EditClienteModal
        visible={editOpen}
        cliente={cliente}
        onClose={() => setEditOpen(false)}
        onSave={(d) => updateMut.mutate(d)}
        saving={updateMut.isPending}
      />
    </ScreenContainer>
  );
}

function ResumoTab({ dash, cliente }: { dash: Dashboard; cliente: Cliente }) {
  return (
    <View style={{ gap: 12 }}>
      <View style={styles.statsGrid}>
        <Stat icon="dollar-sign" label="Total gasto" value={formatCurrency(dash.totalGasto)} color={Colors.success} />
        <Stat icon="award" label="Pontos" value={String(dash.pontosFidelidade)} color={Colors.warning} />
        <Stat icon="calendar" label="Agendamentos" value={String(dash.totalAgendamentos)} color={Colors.accent} />
        <Stat icon="clock" label="Sem agendar" value={dash.diasSemAgendar != null ? `${dash.diasSemAgendar}d` : "-"} color={Colors.info} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Informações</Text>
        {cliente.aniversario && (
          <InfoLine icon="gift" label="Aniversário" value={fmtDateBR(cliente.aniversario)} />
        )}
        {cliente.email && <InfoLine icon="mail" label="E-mail" value={cliente.email} />}
        {cliente.ultimaVisita && (
          <InfoLine icon="clock" label="Última visita" value={fmtDateBR(cliente.ultimaVisita)} />
        )}
        {cliente.observacoes && <InfoLine icon="file-text" label="Observações" value={cliente.observacoes} />}
        {dash.servicoMaisRealizado && (
          <InfoLine icon="trending-up" label="Serviço favorito" value={`${dash.servicoMaisRealizado.nome} (${dash.servicoMaisRealizado.vezes}x)`} />
        )}
        {dash.produtoMaisComprado && (
          <InfoLine icon="package" label="Produto favorito" value={`${dash.produtoMaisComprado.nome} (${dash.produtoMaisComprado.vezes}x)`} />
        )}
      </View>
    </View>
  );
}

function Stat({ icon, label, value, color }: { icon: keyof typeof Feather.glyphMap; label: string; value: string; color: string }) {
  return (
    <View style={styles.statBox}>
      <Feather name={icon} size={16} color={color} />
      <Text style={[styles.statVal, { color }]} numberOfLines={1}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function InfoLine({ icon, label, value }: { icon: keyof typeof Feather.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.infoLine}>
      <Feather name={icon} size={14} color={Colors.textSecondary} />
      <Text style={styles.infoLabel}>{label}:</Text>
      <Text style={styles.infoValue} numberOfLines={3}>{value}</Text>
    </View>
  );
}

function AgendList({ items, loading, error, onRetry }: { items: Agendamento[]; loading: boolean; error: boolean; onRetry: () => void }) {
  if (loading) return <SkeletonList count={4} variant="row" />;
  if (error) return <ErrorView onRetry={onRetry} />;
  if (items.length === 0) return <EmptyState icon="calendar" title="Sem agendamentos" />;
  return (
    <View>
      {items.map((a) => (
        <View key={a.id} style={styles.itemCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemTitle}>{a.servicoNome}</Text>
            <Text style={styles.itemSub}>{fmtDateBR(a.data)} · {a.horaInicio} · {a.profissionalNome}</Text>
            <View style={[styles.statusBadge, statusBadgeStyle(a.status)]}>
              <Text style={[styles.statusText, statusTextStyle(a.status)]}>{a.status}</Text>
            </View>
          </View>
          <Text style={styles.itemPrice}>{formatCurrency(a.valor)}</Text>
        </View>
      ))}
    </View>
  );
}

function statusBadgeStyle(s: string) {
  if (s === "concluido" || s === "concluído") return { backgroundColor: Colors.success + "22" };
  if (s === "cancelado") return { backgroundColor: Colors.error + "22" };
  return { backgroundColor: Colors.surfaceLight };
}
function statusTextStyle(s: string) {
  if (s === "concluido" || s === "concluído") return { color: Colors.success };
  if (s === "cancelado") return { color: Colors.error };
  return { color: Colors.textSecondary };
}

function ComandasList({ items, loading, error, onRetry }: { items: Comanda[]; loading: boolean; error: boolean; onRetry: () => void }) {
  if (loading) return <SkeletonList count={4} variant="row" />;
  if (error) return <ErrorView onRetry={onRetry} />;
  if (items.length === 0) return <EmptyState icon="file-text" title="Sem comandas" />;
  return (
    <View>
      {items.map((c) => (
        <View key={c.id} style={styles.itemCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemTitle}>{c.profissionalNome || "—"}</Text>
            <Text style={styles.itemSub}>{c.dataFechamento ? new Date(c.dataFechamento).toLocaleDateString("pt-BR") : "-"}</Text>
          </View>
          <Text style={styles.itemPrice}>{formatCurrency(c.valorTotal)}</Text>
        </View>
      ))}
    </View>
  );
}

function EditClienteModal({ visible, cliente, onClose, onSave, saving }: { visible: boolean; cliente: Cliente; onClose: () => void; onSave: (d: Partial<Cliente>) => void; saving: boolean }) {
  const [nome, setNome] = useState(cliente.nome);
  const [telefone, setTelefone] = useState(formatPhone(cliente.telefone || ""));
  const [email, setEmail] = useState(cliente.email || "");
  const [aniversario, setAniversario] = useState(cliente.aniversario || "");
  const [observacoes, setObservacoes] = useState(cliente.observacoes || "");
  const [vip, setVip] = useState(!!cliente.vip);

  React.useEffect(() => {
    if (visible) {
      setNome(cliente.nome);
      setTelefone(formatPhone(cliente.telefone || ""));
      setEmail(cliente.email || "");
      setAniversario(cliente.aniversario || "");
      setObservacoes(cliente.observacoes || "");
      setVip(!!cliente.vip);
    }
  }, [visible, cliente]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={styles.modalCard}>
          <View style={styles.modalHead}>
            <Text style={styles.modalTitle}>Editar cliente</Text>
            <TouchableOpacity onPress={onClose}><Feather name="x" size={22} color={Colors.text} /></TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Field label="Nome">
              <TextInput style={styles.input} value={nome} onChangeText={setNome} placeholderTextColor={Colors.textMuted} />
            </Field>
            <Field label="Telefone">
              <TextInput style={styles.input} value={telefone} onChangeText={(t) => setTelefone(formatPhone(t))} keyboardType="phone-pad" placeholder="(00) 00000-0000" placeholderTextColor={Colors.textMuted} />
            </Field>
            <Field label="E-mail">
              <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholderTextColor={Colors.textMuted} />
            </Field>
            <Field label="Aniversário (AAAA-MM-DD)">
              <TextInput style={styles.input} value={aniversario} onChangeText={setAniversario} placeholder="1990-05-21" placeholderTextColor={Colors.textMuted} />
            </Field>
            <Field label="Observações">
              <TextInput style={[styles.input, { height: 80, textAlignVertical: "top" }]} value={observacoes} onChangeText={setObservacoes} multiline placeholderTextColor={Colors.textMuted} />
            </Field>
            <TouchableOpacity onPress={() => setVip(!vip)} style={[styles.vipToggle, vip && styles.vipToggleActive]}>
              <Feather name="star" size={16} color={vip ? Colors.warning : Colors.textSecondary} />
              <Text style={[styles.vipToggleText, vip && { color: Colors.warning }]}>{vip ? "Cliente VIP" : "Marcar como VIP"}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              disabled={saving}
              onPress={() => onSave({
                nome,
                telefone: stripPhone(telefone),
                email: email || null,
                aniversario: aniversario || null,
                observacoes: observacoes || null,
                vip,
              })}
            >
              {saving ? <ActivityIndicator color="#000" /> : <Text style={styles.saveBtnText}>Salvar</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", paddingVertical: 12 },
  avatarLg: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.accent + "22", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: Colors.accent + "55" },
  avatarLgText: { fontSize: 32, fontFamily: "Inter_700Bold", color: Colors.accent },
  vipBadge: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8, backgroundColor: Colors.warning, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  vipBadgeText: { color: "#000", fontFamily: "Inter_700Bold", fontSize: 11 },
  actions: { flexDirection: "row", gap: 8, marginVertical: 12 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder, borderRadius: 10 },
  actionText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.text },
  tabs: { flexDirection: "row", backgroundColor: Colors.surface, borderRadius: 12, padding: 4, marginBottom: 12, borderWidth: 1, borderColor: Colors.surfaceBorder },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 8, borderRadius: 8 },
  tabActive: { backgroundColor: Colors.accent + "1a" },
  tabText: { color: Colors.textSecondary, fontSize: 12, fontFamily: "Inter_500Medium" },
  tabTextActive: { color: Colors.accent, fontFamily: "Inter_600SemiBold" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statBox: { flexBasis: "48%", flexGrow: 1, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: 12, borderRadius: 12 },
  statVal: { fontSize: 18, fontFamily: "Inter_700Bold", marginTop: 4 },
  statLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  card: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder, borderRadius: 12, padding: 14 },
  cardTitle: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.text, marginBottom: 8 },
  infoLine: { flexDirection: "row", alignItems: "flex-start", gap: 6, paddingVertical: 6 },
  infoLabel: { fontSize: 12, color: Colors.textSecondary, fontFamily: "Inter_500Medium" },
  infoValue: { flex: 1, fontSize: 13, color: Colors.text, fontFamily: "Inter_400Regular" },
  itemCard: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder, borderRadius: 12, padding: 12, marginBottom: 8, gap: 12 },
  itemTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text },
  itemSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  itemPrice: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.accent },
  statusBadge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginTop: 6 },
  statusText: { fontSize: 10, fontFamily: "Inter_700Bold", textTransform: "uppercase" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: Colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32, maxHeight: "90%", borderTopWidth: 1, borderColor: Colors.surfaceBorder },
  modalHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text },
  label: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder, borderRadius: 10, paddingHorizontal: 12, height: 44, color: Colors.text, fontSize: 14, fontFamily: "Inter_400Regular" },
  vipToggle: { marginTop: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: Colors.surfaceBorder },
  vipToggleActive: { borderColor: Colors.warning, backgroundColor: Colors.warning + "10" },
  vipToggleText: { color: Colors.textSecondary, fontFamily: "Inter_600SemiBold", fontSize: 13 },
  saveBtn: { marginTop: 18, backgroundColor: Colors.accent, height: 50, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  saveBtnText: { color: "#000", fontFamily: "Inter_700Bold", fontSize: 15 },
});
