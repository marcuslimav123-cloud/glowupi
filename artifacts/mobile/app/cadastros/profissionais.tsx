import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Switch,
  Alert,
  Image,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/ScreenContainer";
import { EmptyState } from "@/components/EmptyState";
import { ErrorView } from "@/components/ErrorView";
import { SkeletonList } from "@/components/Skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useColors, type ColorPalette } from "@/lib/theme";
import { fetchJson, formatPhone, stripPhone } from "@/lib/api";
import { pickImageFromLibrary, pickImageFromCamera, uploadPickedImage, resolveImageUrl } from "@/lib/uploadImage";

type Servico = { id: number; nome: string; preco: number; duracaoMinutos: number };

type DiaHorario = { inicio: string; fim: string; folga: boolean };
type Horarios = Record<string, DiaHorario>;

type Profissional = {
  id: number;
  nomeExibicao: string;
  apelido: string | null;
  fotoUrl: string | null;
  comissaoTipo: string;
  comissaoValor: number;
  especialidade: string | null;
  celular: string | null;
  ativo: boolean;
  horarios: Horarios | null;
  servicoIds: number[];
};

const DIAS = [
  { key: "segunda", label: "Seg" },
  { key: "terca", label: "Ter" },
  { key: "quarta", label: "Qua" },
  { key: "quinta", label: "Qui" },
  { key: "sexta", label: "Sex" },
  { key: "sabado", label: "Sáb" },
  { key: "domingo", label: "Dom" },
];

const DEFAULT_HORARIO: DiaHorario = { inicio: "09:00", fim: "18:00", folga: false };

