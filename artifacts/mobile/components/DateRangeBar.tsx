import React, { useMemo } from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors, type ColorPalette } from "@/lib/theme";

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

function DateField({
  value,
  onChange,
  label,
  colors,
  styles,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  colors: ColorPalette;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="AAAA-MM-DD"
        placeholderTextColor={colors.textMuted}
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
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <DateField value={inicio} onChange={onInicioChange} label="Início" colors={colors} styles={styles} />
        <DateField value={fim} onChange={onFimChange} label="Fim" colors={colors} styles={styles} />
      </View>
      <View style={styles.actionsRow}>
        <Pressable
          onPress={onApply}
          style={({ pressed }) => [styles.btn, styles.btnPrimary, pressed && { opacity: 0.85 }]}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Aplicar filtro"
        >
          <Feather name="search" size={14} color={colors.invertedText} />
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
            <Feather name="download" size={14} color={colors.text} />
            <Text style={styles.btnGhostText}>CSV</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
    container: {
      backgroundColor: c.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.surfaceBorder,
      padding: 12,
      marginBottom: 12,
      gap: 10,
    },
    row: { flexDirection: "row", gap: 10 },
    field: { flex: 1 },
    label: {
      fontSize: 11,
      fontFamily: "Inter_500Medium",
      color: c.textSecondary,
      marginBottom: 4,
    },
    input: {
      backgroundColor: c.surfaceLight,
      borderWidth: 1,
      borderColor: c.surfaceBorder,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: Platform.OS === "ios" ? 10 : 8,
      color: c.text,
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
    btnPrimary: { backgroundColor: c.accent },
    btnPrimaryText: { color: c.invertedText, fontFamily: "Inter_600SemiBold", fontSize: 13 },
    btnGhost: {
      backgroundColor: c.surfaceLight,
      borderWidth: 1,
      borderColor: c.surfaceBorder,
    },
    btnGhostText: { color: c.text, fontFamily: "Inter_600SemiBold", fontSize: 13 },
  });

export default DateRangeBar;
