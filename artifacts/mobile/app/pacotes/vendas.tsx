import React, { useMemo, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useColors, type ColorPalette } from "@/lib/theme";
import { ScreenContainer } from "@/components/ScreenContainer";
import { EmptyState } from "@/components/EmptyState";
import { ErrorView } from "@/components/ErrorView";
import { SkeletonList } from "@/components/Skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { fetchJson, getErrorMessage } from "@/lib/api";

type Pacote = {
  id: number;
  nome: string;
  preco: number | string;
  sessoesTotal?: number | null;
};

type Venda = {
  id: number;
  pacoteId: number;
  pacoteNome?: string | null;
  clienteNome?: string | null;
  status?: string;
  dataCompra?: string | null;
  dataValidade?: string | null;
  dataExpiracao?: string | null;
  sessoesTotal?: number;
  sessoesUsadas?: number;
  sessoesRestantes?: number;
};

function formatBRL(v: number | string | null | undefined) {
  const n = typeof v === "string" ? Number(v) : (v ?? 0);
  return `R$ ${(isNaN(n) ? 0 : n).toFixed(2).replace(".", ",")}`;
}

function formatDate(s?: string | null) {
  if (!s) return null;
  try { return new Date(s).toLocaleDateString("pt-BR"); } catch { return null; }
}

