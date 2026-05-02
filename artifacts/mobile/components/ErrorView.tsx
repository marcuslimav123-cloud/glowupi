import React from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";

export type ErrorViewProps = {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  error?: unknown;
};

function extractMessage(error: unknown): string | undefined {
  if (!error) return undefined;
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return undefined;
}

export function ErrorView({
  title = "Algo deu errado",
  description,
  onRetry,
  retryLabel = "Tentar novamente",
  error,
}: ErrorViewProps) {
  const message = description ?? extractMessage(error) ?? "Não conseguimos carregar agora. Verifique sua conexão e tente novamente.";

  const handleRetry = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onRetry?.();
  };

  return (
    <View style={styles.container} accessibilityLiveRegion="polite">
      <View style={styles.iconWrap}>
        <Feather name="wifi-off" size={36} color={Colors.error} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{message}</Text>
      {onRetry ? (
        <TouchableOpacity
          onPress={handleRetry}
          style={styles.retry}
          accessibilityRole="button"
          accessibilityLabel={retryLabel}
        >
          <Feather name="refresh-cw" size={14} color="#000" />
          <Text style={styles.retryText}>{retryLabel}</Text>
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
    backgroundColor: Colors.error + "15",
    borderWidth: 1,
    borderColor: Colors.error + "30",
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
    maxWidth: 300,
  },
  retry: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#000",
  },
});

export default ErrorView;