export default function ProfissionaisScreen() {
  const { barbeariaId } = useAuth();
  const qc = useQueryClient();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [editing, setEditing] = useState<Profissional | null>(null);
  const [open, setOpen] = useState(false);

  const q = useQuery<Profissional[]>({
    queryKey: ["profissionais", barbeariaId],
    queryFn: () => fetchJson(`/barbearias/${barbeariaId}/profissionais`),
    enabled: !!barbeariaId,
  });

  const servicosQ = useQuery<Servico[]>({
    queryKey: ["servicos", barbeariaId],
    queryFn: () => fetchJson(`/barbearias/${barbeariaId}/servicos`),
    enabled: !!barbeariaId,
  });

  const saveMut = useMutation({
    mutationFn: (data: any) =>
      editing
        ? fetchJson(`/barbearias/${barbeariaId}/profissionais/${editing.id}`, { method: "PUT", body: data })
        : fetchJson(`/barbearias/${barbeariaId}/profissionais`, { method: "POST", body: data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profissionais", barbeariaId] });
      setOpen(false);
      setEditing(null);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (e: Error) => Alert.alert("Erro", e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: number) => fetchJson(`/barbearias/${barbeariaId}/profissionais/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profissionais", barbeariaId] }),
  });

  const handleDelete = (p: Profissional) => {
    Alert.alert("Remover profissional", `Remover "${p.nomeExibicao}"?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Remover", style: "destructive", onPress: () => delMut.mutate(p.id) },
    ]);
  };

  return (
    <ScreenContainer
      title="Profissionais"
      subtitle={q.data ? `${q.data.length} cadastrado(s)` : undefined}
      rightAction={{ icon: "plus", label: "Novo profissional", onPress: () => { setEditing(null); setOpen(true); } }}
      refreshing={q.isFetching && !q.isLoading}
      onRefresh={() => q.refetch()}
    >
      {q.isLoading ? (
        <SkeletonList count={4} variant="row" />
      ) : q.isError ? (
        <ErrorView error={q.error} onRetry={() => q.refetch()} />
      ) : (q.data ?? []).length === 0 ? (
        <EmptyState icon="user-check" title="Nenhum profissional" description="Cadastre sua equipe para começar a agendar atendimentos." ctaLabel="Cadastrar profissional" onCtaPress={() => { setEditing(null); setOpen(true); }} />
      ) : (
        <View>
          {(q.data ?? []).map((p) => (
            <View key={p.id} style={[styles.card, !p.ativo && { opacity: 0.5 }]}>
              {p.fotoUrl ? (
                <Image source={{ uri: resolveImageUrl(p.fotoUrl) || "" }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarText}>{p.nomeExibicao.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{p.nomeExibicao}</Text>
                {p.especialidade && <Text style={styles.cardSub}>{p.especialidade}</Text>}
                <Text style={styles.cardSub}>
                  Comissão: {p.comissaoTipo === "percentual" ? `${p.comissaoValor}%` : `R$ ${p.comissaoValor.toFixed(2)}`}
                  {p.servicoIds?.length ? ` · ${p.servicoIds.length} serviço(s)` : ""}
                </Text>
              </View>
              <View style={styles.rowActions}>
                <TouchableOpacity style={styles.miniBtn} onPress={() => { setEditing(p); setOpen(true); }}>
                  <Feather name="edit-2" size={15} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.miniBtn} onPress={() => handleDelete(p)}>
                  <Feather name="trash-2" size={15} color={colors.error} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      <ProfFormModal
        visible={open}
        editing={editing}
        servicos={servicosQ.data ?? []}
        onClose={() => { setOpen(false); setEditing(null); }}
        onSave={(d) => saveMut.mutate(d)}
        saving={saveMut.isPending}
      />
    </ScreenContainer>
  );
}

function ProfFormModal({ visible, editing, servicos, onClose, onSave, saving }: { visible: boolean; editing: Profissional | null; servicos: Servico[]; onClose: () => void; onSave: (d: any) => void; saving: boolean }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [nome, setNome] = useState("");
  const [apelido, setApelido] = useState("");
  const [especialidade, setEspecialidade] = useState("");
  const [celular, setCelular] = useState("");
  const [comissaoTipo, setComissaoTipo] = useState<"percentual" | "valor_fixo">("percentual");
  const [comissaoValor, setComissaoValor] = useState("");
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [horarios, setHorarios] = useState<Horarios>(() => Object.fromEntries(DIAS.map((d) => [d.key, { ...DEFAULT_HORARIO }])));
  const [servicoIds, setServicoIds] = useState<Set<number>>(new Set());

  React.useEffect(() => {
    if (!visible) return;
    setNome(editing?.nomeExibicao || "");
    setApelido(editing?.apelido || "");
    setEspecialidade(editing?.especialidade || "");
    setCelular(formatPhone(editing?.celular || ""));
    setComissaoTipo((editing?.comissaoTipo as any) || "percentual");
    setComissaoValor(editing?.comissaoValor != null ? String(editing.comissaoValor) : "");
    setFotoUrl(editing?.fotoUrl || null);
    if (editing?.horarios) {
      const h: Horarios = {};
      DIAS.forEach((d) => {
        h[d.key] = editing.horarios?.[d.key] || { ...DEFAULT_HORARIO };
      });
      setHorarios(h);
    } else {
      setHorarios(Object.fromEntries(DIAS.map((d) => [d.key, { ...DEFAULT_HORARIO }])));
    }
    setServicoIds(new Set(editing?.servicoIds || []));
  }, [visible, editing]);

  const handlePickImage = async () => {
    Alert.alert("Foto do profissional", "Selecione uma origem", [
      { text: "Câmera", onPress: () => doPick("camera") },
      { text: "Galeria", onPress: () => doPick("library") },
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  const doPick = async (source: "camera" | "library") => {
    try {
      setUploading(true);
      const picked = source === "camera" ? await pickImageFromCamera() : await pickImageFromLibrary();
      if (!picked) return;
      const path = await uploadPickedImage(picked);
      setFotoUrl(path);
    } catch (e: any) {
      Alert.alert("Erro", e.message || "Falha ao enviar imagem");
    } finally {
      setUploading(false);
    }
  };

  const submit = () => {
    if (!nome.trim()) { Alert.alert("Erro", "Nome obrigatório"); return; }
    const v = comissaoValor ? parseFloat(comissaoValor.replace(",", ".")) : 0;
    if (!Number.isFinite(v) || v < 0) { Alert.alert("Erro", "Comissão inválida"); return; }
    onSave({
      nomeExibicao: nome.trim(),
      apelido: apelido || null,
      especialidade: especialidade || null,
      celular: stripPhone(celular) || null,
      comissaoTipo,
      comissaoValor: v,
      fotoUrl,
      horarios,
      servicoIds: Array.from(servicoIds),
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={styles.modalCard}>
          <View style={styles.modalHead}>
            <Text style={styles.modalTitle}>{editing ? "Editar profissional" : "Novo profissional"}</Text>
            <TouchableOpacity onPress={onClose}><Feather name="x" size={22} color={colors.text} /></TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={{ alignItems: "center", marginVertical: 8 }}>
              <TouchableOpacity onPress={handlePickImage} disabled={uploading} style={styles.photoTouch}>
                {uploading ? (
                  <ActivityIndicator color={colors.accent} />
                ) : fotoUrl ? (
                  <Image source={{ uri: resolveImageUrl(fotoUrl) || "" }} style={styles.photoPreview} />
                ) : (
                  <Feather name="camera" size={28} color={colors.textSecondary} />
                )}
              </TouchableOpacity>
              <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 6 }}>Toque para alterar foto</Text>
            </View>

            <Field label="Nome *"><TextInput style={styles.input} value={nome} onChangeText={setNome} placeholder="Ex: Mariana Silva" placeholderTextColor={colors.textMuted} /></Field>
            <Field label="Apelido"><TextInput style={styles.input} value={apelido} onChangeText={setApelido} placeholder="Mari" placeholderTextColor={colors.textMuted} /></Field>
            <Field label="Especialidade"><TextInput style={styles.input} value={especialidade} onChangeText={setEspecialidade} placeholder="Ex: Manicure" placeholderTextColor={colors.textMuted} /></Field>
            <Field label="Celular"><TextInput style={styles.input} value={celular} onChangeText={(t) => setCelular(formatPhone(t))} keyboardType="phone-pad" placeholderTextColor={colors.textMuted} /></Field>

            <Text style={[styles.label, { marginTop: 18 }]}>Comissão</Text>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
              <TouchableOpacity onPress={() => setComissaoTipo("percentual")} style={[styles.choice, comissaoTipo === "percentual" && styles.choiceActive]}>
                <Text style={[styles.choiceText, comissaoTipo === "percentual" && styles.choiceTextActive]}>Percentual</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setComissaoTipo("valor_fixo")} style={[styles.choice, comissaoTipo === "valor_fixo" && styles.choiceActive]}>
                <Text style={[styles.choiceText, comissaoTipo === "valor_fixo" && styles.choiceTextActive]}>Valor fixo</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.input, { marginTop: 8 }]}
              value={comissaoValor}
              onChangeText={setComissaoValor}
              keyboardType="decimal-pad"
              placeholder={comissaoTipo === "percentual" ? "30 (%)" : "50.00 (R$)"}
              placeholderTextColor={colors.textMuted}
            />

            <Text style={[styles.label, { marginTop: 18 }]}>Horários por dia</Text>
            <View style={{ marginTop: 6 }}>
              {DIAS.map((d) => {
                const h = horarios[d.key] || DEFAULT_HORARIO;
                return (
                  <View key={d.key} style={styles.diaRow}>
                    <Text style={{ color: colors.text, width: 42, fontFamily: "Inter_600SemiBold" }}>{d.label}</Text>
                    {h.folga ? (
                      <Text style={{ color: colors.textMuted, flex: 1, fontStyle: "italic" }}>Folga</Text>
                    ) : (
                      <>
                        <TextInput
                          style={styles.timeInput}
                          value={h.inicio}
                          onChangeText={(t) => setHorarios({ ...horarios, [d.key]: { ...h, inicio: t } })}
                          placeholder="09:00"
                          placeholderTextColor={colors.textMuted}
                        />
                        <Text style={{ color: colors.textMuted, marginHorizontal: 4 }}>—</Text>
                        <TextInput
                          style={styles.timeInput}
                          value={h.fim}
                          onChangeText={(t) => setHorarios({ ...horarios, [d.key]: { ...h, fim: t } })}
                          placeholder="18:00"
                          placeholderTextColor={colors.textMuted}
                        />
                      </>
                    )}
                    <Switch
                      value={!h.folga}
                      onValueChange={(v) => setHorarios({ ...horarios, [d.key]: { ...h, folga: !v } })}
                      trackColor={{ true: colors.accent, false: colors.surfaceLight }}
                      thumbColor={!h.folga ? "#000" : "#fff"}
                    />
                  </View>
                );
              })}
            </View>

            <Text style={[styles.label, { marginTop: 18 }]}>Serviços vinculados</Text>
            {servicos.length === 0 ? (
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 8 }}>Nenhum serviço cadastrado.</Text>
            ) : (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                {servicos.map((s) => {
                  const checked = servicoIds.has(s.id);
                  return (
                    <TouchableOpacity
                      key={s.id}
                      onPress={() => {
                        const next = new Set(servicoIds);
                        if (checked) next.delete(s.id); else next.add(s.id);
                        setServicoIds(next);
                      }}
                      style={[styles.chip, checked && styles.chipActive]}
                    >
                      {checked && <Feather name="check" size={12} color={colors.invertedText} />}
                      <Text style={[styles.chipText, checked && styles.chipTextActive]}>{s.nome}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} disabled={saving || uploading} onPress={submit}>
              {saving ? <ActivityIndicator color={colors.invertedText} /> : <Text style={styles.saveBtnText}>Salvar</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return <View style={{ marginTop: 12 }}><Text style={styles.label}>{label}</Text>{children}</View>;
}

const makeStyles = (c: ColorPalette) => StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: c.surface, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: c.surfaceBorder },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.surfaceLight },
  avatarPlaceholder: { alignItems: "center", justifyContent: "center", backgroundColor: c.accent + "22" },
  avatarText: { color: c.accent, fontFamily: "Inter_700Bold" },
  cardTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: c.text },
  cardSub: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
  rowActions: { flexDirection: "row", gap: 4 },
  miniBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: c.surfaceLight },
  modalBackdrop: { flex: 1, backgroundColor: c.overlay, justifyContent: "flex-end" },
  modalCard: { backgroundColor: c.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32, maxHeight: "92%", borderTopWidth: 1, borderColor: c.surfaceBorder },
  modalHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: c.text },
  label: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: c.textSecondary, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.surfaceBorder, borderRadius: 10, paddingHorizontal: 12, height: 44, color: c.text, fontSize: 14 },
  saveBtn: { marginTop: 24, backgroundColor: c.accent, height: 50, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  saveBtnText: { color: c.invertedText, fontFamily: "Inter_700Bold", fontSize: 15 },
  photoTouch: { width: 90, height: 90, borderRadius: 45, backgroundColor: c.surface, borderWidth: 2, borderColor: c.surfaceBorder, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  photoPreview: { width: "100%", height: "100%" },
  choice: { flex: 1, padding: 10, borderRadius: 10, alignItems: "center", borderWidth: 1, borderColor: c.surfaceBorder, backgroundColor: c.surface },
  choiceActive: { borderColor: c.accent, backgroundColor: c.accent + "15" },
  choiceText: { color: c.textSecondary, fontSize: 13, fontFamily: "Inter_500Medium" },
  choiceTextActive: { color: c.accent, fontFamily: "Inter_600SemiBold" },
  diaRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: c.surfaceBorder },
  timeInput: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.surfaceBorder, borderRadius: 8, paddingHorizontal: 8, height: 36, color: c.text, width: 64, textAlign: "center", fontSize: 13 },
  chip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, borderWidth: 1, borderColor: c.surfaceBorder, backgroundColor: c.surface },
  chipActive: { backgroundColor: c.accent, borderColor: c.accent },
  chipText: { color: c.textSecondary, fontSize: 12, fontFamily: "Inter_500Medium" },
  chipTextActive: { color: c.invertedText, fontFamily: "Inter_700Bold" },
});
