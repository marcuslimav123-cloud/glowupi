import React, { useState } from "react";
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
import Colors from "@/constants/colors";
import { fetchJson, formatCurrency } from "@/lib/api";

type Produto = {
  id: number;
  nome: string;
  preco: number;
  custo: number | null;
  quantidade: number;
  quantidadeMinima: number;
  codigoBarras: string | null;
  validade: string | null;
  ativo: boolean;
};

type Movimentacao = { id: number; tipo: string; quantidade: number; motivo: string; createdAt: string };

export default function ProdutosScreen() {
  const { barbeariaId } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Produto | null>(null);
  const [open, setOpen] = useState(false);
  const [movProduto, setMovProduto] = useState<Produto | null>(null);

  const q = useQuery<Produto[]>({
    queryKey: ["produtos", barbeariaId],
    queryFn: () => fetchJson(`/barbearias/${barbeariaId}/produtos`),
    enabled: !!barbeariaId,
  });

  const saveMut = useMutation({
    mutationFn: (data: Partial<Produto>) =>
      editing
        ? fetchJson(`/barbearias/${barbeariaId}/produtos/${editing.id}`, { method: "PUT", body: data })
        : fetchJson(`/barbearias/${barbeariaId}/produtos`, { method: "POST", body: data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["produtos", barbeariaId] });
      setOpen(false);
      setEditing(null);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (e: Error) => Alert.alert("Erro", e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: number) => fetchJson(`/barbearias/${barbeariaId}/produtos/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["produtos", barbeariaId] }),
  });

  const handleDelete = (p: Produto) => {
    Alert.alert("Remover produto", `Remover "${p.nome}"?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Remover", style: "destructive", onPress: () => delMut.mutate(p.id) },
    ]);
  };

  const baixoEstoque = (q.data ?? []).filter((p) => p.ativo && p.quantidade <= p.quantidadeMinima).length;

  return (
    <ScreenContainer
      title="Produtos"
      subtitle={q.data ? `${q.data.length} no estoque${baixoEstoque ? ` · ${baixoEstoque} em alerta` : ""}` : undefined}
      rightAction={{ icon: "plus", label: "Novo produto", onPress: () => { setEditing(null); setOpen(true); } }}
      refreshing={q.isFetching && !q.isLoading}
      onRefresh={() => q.refetch()}
    >
      {q.isLoading ? (
        <SkeletonList count={4} />
      ) : q.isError ? (
        <ErrorView error={q.error} onRetry={() => q.refetch()} />
      ) : (q.data ?? []).length === 0 ? (
        <EmptyState icon="package" title="Nenhum produto" description="Cadastre os produtos que você vende ou usa internamente." ctaLabel="Cadastrar produto" onCtaPress={() => { setEditing(null); setOpen(true); }} />
      ) : (
        <View>
          {baixoEstoque > 0 && (
            <View style={styles.alert}>
              <Feather name="alert-triangle" size={14} color={Colors.warning} />
              <Text style={{ color: Colors.warning, fontSize: 12, fontFamily: "Inter_600SemiBold" }}>{baixoEstoque} produto(s) com estoque baixo</Text>
            </View>
          )}
          {(q.data ?? []).map((p) => {
            const baixo = p.quantidade <= p.quantidadeMinima;
            return (
              <View key={p.id} style={[styles.card, !p.ativo && { opacity: 0.5 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{p.nome}</Text>
                  <Text style={styles.cardSub}>{formatCurrency(p.preco)}{p.custo != null ? ` · custo ${formatCurrency(p.custo)}` : ""}</Text>
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 6, alignItems: "center" }}>
                    <View style={[styles.stockBadge, baixo && styles.stockBadgeBaixo]}>
                      {baixo && <Feather name="alert-triangle" size={10} color={Colors.error} />}
                      <Text style={[styles.stockBadgeText, baixo && { color: Colors.error }]}>{p.quantidade} em estoque</Text>
                    </View>
                    <Text style={{ color: Colors.textMuted, fontSize: 11 }}>mín: {p.quantidadeMinima}</Text>
                  </View>
                </View>
                <View style={styles.rowActions}>
                  <TouchableOpacity style={styles.miniBtn} onPress={() => setMovProduto(p)}>
                    <Feather name="repeat" size={15} color={Colors.accent} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.miniBtn} onPress={() => { setEditing(p); setOpen(true); }}>
                    <Feather name="edit-2" size={15} color={Colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.miniBtn} onPress={() => handleDelete(p)}>
                    <Feather name="trash-2" size={15} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}

      <ProdutoFormModal visible={open} editing={editing} onClose={() => { setOpen(false); setEditing(null); }} onSave={(d) => saveMut.mutate(d)} saving={saveMut.isPending} />
      <MovimentacoesModal produto={movProduto} onClose={() => setMovProduto(null)} />
    </ScreenContainer>
  );
}

function ProdutoFormModal({ visible, editing, onClose, onSave, saving }: { visible: boolean; editing: Produto | null; onClose: () => void; onSave: (d: any) => void; saving: boolean }) {
  const [nome, setNome] = useState("");
  const [preco, setPreco] = useState("");
  const [custo, setCusto] = useState("");
  const [quantidade, setQuantidade] = useState("0");
  const [quantidadeMinima, setQuantidadeMinima] = useState("5");
  const [codigoBarras, setCodigoBarras] = useState("");
  const [validade, setValidade] = useState("");

  React.useEffect(() => {
    if (visible) {
      setNome(editing?.nome || "");
      setPreco(editing?.preco != null ? String(editing.preco) : "");
      setCusto(editing?.custo != null ? String(editing.custo) : "");
      setQuantidade(editing?.quantidade != null ? String(editing.quantidade) : "0");
      setQuantidadeMinima(editing?.quantidadeMinima != null ? String(editing.quantidadeMinima) : "5");
      setCodigoBarras(editing?.codigoBarras || "");
      setValidade(editing?.validade || "");
    }
  }, [visible, editing]);

  const submit = () => {
    if (!nome.trim()) { Alert.alert("Erro", "Nome obrigatório"); return; }
    const p = parseFloat(preco.replace(",", "."));
    if (!Number.isFinite(p) || p < 0) { Alert.alert("Erro", "Preço inválido"); return; }
    onSave({
      nome: nome.trim(),
      preco: p,
      custo: custo ? parseFloat(custo.replace(",", ".")) : null,
      quantidade: parseInt(quantidade) || 0,
      quantidadeMinima: parseInt(quantidadeMinima) || 0,
      codigoBarras: codigoBarras || null,
      validade: validade || null,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={styles.modalCard}>
          <View style={styles.modalHead}>
            <Text style={styles.modalTitle}>{editing ? "Editar produto" : "Novo produto"}</Text>
            <TouchableOpacity onPress={onClose}><Feather name="x" size={22} color={Colors.text} /></TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Field label="Nome *"><TextInput style={styles.input} value={nome} onChangeText={setNome} placeholder="Ex: Esmalte" placeholderTextColor={Colors.textMuted} /></Field>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}><Field label="Preço *"><TextInput style={styles.input} value={preco} onChangeText={setPreco} keyboardType="decimal-pad" placeholder="25.00" placeholderTextColor={Colors.textMuted} /></Field></View>
              <View style={{ flex: 1 }}><Field label="Custo"><TextInput style={styles.input} value={custo} onChangeText={setCusto} keyboardType="decimal-pad" placeholder="12.00" placeholderTextColor={Colors.textMuted} /></Field></View>
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}><Field label="Estoque"><TextInput style={styles.input} value={quantidade} onChangeText={setQuantidade} keyboardType="number-pad" /></Field></View>
              <View style={{ flex: 1 }}><Field label="Mínimo"><TextInput style={styles.input} value={quantidadeMinima} onChangeText={setQuantidadeMinima} keyboardType="number-pad" /></Field></View>
            </View>
            <Field label="Código de barras"><TextInput style={styles.input} value={codigoBarras} onChangeText={setCodigoBarras} placeholder="7891..." placeholderTextColor={Colors.textMuted} /></Field>
            <Field label="Validade (AAAA-MM-DD)"><TextInput style={styles.input} value={validade} onChangeText={setValidade} placeholder="2026-12-31" placeholderTextColor={Colors.textMuted} /></Field>
            <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} disabled={saving} onPress={submit}>
              {saving ? <ActivityIndicator color="#000" /> : <Text style={styles.saveBtnText}>Salvar</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function MovimentacoesModal({ produto, onClose }: { produto: Produto | null; onClose: () => void }) {
  const { barbeariaId } = useAuth();
  const qc = useQueryClient();
  const [tipo, setTipo] = useState<"entrada" | "saida">("entrada");
  const [quantidade, setQuantidade] = useState("");
  const [motivo, setMotivo] = useState("");

  const movQ = useQuery<Movimentacao[]>({
    queryKey: ["movimentacoes", barbeariaId, produto?.id],
    queryFn: () => fetchJson(`/barbearias/${barbeariaId}/produtos/${produto!.id}/movimentacoes`),
    enabled: !!produto && !!barbeariaId,
  });

  const addMut = useMutation({
    mutationFn: () => fetchJson(`/barbearias/${barbeariaId}/produtos/${produto!.id}/movimentacoes`, {
      method: "POST",
      body: { tipo, quantidade: parseInt(quantidade), motivo, barbeariaId, produtoId: produto!.id },
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["movimentacoes", barbeariaId, produto?.id] });
      qc.invalidateQueries({ queryKey: ["produtos", barbeariaId] });
      setQuantidade("");
      setMotivo("");
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (e: Error) => Alert.alert("Erro", e.message),
  });

  const submit = () => {
    const n = parseInt(quantidade);
    if (!Number.isFinite(n) || n <= 0) { Alert.alert("Erro", "Quantidade inválida"); return; }
    if (!motivo.trim()) { Alert.alert("Erro", "Informe o motivo"); return; }
    addMut.mutate();
  };

  return (
    <Modal visible={!!produto} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={[styles.modalCard, { maxHeight: "85%" }]}>
          <View style={styles.modalHead}>
            <Text style={styles.modalTitle}>Estoque · {produto?.nome}</Text>
            <TouchableOpacity onPress={onClose}><Feather name="x" size={22} color={Colors.text} /></TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.stockBox}>
              <View style={{ alignItems: "center" }}>
                <Text style={{ color: Colors.text, fontSize: 22, fontFamily: "Inter_700Bold" }}>{produto?.quantidade ?? 0}</Text>
                <Text style={{ color: Colors.textSecondary, fontSize: 11 }}>em estoque</Text>
              </View>
              <View style={{ alignItems: "center" }}>
                <Text style={{ color: Colors.textSecondary, fontSize: 18, fontFamily: "Inter_600SemiBold" }}>{produto?.quantidadeMinima ?? 0}</Text>
                <Text style={{ color: Colors.textSecondary, fontSize: 11 }}>mínimo</Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
              <TouchableOpacity onPress={() => setTipo("entrada")} style={[styles.tipoBtn, tipo === "entrada" && { borderColor: Colors.success, backgroundColor: Colors.success + "15" }]}>
                <Feather name="arrow-down-circle" size={14} color={Colors.success} />
                <Text style={{ color: Colors.text, fontSize: 12 }}>Entrada</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setTipo("saida")} style={[styles.tipoBtn, tipo === "saida" && { borderColor: Colors.error, backgroundColor: Colors.error + "15" }]}>
                <Feather name="arrow-up-circle" size={14} color={Colors.error} />
                <Text style={{ color: Colors.text, fontSize: 12 }}>Saída</Text>
              </TouchableOpacity>
            </View>
            <Field label="Quantidade"><TextInput style={styles.input} value={quantidade} onChangeText={setQuantidade} keyboardType="number-pad" placeholder="1" placeholderTextColor={Colors.textMuted} /></Field>
            <Field label="Motivo"><TextInput style={styles.input} value={motivo} onChangeText={setMotivo} placeholder="Ex: Compra fornecedor" placeholderTextColor={Colors.textMuted} /></Field>
            <TouchableOpacity style={[styles.saveBtn, addMut.isPending && { opacity: 0.6 }]} onPress={submit} disabled={addMut.isPending}>
              {addMut.isPending ? <ActivityIndicator color="#000" /> : <Text style={styles.saveBtnText}>Registrar</Text>}
            </TouchableOpacity>

            <Text style={[styles.label, { marginTop: 24 }]}>Histórico</Text>
            {movQ.isLoading ? (
              <ActivityIndicator color={Colors.accent} style={{ marginTop: 12 }} />
            ) : (movQ.data ?? []).length === 0 ? (
              <Text style={{ color: Colors.textMuted, textAlign: "center", marginTop: 12, fontSize: 13 }}>Sem movimentações</Text>
            ) : (
              (movQ.data ?? []).map((m) => (
                <View key={m.id} style={styles.movRow}>
                  <Feather name={m.tipo === "entrada" ? "arrow-down-circle" : "arrow-up-circle"} size={16} color={m.tipo === "entrada" ? Colors.success : Colors.error} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: Colors.text, fontSize: 13, fontFamily: "Inter_500Medium" }}>{m.motivo}</Text>
                    <Text style={{ color: Colors.textMuted, fontSize: 11 }}>{new Date(m.createdAt).toLocaleString("pt-BR")}</Text>
                  </View>
                  <Text style={{ color: m.tipo === "entrada" ? Colors.success : Colors.error, fontFamily: "Inter_700Bold" }}>{m.tipo === "entrada" ? "+" : "-"}{m.quantidade}</Text>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <View style={{ marginTop: 12 }}><Text style={styles.label}>{label}</Text>{children}</View>;
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: Colors.surface, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: Colors.surfaceBorder },
  cardTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text },
  cardSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  stockBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: Colors.surfaceLight },
  stockBadgeBaixo: { backgroundColor: Colors.error + "22" },
  stockBadgeText: { fontSize: 11, color: Colors.text, fontFamily: "Inter_600SemiBold" },
  alert: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 10, backgroundColor: Colors.warning + "15", borderWidth: 1, borderColor: Colors.warning + "30", marginBottom: 10 },
  rowActions: { flexDirection: "row", gap: 4 },
  miniBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: Colors.surfaceLight },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: Colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32, maxHeight: "90%", borderTopWidth: 1, borderColor: Colors.surfaceBorder },
  modalHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text },
  label: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder, borderRadius: 10, paddingHorizontal: 12, height: 44, color: Colors.text, fontSize: 14 },
  saveBtn: { marginTop: 20, backgroundColor: Colors.accent, height: 50, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  saveBtnText: { color: "#000", fontFamily: "Inter_700Bold", fontSize: 15 },
  stockBox: { flexDirection: "row", justifyContent: "space-around", padding: 14, borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder, marginTop: 10 },
  tipoBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: Colors.surfaceBorder, backgroundColor: Colors.surface },
  movRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 10, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder, marginTop: 6 },
});
