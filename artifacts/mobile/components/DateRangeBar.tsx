import React from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";

type Props = {
  inicio: string;
  fim: string;
  onInicioChange: (v: string) => void;
  onFimChange: (v: string) => void;
  onApply: () => void;
  onExport?: () => void;
  exportDisabled?: boolean;
  loading?: boolean;
};

function DateField({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="AAAA-MM-DD"
        placeholderTextColor={Colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType={Platform.OS === "ios" ? "numbers-and-punctuation" : "default"}
        style={styles.input}
        accessibilityLabel={label}
      />
    </View>
  );
}

export function DateRangeBar({ inicio, fim, onInicioChange, onFimChange, onApply, onExport, exportDisabled, loading }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <DateField value={inicio} onChange={onInicioChange} label="Início" />
        <DateField value={fim} onChange={onFimChange} label="Fim" />
      </View>
      <View style={styles.actionsRow}>
        <Pressable
          onPress={onApply}
          style={({ pressed }) => [styles.btn, styles.btnPrimary, pressed && { opacity: 0.85 }]}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Aplicar filtro"
        >
          <Feather name="search" size={14} color="#000" />
          <Text style={styles.btnPrimaryText}>{loading ? "Carregando…" : "Aplicar"}</Text>
        </Pressable>
        {onExport ? (
          <Pressable
            onPress={onExport}
            disabled={exportDisabled}
            style={({ pressed }) => [styles.btn, styles.btnGhost, exportDisabled && { opacity: 0.5 }, pressed && { opacity: 0.85 }]}
            accessibilityRole="button"
            accessibilityLabel="Exportar CSV"
          >
            <Feather name="download" size={14} color={Colors.text} />
            <Text style={styles.btnGhostText}>CSV</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: 12,
    marginBottom: 12,
    gap: 10,
  },
  row: { flexDirection: "row", gap: 10 },
  field: { flex: 1 },
  label: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  input: {
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    color: Colors.text,
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  actionsRow: { flexDirection: "row", gap: 8 },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  btnPrimary: { backgroundColor: Colors.accent },
  btnPrimaryText: { color: "#000", fontFamily: "Inter_600SemiBold", fontSize: 13 },
  btnGhost: {
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  btnGhostText: { color: Colors.text, fontFamily: "Inter_600SemiBold", fontSize: 13 },
});

export default DateRangeBar;
