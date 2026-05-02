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
import { fetchJson, formatCurrency } from "@/lib/api";

type Servico = {
  id: number;
  nome: string;
  descricao: string | null;
  preco: number;
  duracaoMinutos: number;
  ativo: boolean;
  comissaoPorcentagem: number | null;
  disponivelOnline: boolean;
  fidelidadeAtiva: boolean;
};

export default function ServicosScreen() {
  const { barbeariaId } = useAuth();
  const qc = useQueryClient();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [editing, setEditing] = useState<Servico | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const q = useQuery<Servico[]>({
    queryKey: ["servicos", barbeariaId],
    queryFn: () => fetchJson(`/barbearias/${barbeariaId}/servicos`),
    enabled: !!barbeariaId,
  });

  const saveMut = useMutation({
    mutationFn: (data: Partial<Servico>) => {
      if (editing) {
        return fetchJson(`/barbearias/${barbeariaId}/servicos/${editing.id}`, { method: "PUT", body: data });
      }
      return fetchJson(`/barbearias/${barbeariaId}/servicos`, { method: "POST", body: data });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["servicos", barbeariaId] });
      setModalOpen(false);
      setEditing(null);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (e: Error) => Alert.alert("Erro", e.message),
  });

  const toggleMut = useMutation({
    mutationFn: (s: Servico) =>
      fetchJson(`/barbearias/${barbeariaId}/servicos/${s.id}`, { method: "PUT", body: { ativo: !s.ativo } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["servicos", barbeariaId] }),
  });

  const delMut = useMutation({
    mutationFn: (id: number) => fetchJson(`/barbearias/${barbeariaId}/servicos/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["servicos", barbeariaId] }),
  });

  const handleDelete = (s: Servico) => {
    Alert.alert("Remover serviço", `Remover "${s.nome}"?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Remover", style: "destructive", onPress: () => delMut.mutate(s.id) },
    ]);
  };

  return (
    <ScreenContainer
      title="Serviços"
      subtitle={q.data ? `${q.data.length} cadastrado(s)` : undefined}
      rightAction={{ icon: "plus", label: "Novo serviço", onPress: () => { setEditing(null); setModalOpen(true); } }}
      refreshing={q.isFetching && !q.isLoading}
      onRefresh={() => q.refetch()}
    >
      {q.isLoading ? (
        <SkeletonList count={4} />
      ) : q.isError ? (
        <ErrorView error={q.error} onRetry={() => q.refetch()} />
      ) : (q.data ?? []).length === 0 ? (
        <EmptyState icon="settings" title="Nenhum serviço" description="Cadastre seus serviços para começar a agendar." ctaLabel="Criar serviço" onCtaPress={() => { setEditing(null); setModalOpen(true); }} />
      ) : (
        <View>
          {(q.data ?? []).map((s) => (
            <View key={s.id} style={[styles.card, !s.ativo && { opacity: 0.5 }]}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={styles.cardTitle}>{s.nome}</Text>
                  {!s.ativo && <Text style={styles.tagMuted}>inativo</Text>}
                </View>
                <Text style={styles.cardSub}>{formatCurrency(s.preco)} · {s.duracaoMinutos} min{s.comissaoPorcentagem != null ? ` · ${s.comissaoPorcentagem}%` : ""}</Text>
                {s.descricao && <Text style={styles.cardDesc} numberOfLines={2}>{s.descricao}</Text>}
              </View>
              <View style={styles.rowActions}>
                <TouchableOpacity style={styles.miniBtn} onPress={() => toggleMut.mutate(s)}>
                  <Feather name={s.ativo ? "toggle-right" : "toggle-left"} size={20} color={s.ativo ? colors.success : colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.miniBtn} onPress={() => { setEditing(s); setModalOpen(true); }}>
                  <Feather name="edit-2" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.miniBtn} onPress={() => handleDelete(s)}>
                  <Feather name="trash-2" size={16} color={colors.error} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      <ServicoFormModal
        visible={modalOpen}
        editing={editing}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSave={(d) => saveMut.mutate(d)}
        saving={saveMut.isPending}
      />
    </ScreenContainer>
  );
}

function ServicoFormModal({ visible, editing, onClose, onSave, saving }: { visible: boolean; editing: Servico | null; onClose: () => void; onSave: (d: any) => void; saving: boolean }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [preco, setPreco] = useState("");
  const [duracao, setDuracao] = useState("30");
  const [comissao, setComissao] = useState("");
  const [disponivelOnline, setDisponivelOnline] = useState(true);
  const [fidelidadeAtiva, setFidelidadeAtiva] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setNome(editing?.nome || "");
      setDescricao(editing?.descricao || "");
      setPreco(editing?.preco != null ? String(editing.preco) : "");
      setDuracao(editing?.duracaoMinutos != null ? String(editing.duracaoMinutos) : "30");
      setComissao(editing?.comissaoPorcentagem != null ? String(editing.comissaoPorcentagem) : "");
      setDisponivelOnline(editing?.disponivelOnline ?? true);
      setFidelidadeAtiva(editing?.fidelidadeAtiva ?? false);
    }
  }, [visible, editing]);

  const handleSubmit = () => {
    if (!nome.trim()) { Alert.alert("Erro", "Nome obrigatório"); return; }
    const p = parseFloat(preco.replace(",", "."));
    if (!Number.isFinite(p) || p < 0) { Alert.alert("Erro", "Preço inválido"); return; }
    onSave({
      nome: nome.trim(),
      descricao: descricao || null,
      preco: p,
      duracaoMinutos: parseInt(duracao) || 30,
      comissaoPorcentagem: comissao ? parseFloat(comissao.replace(",", ".")) : null,
      disponivelOnline,
      fidelidadeAtiva,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={styles.modalCard}>
          <View style={styles.modalHead}>
            <Text style={styles.modalTitle}>{editing ? "Editar serviço" : "Novo serviço"}</Text>
            <TouchableOpacity onPress={onClose}><Feather name="x" size={22} color={colors.text} /></TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Field label="Nome *"><TextInput style={styles.input} value={nome} onChangeText={setNome} placeholderTextColor={colors.textMuted} placeholder="Ex: Corte feminino" /></Field>
            <Field label="Descrição"><TextInput style={[styles.input, { height: 60, textAlignVertical: "top" }]} value={descricao} onChangeText={setDescricao} multiline placeholderTextColor={colors.textMuted} /></Field>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Field label="Preço (R$) *"><TextInput style={styles.input} value={preco} onChangeText={setPreco} keyboardType="decimal-pad" placeholder="35.00" placeholderTextColor={colors.textMuted} /></Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Duração (min)"><TextInput style={styles.input} value={duracao} onChangeText={setDuracao} keyboardType="number-pad" /></Field>
              </View>
            </View>
            <Field label="Comissão (%)"><TextInput style={styles.input} value={comissao} onChangeText={setComissao} keyboardType="decimal-pad" placeholder="30" placeholderTextColor={colors.textMuted} /></Field>
            <SwitchRow label="Disponível para agendamento online" value={disponivelOnline} onChange={setDisponivelOnline} />
            <SwitchRow label="Incluir no programa de fidelidade" value={fidelidadeAtiva} onChange={setFidelidadeAtiva} />
            <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} disabled={saving} onPress={handleSubmit}>
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
function SwitchRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.switchRow}>
      <Text style={{ color: colors.text, flex: 1, fontSize: 13 }}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.accent, false: colors.surfaceLight }} thumbColor={value ? "#000" : "#fff"} />
    </View>
  );
}

const makeStyles = (c: ColorPalette) => StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: c.surface, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: c.surfaceBorder },
  cardTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: c.text },
  cardSub: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
  cardDesc: { fontSize: 12, color: c.textMuted, marginTop: 4 },
  tagMuted: { fontSize: 10, color: c.textMuted, fontFamily: "Inter_700Bold", textTransform: "uppercase" },
  rowActions: { flexDirection: "row", gap: 4 },
  miniBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: c.surfaceLight },
  modalBackdrop: { flex: 1, backgroundColor: c.overlay, justifyContent: "flex-end" },
  modalCard: { backgroundColor: c.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32, maxHeight: "90%", borderTopWidth: 1, borderColor: c.surfaceBorder },
  modalHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: c.text },
  label: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: c.textSecondary, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.surfaceBorder, borderRadius: 10, paddingHorizontal: 12, height: 44, color: c.text, fontSize: 14 },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 16, padding: 12, borderRadius: 10, backgroundColor: c.surface, borderWidth: 1, borderColor: c.surfaceBorder },
  saveBtn: { marginTop: 20, backgroundColor: c.accent, height: 50, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  saveBtnText: { color: c.invertedText, fontFamily: "Inter_700Bold", fontSize: 15 },
});
