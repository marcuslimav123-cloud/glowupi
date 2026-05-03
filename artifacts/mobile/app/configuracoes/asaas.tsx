import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Alert, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors, type ColorPalette } from "@/lib/theme";
import { ScreenContainer } from "@/components/ScreenContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { fetchJson, getErrorMessage } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

type Conta = {
  id: number;
  ambiente: "sandbox" | "producao";
  walletId: string | null;
  accountName: string | null;
  accountEmail: string | null;
  accountCpfCnpj: string | null;
  apiKeyMasked: string | null;
  webhookConfigured: boolean;
  status: "ativo" | "pausado" | string;
  splitOptIn: boolean;
  splitPercentualPlataforma: number;
} | null;

type ContaResp = { conectado: boolean; conta: Conta };
type ValidarResp = { ok: boolean; ambiente?: string; account?: { name?: string; email?: string; cpfCnpj?: string }; error?: string };

export default function ConexaoAsaasScreen() {
  const { barbeariaId } = useAuth();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [step, setStep] = useState<"loading" | "conectar" | "validar" | "conectada">("loading");
  const [saving, setSaving] = useState(false);
  const [conta, setConta] = useState<Conta>(null);
  const [apiKey, setApiKey] = useState("");
  const [ambiente, setAmbiente] = useState<"sandbox" | "producao">("sandbox");
  const [splitOptIn, setSplitOptIn] = useState(false);
  const [splitPct, setSplitPct] = useState("");
  const [validInfo, setValidInfo] = useState<{ name?: string; email?: string; cpfCnpj?: string } | null>(null);
  const [webhookUrl, setWebhookUrl] = useState("");

  const carregar = useCallback(async () => {
    if (!barbeariaId) return;
    try {
      const data = await fetchJson<ContaResp>(`/barbearias/${barbeariaId}/asaas`);
      const c = data?.conta || null;
      setConta(c);
      if (c) {
        setAmbiente(c.ambiente);
        setSplitOptIn(!!c.splitOptIn);
        setSplitPct(c.splitPercentualPlataforma ? String(c.splitPercentualPlataforma) : "");
        setStep("conectada");
        try {
          const wh = await fetchJson<{ url: string }>(`/barbearias/${barbeariaId}/asaas/webhook-url`);
          setWebhookUrl(wh?.url || "");
        } catch {}
      } else {
        setStep("conectar");
      }
    } catch {
      setStep("conectar");
    }
  }, [barbeariaId]);

  useEffect(() => { carregar(); }, [carregar]);

  const validar = async () => {
    if (!apiKey.trim()) { Alert.alert("Atenção", "Informe a API Key do Asaas."); return; }
    setSaving(true);
    try {
      const r = await fetchJson<ValidarResp>(`/barbearias/${barbeariaId}/asaas/validar`, {
        method: "POST",
        body: { apiKey: apiKey.trim(), ambiente },
      });
      if (!r?.ok) throw new Error(r?.error || "Chave inválida");
      setValidInfo(r.account || {});
      setStep("validar");
    } catch (e) {
      Alert.alert("Erro ao validar", getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const conectar = async () => {
    setSaving(true);
    try {
      await fetchJson(`/barbearias/${barbeariaId}/asaas`, {
        method: "POST",
        body: {
          apiKey: apiKey.trim(),
          ambiente,
          splitOptIn,
          splitPercentualPlataforma: splitPct.trim() ? Number(splitPct.replace(",", ".")) : 0,
        },
      });
      try {
        await fetchJson(`/barbearias/${barbeariaId}/asaas/webhook-auto`, { method: "POST" });
      } catch {}
      setApiKey("");
      Alert.alert("Sucesso", "Conta Asaas conectada.");
      await carregar();
    } catch (e) {
      Alert.alert("Erro", getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const reconfigurarWebhook = async () => {
    setSaving(true);
    try {
      await fetchJson(`/barbearias/${barbeariaId}/asaas/webhook-auto`, { method: "POST" });
      Alert.alert("Sucesso", "Webhook reconfigurado.");
      await carregar();
    } catch (e) {
      Alert.alert("Erro", getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const salvarSplit = async () => {
    setSaving(true);
    try {
      await fetchJson(`/barbearias/${barbeariaId}/asaas`, {
        method: "PUT",
        body: {
          splitOptIn,
          splitPercentualPlataforma: splitPct.trim() ? Number(splitPct.replace(",", ".")) : 0,
        },
      });
      Alert.alert("Salvo", "Configuração de split atualizada.");
      await carregar();
    } catch (e) {
      Alert.alert("Erro", getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const desconectar = () => {
    Alert.alert("Desconectar Asaas", "Tem certeza? Pagamentos via Asaas serão suspensos.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Desconectar", style: "destructive", onPress: async () => {
          setSaving(true);
          try {
            await fetchJson(`/barbearias/${barbeariaId}/asaas`, { method: "DELETE" });
            setApiKey(""); setValidInfo(null); setStep("conectar");
            await carregar();
          } catch (e) {
            Alert.alert("Erro", getErrorMessage(e));
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  };

  if (step === "loading") {
    return (
      <ScreenContainer title="Conexão Asaas" subtitle="Pagamentos da barbearia">
        <View style={{ padding: 24, alignItems: "center" }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </ScreenContainer>
    );
  }

  if (step === "conectada" && conta) {
    const ativo = conta.status === "ativo";
    return (
      <ScreenContainer title="Conexão Asaas" subtitle="Conta conectada">
        <SectionHeader label="Conta" />
        <View style={styles.card}>
          <Row label="Status" value={ativo ? "Ativa" : "Pausada"} valueColor={ativo ? colors.success : colors.error} colors={colors} />
          <Row label="Ambiente" value={conta.ambiente === "producao" ? "Produção" : "Sandbox"} colors={colors} />
          {conta.accountEmail && <Row label="E-mail" value={conta.accountEmail} colors={colors} />}
          {conta.accountName && <Row label="Nome" value={conta.accountName} colors={colors} />}
          {conta.walletId && <Row label="Wallet" value={conta.walletId} colors={colors} />}
          <Row label="Webhook" value={conta.webhookConfigured ? "Configurado" : "Pendente"} valueColor={conta.webhookConfigured ? colors.success : colors.warning} colors={colors} />
        </View>

        {webhookUrl && (
          <View style={[styles.card, { marginTop: 8 }]}>
            <Text style={styles.label}>URL do webhook</Text>
            <Text style={[styles.help, { fontFamily: "monospace" }]} selectable>{webhookUrl}</Text>
            <TouchableOpacity style={styles.secondaryBtn} onPress={reconfigurarWebhook} disabled={saving}>
              <Feather name="refresh-cw" size={14} color={colors.text} />
              <Text style={[styles.secondaryText, { color: colors.text }]}>Reconfigurar webhook</Text>
            </TouchableOpacity>
          </View>
        )}

        <SectionHeader label="Split SaaS" />
        <View style={styles.card}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 4 }}>
            <Text style={{ color: colors.text, fontSize: 13, fontWeight: "500" }}>Habilitar split com plataforma</Text>
            <Switch value={splitOptIn} onValueChange={setSplitOptIn} />
          </View>
          <Text style={styles.label}>Percentual da plataforma (%)</Text>
          <TextInput value={splitPct} onChangeText={setSplitPct} placeholder="Ex: 5" placeholderTextColor={colors.textMuted} style={styles.input} keyboardType="decimal-pad" />
          <TouchableOpacity style={styles.primaryBtn} onPress={salvarSplit} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : (
              <>
                <Feather name="save" size={16} color="#fff" />
                <Text style={styles.primaryBtnText}>Salvar split</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ marginTop: 16 }}>
          <TouchableOpacity style={styles.dangerBtn} onPress={desconectar} disabled={saving}>
            <Feather name="x-circle" size={16} color={colors.error} />
            <Text style={[styles.dangerText, { color: colors.error }]}>Desconectar conta</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer title="Conexão Asaas" subtitle="Conecte sua conta para receber pagamentos">
      <SectionHeader label={step === "validar" ? "2. Confirmar e conectar" : "1. Validar API Key"} />
      <View style={styles.card}>
        <Text style={styles.label}>Ambiente</Text>
        <View style={styles.toggle}>
          {(["sandbox", "producao"] as const).map((v) => (
            <TouchableOpacity
              key={v}
              style={[styles.toggleBtn, ambiente === v && styles.toggleBtnActive]}
              onPress={() => { setAmbiente(v); setValidInfo(null); setStep("conectar"); }}
              disabled={saving}
            >
              <Text style={[styles.toggleText, ambiente === v && styles.toggleTextActive]}>
                {v === "sandbox" ? "Sandbox" : "Produção"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>API Key Asaas</Text>
        <TextInput
          value={apiKey}
          onChangeText={(v) => { setApiKey(v); setValidInfo(null); setStep("conectar"); }}
          placeholder="$aact_..."
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
        />

        {step === "conectar" && (
          <TouchableOpacity style={styles.primaryBtn} onPress={validar} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : (
              <>
                <Feather name="check-circle" size={16} color="#fff" />
                <Text style={styles.primaryBtnText}>Validar chave</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {step === "validar" && validInfo && (
          <View style={styles.successBox}>
            <Text style={[styles.label, { color: colors.success, marginTop: 0 }]}>Conta validada</Text>
            {validInfo.name && <Text style={styles.help}>Nome: {validInfo.name}</Text>}
            {validInfo.email && <Text style={styles.help}>E-mail: {validInfo.email}</Text>}
            {validInfo.cpfCnpj && <Text style={styles.help}>CPF/CNPJ: {validInfo.cpfCnpj}</Text>}
          </View>
        )}

        {step === "validar" && (
          <>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: "500" }}>Habilitar split com plataforma</Text>
              <Switch value={splitOptIn} onValueChange={setSplitOptIn} />
            </View>
            <Text style={styles.label}>Percentual da plataforma (%) (opcional)</Text>
            <TextInput value={splitPct} onChangeText={setSplitPct} placeholder="Ex: 5" placeholderTextColor={colors.textMuted} style={styles.input} keyboardType="decimal-pad" />
            <TouchableOpacity style={styles.primaryBtn} onPress={conectar} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Feather name="link" size={16} color="#fff" />
                  <Text style={styles.primaryBtnText}>Conectar conta</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}

        <Text style={styles.help}>
          Para obter sua API Key, acesse o painel Asaas em Integrações &gt; API Asaas.
        </Text>
      </View>
    </ScreenContainer>
  );
}

function Row({ label, value, valueColor, colors }: { label: string; value: string; valueColor?: string; colors: ColorPalette }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8 }}>
      <Text style={{ color: colors.textMuted, fontSize: 13 }}>{label}</Text>
      <Text style={{ color: valueColor || colors.text, fontSize: 13, fontWeight: "600" }}>{value}</Text>
    </View>
  );
}

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.surfaceBorder, padding: 16,
    },
    label: { fontSize: 12, color: c.textMuted, marginBottom: 6, marginTop: 10, fontWeight: "500" },
    input: {
      borderWidth: 1, borderColor: c.surfaceBorder, borderRadius: 12,
      paddingHorizontal: 12, paddingVertical: 10, color: c.text, backgroundColor: c.background, fontSize: 14,
    },
    toggle: { flexDirection: "row", gap: 8, marginTop: 6 },
    toggleBtn: {
      flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: c.surfaceBorder,
      alignItems: "center", backgroundColor: c.background,
    },
    toggleBtnActive: { backgroundColor: c.accent, borderColor: c.accent },
    toggleText: { color: c.text, fontSize: 13, fontWeight: "500" },
    toggleTextActive: { color: "#fff" },
    primaryBtn: {
      marginTop: 16, backgroundColor: c.accent, borderRadius: 12, paddingVertical: 12,
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    },
    primaryBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
    secondaryBtn: {
      marginTop: 12, backgroundColor: c.background, borderRadius: 12, paddingVertical: 10,
      borderWidth: 1, borderColor: c.surfaceBorder,
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    },
    secondaryText: { fontWeight: "600", fontSize: 13 },
    dangerBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
      paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: c.surfaceBorder,
      backgroundColor: c.surface,
    },
    dangerText: { fontWeight: "600", fontSize: 14 },
    successBox: {
      marginTop: 12, padding: 10, borderRadius: 12, borderWidth: 1,
      borderColor: c.success + "55", backgroundColor: c.success + "11",
    },
    help: { fontSize: 11, color: c.textMuted, marginTop: 12, lineHeight: 16 },
  });
