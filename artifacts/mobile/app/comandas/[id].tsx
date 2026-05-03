import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useColors, type ColorPalette } from "@/lib/theme";
import { useAuth } from "@/contexts/AuthContext";
import { ErrorView } from "@/components/ErrorView";
import { fetchJson, formatCurrency, getErrorMessage, whatsappLink } from "@/lib/api";

type Parametro = { chave: string; valor: string };
type Bandeira = { id: number; nome: string; categoria: string; ativo?: boolean; taxaOperadora?: string };
type FormaPagamento = { id: number; nome: string; categoria: string; ativo?: boolean };
type Profissional = { id: number; nomeExibicao: string; apelido?: string };
type Servico = { id: number; nome: string; preco: number | string; ativo?: boolean };
type Produto = { id: number; nome: string; preco: number | string; quantidade: number; ativo?: boolean };

type Agendamento = {
  id: number; clienteId?: number | null; clienteNome: string; clienteTelefone?: string | null;
  profissionalId: number; profissionalNome: string; servicoId: number; servicoNome: string;
  data: string; horaInicio: string; horaFim: string; status: string;
  valor: number | string; pago: boolean;
};

type ComandaItem = { id?: number; nome: string; valor?: number | string; quantidade?: number; comissao?: number | string };
type Pagamento = { metodo: string; valor: number; bandeira?: string };
type Comanda = {
  id: number; clienteId?: number | null; clienteNome: string;
  profissionalId: number; profissionalNome: string;
  dataFechamento: string; valorTotal: number; valorLiquido?: number | null;
  taxaCartao?: number | null; comissaoTotal: number;
  desconto?: number; descontoTipo?: string; parcelas?: number;
  servicos: ComandaItem[]; produtos: ComandaItem[];
  pagamentos: Pagamento[]; gorjeta?: { valor: number; profissionalId?: number; profissionalNome?: string } | null;
  tipoComanda: string; observacao?: string | null; status: string;
};

const PAGAMENTO_PADROES = [
  { value: "pix", label: "PIX", icon: "smartphone" as const },
  { value: "dinheiro", label: "Dinheiro", icon: "dollar-sign" as const },
  { value: "credito", label: "Crédito", icon: "credit-card" as const },
  { value: "debito", label: "Débito", icon: "credit-card" as const },
];
const requiresBandeira = (m: string) => m === "credito" || m === "debito";

type LocalPagamento = { metodo: string; valor: string; bandeira?: string };
type LocalServicoExtra = { servicoId: number; nome: string; valor: number; profissionalId: number; profissionalNome: string };
type LocalProdutoExtra = { produtoId: number; nome: string; valor: number; quantidade: number };

export default function ComandaDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id, tipo } = useLocalSearchParams<{ id: string; tipo?: string }>();
  const isAberta = tipo !== "fechada";
  const { barbeariaId } = useAuth();
  const qc = useQueryClient();
  const webTopPad = Platform.OS === "web" ? 67 : insets.top + 8;

  if (isAberta) {
    return <AbertaView id={String(id)} insets={insets} webTopPad={webTopPad} barbeariaId={barbeariaId} qc={qc} router={router} />;
  }
  return <FechadaView id={String(id)} insets={insets} webTopPad={webTopPad} barbeariaId={barbeariaId} qc={qc} router={router} />;
}

