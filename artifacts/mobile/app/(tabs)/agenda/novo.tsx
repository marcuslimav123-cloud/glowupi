import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
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
import {
  fetchJson, formatCurrency, formatPhone, stripPhone, todayStr,
  generateTimeSlots, timeToMinutes, addMinutesToTime, strToDate,
} from "@/lib/api";

type Step = "client" | "service" | "professional" | "time";

type Cliente = { id: number; nome: string; telefone?: string | null; vip?: boolean; aniversario?: string | null };
type Servico = { id: number; nome: string; preco: number | string; duracaoMinutos?: number; ativo?: boolean };
type Profissional = { id: number; nomeExibicao: string; apelido?: string | null; ativo?: boolean; especialidade?: string | null };

export default function NovoAgendamentoScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string; encaixe?: string; profissionalId?: string; horaInicio?: string }>();
  const { barbeariaId } = useAuth();
  const qc = useQueryClient();

  const isEncaixe = params.encaixe === "1";
  const dateStr = params.date || todayStr();

  const [step, setStep] = useState<Step>("client");
  const [clientSearch, setClientSearch] = useState("");
  const [serviceSearch, setServiceSearch] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [useNewClient, setUseNewClient] = useState(false);
  const [formNome, setFormNome] = useState("");
  const [formTelefone, setFormTelefone] = useState("");
  const [formProfId, setFormProfId] = useState(params.profissionalId || "");
  const [formServId, setFormServId] = useState("");
  const [formHora, setFormHora] = useState(params.horaInicio || "");
  const [formObs, setFormObs] = useState("");
  const [extraItems, setExtraItems] = useState<{ servicoId: string; profissionalId: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const { data: clientes = [] } = useQuery<Cliente[]>({
    queryKey: ["clientes", barbeariaId, clientSearch],
    queryFn: async () => {
      if (!barbeariaId) return [];
      const url = `/barbearias/${barbeariaId}/clientes${clientSearch ? `?search=${encodeURIComponent(clientSearch)}` : ""}`;
      const data = await fetchJson<Cliente[]>(url);
      return Array.isArray(data) ? data : [];
    },
    enabled: !!barbeariaId,
  });

  const { data: servicos = [] } = useQuery<Servico[]>({
    queryKey: ["servicos", barbeariaId],
    queryFn: async () => {
      if (!barbeariaId) return [];
      const data = await fetchJson<Servico[]>(`/barbearias/${barbeariaId}/servicos`);
      return Array.isArray(data) ? data : [];
    },
    enabled: !!barbeariaId,
  });

  const { data: profissionais = [] } = useQuery<Profissional[]>({
    queryKey: ["profissionais", barbeariaId],
    queryFn: async () => {
      if (!barbeariaId) return [];
      const data = await fetchJson<Profissional[]>(`/barbearias/${barbeariaId}/profissionais`);
      return Array.isArray(data) ? data : [];
    },
    enabled: !!barbeariaId,
  });

  const filteredClients = useMemo(() => {
    const q = clientSearch.toLowerCase();
    return (clientes as Cliente[]).filter(c =>
      !q || c.nome?.toLowerCase().includes(q) || (c.telefone || "").includes(clientSearch)
    );
  }, [clientes, clientSearch]);

  const filteredServicos = useMemo(() => {
    const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return (servicos as Servico[])
      .filter(s => s.ativo !== false)
      .filter(s => !serviceSearch || norm(s.nome).includes(norm(serviceSearch)));
  }, [servicos, serviceSearch]);

  const sortedProfs = useMemo(() => {
    return (profissionais as Profissional[]).filter(p => p.ativo !== false);
  }, [profissionais]);

  const selectedServico = useMemo(() => (servicos as Servico[]).find(s => String(s.id) === formServId), [servicos, formServId]);
  const selectedProf = useMemo(() => (profissionais as Profissional[]).find(p => String(p.id) === formProfId), [profissionais, formProfId]);

  const timeSlots = useMemo(() => {
    const slots = generateTimeSlots("06:00", "23:30", 30);
    if (dateStr === todayStr() && !isEncaixe) {
      const now = new Date();
      const nowMin = now.getHours() * 60 + now.getMinutes();
      return slots.filter(t => timeToMinutes(t) > nowMin);
    }
    return slots;
  }, [dateStr, isEncaixe]);

  const handleSubmit = async () => {
    if (!formProfId || !formServId || !formHora) {
      Alert.alert("Campos obrigatórios", "Preencha serviço, profissional e horário.");
      return;
    }
    if (!formNome) {
      Alert.alert("Cliente obrigatório", "Selecione ou cadastre um cliente.");
      return;
    }
    const telDigits = stripPhone(formTelefone);
    if (!telDigits || telDigits.length < 10) {
      Alert.alert("WhatsApp obrigatório", "Informe um WhatsApp válido para o cliente.");
      setStep("client");
      setUseNewClient(true);
      return;
    }
    const validExtras = extraItems.filter(it => it.servicoId && it.profissionalId);
    if (extraItems.length > 0 && validExtras.length !== extraItems.length) {
      Alert.alert("Itens incompletos", "Preencha serviço e profissional em cada item adicional.");
      return;
    }

    setSubmitting(true);
    try {
      if (validExtras.length === 0) {
        await fetchJson(`/barbearias/${barbeariaId}/agendamentos`, {
          method: "POST",
          body: {
            clienteId: selectedClientId || undefined,
            clienteNome: formNome,
            clienteTelefone: stripPhone(formTelefone),
            profissionalId: Number(formProfId),
            servicoId: Number(formServId),
            data: dateStr,
            horaInicio: formHora,
            observacao: formObs || undefined,
            encaixe: isEncaixe || undefined,
          },
        });
      } else {
        const itens = [
          { servicoId: Number(formServId), profissionalId: Number(formProfId) },
          ...validExtras.map(it => ({ servicoId: Number(it.servicoId), profissionalId: Number(it.profissionalId) })),
        ];
        await fetchJson(`/barbearias/${barbeariaId}/atendimentos`, {
          method: "POST",
          body: {
            clienteId: selectedClientId ?? undefined,
            clienteNome: formNome,
            clienteTelefone: stripPhone(formTelefone) || null,
            data: dateStr,
            horaInicio: formHora,
            observacao: formObs || null,
            encaixe: isEncaixe || null,
            itens,
          },
        });
      }
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ["agendamentos"] });
      qc.invalidateQueries({ queryKey: ["agendamentos-pendentes-count"] });
      router.back();
    } catch (err: any) {
      Alert.alert("Erro ao agendar", err?.message || "Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const stepIndex = (["client", "service", "professional", "time"] as Step[]).indexOf(step);

  const webTopPad = Platform.OS === "web" ? 67 : insets.top + 8;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: Colors.background }}
    >
      <View style={[styles.header, { paddingTop: webTopPad }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{isEncaixe ? "Novo encaixe" : "Novo agendamento"}</Text>
          <Text style={styles.subtitle}>
            {strToDate(dateStr).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
          </Text>
        </View>
      </View>

      <View style={styles.steps}>
        {(["client", "service", "professional", "time"] as Step[]).map((s, i) => (
          <Pressable
            key={s}
            style={[
              styles.stepChip,
              step === s && styles.stepChipActive,
              i < stepIndex && styles.stepChipDone,
            ]}
            onPress={() => setStep(s)}
          >
            <Text style={[styles.stepNum, step === s && { color: "#000" }]}>{i + 1}</Text>
            <Text style={[styles.stepLabel, step === s && { color: "#000" }]}>
              {s === "client" ? "Cliente" : s === "service" ? "Serviço" : s === "professional" ? "Profissional" : "Horário"}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 120 + insets.bottom }} keyboardShouldPersistTaps="handled">
        {step === "client" && (
          <View>
            {!useNewClient ? (
              <>
                <View style={styles.searchBox}>
                  <Feather name="search" size={16} color={Colors.textMuted} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar por nome ou telefone…"
                    placeholderTextColor={Colors.textMuted}
                    value={clientSearch}
                    onChangeText={setClientSearch}
                  />
                </View>
                {filteredClients.slice(0, 30).map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.option, selectedClientId === c.id && styles.optionActive]}
                    onPress={() => {
                      const tel = (c.telefone || "").replace(/\D/g, "");
                      if (!tel || tel.length < 10) {
                        Alert.alert(
                          "WhatsApp ausente",
                          "Este cliente não possui WhatsApp cadastrado. Edite o cadastro do cliente ou cadastre como novo cliente para informar o WhatsApp.",
                        );
                        return;
                      }
                      setSelectedClientId(c.id);
                      setFormNome(c.nome);
                      setFormTelefone(formatPhone(c.telefone || ""));
                      setStep("service");
                    }}
                  >
                    <View style={styles.avatarSm}>
                      <Text style={styles.avatarSmText}>{c.nome.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.optionTitle} numberOfLines={1}>{c.nome}</Text>
                      {c.telefone && <Text style={styles.optionSub}>{formatPhone(c.telefone)}</Text>}
                    </View>
                    {c.vip && <Feather name="star" size={14} color={Colors.warning} />}
                  </TouchableOpacity>
                ))}
                {filteredClients.length === 0 && (
                  <Text style={styles.empty}>Nenhum cliente encontrado.</Text>
                )}
                <TouchableOpacity onPress={() => setUseNewClient(true)} style={styles.linkBtn}>
                  <Feather name="plus-circle" size={16} color={Colors.accent} />
                  <Text style={styles.linkText}>Novo cliente sem cadastro</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={{ gap: 12 }}>
                <View>
                  <Text style={styles.fieldLabel}>Nome do cliente *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: Mariana Silva"
                    placeholderTextColor={Colors.textMuted}
                    value={formNome}
                    onChangeText={setFormNome}
                  />
                </View>
                <View>
                  <Text style={styles.fieldLabel}>WhatsApp *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="(11) 99999-9999"
                    placeholderTextColor={Colors.textMuted}
                    value={formTelefone}
                    onChangeText={(v) => setFormTelefone(formatPhone(v))}
                    keyboardType="phone-pad"
                  />
                </View>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TouchableOpacity
                    style={[styles.btnGhost, { flex: 1 }]}
                    onPress={() => { setUseNewClient(false); setFormNome(""); setFormTelefone(""); }}
                  >
                    <Text style={styles.btnGhostText}>Voltar à lista</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.btnPrimary, { flex: 1, opacity: (!formNome || !formTelefone) ? 0.4 : 1 }]}
                    disabled={!formNome || !formTelefone}
                    onPress={() => { setSelectedClientId(null); setStep("service"); }}
                  >
                    <Text style={styles.btnPrimaryText}>Continuar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}

        {step === "service" && (
          <View>
            <View style={styles.searchBox}>
              <Feather name="search" size={16} color={Colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar serviço…"
                placeholderTextColor={Colors.textMuted}
                value={serviceSearch}
                onChangeText={setServiceSearch}
              />
            </View>
            {filteredServicos.map(s => (
              <TouchableOpacity
                key={s.id}
                style={[styles.option, formServId === String(s.id) && styles.optionActive]}
                onPress={() => { setFormServId(String(s.id)); setStep("professional"); }}
              >
                <View style={[styles.avatarSm, { backgroundColor: Colors.accent + "22" }]}>
                  <Feather name="scissors" size={16} color={Colors.accent} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.optionTitle} numberOfLines={1}>{s.nome}</Text>
                  <Text style={styles.optionSub}>{s.duracaoMinutos || 30} min</Text>
                </View>
                <Text style={styles.servicePrice}>{formatCurrency(Number(s.preco))}</Text>
              </TouchableOpacity>
            ))}
            {filteredServicos.length === 0 && (
              <Text style={styles.empty}>Nenhum serviço encontrado.</Text>
            )}
          </View>
        )}

        {step === "professional" && (
          <View>
            {sortedProfs.map(p => (
              <TouchableOpacity
                key={p.id}
                style={[styles.option, formProfId === String(p.id) && styles.optionActive]}
                onPress={() => { setFormProfId(String(p.id)); setStep("time"); }}
              >
                <View style={[styles.avatarSm, { backgroundColor: Colors.accent + "22" }]}>
                  <Text style={[styles.avatarSmText, { color: Colors.accent }]}>{p.nomeExibicao.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionTitle}>{p.nomeExibicao}</Text>
                  {p.especialidade && <Text style={styles.optionSub}>{p.especialidade}</Text>}
                </View>
              </TouchableOpacity>
            ))}
            {sortedProfs.length === 0 && (
              <Text style={styles.empty}>Nenhum profissional disponível.</Text>
            )}
          </View>
        )}

        {step === "time" && (
          <View>
            <View style={styles.summaryBox}>
              <SummaryRow label="Cliente" value={formNome} />
              {selectedServico && <SummaryRow label="Serviço" value={selectedServico.nome} />}
              {selectedProf && <SummaryRow label="Profissional" value={selectedProf.nomeExibicao} />}
            </View>

            <Text style={styles.sectionLabel}>Horário *</Text>
            <View style={styles.slotsGrid}>
              {timeSlots.map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.slot, formHora === t && styles.slotActive]}
                  onPress={() => { setFormHora(t); if (Platform.OS !== "web") Haptics.selectionAsync(); }}
                >
                  <Text style={[styles.slotText, formHora === t && { color: "#000" }]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionLabel}>Itens adicionais (atendimento conjunto)</Text>
            {extraItems.map((it, idx) => (
              <View key={idx} style={styles.extraBox}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={styles.extraTitle}>Item extra #{idx + 1}</Text>
                  <TouchableOpacity onPress={() => setExtraItems(prev => prev.filter((_, i) => i !== idx))}>
                    <Text style={styles.removeLink}>Remover</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.fieldLabel}>Serviço</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {(servicos as Servico[]).filter(s => s.ativo !== false).map(s => (
                    <TouchableOpacity
                      key={s.id}
                      style={[styles.miniChip, it.servicoId === String(s.id) && styles.miniChipActive]}
                      onPress={() => setExtraItems(prev => prev.map((p, i) => i === idx ? { ...p, servicoId: String(s.id) } : p))}
                    >
                      <Text style={[styles.miniChipText, it.servicoId === String(s.id) && { color: "#000" }]}>{s.nome}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <Text style={styles.fieldLabel}>Profissional</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {sortedProfs.map(p => (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.miniChip, it.profissionalId === String(p.id) && styles.miniChipActive]}
                      onPress={() => setExtraItems(prev => prev.map((pp, i) => i === idx ? { ...pp, profissionalId: String(p.id) } : pp))}
                    >
                      <Text style={[styles.miniChipText, it.profissionalId === String(p.id) && { color: "#000" }]}>{p.apelido || p.nomeExibicao}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ))}
            <TouchableOpacity style={styles.addItemBtn} onPress={() => setExtraItems(prev => [...prev, { servicoId: "", profissionalId: "" }])}>
              <Feather name="plus" size={16} color={Colors.accent} />
              <Text style={styles.addItemText}>Adicionar serviço extra</Text>
            </TouchableOpacity>

            <Text style={styles.sectionLabel}>Observação <Text style={{ color: Colors.textMuted }}>(opcional)</Text></Text>
            <TextInput
              style={[styles.input, { minHeight: 70, textAlignVertical: "top" }]}
              placeholder="Ex: trazer foto de referência"
              placeholderTextColor={Colors.textMuted}
              value={formObs}
              onChangeText={setFormObs}
              multiline
            />

            <TouchableOpacity
              style={[styles.btnPrimary, { marginTop: 16, opacity: (!formHora || submitting) ? 0.5 : 1 }]}
              disabled={!formHora || submitting}
              onPress={handleSubmit}
            >
              {submitting ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.btnPrimaryText}>
                  {isEncaixe
                    ? "Confirmar encaixe"
                    : extraItems.length > 0
                      ? `Confirmar atendimento conjunto (${extraItems.length + 1} itens)`
                      : "Confirmar agendamento"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}>
      <Text style={{ fontSize: 12, color: Colors.textSecondary, fontFamily: "Inter_400Regular" }}>{label}</Text>
      <Text style={{ fontSize: 12, color: Colors.text, fontFamily: "Inter_600SemiBold", maxWidth: "65%" }} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 12, paddingBottom: 8, gap: 8 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.text },
  subtitle: { fontSize: 13, color: Colors.textSecondary, fontFamily: "Inter_400Regular", marginTop: 2, textTransform: "capitalize" },
  steps: { flexDirection: "row", paddingHorizontal: 12, gap: 6, marginTop: 4, flexWrap: "wrap" },
  stepChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder },
  stepChipDone: { backgroundColor: Colors.accent + "22", borderColor: Colors.accent + "55" },
  stepChipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  stepNum: { fontSize: 11, fontFamily: "Inter_700Bold", color: Colors.textSecondary },
  stepLabel: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder, borderRadius: 12, paddingHorizontal: 12, height: 44, marginBottom: 12 },
  searchInput: { flex: 1, color: Colors.text, fontSize: 14, fontFamily: "Inter_400Regular" },
  option: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: Colors.surfaceBorder, backgroundColor: Colors.surface, marginBottom: 8 },
  optionActive: { borderColor: Colors.accent, backgroundColor: Colors.accent + "0d" },
  avatarSm: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: Colors.surfaceLight },
  avatarSmText: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.text },
  optionTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text },
  optionSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2 },
  servicePrice: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.accent },
  empty: { textAlign: "center", color: Colors.textMuted, paddingVertical: 24, fontSize: 13 },
  linkBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, marginTop: 4 },
  linkText: { color: Colors.accent, fontFamily: "Inter_600SemiBold", fontSize: 13 },
  fieldLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary, marginBottom: 6, marginTop: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: Colors.text, fontSize: 14, fontFamily: "Inter_400Regular" },
  btnPrimary: { backgroundColor: Colors.accent, borderRadius: 12, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  btnPrimaryText: { color: "#000", fontFamily: "Inter_600SemiBold", fontSize: 14 },
  btnGhost: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  btnGhostText: { color: Colors.text, fontFamily: "Inter_500Medium", fontSize: 14 },
  summaryBox: { padding: 12, borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder, marginBottom: 10 },
  sectionLabel: { fontSize: 12, fontFamily: "Inter_700Bold", color: Colors.textSecondary, marginTop: 14, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.6 },
  slotsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  slot: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: Colors.surfaceBorder, backgroundColor: Colors.surface, minWidth: 64, alignItems: "center" },
  slotActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  slotText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.text },
  extraBox: { padding: 10, borderRadius: 12, backgroundColor: Colors.surfaceLight, borderWidth: 1, borderColor: Colors.surfaceBorder, marginBottom: 10 },
  extraTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary, textTransform: "uppercase" },
  removeLink: { color: Colors.error, fontFamily: "Inter_500Medium", fontSize: 12 },
  miniChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder, marginRight: 6 },
  miniChipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  miniChipText: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.text },
  addItemBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, marginBottom: 6 },
  addItemText: { color: Colors.accent, fontFamily: "Inter_600SemiBold", fontSize: 12 },
});
