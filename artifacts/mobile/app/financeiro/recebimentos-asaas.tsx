import React, { useEffect, useMemo, useState, useCallback } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors, type ColorPalette } from "@/lib/theme";
import { ScreenContainer } from "@/components/ScreenContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { EmptyState } from "@/components/EmptyState";
import { fetchJson } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

type Pagamento = {
  id: number;
  asaasPaymentId: string;
  tipo: string;
  billingType: string;
  valor: string;
  status: string;
  payerNome: string | null;
  dataPagamento: string | null;
  createdAt: string;
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendente", AWAITING_RISK_ANALYSIS: "Análise",
  CONFIRMED: "Confirmado", RECEIVED: "Recebido", RECEIVED_IN_CASH: "Em caixa",
  REFUNDED: "Reembolsado", OVERDUE: "Vencido",
  CHARGEBACK_REQUESTED: "Chargeback", CHARGEBACK_DISPUTE: "Disputa",
};

function fmtMoney(v: string | number) {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return `R$ ${n.toFixed(2).replace(".", ",")}`;
}
function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function RecebimentosAsaasScreen() {
  const { barbeariaId } = useAuth();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [items, setItems] = useState<Pagamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const carregar = useCallback(async () => {
    if (!barbeariaId) return;
    try {
      const data = await fetchJson<{ pagamentos?: Pagamento[]; recebimentos?: Pagamento[] } | Pagamento[]>(`/barbearias/${barbeariaId}/asaas/recebimentos`);
      const list = Array.isArray(data)
        ? data
        : (data?.pagamentos || data?.recebimentos || []);
      setItems(Array.isArray(list) ? list : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [barbeariaId]);

  useEffect(() => { carregar(); }, [carregar]);

  const totalRecebido = items
    .filter((p) => ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"].includes(p.status))
    .reduce((s, p) => s + parseFloat(p.valor || "0"), 0);
  const pendente = items
    .filter((p) => ["PENDING", "AWAITING_RISK_ANALYSIS"].includes(p.status))
    .reduce((s, p) => s + parseFloat(p.valor || "0"), 0);

  if (loading) {
    return (
      <ScreenContainer title="Recebimentos Asaas" subtitle="Pagamentos via Asaas">
        <View style={{ padding: 24, alignItems: "center" }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer title="Recebimentos Asaas" subtitle="Histórico de cobranças">
      <SectionHeader label="Resumo" />
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={[styles.card, { flex: 1 }]}>
          <Text style={styles.kpiLabel}>Recebido</Text>
          <Text style={[styles.kpiValue, { color: colors.success }]}>{fmtMoney(totalRecebido)}</Text>
        </View>
        <View style={[styles.card, { flex: 1 }]}>
          <Text style={styles.kpiLabel}>Pendente</Text>
          <Text style={[styles.kpiValue, { color: colors.warning }]}>{fmtMoney(pendente)}</Text>
        </View>
      </View>

      <SectionHeader label={`Lançamentos (${items.length})`} />
      <FlatList
        data={items}
        keyExtractor={(p) => String(p.id)}
        scrollEnabled={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); carregar(); }} tintColor={colors.accent} />}
        ListEmptyComponent={<EmptyState icon="inbox" title="Sem lançamentos" description="Quando você emitir cobranças via Asaas, elas aparecerão aqui." />}
        ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={styles.title}>{item.payerNome || "—"}</Text>
              <Text style={[styles.value]}>{fmtMoney(item.valor)}</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
              <Text style={styles.meta}>{item.billingType} · {item.tipo}</Text>
              <Text style={[styles.badge, badgeColorStyle(item.status, colors)]}>{STATUS_LABEL[item.status] || item.status}</Text>
            </View>
            <Text style={[styles.meta, { marginTop: 4 }]}><Feather name="clock" size={10} /> {fmtDate(item.dataPagamento || item.createdAt)}</Text>
          </View>
        )}
      />
    </ScreenContainer>
  );
}

function badgeColorStyle(status: string, c: ColorPalette) {
  if (["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"].includes(status)) return { color: c.success };
  if (["PENDING", "AWAITING_RISK_ANALYSIS"].includes(status)) return { color: c.warning };
  if (["REFUNDED", "OVERDUE", "CHARGEBACK_REQUESTED", "CHARGEBACK_DISPUTE"].includes(status)) return { color: c.error };
  return { color: c.textMuted };
}

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.surfaceBorder, padding: 12,
    },
    kpiLabel: { fontSize: 11, color: c.textMuted, marginBottom: 4 },
    kpiValue: { fontSize: 20, fontWeight: "700" },
    title: { fontSize: 14, fontWeight: "600", color: c.text },
    value: { fontSize: 14, fontWeight: "700", color: c.accent },
    meta: { fontSize: 11, color: c.textMuted },
    badge: { fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  });
