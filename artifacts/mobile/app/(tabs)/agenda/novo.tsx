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
  generateTimeSlots, timeToMinutes, addMinutesToTime, strToDate, dateToStr,
} from "@/lib/api";

type Step = "client" | "service" | "professional" | "time";

type Slot = { horaInicio: string; horaFim: string; profissionalId: number; profissionalNome: string; disponivel: boolean };

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

  const [dateStr, setDateStr] = useState<string>(params.date || todayStr());
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
  const [customTime, setCustomTime] = useState("");
  const [showCustom, setShowCustom] = useState(false);

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

  const slotsEnabled = !!barbeariaId && !!formServId && !!formProfId && step === "time";
  const { data: slotsData = [], isLoading: slotsLoading, isFetched: slotsFetched } = useQuery<Slot[]>({
    queryKey: ["slots-disponiveis", barbeariaId, dateStr, formServId, formProfId],
    queryFn: async () => {
      if (!barbeariaId || !formServId || !formProfId) return [];
      const url = `/barbearias/${barbeariaId}/slots-disponiveis?data=${dateStr}&servicoId=${formServId}&profissionalId=${formProfId}`;
      const data = await fetchJson<Slot[]>(url);
      return Array.isArray(data) ? data : [];
    },
    enabled: slotsEnabled,
  });

  const fallbackSlots = useMemo(() => {
    const slots = generateTimeSlots("06:00", "23:30", 30);
    if (dateStr === todayStr() && !isEncaixe) {
      const now = new Date();
      const nowMin = now.getHours() * 60 + now.getMinutes();
      return slots.filter(t => timeToMinutes(t) > nowMin);
    }
    return slots;
  }, [dateStr, isEncaixe]);

  const useFallback = !slotsEnabled || (!slotsFetched && slotsData.length === 0);

  const visibleSlots = useMemo(() => {
    if (useFallback) {
      return fallbackSlots.map(t => ({ horaInicio: t, disponivel: true }));
    }
    return slotsData.map(s => ({ horaInicio: s.horaInicio, disponivel: s.disponivel }));
  }, [slotsData, fallbackSlots, useFallback]);

  const isSlotAvailable = (t: string): boolean => {
    if (useFallback) return true;
    const found = slotsData.find(s => s.horaInicio === t);
    if (found) return found.disponivel;
    return false;
  };

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

    const slotInfo = !useFallback ? slotsData.find(s => s.horaInicio === formHora) : undefined;
    const isOutsideGrid = !useFallback && slotsData.length > 0 && !slotInfo;
    const isUnavailable = !!(slotInfo && !slotInfo.disponivel);
    const needsConfirm = isEncaixe || isOutsideGrid || isUnavailable;

    if (needsConfirm) {
      const motivo = isUnavailable
        ? "Este horário está ocupado, bloqueado ou fora da grade do profissional."
        : isOutsideGrid
          ? "Este horário está fora da grade padrão do profissional."
          : "Confirma o encaixe neste horário?";
      const proceed = await new Promise<boolean>((resolve) => {
        Alert.alert(
          isEncaixe ? "Confirmar encaixe" : "Confirmar horário",
          `${motivo}\n\nDeseja registrar mesmo assim como encaixe?`,
          [
            { text: "Voltar", style: "cancel", onPress: () => resolve(false) },
            { text: "Confirmar", onPress: () => resolve(true) },
          ],
        );
      });
      if (!proceed) return;
    }

    const finalEncaixe = isEncaixe || isOutsideGrid || isUnavailable;

    setSubmitting(true);
    try {
      let clienteIdToUse: number | null = selectedClientId;
      const telDigits = stripPhone(formTelefone);
      if (useNewClient && !clienteIdToUse) {
        try {
          const created = await fetchJson<{ id: number }>(`/barbearias/${barbeariaId}/clientes`, {
            method: "POST",
            body: { nome: formNome, telefone: telDigits },
          });
          if (created?.id) clienteIdToUse = created.id;
        } catch (e: any) {
          const msg = String(e?.message || "");
          if (/já existe|exists|409|duplic/i.test(msg)) {
            try {
              const existing = await fetchJson<Array<{ id: number; telefone?: string | null; nome?: string }>>(
                `/barbearias/${barbeariaId}/clientes?busca=${encodeURIComponent(telDigits || formNome)}`,
              );
              const match = Array.isArray(existing) && telDigits
                ? existing.find(c => stripPhone(c.telefone || "") === telDigits)
                : null;
              if (match?.id) clienteIdToUse = match.id;
            } catch {}
          } else {
            Alert.alert("Erro ao cadastrar cliente", msg || "Tente novamente.");
            setSubmitting(false);
            return;
          }
        }
      }

      if (validExtras.length === 0) {
        await fetchJson(`/barbearias/${barbeariaId}/agendamentos`, {
          method: "POST",
          body: {
            clienteId: clienteIdToUse || undefined,
            clienteNome: formNome,
            clienteTelefone: telDigits,
            profissionalId: Number(formProfId),
            servicoId: Number(formServId),
            data: dateStr,
            horaInicio: formHora,
            observacao: formObs || undefined,
            encaixe: finalEncaixe || undefined,
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
            clienteId: clienteIdToUse ?? undefined,
            clienteNome: formNome,
            clienteTelefone: telDigits || null,
            data: dateStr,
            horaInicio: formHora,
            observacao: formObs || null,
            encaixe: finalEncaixe || null,
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
            <Text style={styles.helperText}>
              Toque para selecionar. O primeiro vira o serviço principal e os demais entram como atendimento conjunto (você definirá o profissional de cada extra na próxima etapa).
            </Text>
            {filteredServicos.map(s => {
              const sid = String(s.id);
              const isPrimary = formServId === sid;
              const extraIdx = extraItems.findIndex(it => it.servicoId === sid);
              const isExtra = extraIdx >= 0;
              const isSelected = isPrimary || isExtra;
              const orderIdx = isPrimary ? 1 : (isExtra ? extraIdx + 2 : 0);
              return (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.option, isSelected && styles.optionActive]}
                  onPress={() => {
                    if (isPrimary) return;
                    if (isExtra) {
                      setExtraItems(prev => prev.filter(it => it.servicoId !== sid));
                      return;
                    }
                    if (!formServId) {
                      setFormServId(sid);
                    } else {
                      setExtraItems(prev => [...prev, { servicoId: sid, profissionalId: formProfId || "" }]);
                    }
                    if (Platform.OS !== "web") Haptics.selectionAsync();
                  }}
                >
                  <View style={[styles.avatarSm, { backgroundColor: Colors.accent + "22" }]}>
                    {isSelected ? (
                      <Text style={[styles.avatarSmText, { color: Colors.accent }]}>{orderIdx}</Text>
                    ) : (
                      <Feather name="scissors" size={16} color={Colors.accent} />
                    )}
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.optionTitle} numberOfLines={1}>
                      {s.nome}
                      {isPrimary ? " · principal" : isExtra ? ` · extra ${extraIdx + 1}` : ""}
                    </Text>
                    <Text style={styles.optionSub}>{s.duracaoMinutos || 30} min</Text>
                  </View>
                  <Text style={styles.servicePrice}>{formatCurrency(Number(s.preco))}</Text>
                </TouchableOpacity>
              );
            })}
            {filteredServicos.length === 0 && (
              <Text style={styles.empty}>Nenhum serviço encontrado.</Text>
            )}
            {formServId && (
              <TouchableOpacity
                style={[styles.btnPrimary, { marginTop: 16 }]}
                onPress={() => setStep("professional")}
              >
                <Text style={styles.btnPrimaryText}>
                  Continuar ({extraItems.length + 1} {extraItems.length === 0 ? "serviço" : "serviços"})
                </Text>
              </TouchableOpacity>
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
              <SummaryRow label="Data" value={strToDate(dateStr).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })} />
            </View>

            <Text style={styles.sectionLabel}>Data *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 4 }}>
              {Array.from({ length: 29 }, (_, i) => {
                const base = strToDate(dateStr);
                const d = new Date(base);
                d.setDate(base.getDate() + (i - 14));
                const dStr = dateToStr(d);
                const sel = dStr === dateStr;
                const isToday = dStr === todayStr();
                return (
                  <TouchableOpacity
                    key={dStr}
                    style={[styles.dateChip, sel && styles.dateChipActive, !sel && isToday && { borderColor: Colors.accent }]}
                    onPress={() => {
                      setDateStr(dStr);
                      setFormHora("");
                      if (Platform.OS !== "web") Haptics.selectionAsync();
                    }}
                  >
                    <Text style={[styles.dateChipWeek, sel && { color: "#000" }]}>
                      {d.toLocaleDateString("pt-BR", { weekday: "short" }).slice(0, 3)}
                    </Text>
                    <Text style={[styles.dateChipNum, sel && { color: "#000" }]}>{d.getDate()}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14, marginBottom: 4 }}>
              <Text style={styles.sectionLabel}>
                Horário * {slotsLoading ? <Text style={{ color: Colors.textMuted, fontSize: 11 }}> (carregando…)</Text> : null}
              </Text>
              <TouchableOpacity onPress={() => setShowCustom(v => !v)}>
                <Text style={styles.linkText}>{showCustom ? "Usar grade" : "Horário customizado"}</Text>
              </TouchableOpacity>
            </View>
            {showCustom ? (
              <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="HH:MM (ex: 14:30)"
                  placeholderTextColor={Colors.textMuted}
                  value={customTime}
                  onChangeText={(v) => {
                    const digits = v.replace(/[^\d]/g, "").slice(0, 4);
                    const fmt = digits.length >= 3 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;
                    setCustomTime(fmt);
                  }}
                  keyboardType="number-pad"
                />
                <TouchableOpacity
                  style={styles.btnPrimary}
                  onPress={() => {
                    if (!/^\d{2}:\d{2}$/.test(customTime)) {
                      Alert.alert("Horário inválido", "Use o formato HH:MM, ex: 14:30.");
                      return;
                    }
                    const [h, m] = customTime.split(":").map(Number);
                    if (h > 23 || m > 59) {
                      Alert.alert("Horário inválido", "Hora fora dos limites.");
                      return;
                    }
                    setFormHora(customTime);
                    if (Platform.OS !== "web") Haptics.selectionAsync();
                  }}
                >
                  <Text style={styles.btnPrimaryText}>Aplicar</Text>
                </TouchableOpacity>
              </View>
            ) : visibleSlots.length === 0 && slotsFetched && !slotsLoading ? (
              <View style={[styles.warnBox, { backgroundColor: Colors.surface, borderColor: Colors.surfaceBorder }]}>
                <Feather name="alert-circle" size={14} color={Colors.textSecondary} />
                <Text style={[styles.warnText, { color: Colors.textSecondary }]}>
                  Sem horários disponíveis para esse profissional/serviço/data. Use "Horário customizado" para registrar como encaixe.
                </Text>
              </View>
            ) : (
              <View style={styles.slotsGrid}>
                {visibleSlots.map(({ horaInicio: t, disponivel }) => {
                  const sel = formHora === t;
                  const allowSelect = isEncaixe || disponivel;
                  return (
                    <TouchableOpacity
                      key={t}
                      style={[
                        styles.slot,
                        sel && styles.slotActive,
                        !allowSelect && !sel && styles.slotDisabled,
                      ]}
                      onPress={() => {
                        if (!allowSelect && !isEncaixe) {
                          Alert.alert(
                            "Horário ocupado",
                            "Esse horário não está disponível. Use 'Horário customizado' ou ative encaixe pelo botão flutuante para sobrepor.",
                          );
                          return;
                        }
                        setFormHora(t);
                        if (Platform.OS !== "web") Haptics.selectionAsync();
                      }}
                    >
                      <Text style={[
                        styles.slotText,
                        sel && { color: "#000" },
                        !allowSelect && !sel && { color: Colors.textMuted, textDecorationLine: "line-through" },
                      ]}>{t}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
            {formHora && !useFallback && !isSlotAvailable(formHora) && (
              <View style={styles.warnBox}>
                <Feather name="alert-triangle" size={14} color={Colors.warning} />
                <Text style={styles.warnText}>
                  {slotsData.find(s => s.horaInicio === formHora)
                    ? "Horário ocupado/bloqueado — será registrado como encaixe."
                    : "Horário fora da grade — será registrado como encaixe."}
                </Text>
              </View>
            )}

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
  slotDisabled: { opacity: 0.45 },
  warnBox: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10, padding: 10, borderRadius: 10, backgroundColor: Colors.warning + "12", borderWidth: 1, borderColor: Colors.warning + "55" },
  warnText: { flex: 1, fontSize: 12, color: Colors.warning, fontFamily: "Inter_500Medium" },
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
  helperText: { fontSize: 12, color: Colors.textMuted, fontFamily: "Inter_400Regular", marginBottom: 10, lineHeight: 17 },
  dateChip: { minWidth: 52, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: Colors.surfaceBorder, backgroundColor: Colors.surface, alignItems: "center" },
  dateChipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  dateChipWeek: { fontSize: 10, color: Colors.textSecondary, fontFamily: "Inter_500Medium", textTransform: "capitalize" },
  dateChipNum: { fontSize: 16, color: Colors.text, fontFamily: "Inter_700Bold", marginTop: 2 },
});