export default function PacotesVendasScreen() {
  const { barbeariaId, user } = useAuth();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const qc = useQueryClient();
  const canManage = user?.role === "dono" || user?.role === "gerente";

  const [vendaModal, setVendaModal] = useState(false);
  const [pacoteSel, setPacoteSel] = useState<number | null>(null);
  const [clienteNome, setClienteNome] = useState("");

  const pacotesQ = useQuery<Pacote[]>({
    queryKey: ["pacotes", barbeariaId],
    queryFn: async () => {
      if (!barbeariaId) return [];
      const raw = await fetchJson<unknown>(`/barbearias/${barbeariaId}/pacotes`);
      return Array.isArray(raw) ? (raw as Pacote[]) : [];
    },
    enabled: !!barbeariaId,
  });

  const vendasQ = useQuery<Venda[]>({
    queryKey: ["pacotes-cliente", barbeariaId],
    queryFn: async () => {
      if (!barbeariaId) return [];
      const raw = await fetchJson<unknown>(`/barbearias/${barbeariaId}/pacotes-cliente`);
      return Array.isArray(raw) ? (raw as Venda[]) : [];
    },
    enabled: !!barbeariaId,
  });

  const venderMutation = useMutation({
    mutationFn: async () => {
      if (!barbeariaId) throw new Error("Barbearia não encontrada");
      if (!pacoteSel) throw new Error("Selecione um pacote");
      if (!clienteNome.trim()) throw new Error("Informe o nome do cliente");
      return fetchJson(`/barbearias/${barbeariaId}/pacotes-cliente`, {
        method: "POST",
        body: { pacoteId: pacoteSel, clienteNome: clienteNome.trim() },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pacotes-cliente", barbeariaId] });
      setVendaModal(false);
      setPacoteSel(null);
      setClienteNome("");
    },
    onError: (e) => Alert.alert("Erro na venda", getErrorMessage(e)),
  });

  const usarMutation = useMutation({
    mutationFn: async (pcId: number) => {
      if (!barbeariaId) throw new Error("Barbearia não encontrada");
      return fetchJson(`/barbearias/${barbeariaId}/pacotes-cliente/${pcId}/usar`, { method: "POST" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pacotes-cliente", barbeariaId] }),
    onError: (e) => Alert.alert("Erro", getErrorMessage(e)),
  });

  const confirmUsar = (v: Venda) => {
    Alert.alert("Registrar sessão", `Consumir 1 sessão de "${v.pacoteNome || "pacote"}" para ${v.clienteNome || "cliente"}?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Registrar", onPress: () => usarMutation.mutate(v.id) },
    ]);
  };

  const tone = (status?: string) =>
    status === "ativo" ? colors.success : status === "expirado" ? colors.error : colors.textSecondary;

  const sessoesRestantes = (v: Venda) => {
    const toN = (x: unknown) => {
      if (x == null) return 0;
      const n = typeof x === "string" ? Number(x) : Number(x);
      return isFinite(n) ? n : 0;
    };
    if (v.sessoesRestantes != null) return toN(v.sessoesRestantes);
    return Math.max(0, toN(v.sessoesTotal) - toN(v.sessoesUsadas));
  };

  return (
    <ScreenContainer
      title="Vendas de pacotes"
      subtitle="Vendas e saldo de sessões"
      refreshing={vendasQ.isRefetching}
      onRefresh={vendasQ.refetch}
      rightAction={canManage ? { icon: "shopping-cart", label: "Vender pacote", onPress: () => setVendaModal(true) } : undefined}
    >
      {vendasQ.isLoading ? (
        <SkeletonList count={4} variant="card" />
      ) : vendasQ.isError ? (
        <ErrorView error={vendasQ.error} onRetry={vendasQ.refetch} />
      ) : !vendasQ.data || vendasQ.data.length === 0 ? (
        <EmptyState
          icon="shopping-bag"
          title="Nenhum pacote vendido"
          description="Venda pacotes para clientes e acompanhe o consumo de sessões."
          ctaLabel={canManage ? "Vender primeiro pacote" : undefined}
          onCtaPress={canManage ? () => setVendaModal(true) : undefined}
        />
      ) : (
        vendasQ.data.map((v) => {
          const restantes = sessoesRestantes(v);
          const podeUsar = canManage && restantes > 0 && v.status !== "expirado";
          return (
            <View key={v.id} style={styles.card}>
              <View style={styles.headRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title} numberOfLines={1}>{v.pacoteNome || "Pacote"}</Text>
                  <Text style={styles.cliente}>{v.clienteNome || "Cliente"}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: tone(v.status) + "22" }]}>
                  <Text style={[styles.statusText, { color: tone(v.status) }]}>
                    {(v.status || "ativo").toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.metaRow}>
                {v.sessoesTotal != null ? (
                  <View style={styles.metaItem}>
                    <Feather name="clipboard" size={12} color={colors.textMuted} />
                    <Text style={styles.metaText}>{restantes}/{v.sessoesTotal} sessões</Text>
                  </View>
                ) : null}
                {formatDate(v.dataCompra) ? (
                  <View style={styles.metaItem}>
                    <Feather name="calendar" size={12} color={colors.textMuted} />
                    <Text style={styles.metaText}>Compra {formatDate(v.dataCompra)}</Text>
                  </View>
                ) : null}
                {formatDate(v.dataValidade || v.dataExpiracao) ? (
                  <View style={styles.metaItem}>
                    <Feather name="clock" size={12} color={colors.textMuted} />
                    <Text style={styles.metaText}>Expira {formatDate(v.dataValidade || v.dataExpiracao)}</Text>
                  </View>
                ) : null}
              </View>

              {podeUsar ? (
                <Pressable onPress={() => confirmUsar(v)} style={styles.useBtn}>
                  <Feather name="play-circle" size={16} color={colors.invertedText} />
                  <Text style={styles.useBtnText}>Registrar sessão</Text>
                </Pressable>
              ) : null}
            </View>
          );
        })
      )}

      <Modal visible={vendaModal} transparent animationType="slide" onRequestClose={() => setVendaModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Vender pacote</Text>

              <Text style={styles.label}>Pacote</Text>
              <View style={{ gap: 6 }}>
                {(pacotesQ.data || []).filter((p) => (p as Pacote & { ativo?: boolean }).ativo !== false).map((p) => {
                  const sel = pacoteSel === p.id;
                  return (
                    <Pressable key={p.id} onPress={() => setPacoteSel(p.id)} style={[styles.opt, sel && styles.optActive]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.optName, sel && { color: colors.invertedText }]}>{p.nome}</Text>
                        <Text style={[styles.optMeta, sel && { color: colors.invertedText }]}>
                          {formatBRL(p.preco)} {p.sessoesTotal ? `• ${p.sessoesTotal} sessões` : ""}
                        </Text>
                      </View>
                      {sel ? <Feather name="check" size={18} color={colors.invertedText} /> : null}
                    </Pressable>
                  );
                })}
                {(!pacotesQ.data || pacotesQ.data.length === 0) ? (
                  <Text style={styles.hint}>Crie um pacote primeiro em /pacotes.</Text>
                ) : null}
              </View>

              <Text style={styles.label}>Cliente</Text>
              <TextInput
                value={clienteNome}
                onChangeText={setClienteNome}
                placeholder="Nome do cliente"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
              />

              <View style={styles.actions}>
                <Pressable onPress={() => setVendaModal(false)} style={[styles.btn, styles.btnGhost]}>
                  <Text style={styles.btnGhostText}>Cancelar</Text>
                </Pressable>
                <Pressable
                  onPress={() => venderMutation.mutate()}
                  disabled={venderMutation.isPending}
                  style={[styles.btn, styles.btnPrimary, venderMutation.isPending && { opacity: 0.7 }]}
                >
                  <Text style={styles.btnPrimaryText}>{venderMutation.isPending ? "Vendendo…" : "Confirmar venda"}</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
    card: { backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.surfaceBorder, padding: 14, marginBottom: 8 },
    headRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
    title: { color: c.text, fontFamily: "Inter_600SemiBold", fontSize: 14 },
    cliente: { color: c.textSecondary, fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 2 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 0.5 },
    metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
    metaText: { color: c.textSecondary, fontFamily: "Inter_500Medium", fontSize: 11 },
    useBtn: { marginTop: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: c.accent, paddingVertical: 10, borderRadius: 10 },
    useBtnText: { color: c.invertedText, fontFamily: "Inter_700Bold", fontSize: 13 },
    modalBackdrop: { flex: 1, backgroundColor: c.overlay, justifyContent: "flex-end" },
    modalCard: { backgroundColor: c.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32, borderTopWidth: 1, borderColor: c.surfaceBorder, maxHeight: "85%" },
    modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: c.text, marginBottom: 16 },
    label: { fontSize: 12, fontFamily: "Inter_500Medium", color: c.textSecondary, marginBottom: 6, marginTop: 8 },
    input: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.surfaceBorder, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: c.text, fontFamily: "Inter_500Medium", fontSize: 14 },
    opt: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 10, backgroundColor: c.surface, borderWidth: 1, borderColor: c.surfaceBorder },
    optActive: { backgroundColor: c.accent, borderColor: c.accent },
    optName: { color: c.text, fontFamily: "Inter_600SemiBold", fontSize: 14 },
    optMeta: { color: c.textSecondary, fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 2 },
    actions: { flexDirection: "row", gap: 10, marginTop: 18 },
    btn: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: 10 },
    btnGhost: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.surfaceBorder },
    btnGhostText: { color: c.text, fontFamily: "Inter_600SemiBold", fontSize: 14 },
    btnPrimary: { backgroundColor: c.accent },
    btnPrimaryText: { color: c.invertedText, fontFamily: "Inter_700Bold", fontSize: 14 },
    hint: { color: c.textMuted, fontFamily: "Inter_500Medium", fontSize: 12, textAlign: "center", paddingVertical: 12 },
  });
