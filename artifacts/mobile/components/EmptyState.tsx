import React from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";

export type EmptyStateProps = {
  icon?: keyof typeof Feather.glyphMap;
  title: string;
  description?: string;
  ctaLabel?: string;
  onCtaPress?: () => void;
  iconColor?: string;
};

export function EmptyState({
  icon = "inbox",
  title,
  description,
  ctaLabel,
  onCtaPress,
  iconColor,
}: EmptyStateProps) {
  const handlePress = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onCtaPress?.();
  };

  return (
    <View style={styles.container} accessibilityLiveRegion="polite">
      <View style={styles.iconWrap}>
        <Feather name={icon} size={40} color={iconColor ?? Colors.textMuted} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {ctaLabel && onCtaPress ? (
        <TouchableOpacity
          onPress={handlePress}
          style={styles.cta}
          accessibilityRole="button"
          accessibilityLabel={ctaLabel}
        >
          <Text style={styles.ctaText}>{ctaLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 60,
    paddingHorizontal: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    textAlign: "center",
    marginBottom: 6,
  },
  description: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 19,
    maxWidth: 280,
  },
  cta: {
    marginTop: 18,
    backgroundColor: Colors.accent,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 10,
  },
  ctaText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#000",
  },
});

export default EmptyState;
