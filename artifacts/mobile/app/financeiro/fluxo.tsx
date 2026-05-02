import React, { useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import { ScreenContainer } from "@/components/ScreenContainer";
import { ErrorView } from "@/components/ErrorView";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonList } from "@/components/Skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { fetchJson, formatCurrency, dateToStr } from "@/lib/api";

type Comanda = {
  id: number;
  clienteNome: string | null;
  dataFechamento: string | null;
  dataCompensacao: string | null;
  valorTotal: number;
  valorLiquido?: number;
  taxaCartao?: number;
  gorjeta?: { valor: number } | null;
  pagamentos?: { metodo: string; valor: number; bandeira?: string | null }[];
};

type Conta = {
  id: number;
  tipo: "pagar" | "receber";
  status: string;
  valor: number;
  descricao: string;
  categoria: string | null;
  dataVencimento: string | null;
  dataPagamento: string | null;
};

type Tab = "movimentado" | "disponivel" | "receber";

function startOfMonthStr() {
  const d = new Date();
  d.setDate(1);
  return dateToStr(d);
}

function isCard(metodo: string) {
  return metodo === "credito" || metodo === "debito";
}

export default function FluxoCaixaScreen() {
  const { barbeariaId } = useAuth();
  const [dataInicio, setDataInicio] = useState(startOfMonthStr());
  const [dataFim, setDataFim] = useState(dateToStr(new Date()));
  const [tab, setTab] = useState<Tab>("movimentado");
  const [categoria, setCategoria] = useState<string>("todas");

  const comandasQ = useQuery<Comanda[]>({
    queryKey: ["fluxo-comandas", barbeariaId, dataInicio, dataFim],
    enabled: !!barbeariaId,
    queryFn: async () => {
      const r = await fetchJson<Comanda[]>(`/barbearias/${barbeariaId}/comandas?dataInicio=${dataInicio}&dataFim=${dataFim}`);
      return Array.isArray(r) ? r : [];
    },
  });

  const contasQ = useQuery<Conta[]>({
    queryKey: ["fluxo-contas", barbeariaId],
    enabled: !!barbeariaId,
    queryFn: async () => {
      const r = await fetchJson<Conta[]>(`/barbearias/${barbeariaId}/financeiro`);
      return Array.isArray(r) ? r : [];
    },
  });

  const isLoading = comandasQ.isLoading || contasQ.isLoading;
  const isError = comandasQ.isError || contasQ.isError;
  const error = comandasQ.error || contasQ.error;

  const comandas = comandasQ.data ?? [];
  const contas = contasQ.data ?? [];

  const today = dateToStr(new Date());

  const categoriasDisponiveis = useMemo(() => {
    const set = new Set<string>();
    contas.forEach(c => { if (c.categoria) set.add(c.categoria); });
    return Array.from(set).sort();
  }, [contas]);

  const contasFiltradas = useMemo(() => {
    if (categoria === "todas") return contas;
    return contas.filter(c => (c.categoria || "") === categoria);
  }, [contas, categoria]);

  const computed = useMemo(() => {
    const totalBruto = comandas.reduce((s, c) => s + (c.valorTotal || 0), 0);
    const totalLiquido = comandas.reduce((s, c) => s + (c.valorLiquido ?? c.valorTotal ?? 0), 0);
    const totalTaxas = comandas.reduce((s, c) => s + (c.taxaCartao ?? 0), 0);
    const totalGorjetas = comandas.reduce((s, c) => s + (c.gorjeta?.valor ?? 0), 0);

    type P = { comandaId: number; valor: number; metodo: string; bandeira?: string | null; dataCompensacao?: string | null; taxaCartao: number; clienteNome: string | null };
    const payments: P[] = [];
    comandas.forEach(c => {
      const pags = Array.isArray(c.pagamentos) ? c.pagamentos : [];
      const numPags = pags.length || 1;
      const taxaPorPag = (c.taxaCartao ?? 0) / numPags;
      if (pags.length === 0) {
        payments.push({ comandaId: c.id, clienteNome: c.clienteNome, valor: c.valorTotal, metodo: "dinheiro", taxaCartao: 0 });
      } else {
        pags.forEach(p => {
          const card = isCard(p.metodo);
          payments.push({
            comandaId: c.id,
            clienteNome: c.clienteNome,
            valor: Number(p.valor) || 0,
            metodo: p.metodo,
            bandeira: p.bandeira,
            dataCompensacao: card ? c.dataCompensacao : undefined,
            taxaCartao: card ? taxaPorPag : 0,
          });
        });
      }
    });

    const cardPending = payments.filter(p => isCard(p.metodo) && p.dataCompensacao && p.dataCompensacao > today);
    const cardCompensated = payments.filter(p => isCard(p.metodo) && (!p.dataCompensacao || p.dataCompensacao <= today));
    const cashPayments = payments.filter(p => !isCard(p.metodo));

    const totalDisponivel = [...cashPayments, ...cardCompensated].reduce((s, p) => s + p.valor - p.taxaCartao, 0);
    const totalAReceberCard = cardPending.reduce((s, p) => s + p.valor - p.taxaCartao, 0);

    const aReceberContas = contasFiltradas.filter(c => c.tipo === "receber" && c.status !== "paga").reduce((s, c) => s + (c.valor || 0), 0);
    const aPagarContas = contasFiltradas.filter(c => c.tipo === "pagar" && c.status !== "paga").reduce((s, c) => s + (c.valor || 0), 0);
    const contasPagas = contasFiltradas.filter(c => c.status === "paga" && c.dataPagamento && c.dataPagamento >= dataInicio && c.dataPagamento <= dataFim);
    const saidasPagas = contasPagas.filter(c => c.tipo === "pagar").reduce((s, c) => s + (c.valor || 0), 0);
    const entradasPagas = contasPagas.filter(c => c.tipo === "receber").reduce((s, c) => s + (c.valor || 0), 0);
    const contasPendentes = contasFiltradas.filter(c => c.status !== "paga");

    const byDay: Record<string, { liquido: number; bruto: number; count: number }> = {};
    comandas.forEach(c => {
      const d = c.dataFechamento ? new Date(c.dataFechamento).toLocaleDateString("pt-BR") : "—";
      if (!byDay[d]) byDay[d] = { liquido: 0, bruto: 0, count: 0 };
      byDay[d].liquido += c.valorLiquido ?? c.valorTotal ?? 0;
      byDay[d].bruto += c.valorTotal ?? 0;
      byDay[d].count += 1;
    });

    return {
      totalBruto, totalLiquido, totalTaxas, totalGorjetas,
      totalDisponivel, totalAReceberCard,
      aReceberContas, aPagarContas,
      saidasPagas, entradasPagas,
      contasPendentes,
      cardPending, byDay,
    };
  }, [comandas, contasFiltradas, today, dataInicio, dataFim]);

  return (
    <ScreenContainer
      title="Fluxo de caixa"
      subtitle={`${dataInicio} → ${dataFim}`}
      refreshing={(comandasQ.isFetching || contasQ.isFetching) && !isLoading}
      onRefresh={() => { comandasQ.refetch(); contasQ.refetch(); }}
    >
      <View style={styles.filterCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.fieldLabel}>De</Text>
          <TextInput style={styles.input} value={dataInicio} onChangeText={setDataInicio} placeholder="AAAA-MM-DD" placeholderTextColor={Colors.textMuted} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.fieldLabel}>Até</Text>
          <TextInput style={styles.input} value={dataFim} onChangeText={setDataFim} placeholder="AAAA-MM-DD" placeholderTextColor={Colors.textMuted} />
        </View>
        <TouchableOpacity style={styles.searchBtn} onPress={() => { comandasQ.refetch(); contasQ.refetch(); }}>
          <Feather name="search" size={16} color={Colors.accent} />
        </TouchableOpacity>
      </View>

      <Text style={styles.fieldLabel}>Categoria</Text>
      <View style={styles.catRow}>
        <TouchableOpacity
          style={[styles.catChip, categoria === "todas" && styles.catChipActive]}
          onPress={() => setCategoria("todas")}
        >
          <Text style={[styles.catChipText, categoria === "todas" && styles.catChipTextActive]}>Todas</Text>
        </TouchableOpacity>
        {categoriasDisponiveis.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[styles.catChip, categoria === cat && styles.catChipActive]}
            onPress={() => setCategoria(cat)}
          >
            <Text style={[styles.catChipText, categoria === cat && styles.catChipTextActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.tabRow}>
        {(["movimentado", "disponivel", "receber"] as Tab[]).map(t => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === "movimentado" ? "Movimentado" : t === "disponivel" ? "Disponível" : "A receber"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <SkeletonList count={3} />
      ) : isError ? (
        <ErrorView error={error} onRetry={() => { comandasQ.refetch(); contasQ.refetch(); }} />
      ) : (
        <>
          {tab === "movimentado" && (
            <>
              <View style={styles.kpiGrid}>
                <Kpi tone={Colors.success} icon="trending-up" label="Receita bruta" value={formatCurrency(computed.totalBruto)} />
                <Kpi tone={Colors.accent} icon="dollar-sign" label="Receita líquida" value={formatCurrency(computed.totalLiquido)} sub={computed.totalTaxas > 0 ? `taxas: -${formatCurrency(computed.totalTaxas)}` : undefined} />
                <Kpi tone={Colors.info} icon="arrow-up-circle" label="Contas a receber" value={formatCurrency(computed.aReceberContas)} />
                <Kpi tone={Colors.error} icon="arrow-down-circle" label="Contas a pagar" value={formatCurrency(computed.aPagarContas)} />
              </View>
              <View style={styles.saldoCard}>
                <View>
                  <Text style={styles.saldoLabel}>Saldo do período</Text>
                  <Text style={styles.saldoSub}>Líquido + a receber − a pagar</Text>
                </View>
                <Text style={[styles.saldoValue, { color: (computed.totalLiquido + computed.aReceberContas - computed.aPagarContas) >= 0 ? Colors.success : Colors.error }]}>
                  {formatCurrency(computed.totalLiquido + computed.aReceberContas - computed.aPagarContas)}
                </Text>
              </View>
              <Text style={styles.sectionTitle}>Receitas por dia</Text>
              {Object.keys(computed.byDay).length === 0 ? (
                <EmptyState icon="bar-chart-2" title="Sem comandas" description="Nenhuma comanda fechada no período." />
              ) : (
                <View style={{ gap: 6 }}>
                  {Object.entries(computed.byDay).map(([dia, v]) => (
                    <View key={dia} style={styles.dayRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.dayLabel}>{dia}</Text>
                        <Text style={styles.dayMeta}>{v.count} comanda{v.count === 1 ? "" : "s"}</Text>
                      </View>
                      <Text style={[styles.dayValue, { color: Colors.success }]}>+{formatCurrency(v.liquido)}</Text>
                    </View>
                  ))}
                </View>
              )}

              <Text style={styles.sectionTitle}>Resumo de contas no período</Text>
              <View style={styles.statRow}>
                <View style={styles.statBox}>
                  <Text style={[styles.statValue, { color: Colors.success }]}>+{formatCurrency(computed.entradasPagas)}</Text>
                  <Text style={styles.statLabel}>Entradas pagas</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={[styles.statValue, { color: Colors.error }]}>−{formatCurrency(computed.saidasPagas)}</Text>
                  <Text style={styles.statLabel}>Saídas pagas</Text>
                </View>
              </View>

              <Text style={styles.sectionTitle}>Contas pendentes</Text>
              {computed.contasPendentes.length === 0 ? (
                <EmptyState icon="check-circle" title="Tudo em dia" description="Sem contas em aberto." />
              ) : (
                <View style={{ gap: 6 }}>
                  {computed.contasPendentes
                    .slice()
                    .sort((a, b) => (a.dataVencimento || "").localeCompare(b.dataVencimento || ""))
                    .map(c => {
                      const tone = c.tipo === "pagar" ? Colors.error : Colors.success;
                      return (
                        <View key={c.id} style={styles.contaRow}>
                          <View style={[styles.movIcon, { backgroundColor: tone + "1f" }]}>
                            <Feather name={c.tipo === "pagar" ? "arrow-down-circle" : "arrow-up-circle"} size={14} color={tone} />
                          </View>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={styles.contaTitle} numberOfLines={1}>{c.descricao}</Text>
                            <Text style={styles.contaMeta} numberOfLines={1}>
                              {(c.categoria || "Sem categoria")} · vence {c.dataVencimento ?? "—"}
                            </Text>
                          </View>
                          <Text style={[styles.contaValue, { color: tone }]}>
                            {c.tipo === "pagar" ? "−" : "+"}{formatCurrency(c.valor)}
                          </Text>
                        </View>
                      );
                    })}
                </View>
              )}
            </>
          )}

          {tab === "disponivel" && (
            <>
              <View style={styles.kpiGrid}>
                <Kpi tone={Colors.success} icon="check-circle" label="Total disponível" value={formatCurrency(computed.totalDisponivel)} sub="Dinheiro/PIX + cartões compensados" />
                <Kpi tone={Colors.info} icon="clock" label="Aguardando compensação" value={formatCurrency(computed.totalAReceberCard)} sub={`${computed.cardPending.length} pgto.`} />
                <Kpi tone={Colors.warning} icon="credit-card" label="Taxas retidas" value={`-${formatCurrency(computed.totalTaxas)}`} />
              </View>
            </>
          )}

          {tab === "receber" && (
            <>
              <View style={styles.kpiGrid}>
                <Kpi tone={Colors.info} icon="credit-card" label="Cartões pendentes" value={formatCurrency(computed.totalAReceberCard)} sub={`${computed.cardPending.length} pgto.`} />
                <Kpi tone={Colors.success} icon="arrow-up-circle" label="Contas a receber" value={formatCurrency(computed.aReceberContas)} />
              </View>
              <Text style={styles.sectionTitle}>Recebimentos de cartão pendentes</Text>
              {computed.cardPending.length === 0 ? (
                <EmptyState icon="credit-card" title="Tudo compensado" description="Nenhum recebimento de cartão pendente." />
              ) : (
                <View style={{ gap: 6 }}>
                  {computed.cardPending
                    .slice()
                    .sort((a, b) => (a.dataCompensacao || "").localeCompare(b.dataCompensacao || ""))
                    .map((p, idx) => (
                      <View key={`${p.comandaId}-${idx}`} style={styles.cardPendRow}>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={styles.cardPendTitle} numberOfLines={1}>Comanda #{p.comandaId} · {p.clienteNome ?? "—"}</Text>
                          <Text style={styles.cardPendMeta} numberOfLines={1}>
                            {p.metodo === "credito" ? "Crédito" : "Débito"}{p.bandeira ? ` · ${p.bandeira}` : ""} · compensa {p.dataCompensacao}
                          </Text>
                        </View>
                        <Text style={[styles.cardPendValue, { color: Colors.info }]}>{formatCurrency(p.valor - p.taxaCartao)}</Text>
                      </View>
                    ))}
                </View>
              )}
            </>
          )}
        </>
      )}
    </ScreenContainer>
  );
}