/* ------------ ABERTA (PDV) ------------ */
function AbertaView({ id, insets, webTopPad, barbeariaId, qc, router }: any) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const numericId = parseInt(id, 10);

  const { data: parametros = {} } = useQuery<Record<string, string>>({
    queryKey: ["parametros", barbeariaId],
    queryFn: async () => {
      if (!barbeariaId) return {};
      const arr = await fetchJson<Parametro[]>(`/barbearias/${barbeariaId}/parametros`);
      const map: Record<string, string> = {};
      if (Array.isArray(arr)) for (const p of arr) if (p?.chave) map[p.chave] = p.valor;
      return map;
    },
    enabled: !!barbeariaId,
  });

  const { data: barbearia } = useQuery<{ nome?: string }>({
    queryKey: ["barbearia-info-min", barbeariaId],
    queryFn: async () => barbeariaId ? await fetchJson(`/barbearias/${barbeariaId}`) : { nome: "" },
    enabled: !!barbeariaId,
    staleTime: 60_000,
  });

  const { data: bandeiras = [] } = useQuery<Bandeira[]>({
    queryKey: ["tipos-bandeira", barbeariaId],
    queryFn: async () => {
      if (!barbeariaId) return [];
      const arr = await fetchJson<Bandeira[]>(`/barbearias/${barbeariaId}/tipos?categoria=bandeira`);
      return Array.isArray(arr) ? arr.filter(b => b.ativo !== false) : [];
    },
    enabled: !!barbeariaId,
  });

  const { data: formasPagamento = [] } = useQuery<FormaPagamento[]>({
    queryKey: ["tipos-forma-pagamento", barbeariaId],
    queryFn: async () => {
      if (!barbeariaId) return [];
      const arr = await fetchJson<FormaPagamento[]>(`/barbearias/${barbeariaId}/tipos?categoria=forma_pagamento`);
      return Array.isArray(arr) ? arr.filter(f => f.ativo !== false) : [];
    },
    enabled: !!barbeariaId,
  });

  const { data: profissionais = [] } = useQuery<Profissional[]>({
    queryKey: ["profissionais", barbeariaId],
    queryFn: async () => barbeariaId ? await fetchJson(`/barbearias/${barbeariaId}/profissionais`) : [],
    enabled: !!barbeariaId,
  });

  const { data: servicos = [] } = useQuery<Servico[]>({
    queryKey: ["servicos", barbeariaId],
    queryFn: async () => barbeariaId ? await fetchJson(`/barbearias/${barbeariaId}/servicos`) : [],
    enabled: !!barbeariaId,
  });

  const { data: produtos = [] } = useQuery<Produto[]>({
    queryKey: ["produtos", barbeariaId],
    queryFn: async () => barbeariaId ? await fetchJson(`/barbearias/${barbeariaId}/produtos`) : [],
    enabled: !!barbeariaId,
  });

  const bandeiraObrigatoria = parametros["comanda_obrigatoriedade_bandeira"] === "Sim";
  const caixinhaHabilitada = parametros["comanda_habilitar_caixinha"] === "Sim";
  const tplPosatendimento = parametros["whatsapp_template_posatendimento"] || "";
  const nomeEstabelecimento = barbearia?.nome || "";

  const { data: agend, isLoading, isError, refetch } = useQuery<Agendamento | null>({
    queryKey: ["agendamento", barbeariaId, numericId],
    queryFn: async () => {
      if (!barbeariaId || !numericId) return null;
      return await fetchJson<Agendamento>(`/barbearias/${barbeariaId}/agendamentos/${numericId}`);
    },
    enabled: !!barbeariaId && !!numericId,
  });

  const [servicosExtras, setServicosExtras] = useState<LocalServicoExtra[]>([]);
  const [produtosExtras, setProdutosExtras] = useState<LocalProdutoExtra[]>([]);
  const [desconto, setDesconto] = useState("");
  const [descontoTipo, setDescontoTipo] = useState<"valor" | "percentual">("valor");
  const [gorjeta, setGorjeta] = useState("");
  const [gorjetaProfId, setGorjetaProfId] = useState<number | null>(null);
  const [tipoComanda, setTipoComanda] = useState<"cliente" | "profissional">("cliente");
  const [parcelas, setParcelas] = useState("1");
  const [observacao, setObservacao] = useState("");
  const [pagamentos, setPagamentos] = useState<LocalPagamento[]>([{ metodo: "pix", valor: "" }]);
  const [showServicoModal, setShowServicoModal] = useState(false);
  const [showProdutoModal, setShowProdutoModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const valorServico = useMemo(() => agend ? Number(agend.valor) || 0 : 0, [agend]);
  const valorServicosExtras = servicosExtras.reduce((s, x) => s + x.valor, 0);
  const valorProdutosTotal = produtosExtras.reduce((s, p) => s + p.valor * p.quantidade, 0);
  const subtotal = valorServico + valorServicosExtras + valorProdutosTotal;
  const descontoNum = parseFloat(desconto) || 0;
  const descontoValor = descontoTipo === "percentual"
    ? subtotal * Math.min(descontoNum, 100) / 100
    : Math.min(descontoNum, subtotal);
  const gorjetaValor = parseFloat(gorjeta) || 0;
  const valorFinal = Math.max(0, subtotal - descontoValor) + gorjetaValor;
  const totalAPagar = Math.max(0, subtotal - descontoValor);

  // Auto-fill first payment when totalAPagar changes and the first payment is empty
  useEffect(() => {
    if (pagamentos.length === 1 && !pagamentos[0].valor) {
      setPagamentos([{ ...pagamentos[0], valor: totalAPagar.toFixed(2) }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalAPagar]);

  const totalPago = pagamentos.reduce((s, p) => s + (parseFloat(p.valor) || 0), 0);
  const troco = Math.max(0, totalPago - totalAPagar);
  const faltam = Math.max(0, totalAPagar - totalPago);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["comandas-abertas"] });
    qc.invalidateQueries({ queryKey: ["comandas-fechadas"] });
    qc.invalidateQueries({ queryKey: ["agendamentos"] });
    qc.invalidateQueries({ queryKey: ["agendamento"] });
  };

  const fecharComanda = async () => {
    if (!agend) return;
    if (totalPago + 0.005 < totalAPagar - gorjetaValor) {
      Alert.alert("Pagamento insuficiente", `Faltam ${formatCurrency(faltam)} para fechar a comanda.`);
      return;
    }
    if (bandeiraObrigatoria) {
      const semBandeira = pagamentos.some(p => requiresBandeira(p.metodo) && !p.bandeira);
      if (semBandeira) {
        Alert.alert("Bandeira obrigatória", "Selecione a bandeira para todos os pagamentos em cartão.");
        return;
      }
    }
    setSubmitting(true);
    try {
      const pagsBody = pagamentos
        .map(p => {
          const obj: any = { metodo: p.metodo, valor: parseFloat(p.valor) || 0 };
          if (requiresBandeira(p.metodo) && p.bandeira) obj.bandeira = p.bandeira;
          return obj;
        })
        .filter(p => p.valor > 0);
      const body: any = {
        pagamentos: pagsBody,
        tipoComanda,
        desconto: descontoNum,
        descontoTipo,
        parcelas: parseInt(parcelas) || 1,
        observacao: observacao || null,
        produtosAdicionais: produtosExtras.map(p => ({ produtoId: p.produtoId, valor: p.valor, quantidade: p.quantidade })),
        servicosAdicionais: servicosExtras.map(s => ({ servicoId: s.servicoId, valor: s.valor, profissionalId: s.profissionalId })),
      };
      if (gorjetaValor > 0 && caixinhaHabilitada) {
        body.gorjeta = { valor: gorjetaValor, profissionalId: gorjetaProfId ?? agend.profissionalId };
      }
      await fetchJson(`/barbearias/${barbeariaId}/agendamentos/${agend.id}/checkout`, {
        method: "POST",
        body,
      });
      invalidate();
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowCheckoutModal(false);

      // Pos-atendimento WhatsApp
      const phoneDigits = (agend.clienteTelefone || "").replace(/\D/g, "");
      if (phoneDigits.length >= 10 && tplPosatendimento) {
        const text = renderTemplate(tplPosatendimento, {
          cliente: agend.clienteNome || "",
          servico: agend.servicoNome || "",
          profissional: agend.profissionalNome || "",
          estabelecimento: nomeEstabelecimento,
        });
        Alert.alert("Comanda fechada", "Enviar mensagem de pós-atendimento via WhatsApp?", [
          { text: "Não", style: "cancel", onPress: () => router.back() },
          {
            text: "Enviar WhatsApp",
            onPress: () => {
              Linking.openURL(whatsappLink(agend.clienteTelefone, text));
              router.back();
            },
          },
        ]);
      } else {
        Alert.alert("Sucesso", "Comanda fechada com sucesso.", [{ text: "OK", onPress: () => router.back() }]);
      }
    } catch (e) {
      Alert.alert("Erro ao fechar comanda", getErrorMessage(e, "Tente novamente."));
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || !agend) {
    return (
      <View style={[styles.container, { paddingTop: webTopPad }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="chevron-left" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Comanda</Text>
        </View>
        <View style={{ paddingTop: 80, alignItems: "center" }}>
          {isError ? (
            <ErrorView title="Não foi possível carregar" onRetry={() => refetch()} />
          ) : (
            <ActivityIndicator color={colors.accent} />
          )}
        </View>
      </View>
    );
  }

  const todasFormas: { value: string; label: string; icon: keyof typeof Feather.glyphMap }[] = [
    ...PAGAMENTO_PADROES,
    ...formasPagamento
      .filter(f => !["pix", "dinheiro", "credito", "debito"].includes(f.nome.toLowerCase()))
      .map(f => ({ value: f.nome.toLowerCase(), label: f.nome, icon: "credit-card" as const })),
  ];

  return (
    <View style={[styles.container, { paddingTop: webTopPad }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Comanda aberta</Text>
          <Text style={styles.subtitle}>{agend.clienteNome}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 200 + insets.bottom }}>
        {/* Resumo do agendamento */}
        <View style={styles.bigCard}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View>
              <Text style={styles.cardLabel}>Atendimento</Text>
              <Text style={styles.cardTitle}>{agend.servicoNome}</Text>
              <Text style={styles.cardSub}>
                {agend.profissionalNome} • {agend.horaInicio?.slice(0, 5)} – {agend.horaFim?.slice(0, 5)}
              </Text>
            </View>
            <Text style={styles.bigValue}>{formatCurrency(valorServico)}</Text>
          </View>
        </View>

        {/* Serviços extras */}
        {servicosExtras.length > 0 && (
          <>
            <SectionTitle label="Serviços adicionais" icon="scissors" />
            {servicosExtras.map((s, idx) => (
              <View key={idx} style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{s.nome}</Text>
                  <Text style={styles.itemSub}>{s.profissionalNome}</Text>
                </View>
                <Text style={styles.itemValue}>{formatCurrency(s.valor)}</Text>
                <TouchableOpacity onPress={() => setServicosExtras(prev => prev.filter((_, i) => i !== idx))} style={styles.delBtn}>
                  <Feather name="x" size={14} color={colors.error} />
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}

        {/* Produtos */}
        {produtosExtras.length > 0 && (
          <>
            <SectionTitle label="Produtos" icon="shopping-bag" />
            {produtosExtras.map((p) => (
              <View key={p.produtoId} style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{p.nome}</Text>
                  <Text style={styles.itemSub}>{p.quantidade}× {formatCurrency(p.valor)}</Text>
                </View>
                <Text style={styles.itemValue}>{formatCurrency(p.valor * p.quantidade)}</Text>
                <TouchableOpacity onPress={() => setProdutosExtras(prev => prev.filter(x => x.produtoId !== p.produtoId))} style={styles.delBtn}>
                  <Feather name="x" size={14} color={colors.error} />
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}

        {/* Adicionar */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.smallBtn} onPress={() => setShowServicoModal(true)}>
            <Feather name="scissors" size={14} color={colors.accent} />
            <Text style={styles.smallBtnText}>+ Serviço</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.smallBtn} onPress={() => setShowProdutoModal(true)}>
            <Feather name="shopping-bag" size={14} color={colors.accent} />
            <Text style={styles.smallBtnText}>+ Produto</Text>
          </TouchableOpacity>
        </View>

        {/* Desconto */}
        <SectionTitle label="Desconto" icon="percent" />
        <View style={styles.descontoRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={desconto}
            onChangeText={setDesconto}
            placeholder="0,00"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
          />
          <View style={styles.toggleRow}>
            {(["valor", "percentual"] as const).map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.toggleBtn, descontoTipo === t && styles.toggleBtnActive]}
                onPress={() => setDescontoTipo(t)}
              >
                <Text style={[styles.toggleText, descontoTipo === t && styles.toggleTextActive]}>
                  {t === "valor" ? "R$" : "%"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Gorjeta */}
        {caixinhaHabilitada && (
          <>
            <SectionTitle label="Gorjeta / caixinha" icon="gift" />
            <TextInput
              style={styles.input}
              value={gorjeta}
              onChangeText={setGorjeta}
              placeholder="0,00 (opcional)"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
            />
            {gorjetaValor > 0 && profissionais.length > 0 && (
              <View style={{ marginTop: 8 }}>
                <Text style={styles.fieldHint}>Profissional que recebe</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                  <TouchableOpacity
                    style={[styles.profChip, gorjetaProfId === null && styles.profChipActive]}
                    onPress={() => setGorjetaProfId(null)}
                  >
                    <Text style={[styles.profChipText, gorjetaProfId === null && styles.profChipTextActive]}>
                      {agend.profissionalNome}
                    </Text>
                  </TouchableOpacity>
                  {profissionais.filter(p => p.id !== agend.profissionalId).map(p => (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.profChip, gorjetaProfId === p.id && styles.profChipActive]}
                      onPress={() => setGorjetaProfId(p.id)}
                    >
                      <Text style={[styles.profChipText, gorjetaProfId === p.id && styles.profChipTextActive]}>
                        {p.apelido || p.nomeExibicao}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </>
        )}

        {/* Tipo da comanda */}
        <SectionTitle label="Tipo da comanda" icon="user" />
        <View style={styles.toggleRowBig}>
          {([
            { v: "cliente", lbl: "Cliente paga" },
            { v: "profissional", lbl: "Lançar em conta (profissional)" },
          ] as const).map(opt => (
            <TouchableOpacity
              key={opt.v}
              style={[styles.toggleBtnBig, tipoComanda === opt.v && styles.toggleBtnBigActive]}
              onPress={() => setTipoComanda(opt.v as any)}
            >
              <Text style={[styles.toggleTextBig, tipoComanda === opt.v && styles.toggleTextBigActive]}>{opt.lbl}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {tipoComanda === "profissional" && (
          <Text style={styles.fieldHint}>O valor total será lançado como débito na conta do profissional.</Text>
        )}

        {/* Observação */}
        <SectionTitle label="Observação" icon="edit-3" />
        <TextInput
          style={[styles.input, { minHeight: 60, textAlignVertical: "top" }]}
          value={observacao}
          onChangeText={setObservacao}
          placeholder="Observação (opcional)"
          placeholderTextColor={colors.textMuted}
          multiline
        />

        {/* Resumo */}
        <View style={[styles.totalCard, { marginTop: 18 }]}>
          <RowKV label="Subtotal" value={formatCurrency(subtotal)} />
          {descontoValor > 0 && <RowKV label="Desconto" value={`-${formatCurrency(descontoValor)}`} color={colors.error} />}
          {gorjetaValor > 0 && <RowKV label="Gorjeta" value={`+${formatCurrency(gorjetaValor)}`} color={colors.success} />}
          <View style={styles.totalLine} />
          <RowKV label="Total" value={formatCurrency(valorFinal)} bold large />
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, { marginTop: 16 }]}
          onPress={() => setShowCheckoutModal(true)}
        >
          <Feather name="check-circle" size={16} color="#000" />
          <Text style={styles.primaryBtnText}>Finalizar — {formatCurrency(valorFinal)}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal: adicionar serviço */}
      <PickerModal
        visible={showServicoModal}
        title="Adicionar serviço"
        onClose={() => setShowServicoModal(false)}
        items={servicos.filter(s => s.ativo !== false).map(s => ({ id: s.id, label: s.nome, sub: formatCurrency(parseFloat(String(s.preco))) }))}
        onPick={(servId) => {
          const serv = servicos.find(s => s.id === servId);
          if (!serv) return;
          setServicosExtras(prev => [...prev, {
            servicoId: serv.id,
            nome: serv.nome,
            valor: parseFloat(String(serv.preco)),
            profissionalId: agend.profissionalId,
            profissionalNome: agend.profissionalNome,
          }]);
          setShowServicoModal(false);
        }}
        insets={insets}
      />

      {/* Modal: adicionar produto */}
      <PickerModal
        visible={showProdutoModal}
        title="Adicionar produto"
        onClose={() => setShowProdutoModal(false)}
        items={produtos.filter(p => p.ativo !== false && (p.quantidade ?? 0) > 0).map(p => ({
          id: p.id, label: p.nome, sub: `${formatCurrency(parseFloat(String(p.preco)))} • estoque ${p.quantidade}`,
        }))}
        onPick={(prodId) => {
          const prod = produtos.find(p => p.id === prodId);
          if (!prod) return;
          setProdutosExtras(prev => {
            const existing = prev.find(x => x.produtoId === prod.id);
            if (existing) return prev.map(x => x.produtoId === prod.id ? { ...x, quantidade: x.quantidade + 1 } : x);
            return [...prev, { produtoId: prod.id, nome: prod.nome, valor: parseFloat(String(prod.preco)), quantidade: 1 }];
          });
          setShowProdutoModal(false);
        }}
        insets={insets}
      />

      {/* Modal: checkout */}
      <Modal visible={showCheckoutModal} animationType="slide" transparent onRequestClose={() => setShowCheckoutModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { paddingBottom: 24 + insets.bottom, maxHeight: "90%" }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pagamento</Text>
              <TouchableOpacity onPress={() => setShowCheckoutModal(false)}>
                <Feather name="x" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 480 }}>
              {pagamentos.map((pag, idx) => (
                <View key={idx} style={styles.pagBlock}>
                  <View style={styles.pagBlockHeader}>
                    <Text style={styles.pagBlockTitle}>Pagamento {idx + 1}</Text>
                    {pagamentos.length > 1 && (
                      <TouchableOpacity onPress={() => setPagamentos(prev => prev.filter((_, i) => i !== idx))}>
                        <Feather name="trash-2" size={14} color={colors.error} />
                      </TouchableOpacity>
                    )}
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                    {todasFormas.map(f => (
                      <TouchableOpacity
                        key={f.value}
                        style={[styles.payChip, pag.metodo === f.value && styles.payChipActive]}
                        onPress={() => setPagamentos(prev => prev.map((p, i) => i === idx ? { ...p, metodo: f.value, bandeira: requiresBandeira(f.value) ? p.bandeira : undefined } : p))}
                      >
                        <Feather name={f.icon} size={12} color={pag.metodo === f.value ? "#000" : colors.textSecondary} />
                        <Text style={[styles.payChipText, pag.metodo === f.value && { color: colors.invertedText }]}>{f.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <TextInput
                    style={styles.input}
                    value={pag.valor}
                    onChangeText={v => setPagamentos(prev => prev.map((p, i) => i === idx ? { ...p, valor: v } : p))}
                    placeholder="Valor"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                  />
                  {requiresBandeira(pag.metodo) && bandeiras.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                      {bandeiras.map(b => (
                        <TouchableOpacity
                          key={b.id}
                          style={[styles.profChip, pag.bandeira === b.nome && styles.profChipActive]}
                          onPress={() => setPagamentos(prev => prev.map((p, i) => i === idx ? { ...p, bandeira: b.nome } : p))}
                        >
                          <Text style={[styles.profChipText, pag.bandeira === b.nome && styles.profChipTextActive]}>{b.nome}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>
              ))}
              <TouchableOpacity
                style={styles.addPagBtn}
                onPress={() => setPagamentos(prev => [...prev, { metodo: "dinheiro", valor: faltam.toFixed(2) }])}
              >
                <Feather name="plus" size={14} color={colors.accent} />
                <Text style={styles.smallBtnText}>Adicionar forma de pagamento</Text>
              </TouchableOpacity>
              {pagamentos.some(p => p.metodo === "credito") && (
                <View style={{ marginTop: 10 }}>
                  <Text style={styles.fieldHint}>Parcelas</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
                      <TouchableOpacity
                        key={n}
                        style={[styles.profChip, parcelas === String(n) && styles.profChipActive]}
                        onPress={() => setParcelas(String(n))}
                      >
                        <Text style={[styles.profChipText, parcelas === String(n) && styles.profChipTextActive]}>{n}x</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </ScrollView>

            <View style={[styles.totalCard, { marginTop: 12 }]}>
              <RowKV label="Total a pagar" value={formatCurrency(totalAPagar)} />
              <RowKV label="Pago" value={formatCurrency(totalPago)} color={colors.success} />
              {faltam > 0.005 && <RowKV label="Faltam" value={formatCurrency(faltam)} color={colors.error} />}
              {troco > 0.005 && <RowKV label="Troco" value={formatCurrency(troco)} color={colors.success} />}
              {gorjetaValor > 0 && <RowKV label="Gorjeta (à parte)" value={formatCurrency(gorjetaValor)} color={colors.success} />}
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, { marginTop: 14 }, (submitting || faltam > 0.005) && { opacity: 0.5 }]}
              disabled={submitting || faltam > 0.005}
              onPress={fecharComanda}
            >
              {submitting ? <ActivityIndicator color={colors.invertedText} /> : (
                <>
                  <Feather name="check" size={16} color="#000" />
                  <Text style={styles.primaryBtnText}>Confirmar pagamento</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
              <Text style={{ color: colors.muted, fontSize: 11, marginBottom: 8 }}>Cobrar cliente via Asaas</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {(["PIX", "BOLETO", "CREDIT_CARD"] as const).map(bt => (
                  <TouchableOpacity
                    key={bt}
                    style={{ flex: 1, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: "center" }}
                    onPress={async () => {
                      try {
                        const data = await fetchJson(`/barbearias/${barbeariaId}/asaas-comanda/comanda/${agend.id}/cobrar`, {
                          method: "POST",
                          body: { billingType: bt, valor: totalAPagar },
                        });
                        const url = (data as any)?.invoiceUrl || (data as any)?.bankSlipUrl;
                        if (url) Linking.openURL(url);
                        Alert.alert("Cobrança gerada", "Acompanhe em Recebimentos Asaas.");
                      } catch (e) {
                        Alert.alert("Erro", getErrorMessage(e, "Não foi possível gerar a cobrança."));
                      }
                    }}
                  >
                    <Text style={{ color: colors.text, fontSize: 12, fontWeight: "600" }}>
                      {bt === "PIX" ? "Pix" : bt === "BOLETO" ? "Boleto" : "Cartão"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ------------ FECHADA (detalhe) ------------ */
function FechadaView({ id, insets, webTopPad, barbeariaId, qc, router }: any) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const numericId = parseInt(id, 10);

  const { data: comanda, isLoading, isError, refetch } = useQuery<Comanda | null>({
    queryKey: ["comanda-detail", barbeariaId, numericId],
    queryFn: async () => {
      if (!barbeariaId || !numericId) return null;
      return await fetchJson<Comanda>(`/barbearias/${barbeariaId}/comandas/${numericId}`);
    },
    enabled: !!barbeariaId && !!numericId,
  });

  const [reabrindo, setReabrindo] = useState(false);

  const reabrir = async () => {
    if (!comanda) return;
    Alert.alert(
      "Reabrir comanda?",
      "Esta ação irá estornar o pagamento e a comanda voltará para as abertas.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Reabrir",
          style: "destructive",
          onPress: async () => {
            setReabrindo(true);
            try {
              await fetchJson(`/barbearias/${barbeariaId}/comandas/${comanda.id}/reabrir`, { method: "PUT" });
              qc.invalidateQueries({ queryKey: ["comandas-abertas"] });
              qc.invalidateQueries({ queryKey: ["comandas-fechadas"] });
              qc.invalidateQueries({ queryKey: ["agendamentos"] });
              if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              Alert.alert("Comanda reaberta", "A comanda voltou para as abertas.", [
                { text: "OK", onPress: () => router.back() },
              ]);
            } catch (e) {
              Alert.alert("Erro", getErrorMessage(e, "Não foi possível reabrir."));
            } finally {
              setReabrindo(false);
            }
          },
        },
      ]
    );
  };

  if (isLoading || !comanda) {
    return (
      <View style={[styles.container, { paddingTop: webTopPad }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="chevron-left" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Comanda</Text>
        </View>
        <View style={{ paddingTop: 80, alignItems: "center" }}>
          {isError ? <ErrorView title="Não foi possível carregar" onRetry={() => refetch()} /> : <ActivityIndicator color={colors.accent} />}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: webTopPad }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Comanda #{comanda.id}</Text>
          <Text style={styles.subtitle}>
            {new Date(comanda.dataFechamento).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 200 + insets.bottom }}>
        <View style={styles.bigCard}>
          <Text style={styles.cardLabel}>Cliente</Text>
          <Text style={styles.cardTitle}>{comanda.clienteNome}</Text>
          <Text style={styles.cardSub}>{comanda.profissionalNome}</Text>
        </View>

        {Array.isArray(comanda.servicos) && comanda.servicos.length > 0 && (
          <>
            <SectionTitle label="Serviços" icon="scissors" />
            {comanda.servicos.map((s, i) => (
              <View key={i} style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{s.nome}</Text>
                  {s.comissao != null && (
                    <Text style={styles.itemSub}>Comissão: {formatCurrency(Number(s.comissao))}</Text>
                  )}
                </View>
                <Text style={styles.itemValue}>{formatCurrency(Number(s.valor) || 0)}</Text>
              </View>
            ))}
          </>
        )}

        {Array.isArray(comanda.produtos) && comanda.produtos.length > 0 && (
          <>
            <SectionTitle label="Produtos" icon="shopping-bag" />
            {comanda.produtos.map((p, i) => (
              <View key={i} style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{p.nome}</Text>
                  {p.quantidade != null && <Text style={styles.itemSub}>Qtd: {p.quantidade}</Text>}
                </View>
                <Text style={styles.itemValue}>{formatCurrency((Number(p.valor) || 0) * (Number(p.quantidade) || 1))}</Text>
              </View>
            ))}
          </>
        )}

        {comanda.gorjeta && Number(comanda.gorjeta.valor) > 0 && (
          <>
            <SectionTitle label="Gorjeta" icon="gift" />
            <View style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>Caixinha</Text>
                {comanda.gorjeta.profissionalNome && (
                  <Text style={styles.itemSub}>Para {comanda.gorjeta.profissionalNome}</Text>
                )}
              </View>
              <Text style={[styles.itemValue, { color: colors.success }]}>+{formatCurrency(Number(comanda.gorjeta.valor))}</Text>
            </View>
          </>
        )}

        <SectionTitle label="Pagamentos" icon="credit-card" />
        {Array.isArray(comanda.pagamentos) && comanda.pagamentos.map((p, i) => (
          <View key={i} style={styles.itemRow}>
            <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Feather name={p.metodo === "pix" ? "smartphone" : p.metodo === "dinheiro" ? "dollar-sign" : "credit-card"} size={14} color={colors.textSecondary} />
              <Text style={styles.itemName}>
                {p.metodo}{p.bandeira ? ` (${p.bandeira})` : ""}
              </Text>
            </View>
            <Text style={styles.itemValue}>{formatCurrency(Number(p.valor) || 0)}</Text>
          </View>
        ))}

        {comanda.observacao && (
          <>
            <SectionTitle label="Observação" icon="edit-3" />
            <View style={styles.bigCard}>
              <Text style={styles.cardSub}>{comanda.observacao}</Text>
            </View>
          </>
        )}

        <View style={[styles.totalCard, { marginTop: 18 }]}>
          {Number(comanda.desconto) > 0 && <RowKV label="Desconto" value={`-${formatCurrency(Number(comanda.desconto))}`} color={colors.error} />}
          {comanda.taxaCartao != null && Number(comanda.taxaCartao) > 0 && (
            <RowKV label="Taxa cartão" value={`-${formatCurrency(Number(comanda.taxaCartao))}`} color={colors.warning} />
          )}
          <RowKV label="Comissão total" value={formatCurrency(Number(comanda.comissaoTotal))} color={colors.accent} />
          {comanda.valorLiquido != null && (
            <RowKV label="Valor líquido" value={formatCurrency(Number(comanda.valorLiquido))} />
          )}
          <View style={styles.totalLine} />
          <RowKV label="Total" value={formatCurrency(Number(comanda.valorTotal))} bold large />
        </View>

        <TouchableOpacity
          style={[styles.dangerBtn, { marginTop: 16 }, reabrindo && { opacity: 0.5 }]}
          disabled={reabrindo}
          onPress={reabrir}
        >
          {reabrindo ? <ActivityIndicator color={colors.warning} /> : (
            <>
              <Feather name="rotate-ccw" size={16} color={colors.warning} />
              <Text style={styles.dangerBtnText}>Reabrir comanda</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

/* ------------ Helpers / shared UI ------------ */
function SectionTitle({ label, icon }: { label: string; icon: keyof typeof Feather.glyphMap }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.sectionTitleRow}>
      <Feather name={icon} size={13} color={colors.textSecondary} />
      <Text style={styles.sectionTitle}>{label}</Text>
    </View>
  );
}

function RowKV({ label, value, color, bold, large }: { label: string; value: string; color?: string; bold?: boolean; large?: boolean }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.kvRow}>
      <Text style={[styles.kvLabel, bold && { color: colors.text, fontFamily: "Inter_600SemiBold" }, large && { fontSize: 15 }]}>{label}</Text>
      <Text style={[
        styles.kvValue,
        color ? { color } : null,
        bold && { fontFamily: "Inter_700Bold", color: color ?? colors.text },
        large && { fontSize: 18 },
      ]}>{value}</Text>
    </View>
  );
}

type PickerItem = { id: number; label: string; sub?: string };
function PickerModal({ visible, title, items, onPick, onClose, insets }: {
  visible: boolean; title: string; items: PickerItem[]; onPick: (id: number) => void; onClose: () => void; insets: any;
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [search, setSearch] = useState("");
  useEffect(() => { if (!visible) setSearch(""); }, [visible]);
  const filtered = search ? items.filter(i => i.label.toLowerCase().includes(search.toLowerCase())) : items;
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalSheet, { paddingBottom: 24 + insets.bottom, maxHeight: "85%" }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.input}
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar..."
            placeholderTextColor={colors.textMuted}
          />
          <ScrollView style={{ marginTop: 8, maxHeight: 420 }}>
            {filtered.length === 0 ? (
              <Text style={[styles.fieldHint, { textAlign: "center", paddingVertical: 24 }]}>Nada encontrado.</Text>
            ) : filtered.map(it => (
              <TouchableOpacity key={it.id} style={styles.pickerItem} onPress={() => onPick(it.id)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{it.label}</Text>
                  {it.sub && <Text style={styles.itemSub}>{it.sub}</Text>}
                </View>
                <Feather name="chevron-right" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function renderTemplate(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
}

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8, gap: 4 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontFamily: "Inter_700Bold", color: c.text },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: c.textSecondary },
  bigCard: {
    backgroundColor: c.surface, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: c.surfaceBorder, marginBottom: 4,
  },
  cardLabel: { fontSize: 11, fontFamily: "Inter_500Medium", color: c.textMuted, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 },
  cardTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: c.text },
  cardSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: c.textSecondary, marginTop: 2 },
  bigValue: { fontSize: 20, fontFamily: "Inter_700Bold", color: c.accent },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 16, marginBottom: 6 },
  sectionTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: c.textSecondary, textTransform: "uppercase", letterSpacing: 0.4 },
  itemRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: c.surface, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: c.surfaceBorder, marginBottom: 6,
  },
  itemName: { fontSize: 14, fontFamily: "Inter_500Medium", color: c.text },
  itemSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: c.textMuted, marginTop: 2 },
  itemValue: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: c.text },
  delBtn: { padding: 6 },
  actionsRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  smallBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: c.surface, borderWidth: 1, borderColor: c.surfaceBorder,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
  },
  smallBtnText: { fontSize: 13, fontFamily: "Inter_500Medium", color: c.accent },
  input: {
    backgroundColor: c.surface, borderWidth: 1, borderColor: c.surfaceBorder,
    color: c.text, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, fontSize: 14, fontFamily: "Inter_400Regular",
  },
  fieldHint: { fontSize: 11, fontFamily: "Inter_400Regular", color: c.textMuted, marginTop: 6 },
  descontoRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  toggleRow: { flexDirection: "row", backgroundColor: c.surface, borderRadius: 10, padding: 2, borderWidth: 1, borderColor: c.surfaceBorder },
  toggleBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  toggleBtnActive: { backgroundColor: c.accent },
  toggleText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: c.textSecondary },
  toggleTextActive: { color: c.invertedText },
  toggleRowBig: { flexDirection: "row", gap: 8 },
  toggleBtnBig: {
    flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center",
    backgroundColor: c.surface, borderWidth: 1, borderColor: c.surfaceBorder,
  },
  toggleBtnBigActive: { backgroundColor: c.accent + "20", borderColor: c.accent },
  toggleTextBig: { fontSize: 12, fontFamily: "Inter_500Medium", color: c.textSecondary, textAlign: "center" },
  toggleTextBigActive: { color: c.accent, fontFamily: "Inter_600SemiBold" },
  profChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: c.surface, borderWidth: 1, borderColor: c.surfaceBorder, marginRight: 6 },
  profChipActive: { backgroundColor: c.accent + "20", borderColor: c.accent },
  profChipText: { fontSize: 12, fontFamily: "Inter_500Medium", color: c.textSecondary },
  profChipTextActive: { color: c.accent, fontFamily: "Inter_600SemiBold" },
  totalCard: {
    backgroundColor: c.surface, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: c.accent + "30",
  },
  totalLine: { height: 1, backgroundColor: c.surfaceBorder, marginVertical: 8 },
  kvRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 4 },
  kvLabel: { fontSize: 13, fontFamily: "Inter_400Regular", color: c.textSecondary },
  kvValue: { fontSize: 14, fontFamily: "Inter_500Medium", color: c.text },
  primaryBtn: {
    backgroundColor: c.accent, borderRadius: 12, paddingVertical: 14,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  primaryBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: c.invertedText },
  dangerBtn: {
    backgroundColor: c.warning + "12", borderRadius: 12, paddingVertical: 14,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    borderWidth: 1, borderColor: c.warning + "55",
  },
  dangerBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: c.warning },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: c.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, borderTopWidth: 1, borderColor: c.surfaceBorder },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: c.text },
  pickerItem: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10,
    backgroundColor: c.surface, borderWidth: 1, borderColor: c.surfaceBorder, marginBottom: 6,
  },
  pagBlock: {
    backgroundColor: c.surface, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: c.surfaceBorder, marginBottom: 8,
  },
  pagBlockHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  pagBlockTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: c.text },
  payChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    backgroundColor: c.surfaceLight, borderWidth: 1, borderColor: c.surfaceBorder, marginRight: 6,
  },
  payChipActive: { backgroundColor: c.accent, borderColor: c.accent },
  payChipText: { fontSize: 12, fontFamily: "Inter_500Medium", color: c.textSecondary },
  addPagBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    backgroundColor: c.surface, borderWidth: 1, borderStyle: "dashed", borderColor: c.accent + "55",
    paddingVertical: 12, borderRadius: 10, marginTop: 4,
  },
});
