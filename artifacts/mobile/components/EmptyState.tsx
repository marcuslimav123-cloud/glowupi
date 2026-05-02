import React, { useMemo } from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors, type ColorPalette } from "@/lib/theme";

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
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const handlePress = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onCtaPress?.();
  };

  return (
    <View style={styles.container} accessibilityLiveRegion="polite">
      <View style={styles.iconWrap}>
        <Feather name={icon} size={40} color={iconColor ?? colors.textMuted} />
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

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
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
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.surfaceBorder,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
    },
    title: {
      fontSize: 17,
      fontFamily: "Inter_600SemiBold",
      color: c.text,
      textAlign: "center",
      marginBottom: 6,
    },
    description: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: c.textSecondary,
      textAlign: "center",
      lineHeight: 19,
      maxWidth: 280,
    },
    cta: {
      marginTop: 18,
      backgroundColor: c.accent,
      paddingHorizontal: 22,
      paddingVertical: 12,
      borderRadius: 10,
    },
    ctaText: {
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      color: c.invertedText,
    },
  });

export default EmptyState;