function Kpi({
  icon, label, value, sub, tone,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  sub?: string;
  tone: string;
}) {
  return (
    <View style={styles.kpiCard}>
      <View style={[styles.kpiIcon, { backgroundColor: tone + "1f" }]}>
        <Feather name={icon} size={14} color={tone} />
      </View>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={[styles.kpiValue, { color: tone }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      {sub ? <Text style={styles.kpiSub}>{sub}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  filterCard: { flexDirection: "row", gap: 8, alignItems: "flex-end", marginBottom: 12 },
  fieldLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: Colors.textMuted, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: Colors.text, fontSize: 13, fontFamily: "Inter_400Regular" },
  searchBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.accent + "1a", borderWidth: 1, borderColor: Colors.accent + "55", alignItems: "center", justifyContent: "center" },
  tabRow: { flexDirection: "row", gap: 6, marginBottom: 14 },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 10, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder },
  tabActive: { backgroundColor: Colors.accent + "22", borderColor: Colors.accent + "55" },
  tabText: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  tabTextActive: { color: Colors.accent, fontFamily: "Inter_600SemiBold" },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  kpiCard: { flexBasis: "48%", flexGrow: 1, padding: 12, borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder },
  kpiIcon: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  kpiLabel: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 },
  kpiValue: { fontSize: 17, fontFamily: "Inter_700Bold", marginTop: 4 },
  kpiSub: { fontSize: 10, color: Colors.textMuted, fontFamily: "Inter_400Regular", marginTop: 2 },
  saldoCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4, padding: 14, borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder },
  saldoLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.text },
  saldoSub: { fontSize: 11, color: Colors.textMuted, fontFamily: "Inter_400Regular", marginTop: 2 },
  saldoValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  sectionTitle: { fontSize: 12, fontFamily: "Inter_700Bold", color: Colors.textMuted, textTransform: "uppercase", letterSpacing: 1.1, marginTop: 18, marginBottom: 8, paddingHorizontal: 4 },
  dayRow: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder },
  dayLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.text },
  dayMeta: { fontSize: 11, color: Colors.textMuted, fontFamily: "Inter_400Regular", marginTop: 2 },
  dayValue: { fontSize: 14, fontFamily: "Inter_700Bold" },
  cardPendRow: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder },
  cardPendTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.text },
  cardPendMeta: { fontSize: 11, color: Colors.textSecondary, fontFamily: "Inter_400Regular", marginTop: 2 },
  cardPendValue: { fontSize: 14, fontFamily: "Inter_700Bold" },
  contaRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder },
  contaTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.text },
  contaMeta: { fontSize: 11, color: Colors.textSecondary, fontFamily: "Inter_400Regular", marginTop: 2 },
  contaValue: { fontSize: 14, fontFamily: "Inter_700Bold" },
  movIcon: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  statRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  statBox: { flex: 1, padding: 12, borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder },
  statValue: { fontSize: 15, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, color: Colors.textMuted, fontFamily: "Inter_500Medium", marginTop: 4, textTransform: "uppercase", letterSpacing: 0.5 },
  catRow: { flexDirection: "row", gap: 6, flexWrap: "wrap", marginBottom: 12 },
  catChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder },
  catChipActive: { backgroundColor: Colors.accent + "22", borderColor: Colors.accent + "55" },
  catChipText: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.textSecondary, textTransform: "capitalize" },
  catChipTextActive: { color: Colors.accent, fontFamily: "Inter_600SemiBold" },
});
