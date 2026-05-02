import React, { useCallback, useMemo, useState } from "react";
import { Alert, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { ScreenContainer } from "@/components/ScreenContainer";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonList } from "@/components/Skeleton";
import { SectionHeader } from "@/components/SectionHeader";
import { fetchJson, getErrorMessage } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

type ParamRow = {
  chave: string;
  label: string;
  categoria: string;
  tipo: "select" | "input";
  opcoes?: string[];
  valor: string;
};

type Picker = { row: ParamRow } | null;
type Editor = { row: ParamRow; value: string } | null;

export default function ParametrosScreen() {
  const { barbeariaId } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [picker, setPicker] = useState<Picker>(null);
  const [editor, setEditor] = useState<Editor>(null);

  const query = useQuery<ParamRow[]>({
    queryKey: ["parametros", barbeariaId],
    enabled: !!barbeariaId,
    queryFn: async () => {
      const r = await fetchJson<ParamRow[]>(`/barbearias/${barbeariaId}/parametros`);
      return Array.isArray(r) ? r : [];
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ chave, valor }: { chave: string; valor: string }) =>
      fetchJson(`/barbearias/${barbeariaId}/parametros/${encodeURIComponent(chave)}`, {
        method: "PUT",
        body: { valor },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["parametros", barbeariaId] });
    },
    onError: (e) => Alert.alert("Erro", getErrorMessage(e)),
  });

  const grouped = useMemo(() => {
    const data = query.data ?? [];
    const filtered = search
      ? data.filter(
          (p) =>
            p.label.toLowerCase().includes(search.toLowerCase()) ||
            p.categoria.toLowerCase().includes(search.toLowerCase()),
        )
      : data;
    const map = new Map<string, ParamRow[]>();
    for (const p of filtered) {
      const arr = map.get(p.categoria) ?? [];
      arr.push(p);
      map.set(p.categoria, arr);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [query.data, search]);

  const onChangeValue = useCallback(
    (chave: string, valor: string) => {
      updateMutation.mutate({ chave, valor });
    },
    [updateMutation],
  );

  return (
    <ScreenContainer title="Parâmetros" subtitle="Configurações operacionais">
      <View style={styles.searchWrap}>
        <Feather name="search" size={14} color={Colors.textMuted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar parâmetro…"
          placeholderTextColor={Colors.textMuted}
          style={styles.search}
        />
      </View>

      {query.isLoading ? (
        <SkeletonList count={5} variant="card" />
      ) : query.isError ? (
        <EmptyState icon="alert-triangle" title="Erro ao carregar" description={getErrorMessage(query.error)} />
      ) : grouped.length === 0 ? (
        <EmptyState icon="search" title="Nenhum parâmetro" description="Tente outra busca." />
      ) : (
        grouped.map(([cat, rows]) => (
          <View key={cat}>
            <SectionHeader label={cat} />
            <View style={styles.card}>
              {rows.map((row) => (
                <Pressable
                  key={row.chave}
                  onPress={() => (row.tipo === "select" ? setPicker({ row }) : setEditor({ row, value: row.valor }))}
                  style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
                >
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={styles.label}>{row.label}</Text>
                    <Text style={styles.value}>{row.valor || "—"}</Text>
                  </View>
                  <Feather name={row.tipo === "select" ? "chevron-right" : "edit-2"} size={16} color={Colors.textMuted} />
                </Pressable>
              ))}
            </View>
          </View>
        ))
      )}

      <Modal visible={!!picker} transparent animationType="slide" onRequestClose={() => setPicker(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPicker(null)}>
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            <Text style={styles.modalTitle}>{picker?.row.label}</Text>
            <View style={{ marginTop: 8 }}>
              {(picker?.row.opcoes ?? []).map((opt) => (
                <Pressable
                  key={opt}
                  onPress={() => {
                    if (picker) onChangeValue(picker.row.chave, opt);
                    setPicker(null);
                  }}
                  style={({ pressed }) => [styles.optRow, pressed && { backgroundColor: Colors.surfaceLight }]}
                >
                  <Text style={[styles.optText, picker?.row.valor === opt && { color: Colors.accent }]}>{opt}</Text>
                  {picker?.row.valor === opt ? <Feather name="check" size={16} color={Colors.accent} /> : null}
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={!!editor} transparent animationType="fade" onRequestClose={() => setEditor(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setEditor(null)}>
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            <Text style={styles.modalTitle}>{editor?.row.label}</Text>
            <TextInput
              value={editor?.value ?? ""}
              onChangeText={(t) => setEditor((cur) => (cur ? { ...cur, value: t } : cur))}
              style={styles.input}
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
            />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setEditor(null)} style={[styles.btn, styles.btnGhost]}>
                <Text style={styles.btnGhostText}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (editor) onChangeValue(editor.row.chave, editor.value);
                  setEditor(null);
                }}
                style={[styles.btn, styles.btnPrimary]}
              >
                <Text style={styles.btnPrimaryText}>Salvar</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 10 : 6,
    marginBottom: 8,
  },
  search: { flex: 1, color: Colors.text, fontFamily: "Inter_500Medium", fontSize: 13 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  label: { color: Colors.text, fontFamily: "Inter_500Medium", fontSize: 13 },
  value: { color: Colors.textSecondary, fontFamily: "Inter_500Medium", fontSize: 12 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 18,
    maxHeight: "75%",
    borderTopWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  modalTitle: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.text, marginBottom: 8 },
  optRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 10,
  },
  optText: { color: Colors.text, fontFamily: "Inter_500Medium", fontSize: 14 },
  input: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    color: Colors.text,
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    marginTop: 12,
  },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 14 },
  btn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  btnGhost: { backgroundColor: Colors.surfaceLight, borderWidth: 1, borderColor: Colors.surfaceBorder },
  btnGhostText: { color: Colors.text, fontFamily: "Inter_600SemiBold", fontSize: 13 },
  btnPrimary: { backgroundColor: Colors.accent },
  btnPrimaryText: { color: "#000", fontFamily: "Inter_600SemiBold", fontSize: 13 },
});
