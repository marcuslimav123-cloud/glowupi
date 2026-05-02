import React, { useMemo } from "react";
import {
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors, type ColorPalette } from "@/lib/theme";

export type ScreenContainerProps = {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  rightAction?: {
    icon: keyof typeof Feather.glyphMap;
    label?: string;
    onPress: () => void;
  };
  children: React.ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentPadding?: boolean;
};

export function ScreenContainer({
  title,
  subtitle,
  showBack = true,
  rightAction,
  children,
  scroll = true,
  refreshing,
  onRefresh,
  contentPadding = true,
}: ScreenContainerProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? 67 + 12 : insets.top + 8;
  const bottomPadding = isWeb ? 118 : 100 + insets.bottom;

  const handleBack = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/mais");
  };

  const handleRight = () => {
    if (rightAction) {
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      rightAction.onPress();
    }
  };

  const headerNode = (
    <View style={[styles.header, { paddingTop: topPadding }]}>
      <View style={styles.headerRow}>
        {showBack ? (
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="chevron-left" size={24} color={colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={styles.iconBtn} />
        )}
        <View style={styles.titleWrap}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {rightAction ? (
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={handleRight}
            accessibilityRole="button"
            accessibilityLabel={rightAction.label ?? rightAction.icon}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name={rightAction.icon} size={22} color={colors.accent} />
          </TouchableOpacity>
        ) : (
          <View style={styles.iconBtn} />
        )}
      </View>
    </View>
  );

  if (!scroll) {
    return (
      <View style={styles.container}>
        {headerNode}
        <View
          style={[
            styles.body,
            contentPadding ? styles.bodyPadding : null,
            { paddingBottom: bottomPadding },
          ]}
        >
          {children}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {headerNode}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          contentPadding ? styles.scrollContent : null,
          { paddingBottom: bottomPadding },
        ]}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={!!refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          ) : undefined
        }
      >
        {children}
      </ScrollView>
    </View>
  );
}

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    header: {
      paddingHorizontal: 8,
      paddingBottom: 12,
      backgroundColor: c.background,
      borderBottomWidth: 1,
      borderBottomColor: c.surfaceBorder,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      minHeight: 40,
    },
    iconBtn: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    titleWrap: {
      flex: 1,
      alignItems: "center",
      paddingHorizontal: 4,
    },
    title: {
      fontSize: 17,
      fontFamily: "Inter_600SemiBold",
      color: c.text,
      textAlign: "center",
    },
    subtitle: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: c.textSecondary,
      textAlign: "center",
      marginTop: 2,
    },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 16, paddingTop: 16 },
    body: { flex: 1 },
    bodyPadding: { paddingHorizontal: 16, paddingTop: 16 },
  });

export default ScreenContainer;
