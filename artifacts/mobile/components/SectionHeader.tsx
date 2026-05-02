import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors, type ColorPalette } from "@/lib/theme";

export type SectionHeaderProps = {
  label: string;
  description?: string;
  trailing?: React.ReactNode;
};

export function SectionHeader({ label, description, trailing }: SectionHeaderProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        {trailing ? <View>{trailing}</View> : null}
      </View>
      {description ? <Text style={styles.description}>{description}</Text> : null}
    </View>
  );
}

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 4,
      marginTop: 18,
      marginBottom: 8,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    label: {
      fontSize: 12,
      fontFamily: "Inter_700Bold",
      color: c.textMuted,
      textTransform: "uppercase",
      letterSpacing: 1.1,
    },
    description: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: c.textSecondary,
      marginTop: 4,
    },
  });

export default SectionHeader;
