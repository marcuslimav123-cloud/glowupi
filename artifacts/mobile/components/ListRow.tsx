import React, { useMemo } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
  StyleProp,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors, type ColorPalette } from "@/lib/theme";

export type ListRowProps = {
  icon?: keyof typeof Feather.glyphMap;
  iconColor?: string;
  label: string;
  description?: string;
  badge?: string;
  badgeTone?: "default" | "success" | "warning" | "error" | "accent";
  onPress?: () => void;
  rightLabel?: string;
  trailing?: React.ReactNode;
  destructive?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
};

export function ListRow({
  icon,
  iconColor,
  label,
  description,
  badge,
  badgeTone = "default",
  onPress,
  rightLabel,
  trailing,
  destructive = false,
  disabled = false,
  style,
  accessibilityHint,
}: ListRowProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const badgePalette: Record<NonNullable<ListRowProps["badgeTone"]>, { bg: string; fg: string }> = {
    default: { bg: colors.surfaceLight, fg: colors.textSecondary },
    success: { bg: colors.success + "22", fg: colors.success },
    warning: { bg: colors.warning + "22", fg: colors.warning },
    error: { bg: colors.error + "22", fg: colors.error },
    accent: { bg: colors.accent + "22", fg: colors.accent },
  };

  const handlePress = () => {
    if (!onPress || disabled) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const labelColor = destructive ? colors.error : colors.text;
  const ic = iconColor ?? (destructive ? colors.error : colors.accent);
  const badgeStyle = badgePalette[badgeTone];

  const inner = (
    <>
      {icon ? (
        <View style={[styles.iconWrap, { backgroundColor: ic + "1a" }]}>
          <Feather name={icon} size={18} color={ic} />
        </View>
      ) : null}
      <View style={styles.body}>
        <Text style={[styles.label, { color: labelColor }]} numberOfLines={1}>
          {label}
        </Text>
        {description ? (
          <Text style={styles.description} numberOfLines={2}>
            {description}
          </Text>
        ) : null}
      </View>
      <View style={styles.trailing}>
        {badge ? (
          <View style={[styles.badge, { backgroundColor: badgeStyle.bg }]}>
            <Text style={[styles.badgeText, { color: badgeStyle.fg }]}>{badge}</Text>
          </View>
        ) : null}
        {rightLabel ? <Text style={styles.rightLabel}>{rightLabel}</Text> : null}
        {trailing}
        {onPress && !trailing ? (
          <Feather name="chevron-right" size={18} color={colors.textMuted} />
        ) : null}
      </View>
    </>
  );

  const containerStyle: StyleProp<ViewStyle> = [
    styles.row,
    disabled ? styles.rowDisabled : null,
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        style={containerStyle}
        onPress={handlePress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled }}
      >
        {inner}
      </TouchableOpacity>
    );
  }

  return (
    <View style={containerStyle} accessibilityLabel={label}>
      {inner}
    </View>
  );
}

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      paddingVertical: 14,
      backgroundColor: c.surface,
      borderBottomWidth: 1,
      borderBottomColor: c.surfaceBorder,
      gap: 12,
    },
    rowDisabled: { opacity: 0.5 },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    body: { flex: 1, minWidth: 0 },
    label: {
      fontSize: 15,
      fontFamily: "Inter_500Medium",
    },
    description: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: c.textSecondary,
      marginTop: 2,
    },
    trailing: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
    },
    badgeText: {
      fontSize: 11,
      fontFamily: "Inter_700Bold",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    rightLabel: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      color: c.textSecondary,
    },
  });

export default ListRow;
