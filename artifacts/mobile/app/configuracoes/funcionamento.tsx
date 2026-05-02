import React, { useEffect, useState } from "react";
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { ScreenContainer } from "@/components/ScreenContainer";
import { SkeletonList } from "@/components/Skeleton";
import { fetchJson, getErrorMessage } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const DIAS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

type Horario = {
  dia: string;
  ativo: boolean;
  abertura: string;
  fechamento: string;
  intervaloInicio: string;
  intervaloFim: string;
};

type ProfFora = { id: number; nome: string; motivo: string };

const DEFAULT_HORARIOS: Horario[] = DIAS.map((d, i) => ({
  dia: d,
  ativo: i < 6,
  abertura: "08:00",
  fechamento: "18:00",
  intervaloInicio: "12:00",
  intervaloFim: "13:00",
}));

export default function FuncionamentoScreen() {
  const { barbeariaId } = useAuth();
  const qc = useQueryClient();
  const [horarios, setHorarios] = useState<Horario[]>(DEFAULT_HORARIOS);
  const [dirty, setDirty] = useState(false);
  const [profsFora, setProfsFora] = useState<ProfFora[]>([]);
  const [profDialog, setProfDialog] = useState(false);
  const [selectedProfIds, setSelectedProfIds] = useState<number[]>([]);

  const query = useQuery<any>({
    queryKey: ["funcionamento", barbeariaId],
    enabled: !!barbeariaId,
    queryFn: () => fetchJson(`/barbearias/me`),
  });

  useEffect(() => {
    const h = query.data?.horarioFuncionamento;
    if (Array.isArray(h) && h.length === 7) {
      setHorarios(h);
      setDirty(false);
    }
  }, [query.data]);

  const saveMutation = useMutation({
    mutationFn: () => fetchJson(`/barbearias/me`, { method: "PUT", body: { horarioFuncionamento: horarios } }),
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["funcionamento", barbeariaId] });
      setDirty(false);
      const fora: ProfFora[] = Array.isArray(data?.profsForaJanela) ? data.profsForaJanela : [];
      if (fora.length > 0) {
        setProfsFora(fora);
        setSelectedProfIds(fora.map((p) => p.id));
        setProfDialog(true);
      } else {
        Alert.alert("Salvo", "Horários atualizados com sucesso.");
      }
    },
    onError: (e) => Alert.alert("Erro ao salvar", getErrorMessage(e)),
  });

  const syncMutation = useMutation({
    mutationFn: () =>
      fetchJson(`/barbearias/${barbeariaId}/profissionais/bulk-horarios`, {
        method: "PUT",
        body: { resetToDefault: true, profissionalIds: selectedProfIds },
      }),
    onSuccess: () => {
      Alert.alert("Sincronizado", `${selectedProfIds.length} profissional(is) atualizados.`);
      setProfDialog(false);
    },
    onError: (e) => Alert.alert("Erro", getErrorMessage(e)),
  });

  const update = (i: number, patch: Partial<Horario>) => {
    setHorarios((h) => h.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
    setDirty(true);
  };

  return (
    <ScreenContainer
      title="Funcionamento"
      subtitle="Horário do estabelecimento"
      rightAction={dirty ? { icon: "check", label: "Salvar", onPress: () => saveMutation.mutate() } : undefined}
    >
      {query.isLoading ? (
        <SkeletonList count={3} variant="card" />
      ) : (
        <View style={{ gap: 8 }}>
          {horarios.map((h, i) => (
            <View key={h.dia} style={styles.card}>
              <View style={styles.headerRow}>
                <Switch
                  value={h.ativo}
                  onValueChange={(v) => update(i, { ativo: v })}
                  trackColor={{ false: Colors.surfaceLight, true: Colors.accent }}
                  thumbColor="#fff"
                />
                <Text style={[styles.dia, !h.ativo && { color: Colors.textMuted }]}>{h.dia}</Text>
                {!h.ativo ? <Text style={styles.fechado}>Fechado</Text> : null}
              </View>
              {h.ativo ? (
                <View style={styles.timesRow}>
                  <TimeField label="Abre" value={h.abertura} onChange={(v) => update(i, { abertura: v })} />
                  <TimeField label="Fecha" value={h.fechamento} onChange={(v) => update(i, { fechamento: v })} />
                  <TimeField label="Pausa" value={h.intervaloInicio} onChange={(v) => update(i, { intervaloInicio: v })} />
                  <TimeField label="Volta" value={h.intervaloFim} onChange={(v) => update(i, { intervaloFim: v })} />
                </View>
              ) : null}
            </View>
          ))}

          <Pressable
            onPress={() => saveMutation.mutate()}
            disabled={!dirty || saveMutation.isPending}
            style={({ pressed }) => [
              styles.saveBtn,
              (!dirty || saveMutation.isPending) && { opacity: 0.5 },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Feather name="save" size={16} color="#000" />
            <Text style={styles.saveBtnText}>{saveMutation.isPending ? "Salvando…" : "Salvar horários"}</Text>
          </Pressable>
        </View>
      )}

      <Modal visible={profDialog} transparent animationType="slide" onRequestClose={() => setProfDialog(false)}>
        <Pressable style={styles.backdrop} onPress={() => setProfDialog(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.modalTitle}>{profsFora.length} profissional(is) fora da janela</Text>
            <Text style={styles.modalDesc}>Sincronizar para o novo horário padrão?</Text>
            <ScrollView style={{ maxHeight: 280 }}>
              {profsFora.map((p) => {
                const checked = selectedProfIds.includes(p.id);
                return (
                  <Pressable
                    key={p.id}
                    onPress={() =>
                      setSelectedProfIds((cur) => (checked ? cur.filter((x) => x !== p.id) : [...cur, p.id]))
                    }
                    style={styles.profRow}
                  >
                    <View style={[styles.checkbox, checked && { backgroundColor: Colors.accent, borderColor: Colors.accent }]}>
                      {checked ? <Feather name="check" size={12} color="#000" /> : null}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.profName}>{p.nome}</Text>
                      <Text style={styles.profMotivo}>{p.motivo}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
            <View style={styles.actions}>
              <Pressable style={[styles.btn, styles.btnGhost]} onPress={() => setProfDialog(false)}>
                <Text style={styles.btnGhostText}>Agora não</Text>
              </Pressable>
              <Pressable
                style={[styles.btn, styles.btnPrimary, selectedProfIds.length === 0 && { opacity: 0.5 }]}
                disabled={selectedProfIds.length === 0 || syncMutation.isPending}
                onPress={() => syncMutation.mutate()}
              >
                <Text style={styles.btnPrimaryText}>
                  {syncMutation.isPending ? "Sincronizando…" : `Sincronizar (${selectedProfIds.length})`}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
}

function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <View style={styles.timeField}>
      <Text style={styles.timeLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="00:00"
        placeholderTextColor={Colors.textMuted}
        style={styles.timeInput}
        keyboardType={Platform.OS === "ios" ? "numbers-and-punctuation" : "default"}
        maxLength={5}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: 14,
    gap: 10,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  dia: { color: Colors.text, fontFamily: "Inter_600SemiBold", fontSize: 14, flex: 1 },
  fechado: { color: Colors.textMuted, fontFamily: "Inter_500Medium", fontSize: 12, fontStyle: "italic" },
  timesRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  timeField: { flexBasis: "48%", flexGrow: 1 },
  timeLabel: { color: Colors.textMuted, fontSize: 11, fontFamily: "Inter_500Medium", marginBottom: 4 },
  timeInput: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    color: Colors.text,
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    textAlign: "center",
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.accent,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  saveBtnText: { color: "#000", fontFamily: "Inter_700Bold", fontSize: 14 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 18,
    maxHeight: "80%",
  },
  modalTitle: { color: Colors.text, fontFamily: "Inter_700Bold", fontSize: 15 },
  modalDesc: { color: Colors.textSecondary, fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 4, marginBottom: 12 },
  profRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  checkbox: {
    width: 20, height: 20, borderRadius: 6,
    borderWidth: 1, borderColor: Colors.surfaceBorder,
    alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.surfaceLight,
  },
  profName: { color: Colors.text, fontFamily: "Inter_600SemiBold", fontSize: 13 },
  profMotivo: { color: Colors.warning, fontFamily: "Inter_500Medium", fontSize: 11, marginTop: 1 },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 14 },
  btn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  btnGhost: { backgroundColor: Colors.surfaceLight, borderWidth: 1, borderColor: Colors.surfaceBorder },
  btnGhostText: { color: Colors.text, fontFamily: "Inter_600SemiBold", fontSize: 13 },
  btnPrimary: { backgroundColor: Colors.accent },
  btnPrimaryText: { color: "#000", fontFamily: "Inter_600SemiBold", fontSize: 13 },
});
