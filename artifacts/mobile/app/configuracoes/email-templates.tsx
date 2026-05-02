import React, { useEffect, useState } from "react";
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { ScreenContainer } from "@/components/ScreenContainer";
import { SkeletonList } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { fetchJson, getErrorMessage } from "@/lib/api";

type TemplateMeta = {
  tipo: string;
  label: string;
  variaveis: string[];
  exemplos: Record<string, string>;
};

type TemplateRow = {
  tipo: string;
  label: string;
  assunto: string;
  corpo: string;
  variaveis: string[];
  isCustom: boolean;
};

type Editing = { tipo: string; assunto: string; corpo: string; label: string; variaveis: string[] } | null;

export default function EmailTemplatesScreen() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Editing>(null);

  const listQuery = useQuery<TemplateRow[]>({
    queryKey: ["email-templates"],
    queryFn: async () => {
      const r = await fetchJson<TemplateRow[]>(`/email-templates`);
      return Array.isArray(r) ? r : [];
    },
  });

  const updateMutation = useMutation({
    mutationFn: (e: { tipo: string; assunto: string; corpo: string }) =>
      fetchJson(`/email-templates/${encodeURIComponent(e.tipo)}`, {
        method: "PUT",
        body: { assunto: e.assunto, corpo: e.corpo },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email-templates"] });
      setEditing(null);
    },
    onError: (e) => Alert.alert("Erro", getErrorMessage(e)),
  });

  return (
    <ScreenContainer title="Templates de e-mail" subtitle="Modelos enviados automaticamente">
      {listQuery.isLoading ? (
        <SkeletonList count={3} variant="card" />
      ) : listQuery.isError ? (
        <EmptyState icon="alert-triangle" title="Erro" description={getErrorMessage(listQuery.error)} />
      ) : (listQuery.data ?? []).length === 0 ? (
        <EmptyState icon="mail" title="Sem templates" description="Nenhum modelo cadastrado ainda." />
      ) : (
        (listQuery.data ?? []).map((t) => (
          <Pressable
            key={t.tipo}
            onPress={() =>
              setEditing({
                tipo: t.tipo,
                label: t.label,
                assunto: t.assunto,
                corpo: t.corpo,
                variaveis: t.variaveis ?? [],
              })
            }
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
          >
            <View style={styles.cardHead}>
              <View style={styles.iconWrap}><Feather name="mail" size={18} color={Colors.accent} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{t.label}</Text>
                <Text style={styles.subject} numberOfLines={1}>{t.assunto || "—"}</Text>
              </View>
              {t.isCustom ? (
                <View style={styles.badge}><Text style={styles.badgeText}>Personalizado</Text></View>
              ) : (
                <View style={[styles.badge, { backgroundColor: Colors.surfaceLight }]}>
                  <Text style={[styles.badgeText, { color: Colors.textMuted }]}>Padrão</Text>
                </View>
              )}
            </View>
            {t.variaveis?.length ? (
              <View style={styles.chips}>
                {t.variaveis.slice(0, 4).map((v) => (
                  <Text key={v} style={styles.varChip}>{`{{${v}}}`}</Text>
                ))}
                {t.variaveis.length > 4 ? <Text style={styles.varChip}>+{t.variaveis.length - 4}</Text> : null}
              </View>
            ) : null}
          </Pressable>
        ))
      )}

      <Modal visible={!!editing} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <Pressable style={styles.backdrop} onPress={() => setEditing(null)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.modalTitle}>{editing?.label}</Text>
            <ScrollView style={{ maxHeight: 460 }}>
              <Text style={styles.label}>Assunto</Text>
              <TextInput
                value={editing?.assunto ?? ""}
                onChangeText={(t) => setEditing((cur) => (cur ? { ...cur, assunto: t } : cur))}
                style={styles.input}
                placeholderTextColor={Colors.textMuted}
              />

              <Text style={styles.label}>Variáveis disponíveis</Text>
              <View style={styles.chips}>
                {(editing?.variaveis ?? []).map((v) => (
                  <Text key={v} style={styles.varChip}>{`{{${v}}}`}</Text>
                ))}
              </View>

              <Text style={styles.label}>Corpo (HTML)</Text>
              <TextInput
                value={editing?.corpo ?? ""}
                onChangeText={(t) => setEditing((cur) => (cur ? { ...cur, corpo: t } : cur))}
                multiline
                style={[styles.input, { minHeight: 220, textAlignVertical: "top", fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }), fontSize: 11 }]}
                placeholderTextColor={Colors.textMuted}
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable style={[styles.btn, styles.btnGhost]} onPress={() => setEditing(null)}>
                <Text style={styles.btnGhostText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.btn, styles.btnPrimary, updateMutation.isPending && { opacity: 0.5 }]}
                disabled={updateMutation.isPending}
                onPress={() =>
                  editing && updateMutation.mutate({ tipo: editing.tipo, assunto: editing.assunto, corpo: editing.corpo })
                }
              >
                <Text style={styles.btnPrimaryText}>{updateMutation.isPending ? "Salvando…" : "Salvar"}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.surfaceBorder,
    padding: 12, marginBottom: 8,
  },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconWrap: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(196,164,106,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  title: { color: Colors.text, fontFamily: "Inter_600SemiBold", fontSize: 13 },
  subject: { color: Colors.textSecondary, fontFamily: "Inter_500Medium", fontSize: 11, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: "rgba(196,164,106,0.18)" },
  badgeText: { color: Colors.accent, fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 0.4, textTransform: "uppercase" },
  chips: { flexDirection: "row", gap: 6, flexWrap: "wrap", marginTop: 8 },
  varChip: {
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1, borderColor: Colors.surfaceBorder,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
    color: Colors.textSecondary, fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }), fontSize: 11,
    overflow: "hidden",
  },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 18, maxHeight: "92%",
  },
  modalTitle: { color: Colors.text, fontFamily: "Inter_700Bold", fontSize: 15, marginBottom: 4 },
  label: { color: Colors.textMuted, fontFamily: "Inter_500Medium", fontSize: 11, marginTop: 10, marginBottom: 4 },
  input: {
    backgroundColor: Colors.surfaceLight, borderRadius: 10, borderWidth: 1, borderColor: Colors.surfaceBorder,
    paddingHorizontal: 12, paddingVertical: 10, color: Colors.text, fontFamily: "Inter_500Medium", fontSize: 13,
  },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 14 },
  btn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  btnGhost: { backgroundColor: Colors.surfaceLight, borderWidth: 1, borderColor: Colors.surfaceBorder },
  btnGhostText: { color: Colors.text, fontFamily: "Inter_600SemiBold", fontSize: 13 },
  btnPrimary: { backgroundColor: Colors.accent },
  btnPrimaryText: { color: "#000", fontFamily: "Inter_600SemiBold", fontSize: 13 },
});
