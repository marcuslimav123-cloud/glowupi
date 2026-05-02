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
import { fetchJson } from "@/lib/api";

type Filial = {
  id: number;
  nome: string;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  telefone: string | null;
  ativo: boolean;
};

type FiliaisRes = { eligible: boolean; filiais: Filial[] };

export default function FiliaisScreen() {
  const { barbeariaId } = useAuth();
  const qc = useQueryClient();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [editing, setEditing] = useState<Filial | null>(null);
  const [open, setOpen] = useState(false);

  const q = useQuery<FiliaisRes>({
    queryKey: ["filiais", barbeariaId],
    queryFn: () => fetchJson(`/barbearias/${barbeariaId}/filiais`),
    enabled: !!barbeariaId,
  });

  const saveMut = useMutation({
    mutationFn: (data: Partial<Filial>) =>
      editing
        ? fetchJson(`/barbearias/${barbeariaId}/filiais/${editing.id}`, { method: "PUT", body: data })
        : fetchJson(`/barbearias/${barbeariaId}/filiais`, { method: "POST", body: data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["filiais", barbeariaId] });
      setOpen(false);
      setEditing(null);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (e: Error) => Alert.alert("Erro", e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: number) => fetchJson(`/barbearias/${barbeariaId}/filiais/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["filiais", barbeariaId] }),
  });

  const handleDelete = (f: Filial) => {
    Alert.alert("Remover filial", `Remover "${f.nome}"?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Remover", style: "destructive", onPress: () => delMut.mutate(f.id) },
    ]);
  };

  const eligible = q.data?.eligible ?? false;
  const filiais = (q.data?.filiais ?? []).filter((f) => f.ativo);

  return (
    <ScreenContainer
      title="Filiais"
      subtitle={eligible ? `${filiais.length} ativa(s)` : "Recurso premium"}
      rightAction={eligible ? { icon: "plus", label: "Nova filial", onPress: () => { setEditing(null); setOpen(true); } } : undefined}
      refreshing={q.isFetching && !q.isLoading}
      onRefresh={() => q.refetch()}
    >
      {q.isLoading ? (
        <SkeletonList count={3} />
      ) : q.isError ? (
        <ErrorView error={q.error} onRetry={() => q.refetch()} />
      ) : !eligible ? (
        <EmptyState
          icon="lock"
          title="Recurso indisponível no seu plano"
          description="Suporte a filiais está disponível nos planos '6 a 15 Profissionais' e '+15 Profissionais'."
        />
      ) : filiais.length === 0 ? (
        <EmptyState icon="map-pin" title="Nenhuma filial" description="Cadastre filiais para que clientes possam escolher a unidade ao agendar." ctaLabel="Criar filial" onCtaPress={() => { setEditing(null); setOpen(true); }} />
      ) : (
        <View>
          {filiais.map((f) => (
            <View key={f.id} style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{f.nome}</Text>
                <Text style={styles.cardSub}>{[f.logradouro, f.numero, f.bairro, f.cidade, f.uf].filter(Boolean).join(", ") || "Endereço não informado"}</Text>
                {f.telefone && <Text style={styles.cardSub}><Feather name="phone" size={11} color={colors.textMuted} /> {f.telefone}</Text>}
              </View>
              <View style={styles.rowActions}>
                <TouchableOpacity style={styles.miniBtn} onPress={() => { setEditing(f); setOpen(true); }}>
                  <Feather name="edit-2" size={15} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.miniBtn} onPress={() => handleDelete(f)}>
                  <Feather name="trash-2" size={15} color={colors.error} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      <FilialFormModal visible={open} editing={editing} onClose={() => { setOpen(false); setEditing(null); }} onSave={(d) => saveMut.mutate(d)} saving={saveMut.isPending} />
    </ScreenContainer>
  );
}

function FilialFormModal({ visible, editing, onClose, onSave, saving }: { visible: boolean; editing: Filial | null; onClose: () => void; onSave: (d: Partial<Filial>) => void; saving: boolean }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [nome, setNome] = useState("");
  const [cep, setCep] = useState("");
  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");
  const [telefone, setTelefone] = useState("");

  React.useEffect(() => {
    if (visible) {
      setNome(editing?.nome || "");
      setCep(editing?.cep || "");
      setLogradouro(editing?.logradouro || "");
      setNumero(editing?.numero || "");
      setBairro(editing?.bairro || "");
      setCidade(editing?.cidade || "");
      setUf(editing?.uf || "");
      setTelefone(editing?.telefone || "");
    }
  }, [visible, editing]);

  const submit = () => {
    if (!nome.trim()) { Alert.alert("Erro", "Nome obrigatório"); return; }
    onSave({ nome: nome.trim(), cep, logradouro, numero, bairro, cidade, uf, telefone });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={styles.modalCard}>
          <View style={styles.modalHead}>
            <Text style={styles.modalTitle}>{editing ? "Editar filial" : "Nova filial"}</Text>
            <TouchableOpacity onPress={onClose}><Feather name="x" size={22} color={colors.text} /></TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Field label="Nome *"><TextInput style={styles.input} value={nome} onChangeText={setNome} placeholder="Unidade Centro" placeholderTextColor={colors.textMuted} /></Field>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}><Field label="CEP"><TextInput style={styles.input} value={cep} onChangeText={setCep} placeholder="00000-000" placeholderTextColor={colors.textMuted} keyboardType="number-pad" /></Field></View>
              <View style={{ flex: 1 }}><Field label="Telefone"><TextInput style={styles.input} value={telefone} onChangeText={setTelefone} placeholder="(00) 00000-0000" placeholderTextColor={colors.textMuted} keyboardType="phone-pad" /></Field></View>
            </View>
            <Field label="Logradouro"><TextInput style={styles.input} value={logradouro} onChangeText={setLogradouro} placeholderTextColor={colors.textMuted} /></Field>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}><Field label="Número"><TextInput style={styles.input} value={numero} onChangeText={setNumero} placeholderTextColor={colors.textMuted} /></Field></View>
              <View style={{ flex: 2 }}><Field label="Bairro"><TextInput style={styles.input} value={bairro} onChangeText={setBairro} placeholderTextColor={colors.textMuted} /></Field></View>
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 2 }}><Field label="Cidade"><TextInput style={styles.input} value={cidade} onChangeText={setCidade} placeholderTextColor={colors.textMuted} /></Field></View>
              <View style={{ flex: 1 }}><Field label="UF"><TextInput style={styles.input} value={uf} onChangeText={(t) => setUf(t.toUpperCase().slice(0, 2))} maxLength={2} placeholderTextColor={colors.textMuted} /></Field></View>
            </View>
            <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} disabled={saving} onPress={submit}>
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
  card: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: c.surface, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: c.surfaceBorder },
  cardTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: c.text },
  cardSub: { fontSize: 12, color: c.textSecondary, marginTop: 4 },
  rowActions: { flexDirection: "row", gap: 4 },
  miniBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: c.surfaceLight },
  modalBackdrop: { flex: 1, backgroundColor: c.overlay, justifyContent: "flex-end" },
  modalCard: { backgroundColor: c.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32, maxHeight: "90%", borderTopWidth: 1, borderColor: c.surfaceBorder },
  modalHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: c.text },
  label: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: c.textSecondary, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.surfaceBorder, borderRadius: 10, paddingHorizontal: 12, height: 44, color: c.text, fontSize: 14 },
  saveBtn: { marginTop: 20, backgroundColor: c.accent, height: 50, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  saveBtnText: { color: c.invertedText, fontFamily: "Inter_700Bold", fontSize: 15 },
});
