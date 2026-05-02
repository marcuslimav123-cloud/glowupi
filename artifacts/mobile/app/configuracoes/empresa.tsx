import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useColors, type ColorPalette } from "@/lib/theme";
import { ScreenContainer } from "@/components/ScreenContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { ErrorView } from "@/components/ErrorView";
import { useAuth } from "@/contexts/AuthContext";
import { fetchJson, getErrorMessage } from "@/lib/api";

interface BarbeariaFull {
  id: number;
  nome: string;
  slug: string;
  telefone?: string | null;
  email?: string | null;
  cnpj?: string | null;
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  subscriptionStatus?: string | null;
}

export default function EmpresaScreen() {
  const { user, refreshUser } = useAuth();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const qc = useQueryClient();
  const canManage = user?.role === "dono";

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [cep, setCep] = useState("");
  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");
  const [saving, setSaving] = useState(false);

  const { data, isLoading, isError, refetch, isRefetching, error } = useQuery<BarbeariaFull>({
    queryKey: ["barbearia-me"],
    queryFn: () => fetchJson<BarbeariaFull>(`/barbearias/me`),
  });

  useEffect(() => {
    if (!data) return;
    setNome(data.nome || "");
    setTelefone(data.telefone || "");
    setEmail(data.email || "");
    setCnpj(data.cnpj || "");
    setCep(data.cep || "");
    setLogradouro(data.logradouro || "");
    setNumero(data.numero || "");
    setBairro(data.bairro || "");
    setCidade(data.cidade || "");
    setUf(data.uf || "");
  }, [data]);

  const handleSave = async () => {
    if (nome.trim().length < 2) {
      Alert.alert("Nome inválido", "Informe o nome da empresa.");
      return;
    }
    setSaving(true);
    try {
      await fetchJson(`/barbearias/me`, {
        method: "PUT",
        body: {
          nome: nome.trim(),
          telefone: telefone.trim() || null,
          email: email.trim() || null,
          cnpj: cnpj.trim() || null,
          cep: cep.trim() || null,
          logradouro: logradouro.trim() || null,
          numero: numero.trim() || null,
          bairro: bairro.trim() || null,
          cidade: cidade.trim() || null,
          uf: uf.trim().toUpperCase() || null,
        },
      });
      await refreshUser();
      qc.invalidateQueries({ queryKey: ["barbearia-me"] });
      Alert.alert("Pronto", "Dados da empresa atualizados.");
    } catch (e) {
      Alert.alert("Erro", getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <ScreenContainer title="Empresa">
        <View style={{ alignItems: "center", paddingVertical: 40 }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </ScreenContainer>
    );
  }

  if (isError || !data) {
    return (
      <ScreenContainer title="Empresa" refreshing={isRefetching} onRefresh={refetch}>
        <ErrorView error={error} onRetry={refetch} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer title="Empresa" subtitle="Dados do estabelecimento" refreshing={isRefetching} onRefresh={refetch}>
      <SectionHeader label="Identificação" />
      <View style={styles.card}>
        <Field label="Nome" value={nome} onChange={setNome} editable={canManage} colors={colors} styles={styles} />
        <Field label="CNPJ" value={cnpj} onChange={setCnpj} editable={canManage} colors={colors} styles={styles} keyboard="numbers-and-punctuation" />
        <Field label="Slug" value={data.slug} editable={false} colors={colors} styles={styles} last />
      </View>

      <SectionHeader label="Contato" />
      <View style={styles.card}>
        <Field label="Telefone" value={telefone} onChange={setTelefone} editable={canManage} colors={colors} styles={styles} keyboard="phone-pad" />
        <Field label="E-mail" value={email} onChange={setEmail} editable={canManage} colors={colors} styles={styles} keyboard="email-address" last />
      </View>

      <SectionHeader label="Endereço" />
      <View style={styles.card}>
        <Field label="CEP" value={cep} onChange={setCep} editable={canManage} colors={colors} styles={styles} keyboard="numbers-and-punctuation" />
        <Field label="Logradouro" value={logradouro} onChange={setLogradouro} editable={canManage} colors={colors} styles={styles} />
        <Field label="Número" value={numero} onChange={setNumero} editable={canManage} colors={colors} styles={styles} />
        <Field label="Bairro" value={bairro} onChange={setBairro} editable={canManage} colors={colors} styles={styles} />
        <Field label="Cidade" value={cidade} onChange={setCidade} editable={canManage} colors={colors} styles={styles} />
        <Field label="UF" value={uf} onChange={(v) => setUf(v.toUpperCase().slice(0, 2))} editable={canManage} colors={colors} styles={styles} last />
      </View>

      {canManage ? (
        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={({ pressed }) => [styles.saveBtn, (pressed || saving) && { opacity: 0.85 }]}
        >
          {saving ? (
            <ActivityIndicator color={colors.invertedText} />
          ) : (
            <Text style={styles.saveBtnText}>Salvar alterações</Text>
          )}
        </Pressable>
      ) : (
        <Text style={styles.hint}>Somente o(a) proprietário(a) pode editar.</Text>
      )}
    </ScreenContainer>
  );
}

function Field({
  label, value, onChange, editable = true, last, multiline, keyboard, colors, styles,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  editable?: boolean;
  last?: boolean;
  multiline?: boolean;
  keyboard?: "default" | "phone-pad" | "email-address" | "numbers-and-punctuation";
  colors: ColorPalette;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={[styles.row, last && { borderBottomWidth: 0 }]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        editable={editable && !!onChange}
        placeholder={editable ? "—" : ""}
        placeholderTextColor={colors.textMuted}
        multiline={multiline}
        keyboardType={keyboard || "default"}
        style={[styles.input, multiline && { minHeight: 60, textAlignVertical: "top" }, !editable && { opacity: 0.7 }]}
      />
    </View>
  );
}

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
    card: { backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.surfaceBorder, overflow: "hidden" },
    row: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.surfaceBorder },
    rowLabel: { color: c.textMuted, fontFamily: "Inter_500Medium", fontSize: 11, marginBottom: 4 },
    input: { color: c.text, fontFamily: "Inter_600SemiBold", fontSize: 14, paddingVertical: 4 },
    saveBtn: { backgroundColor: c.accent, padding: 14, borderRadius: 12, alignItems: "center", marginTop: 16 },
    saveBtnText: { color: c.invertedText, fontFamily: "Inter_700Bold", fontSize: 15 },
    hint: { color: c.textMuted, fontFamily: "Inter_500Medium", fontSize: 11, textAlign: "center", marginTop: 16 },
  });
