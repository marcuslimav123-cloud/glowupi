import React, { useEffect, useMemo, useState, useCallback } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors, type ColorPalette } from "@/lib/theme";
import { ScreenContainer } from "@/components/ScreenContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { fetchJson, getErrorMessage } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

type Plano = { id: string; nome: string; valor: number };
type Assinatura = {
  id: number;
  asaasSubscriptionId: string;
  status: string;
  valor: string | number;
  billingType: string;
  plano: string;
  proximoVencimento: string | null;
} | null;

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Ativa", INACTIVE: "Inativa", EXPIRED: "Expirada", CANCELLED: "Cancelada",
};
const BILLING_LABEL: Record<string, string> = {
  PIX: "Pix", BOLETO: "Boleto", CREDIT_CARD: "Cartão de crédito",
};

function fmtMoney(v: string | number) {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return `R$ ${n.toFixed(2).replace(".", ",")}`;
}
function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("pt-BR");
}

export default function MensalidadeSaaSScreen() {
  const { barbeariaId } = useAuth();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [assinatura, setAssinatura] = useState<Assinatura>(null);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [planoSel, setPlanoSel] = useState<string>("1_pro");
  const [billingType, setBillingType] = useState<"PIX" | "BOLETO" | "CREDIT_CARD">("PIX");
  const [cpfCnpj, setCpfCnpj] = useState("");

  const carregar = useCallback(async () => {
    if (!barbeariaId) return;
    setLoading(true);
    try {
      const [pls, assResp] = await Promise.all([
        fetchJson<Plano[]>(`/asaas-saas/planos`).catch(() => []),
        fetchJson<{ assinatura: Assinatura }>(`/asaas-saas`).catch(() => ({ assinatura: null })),
      ]);
      setPlanos(Array.isArray(pls) ? pls : []);
      setAssinatura(assResp?.assinatura || null);
    } finally {
      setLoading(false);
    }
  }, [barbeariaId]);

  useEffect(() => { carregar(); }, [carregar]);

  const criarAssinatura = async () => {
    setActing(true);
    try {
      await fetchJson(`/asaas-saas`, {
        method: "POST",
        body: { plano: planoSel, billingType, payerCpfCnpj: cpfCnpj.trim() || undefined },
      });
      Alert.alert("Sucesso", "Assinatura criada. Confira a primeira fatura no e-mail cadastrado.");
      await carregar();
    } catch (e) {
      Alert.alert("Erro", getErrorMessage(e));
    } finally {
      setActing(false);
    }
  };

  const cancelar = () => {
    Alert.alert("Cancelar assinatura", "Tem certeza? O acesso será mantido até o fim do período pago.", [
      { text: "Voltar", style: "cancel" },
      {
        text: "Cancelar assinatura", style: "destructive", onPress: async () => {
          setActing(true);
          try {
            await fetchJson(`/asaas-saas`, { method: "DELETE" });
            await carregar();
          } catch (e) {
            Alert.alert("Erro", getErrorMessage(e));
          } finally {
            setActing(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <ScreenContainer title="Mensalidade" subtitle="Plano da barbearia">
        <View style={{ padding: 24, alignItems: "center" }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </ScreenContainer>
    );
  }

  if (assinatura && assinatura.status !== "CANCELLED") {
    return (
      <ScreenContainer title="Mensalidade" subtitle="Plano e cobranças do SaaS">
        <SectionHeader label="Status da assinatura" />
        <View style={styles.card}>
          <Row label="Status" value={STATUS_LABEL[assinatura.status] || assinatura.status} valueColor={assinatura.status === "ACTIVE" ? colors.success : colors.warning} colors={colors} />
          <Row label="Plano" value={assinatura.plano} colors={colors} />
          <Row label="Valor" value={`${fmtMoney(assinatura.valor)} / mês`} colors={colors} />
          <Row label="Forma de pagamento" value={BILLING_LABEL[assinatura.billingType] || assinatura.billingType} colors={colors} />
          <Row label="Próximo vencimento" value={fmtDate(assinatura.proximoVencimento)} colors={colors} />
        </View>

        {assinatura.status === "ACTIVE" && (
          <View style={{ marginTop: 16 }}>
            <TouchableOpacity style={styles.dangerBtn} onPress={cancelar} disabled={acting}>
              <Feather name="x-circle" size={16} color={colors.error} />
              <Text style={[styles.dangerText, { color: colors.error }]}>Cancelar assinatura</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer title="Mensalidade" subtitle="Assine o plano para liberar recursos Pro">
      <SectionHeader label="Escolha seu plano" />
      <View style={{ gap: 8 }}>
        {planos.map((p) => (
          <TouchableOpacity
            key={p.id}
            onPress={() => setPlanoSel(p.id)}
            style={[styles.planCard, planoSel === p.id && styles.planCardActive]}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.planName}>{p.nome}</Text>
              <Text style={styles.planValue}>{fmtMoney(p.valor)} / mês</Text>
            </View>
            {planoSel === p.id && <Feather name="check-circle" size={18} color={colors.accent} />}
          </TouchableOpacity>
        ))}
      </View>

      <SectionHeader label="Forma de pagamento" />
      <View style={styles.card}>
        <View style={styles.toggle}>
          {(["PIX", "BOLETO", "CREDIT_CARD"] as const).map((v) => (
            <TouchableOpacity key={v} style={[styles.toggleBtn, billingType === v && styles.toggleBtnActive]} onPress={() => setBillingType(v)}>
              <Text style={[styles.toggleText, billingType === v && styles.toggleTextActive]}>{BILLING_LABEL[v]}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity style={styles.primaryBtn} onPress={criarAssinatura} disabled={acting}>
        {acting ? <ActivityIndicator color="#fff" /> : (
          <>
            <Feather name="credit-card" size={16} color="#fff" />
            <Text style={styles.primaryBtnText}>Assinar plano</Text>
          </>
        )}
      </TouchableOpacity>

      <Text style={styles.help}>
        A cobrança é feita via Asaas. Você receberá a primeira fatura por e-mail.
      </Text>
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
    card: { backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.surfaceBorder, padding: 14 },
    planCard: {
      flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 14,
      borderWidth: 1, borderColor: c.surfaceBorder, backgroundColor: c.surface,
    },
    planCardActive: { borderColor: c.accent, borderWidth: 2 },
    planName: { fontSize: 14, fontWeight: "600", color: c.text },
    planValue: { fontSize: 12, color: c.accent, marginTop: 2, fontWeight: "600" },
    toggle: { flexDirection: "row", gap: 6 },
    toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: c.surfaceBorder, alignItems: "center", backgroundColor: c.background },
    toggleBtnActive: { backgroundColor: c.accent, borderColor: c.accent },
    toggleText: { color: c.text, fontSize: 12, fontWeight: "500" },
    toggleTextActive: { color: "#fff" },
    primaryBtn: {
      marginTop: 16, backgroundColor: c.accent, borderRadius: 12, paddingVertical: 12,
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    },
    primaryBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
    dangerBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
      paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: c.surfaceBorder,
    },
    dangerText: { fontWeight: "600", fontSize: 14 },
    help: { fontSize: 11, color: c.textMuted, marginTop: 12, lineHeight: 16, textAlign: "center" },
  });
