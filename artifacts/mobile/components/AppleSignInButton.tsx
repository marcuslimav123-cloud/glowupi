import React, { useState } from "react";
import { Platform, View, ActivityIndicator, StyleSheet, TouchableOpacity, Text } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";

interface Props {
  onSuccess: (identityToken: string, fullName?: { givenName?: string; familyName?: string }) => Promise<void> | void;
  onError?: (msg: string) => void;
  disabled?: boolean;
}

export function AppleSignInButton({ onSuccess, onError, disabled }: Props) {
  const [loading, setLoading] = useState(false);

  if (Platform.OS !== "ios") return null;

  const handlePress = async () => {
    if (disabled || loading) return;
    setLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) {
        onError?.("Token Apple não recebido");
        return;
      }
      const fullName = credential.fullName
        ? {
            givenName: credential.fullName.givenName ?? undefined,
            familyName: credential.fullName.familyName ?? undefined,
          }
        : undefined;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await onSuccess(credential.identityToken, fullName);
    } catch (e: any) {
      if (e?.code === "ERR_REQUEST_CANCELED") return;
      onError?.(e?.message || "Erro ao entrar com Apple");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, (disabled || loading) && styles.disabled]}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel="Continuar com Apple"
      testID="apple-login-button"
    >
      {loading ? (
        <ActivityIndicator color="#fff" size="small" />
      ) : (
        <View style={styles.content}>
          <Text style={styles.appleLogo}></Text>
          <Text style={styles.text}>Continuar com Apple</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#000",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#000",
  },
  disabled: { opacity: 0.6 },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  appleLogo: {
    fontSize: 18,
    color: "#fff",
    marginTop: -2,
  },
  text: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: "#fff",
  },
});
