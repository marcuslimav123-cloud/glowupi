import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";

function MenuItem({
  icon,
  label,
  onPress,
  color,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress?: () => void;
  color?: string;
}) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.menuItemLeft}>
        <Feather name={icon} size={20} color={color ?? Colors.textSecondary} />
        <Text style={[styles.menuItemText, color ? { color } : null]}>{label}</Text>
      </View>
      <Feather name="chevron-right" size={18} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}

export default function MenuScreen() {
  const insets = useSafeAreaInsets();
  const { user, barbearia, logout } = useAuth();
  const webTopPadding = Platform.OS === "web" ? 67 : 0;

  const handleLogout = async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await logout();
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingTop: webTopPadding + 16, paddingBottom: Platform.OS === "web" ? 118 : 100 },
      ]}
    >
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
        <MenuItem icon="settings" label="Configurações" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Suporte</Text>
        <MenuItem icon="help-circle" label="Ajuda" />
        <MenuItem icon="message-circle" label="Fale Conosco" />
      </View>

      <View style={styles.section}>
        <MenuItem icon="log-out" label="Sair" color={Colors.error} onPress={handleLogout} />
      </View>

      <Text style={styles.version}>Glow Upi Pro v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
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
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.accent + "20",
    alignItems: "center",
    justifyContent: "center",
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  profileBarbearia: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.accent,
    marginTop: 4,
  },
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
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuItemText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  version: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    textAlign: "center",
    marginTop: 16,
  },
});
