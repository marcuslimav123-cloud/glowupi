import React, { useEffect, useMemo, useRef } from "react";
import { Animated, DimensionValue, StyleSheet, View, ViewStyle, StyleProp } from "react-native";
import { useColors, type ColorPalette } from "@/lib/theme";

export type SkeletonProps = {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

export function Skeleton({ width = "100%", height = 14, radius = 8, style }: SkeletonProps) {
  const colors = useColors();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.9, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { backgroundColor: colors.surfaceLight, width, height, borderRadius: radius, opacity },
        style,
      ]}
      accessible={false}
    />
  );
}

export function SkeletonCard() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Skeleton width={70} height={20} radius={6} />
        <Skeleton width={80} height={18} radius={9} />
      </View>
      <Skeleton width="60%" height={16} style={{ marginTop: 12 }} />
      <Skeleton width="45%" height={12} style={{ marginTop: 8 }} />
      <Skeleton width="35%" height={12} style={{ marginTop: 6 }} />
    </View>
  );
}

export function SkeletonRow() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.rowCard}>
      <Skeleton width={44} height={44} radius={22} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Skeleton width="55%" height={14} />
        <Skeleton width="35%" height={11} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
}

export function SkeletonList({ count = 4, variant = "card" as "card" | "row" }) {
  const items = Array.from({ length: count });
  return (
    <View accessibilityLabel="Carregando" accessibilityRole="progressbar">
      {items.map((_, i) =>
        variant === "row" ? <SkeletonRow key={i} /> : <SkeletonCard key={i} />,
      )}
    </View>
  );
}

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.surface,
      borderRadius: 16,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: c.surfaceBorder,
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    rowCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.surface,
      borderRadius: 14,
      padding: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: c.surfaceBorder,
    },
  });

export default Skeleton;
