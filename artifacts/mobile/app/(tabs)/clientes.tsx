import React, { useCallback, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  KeyboardAvoidingView,
  Alert,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import { useColors, type ColorPalette } from "@/lib/theme";
import { useAuth } from "@/contexts/AuthContext";
import { EmptyState } from "@/components/EmptyState";
import { ErrorView } from "@/components/ErrorView";
import { SkeletonList } from "@/components/Skeleton";
import { apiUrl, formatPhone, stripPhone, whatsappLink } from "@/lib/api";

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

interface Cliente {
  id: number;
  nome: string;
  telefone?: string;
  email?: string;
  vip?: boolean;
  totalAtendimentos?: number;
  ultimoAtendimento?: string;
}

function initials(nome: string): string {
  const parts = nome.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export default function ClientesScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { barbeariaId, token } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [novoNome, setNovoNome] = useState("");
  const [novoTelefone, setNovoTelefone] = useState("");
  const [novoEmail, setNovoEmail] = useState("");
  const [savingError, setSavingError] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const { data: clientes = [], isLoading, isError, error, refetch } = useQuery<Cliente[]>({
    queryKey: ["clientes", barbeariaId, search],
    queryFn: async () => {
      if (!barbeariaId || !token) return [];
      const qs = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
      const res = await fetch(`${API_BASE}/api/barbearias/${barbeariaId}/clientes${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Erro ao carregar clientes");
      const data = await res.json();
      return Array.isArray(data) ? data : (data.clientes ?? data.items ?? []);
    },
    enabled: !!barbeariaId && !!token,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = {
        nome: novoNome.trim(),
        telefone: stripPhone(novoTelefone) || undefined,
        email: novoEmail.trim() || undefined,
      };
      const url = editing
        ? `${API_BASE}/api/barbearias/${barbeariaId}/clientes/${editing.id}`
        : `${API_BASE}/api/barbearias/${barbeariaId}/clientes`;
      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || "Erro ao salvar cliente");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      setModalOpen(false);
      setEditing(null);
      setNovoNome("");
      setNovoTelefone("");
      setNovoEmail("");
      setSavingError(null);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (e: Error) => setSavingError(e.message),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleSave = () => {
    setSavingError(null);
    if (!novoNome.trim()) {
      setSavingError("Nome é obrigatório");
      return;
    }
    saveMutation.mutate();
  };

  const openCreate = () => {
    setEditing(null);
    setNovoNome("");
    setNovoTelefone("");
    setNovoEmail("");
    setSavingError(null);
    setModalOpen(true);
  };

  const openEdit = (c: Cliente) => {
    setEditing(c);
    setNovoNome(c.nome);
    setNovoTelefone(formatPhone(c.telefone || ""));
    setNovoEmail(c.email || "");
    setSavingError(null);
    setModalOpen(true);
  };

  const webTopPadding = Platform.OS === "web" ? 67 : 0;

  return (
    <View style={[styles.container, { paddingTop: webTopPadding }]}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>Clientes</Text>
            <Text style={styles.subtitle}>{clientes.length} cadastrado(s)</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => {
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setImportOpen(true);
              }}
              accessibilityLabel="Importar Excel"
            >
              <Feather name="upload" size={18} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => {
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                openCreate();
              }}
              accessibilityLabel="Novo cliente"
            >
              <Feather name="plus" size={20} color="#000" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.searchBox}>
          <Feather name="search" size={16} color={colors.textMuted} />
          <TextInput
            placeholder="Buscar por nome ou telefone"
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            autoCapitalize="none"
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Feather name="x" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Platform.OS === "web" ? 118 : 100 + insets.bottom },
        ]}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {isLoading ? (
          <SkeletonList count={5} variant="row" />
        ) : isError ? (
          <ErrorView title="Não foi possível carregar os clientes" error={error} onRetry={() => refetch()} />
        ) : clientes.length === 0 ? (
          <EmptyState
            icon={search ? "search" : "users"}
            title={search ? "Nenhum cliente encontrado" : "Nenhum cliente ainda"}
            description={search ? "Tente buscar por outro termo." : "Cadastre seu primeiro cliente para começar."}
            ctaLabel={search ? undefined : "Cadastrar cliente"}
            onCtaPress={search ? undefined : openCreate}
          />
        ) : (
          clientes.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => router.push(`/clientes/${c.id}` as any)}
            >
              <View style={[styles.avatar, c.vip && styles.avatarVip]}>
                <Text style={[styles.avatarText, c.vip && { color: colors.warning }]}>{initials(c.nome)}</Text>
              </View>
              <View style={styles.info}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={styles.clientName} numberOfLines={1}>{c.nome}</Text>
                  {c.vip && <Feather name="star" size={12} color={colors.warning} />}
                </View>
                {c.telefone && <Text style={styles.clientLine}>{formatPhone(c.telefone)}</Text>}
                {c.email && <Text style={styles.clientLine} numberOfLines={1}>{c.email}</Text>}
              </View>
              <View style={{ flexDirection: "row", gap: 4 }}>
                {c.telefone && (
                  <TouchableOpacity
                    style={styles.miniBtn}
                    onPress={() => Linking.openURL(whatsappLink(c.telefone))}
                    accessibilityLabel="WhatsApp"
                  >
                    <Feather name="message-circle" size={16} color={colors.success} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.miniBtn}
                  onPress={() => openEdit(c)}
                  accessibilityLabel="Editar"
                >
                  <Feather name="edit-2" size={15} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={() => setModalOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editing ? "Editar cliente" : "Novo cliente"}</Text>
              <TouchableOpacity onPress={() => setModalOpen(false)}>
                <Feather name="x" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>
            {savingError && (
              <View style={styles.errorBox}>
                <Feather name="alert-circle" size={14} color={colors.error} />
                <Text style={styles.errorText}>{savingError}</Text>
              </View>
            )}
            <Text style={styles.label}>Nome *</Text>
            <TextInput style={styles.input} value={novoNome} onChangeText={setNovoNome} placeholder="Nome completo" placeholderTextColor={colors.textMuted} autoCapitalize="words" />
            <Text style={styles.label}>Telefone</Text>
            <TextInput style={styles.input} value={novoTelefone} onChangeText={(t) => setNovoTelefone(formatPhone(t))} placeholder="(11) 99999-9999" placeholderTextColor={colors.textMuted} keyboardType="phone-pad" />
            <Text style={styles.label}>E-mail</Text>
            <TextInput style={styles.input} value={novoEmail} onChangeText={setNovoEmail} placeholder="email@exemplo.com" placeholderTextColor={colors.textMuted} keyboardType="email-address" autoCapitalize="none" />
            <TouchableOpacity
              style={[styles.saveBtn, saveMutation.isPending && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? <ActivityIndicator color={colors.invertedText} /> : <Text style={styles.saveBtnText}>Salvar</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <ImportClientesModal visible={importOpen} onClose={() => setImportOpen(false)} onImported={() => refetch()} />
    </View>
  );
}

function ImportClientesModal({ visible, onClose, onImported }: { visible: boolean; onClose: () => void; onImported: () => void }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { barbeariaId, token } = useAuth();
  const [file, setFile] = useState<{ uri: string; name: string; mimeType?: string } | null>(null);
  const [preview, setPreview] = useState<{ headers: string[]; autoMapping: Record<string, string>; totalRows: number; previewRows: string[][] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setLoading(false);
    setImporting(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const pickFile = async () => {
    try {
      const r = await DocumentPicker.getDocumentAsync({
        type: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel", "text/csv"],
        copyToCacheDirectory: true,
      });
      if (r.canceled || !r.assets?.[0]) return;
      const asset = r.assets[0];
      setFile({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType });
      setLoading(true);
      const fd = new FormData();
      fd.append("file", { uri: asset.uri, name: asset.name, type: asset.mimeType || "application/octet-stream" } as any);
      const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/clientes/import/preview`), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || "Erro ao analisar planilha");
      }
      const data = await res.json();
      setPreview(data);
    } catch (e: any) {
      Alert.alert("Erro", e.message || "Erro ao ler arquivo");
      setFile(null);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!file || !preview) return;
    setImporting(true);
    try {
      const mapping: Record<string, number> = {};
      Object.entries(preview.autoMapping).forEach(([colIdx, field]) => {
        mapping[field] = Number(colIdx);
      });
      if (mapping.nome === undefined) {
        throw new Error("Não foi possível detectar a coluna 'Nome'. Renomeie o cabeçalho na planilha.");
      }
      const fd = new FormData();
      fd.append("file", { uri: file.uri, name: file.name, type: file.mimeType || "application/octet-stream" } as any);
      fd.append("columnMapping", JSON.stringify(mapping));
      const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/clientes/import/execute`), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao importar");
      setResult({ imported: data.imported || 0, skipped: data.skipped || 0 });
      onImported();
    } catch (e: any) {
      Alert.alert("Erro", e.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalCard, { maxHeight: "85%" }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Importar planilha</Text>
            <TouchableOpacity onPress={handleClose}>
              <Feather name="x" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {result ? (
              <View style={{ paddingVertical: 12, alignItems: "center" }}>
                <Feather name="check-circle" size={48} color={colors.success} />
                <Text style={[styles.modalTitle, { marginTop: 12 }]}>Importação concluída</Text>
                <Text style={{ color: colors.textSecondary, marginTop: 6 }}>{result.imported} importados · {result.skipped} ignorados</Text>
                <TouchableOpacity style={[styles.saveBtn, { marginTop: 18, width: "100%" }]} onPress={handleClose}>
                  <Text style={styles.saveBtnText}>Concluir</Text>
                </TouchableOpacity>
              </View>
            ) : !file ? (
              <>
                <Text style={{ color: colors.textSecondary, marginVertical: 12, fontSize: 13 }}>
                  Envie um arquivo .xlsx, .xls ou .csv com cabeçalhos (nome, telefone, email, aniversario, observacoes).
                </Text>
                <TouchableOpacity style={styles.saveBtn} onPress={pickFile} disabled={loading}>
                  {loading ? <ActivityIndicator color={colors.invertedText} /> : <Text style={styles.saveBtnText}>Escolher arquivo</Text>}
                </TouchableOpacity>
              </>
            ) : loading ? (
              <View style={{ paddingVertical: 30, alignItems: "center" }}>
                <ActivityIndicator color={colors.accent} />
                <Text style={{ color: colors.textSecondary, marginTop: 8 }}>Analisando planilha...</Text>
              </View>
            ) : preview ? (
              <View>
                <Text style={{ color: colors.text, fontFamily: "Inter_600SemiBold", marginVertical: 8 }}>{preview.totalRows} linha(s) detectadas</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 8 }}>Colunas detectadas:</Text>
                <View style={{ gap: 4, marginBottom: 12 }}>
                  {preview.headers.map((h, i) => {
                    const mapped = preview.autoMapping[i];
                    return (
                      <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", padding: 8, backgroundColor: colors.surface, borderRadius: 8, borderWidth: 1, borderColor: colors.surfaceBorder }}>
                        <Text style={{ color: colors.text, fontSize: 13 }}>{h || `Coluna ${i + 1}`}</Text>
                        <Text style={{ color: mapped ? colors.accent : colors.textMuted, fontSize: 12, fontFamily: "Inter_600SemiBold" }}>
                          {mapped ? `→ ${mapped}` : "ignorado"}
                        </Text>
                      </View>
                    );
                  })}
                </View>
                <TouchableOpacity style={[styles.saveBtn, importing && { opacity: 0.6 }]} onPress={handleImport} disabled={importing}>
                  {importing ? <ActivityIndicator color={colors.invertedText} /> : <Text style={styles.saveBtnText}>Importar {preview.totalRows} clientes</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={{ marginTop: 8, padding: 8, alignItems: "center" }} onPress={() => { setFile(null); setPreview(null); }}>
                  <Text style={{ color: colors.textSecondary }}>Escolher outro arquivo</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  title: { fontSize: 26, fontFamily: "Inter_700Bold", color: c.text },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", color: c.textSecondary, marginTop: 2 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.surface, borderWidth: 1, borderColor: c.surfaceBorder, alignItems: "center", justifyContent: "center" },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.accent, alignItems: "center", justifyContent: "center" },
  searchBox: { flexDirection: "row", alignItems: "center", backgroundColor: c.surface, borderWidth: 1, borderColor: c.surfaceBorder, borderRadius: 12, paddingHorizontal: 12, height: 42, gap: 8 },
  searchInput: { flex: 1, color: c.text, fontSize: 14, fontFamily: "Inter_400Regular" },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingTop: 8 },
  card: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: c.surface, borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: c.surfaceBorder },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.accent + "20", alignItems: "center", justifyContent: "center" },
  avatarVip: { backgroundColor: c.warning + "22" },
  avatarText: { fontSize: 14, fontFamily: "Inter_700Bold", color: c.accent },
  info: { flex: 1 },
  clientName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: c.text },
  clientLine: { fontSize: 12, fontFamily: "Inter_400Regular", color: c.textSecondary, marginTop: 2 },
  miniBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: c.surfaceLight },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: c.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32, borderTopWidth: 1, borderColor: c.surfaceBorder },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: c.text },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: c.error + "15", borderColor: c.error + "40", borderWidth: 1, padding: 10, borderRadius: 10, marginBottom: 12 },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular", color: c.error, flex: 1 },
  label: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: c.textSecondary, marginTop: 12, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.surfaceBorder, borderRadius: 12, paddingHorizontal: 14, height: 46, color: c.text, fontSize: 15, fontFamily: "Inter_400Regular" },
  saveBtn: { marginTop: 18, backgroundColor: c.accent, borderRadius: 12, height: 50, alignItems: "center", justifyContent: "center" },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: c.invertedText },
});
