import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Image,
  Alert,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";

const PRIVACY_URL = "https://glowupi.com/legal/privacidade";
const TERMS_URL = "https://glowupi.com/legal/termos";
const SUPPORT_URL = "https://glowupi.com/suporte";
const SUPPORT_EMAIL = "suporte@glowupi.com";
const APPLE_SUBSCRIPTIONS_URL = "https://apps.apple.com/account/subscriptions";

function MenuItem({
  icon,
  label,
  onPress,
  color,
  badge,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress?: () => void;
  color?: string;
  badge?: string;
}) {
  return (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.menuItemLeft}>
        <Feather name={icon} size={20} color={color ?? Colors.textSecondary} />
        <Text style={[styles.menuItemText, color ? { color } : null]}>{label}</Text>
      </View>
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : (
        <Feather name="chevron-right" size={18} color={Colors.textMuted} />
      )}
    </TouchableOpacity>
  );
}

export default function MenuScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, barbearia, logout, token } = useAuth();
  const webTopPadding = Platform.OS === "web" ? 67 : 0;

  const haptic = (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
    if (Platform.OS !== "web") Haptics.impactAsync(style);
  };

  const openUrl = async (url: string) => {
    haptic();
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch {
      Linking.openURL(url).catch(() => {});
    }
  };

  const openMail = () => {
    haptic();
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Suporte%20Glow%20Upi%20Pro`).catch(() => {
      Alert.alert("E-mail", `Envie um e-mail para ${SUPPORT_EMAIL}`);
    });
  };

  const openAppleSubscriptions = () => {
    haptic();
    Linking.openURL(APPLE_SUBSCRIPTIONS_URL).catch(() => {});
  };

  const handleLogout = async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Sair", "Deseja realmente sair da sua conta?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: () => logout() },
    ]);
  };

  const handleDeleteAccount = async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Excluir conta",
      "Esta ação é permanente. Seus dados pessoais serão removidos e sua assinatura cancelada. Deseja continuar?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Confirmar exclusão",
              "Tem certeza? Esta ação não pode ser desfeita.",
              [
                { text: "Cancelar", style: "cancel" },
                {
                  text: "Sim, excluir",
                  style: "destructive",
                  onPress: async () => {
                    try {
                      const base = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
                      const res = await fetch(`${base}/api/auth/me`, {
                        method: "DELETE",
                        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                      });
                      if (res.ok) {
                        Alert.alert("Conta excluída", "Sua conta foi removida.", [
                          { text: "OK", onPress: () => logout() },
                        ]);
                      } else {
                        Alert.alert("Erro", "Não foi possível excluir a conta. Contate o suporte.");
                      }
                    } catch {
                      Alert.alert("Erro", "Falha de conexão. Tente novamente.");
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingTop: webTopPadding + 16, paddingBottom: Platform.OS === "web" ? 118 : 100 + insets.bottom },
      ]}
    >
      <View style={styles.logoHeader}>
        <Image
          source={require("@/assets/images/logo.png")}
          style={styles.headerLogo}
          resizeMode="contain"
        />
      </View>

      <View style={styles.profileSection}>
        {user?.fotoUrl ? (
          <Image source={{ uri: user.fotoUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Feather name="user" size={28} color={Colors.accent} />
          </View>
        )}
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{user?.nome ?? ""}</Text>
          <Text style={styles.profileEmail}>{user?.email ?? ""}</Text>
          {barbearia && (
            <Text style={styles.profileBarbearia}>{barbearia.nome}</Text>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Conta</Text>
        <MenuItem icon="user" label="Meu Perfil" />
        <MenuItem icon="briefcase" label="Minha Barbearia" />
        <MenuItem icon="settings" label="Configurações" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Plano</Text>
        <MenuItem
          icon="award"
          label="Plano e assinatura"
          badge="Pro"
          onPress={() => {
            haptic();
            router.push("/paywall");
          }}
        />
        {Platform.OS === "ios" && (
          <MenuItem
            icon="credit-card"
            label="Gerenciar assinatura (Apple)"
            onPress={openAppleSubscriptions}
          />
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Suporte</Text>
        <MenuItem icon="mail" label="Falar com o suporte" onPress={openMail} />
        <MenuItem icon="help-circle" label="Central de ajuda" onPress={() => openUrl(SUPPORT_URL)} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Legal</Text>
        <MenuItem icon="shield" label="Política de Privacidade" onPress={() => openUrl(PRIVACY_URL)} />
        <MenuItem icon="file-text" label="Termos de Uso" onPress={() => openUrl(TERMS_URL)} />
      </View>

      <View style={styles.section}>
        <MenuItem icon="log-out" label="Sair" color={Colors.error} onPress={handleLogout} />
        <MenuItem icon="trash-2" label="Excluir conta" color={Colors.error} onPress={handleDeleteAccount} />
      </View>

      <Text style={styles.version}>Glow Upi Pro v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingHorizontal: 16 },
  logoHeader: { alignItems: "center", marginBottom: 20 },
  headerLogo: { width: 80, height: 80 },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: 14,
  },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.accent + "20",
    alignItems: "center",
    justifyContent: "center",
  },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: Colors.text, marginBottom: 2 },
  profileEmail: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  profileBarbearia: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.accent, marginTop: 4 },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    overflow: "hidden",
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textMuted,
    textTransform: "uppercase" as const,
    letterSpacing: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  menuItemLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  menuItemText: { fontSize: 15, fontFamily: "Inter_500Medium", color: Colors.text },
  badge: {
    backgroundColor: Colors.accent + "25",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: Colors.accent,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  version: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    textAlign: "center",
    marginTop: 16,
  },
});
