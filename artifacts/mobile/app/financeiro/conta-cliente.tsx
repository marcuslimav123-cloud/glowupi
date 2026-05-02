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
import { fetchJson, formatCurrency } from "@/lib/api";

type Cliente = { id: number; nome: string; email?: string | null; telefone?: string | null };
type Comanda = {
  id: number;
  clienteNome: string | null;
  profissionalNome?: string | null;
  dataFechamento: string | null;
  valorTotal: number;
  servicos?: { nome: string }[];
};

export default function ContaClienteScreen() {
  const { barbeariaId } = useAuth();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Cliente | null>(null);

  const clientesQ = useQuery<Cliente[]>({
    queryKey: ["fin-clientes", barbeariaId],
    enabled: !!barbeariaId,
    queryFn: async () => {
      const r = await fetchJson<Cliente[]>(`/barbearias/${barbeariaId}/clientes`);
      return Array.isArray(r) ? r : [];
    },
  });

  const comandasQ = useQuery<Comanda[]>({
    queryKey: ["fin-comandas-all", barbeariaId],
    enabled: !!barbeariaId,
    queryFn: async () => {
      const r = await fetchJson<Comanda[]>(`/barbearias/${barbeariaId}/comandas`);
      return Array.isArray(r) ? r : [];
    },
  });

  const isLoading = clientesQ.isLoading || comandasQ.isLoading;
  const isError = clientesQ.isError || comandasQ.isError;
  const error = clientesQ.error || comandasQ.error;

  const clientes = clientesQ.data ?? [];
  const comandas = comandasQ.data ?? [];

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return clientes;
    return clientes.filter(c => (c.nome ?? "").toLowerCase().includes(term) || (c.email ?? "").toLowerCase().includes(term) || (c.telefone ?? "").includes(term));
  }, [clientes, search]);

  const totalsByName = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    comandas.forEach(c => {
      const n = c.clienteNome || "—";
      if (!map[n]) map[n] = { total: 0, count: 0 };
      map[n].total += c.valorTotal || 0;
      map[n].count += 1;
    });
    return map;
  }, [comandas]);

  const selComandas = useMemo(() => {
    if (!selected) return [];
    return comandas
      .filter(c => c.clienteNome === selected.nome)
      .sort((a, b) => (b.dataFechamento || "").localeCompare(a.dataFechamento || ""));
  }, [comandas, selected]);

  const refetchAll = () => { clientesQ.refetch(); comandasQ.refetch(); };

  return (
    <ScreenContainer
      title={selected ? selected.nome : "Conta do cliente"}
      subtitle={selected ? `${selComandas.length} comanda${selComandas.length === 1 ? "" : "s"}` : `${filtered.length} cliente${filtered.length === 1 ? "" : "s"}`}
      refreshing={(clientesQ.isFetching || comandasQ.isFetching) && !isLoading}
      onRefresh={refetchAll}
      rightAction={selected ? { icon: "x", label: "Voltar", onPress: () => setSelected(null) } : undefined}
    >
      {selected ? (
        <>
          <View style={styles.profileCard}>
            <View style={[styles.avatar, { backgroundColor: Colors.accent + "22" }]}>
              <Text style={[styles.avatarText, { color: Colors.accent }]}>{selected.nome.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.profileName}>{selected.nome}</Text>
              <Text style={styles.profileMeta}>{selected.email || selected.telefone || "—"}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.profileTotalLabel}>Total gasto</Text>
              <Text style={styles.profileTotalValue}>{formatCurrency(totalsByName[selected.nome]?.total || 0)}</Text>
            </View>
          </View>

          {isLoading ? (
            <SkeletonList count={3} variant="row" />
          ) : selComandas.length === 0 ? (
            <EmptyState icon="receipt" title="Sem comandas" description="Este cliente ainda não possui comandas finalizadas." />
          ) : (
            <View style={{ gap: 6 }}>
              {selComandas.map(c => (
                <View key={c.id} style={styles.comandaRow}>
                  <View style={[styles.comandaIcon, { backgroundColor: Colors.success + "1f" }]}>
                    <Feather name="receipt" size={14} color={Colors.success} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.comandaTitle} numberOfLines={1}>
                      {(c.servicos || []).map(s => s.nome).filter(Boolean).join(", ") || `Comanda #${c.id}`}
                    </Text>
                    <Text style={styles.comandaMeta} numberOfLines={1}>
                      {c.profissionalNome || "—"}{c.dataFechamento ? ` · ${new Date(c.dataFechamento).toLocaleDateString("pt-BR")}` : ""}
                    </Text>
                  </View>
                  <Text style={styles.comandaValue}>{formatCurrency(c.valorTotal)}</Text>
                </View>
              ))}
            </View>
          )}
        </>
      ) : (
        <>
          <View style={styles.searchWrap}>
            <Feather name="search" size={16} color={Colors.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Buscar cliente..."
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          {isLoading ? (
            <SkeletonList count={5} variant="row" />
          ) : isError ? (
            <ErrorView error={error} onRetry={refetchAll} />
          ) : filtered.length === 0 ? (
            <EmptyState icon="user" title="Nenhum cliente" description="Cadastre clientes para acompanhar a conta de cada um." />
          ) : (
            <View style={{ gap: 6 }}>
              {filtered.map(c => {
                const total = totalsByName[c.nome] || { total: 0, count: 0 };
                return (
                  <TouchableOpacity key={c.id} style={styles.clienteRow} onPress={() => setSelected(c)}>
                    <View style={[styles.avatar, { backgroundColor: Colors.surfaceLight }]}>
                      <Text style={[styles.avatarText, { color: Colors.accent }]}>{c.nome.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.clienteName} numberOfLines={1}>{c.nome}</Text>
                      <Text style={styles.clienteMeta} numberOfLines={1}>{c.telefone || c.email || "—"}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={styles.clienteValue}>{formatCurrency(total.total)}</Text>
                      <Text style={styles.clienteCount}>{total.count} comanda{total.count === 1 ? "" : "s"}</Text>
                    </View>
                    <Feather name="chevron-right" size={16} color={Colors.textMuted} />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  searchWrap: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder, marginBottom: 14 },
  searchInput: { flex: 1, color: Colors.text, fontSize: 14, fontFamily: "Inter_400Regular" },
  clienteRow: { flexDirection: "row", alignItems: "center", padding: 10, borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder, gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  clienteName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text },
  clienteMeta: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2 },
  clienteValue: { fontSize: 13, fontFamily: "Inter_700Bold", color: Colors.text },
  clienteCount: { fontSize: 10, fontFamily: "Inter_500Medium", color: Colors.textMuted, marginTop: 2 },
  profileCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, backgroundColor: Colors.accent + "1a", borderWidth: 1, borderColor: Colors.accent + "44", marginBottom: 14 },
  profileName: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.text },
  profileMeta: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2 },
  profileTotalLabel: { fontSize: 10, fontFamily: "Inter_500Medium", color: Colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },
  profileTotalValue: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.accent, marginTop: 2 },
  comandaRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder },
  comandaIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  comandaTitle: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.text },
  comandaMeta: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2 },
  comandaValue: { fontSize: 13, fontFamily: "Inter_700Bold", color: Colors.text },
});
