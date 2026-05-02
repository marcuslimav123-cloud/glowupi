import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/colors";

export type SectionHeaderProps = {
  label: string;
  description?: string;
  trailing?: React.ReactNode;
};

export function SectionHeader({ label, description, trailing }: SectionHeaderProps) {
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

const styles = StyleSheet.create({
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
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1.1,
  },
  description: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 4,
  },
});

export default SectionHeader;
