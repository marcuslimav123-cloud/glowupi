import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Image,
} from "react-native";
import { Redirect, Link } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import { AppleSignInButton } from "@/components/AppleSignInButton";

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { register, loginWithApple, isAuthenticated } = useAuth();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  const handleRegister = async () => {
    if (!nome.trim() || !email.trim() || !senha.trim()) {
      setError("Preencha todos os campos");
      return;
    }
    if (senha.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    if (senha !== confirmarSenha) {
      setError("As senhas não coincidem");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await register(nome.trim(), email.trim(), senha);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao criar conta");
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: Platform.OS === "web" ? 67 : insets.top }]}>
      <KeyboardAwareScrollViewCompat
        bottomOffset={20}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.logoContainer}>
          <Image
            source={require("@/assets/images/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.subtitle}>Crie sua conta profissional</Text>
        </View>

        <View style={styles.form}>
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nome completo</Text>
            <TextInput
              style={styles.input}
              placeholder="Seu nome"
              placeholderTextColor={Colors.textMuted}
              value={nome}
              onChangeText={setNome}
              autoCapitalize="words"
              autoComplete="name"
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>E-mail</Text>
            <TextInput
              style={styles.input}
              placeholder="seu@email.com"
              placeholderTextColor={Colors.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Senha</Text>
            <TextInput
              style={styles.input}
              placeholder="Mínimo 6 caracteres"
              placeholderTextColor={Colors.textMuted}
              value={senha}
              onChangeText={setSenha}
              secureTextEntry
              autoComplete="new-password"
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirmar senha</Text>
            <TextInput
              style={styles.input}
              placeholder="Repita a senha"
              placeholderTextColor={Colors.textMuted}
              value={confirmarSenha}
              onChangeText={setConfirmarSenha}
              secureTextEntry
              editable={!loading}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Criar conta"
          >
            {loading ? (
              <ActivityIndicator color={Colors.background} size="small" />
            ) : (
              <Text style={styles.buttonText}>Criar conta</Text>
            )}
          </TouchableOpacity>

          {Platform.OS === "ios" && (
            <>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 4 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: Colors.surfaceBorder }} />
                <Text style={{ fontSize: 13, color: Colors.textMuted, fontFamily: "Inter_400Regular" }}>ou</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: Colors.surfaceBorder }} />
              </View>
              <AppleSignInButton
                disabled={loading}
                onSuccess={async (token, fullName) => {
                  setError(null);
                  try {
                    await loginWithApple(token, fullName);
                  } catch (e: unknown) {
                    setError(e instanceof Error ? e.message : "Erro ao entrar com Apple");
                  }
                }}
                onError={(msg) => setError(msg)}
              />
            </>
          )}

          <View style={styles.loginLink}>
            <Text style={styles.loginText}>Já tem uma conta? </Text>
            <Link href="/login" asChild>
              <TouchableOpacity>
                <Text style={styles.loginLinkText}>Fazer login</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  logo: {
    width: 160,
    height: 160,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  form: {
    gap: 18,
  },
  errorContainer: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  button: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.background,
  },
  loginLink: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  loginText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  loginLinkText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.accent,
  },
});
