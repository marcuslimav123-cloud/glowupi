import React from "react";
import { Alert, Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { ScreenContainer } from "@/components/ScreenContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { useAuth } from "@/contexts/AuthContext";
import { fetchJson, getErrorMessage } from "@/lib/api";

const ROLE_LABELS: Record<string, string> = {
  dono: "Proprietário(a)",
  gerente: "Gerente",
  colaborador: "Colaborador(a)",
};

export default function PerfilScreen() {
  const { user, barbearia, logout, refreshUser } = useAuth();

  const handleLogout = () => {
    Alert.alert("Sair", "Deseja realmente sair da conta?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: () => logout() },
    ]);
  };

  const handleTema = async (tema: "claro" | "escuro") => {
    try {
      await fetchJson(`/auth/tema`, { method: "PUT", body: { tema } });
      await refreshUser();
    } catch (e) {
      Alert.alert("Erro", getErrorMessage(e));
    }
  };

  if (!user) {
    return (
      <ScreenContainer title="Perfil">
        <Text style={{ color: Colors.textMuted, textAlign: "center", marginTop: 40 }}>
          Carregando…
        </Text>
      </ScreenContainer>
    );
  }

  const initials = (user.nome || "?")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <ScreenContainer title="Perfil" subtitle="Sua conta e preferências">
      <View style={styles.heroCard}>
        {user.fotoUrl ? (
          <Image source={{ uri: user.fotoUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarInit}>{initials}</Text>
          </View>
        )}
        <Text style={styles.heroName}>{user.nome}</Text>
        <Text style={styles.heroEmail}>{user.email}</Text>
        <View style={styles.heroBadge}>
          <Feather name="shield" size={12} color={Colors.accent} />
          <Text style={styles.heroBadgeText}>{ROLE_LABELS[user.role] ?? user.role}</Text>
        </View>
      </View>

      <SectionHeader label="Dados pessoais" />
      <View style={styles.card}>
        <InfoRow icon="user" label="Nome" value={user.nome} />
        <InfoRow icon="mail" label="E-mail" value={user.email} />
        <InfoRow icon="phone" label="Telefone" value={user.telefone || "—"} />
      </View>

      {barbearia ? (
        <>
          <SectionHeader label="Estabelecimento" />
          <View style={styles.card}>
            <InfoRow icon="briefcase" label="Nome" value={barbearia.nome} />
            <InfoRow icon="link" label="Slug" value={barbearia.slug} />
            {barbearia.subscriptionStatus ? (
              <InfoRow icon="award" label="Plano" value={barbearia.subscriptionStatus} />
            ) : null}
          </View>
        </>
      ) : null}

      <SectionHeader label="Aparência" />
      <View style={styles.card}>
        <View style={styles.themeRow}>
          {(["claro", "escuro"] as const).map((t) => {
            const active = (user.tema || "escuro") === t;
            return (
              <Pressable
                key={t}
                onPress={() => handleTema(t)}
                style={[styles.themeBtn, active && styles.themeBtnActive]}
              >
                <Feather name={t === "claro" ? "sun" : "moon"} size={14} color={active ? "#000" : Colors.textSecondary} />
                <Text style={[styles.themeText, active && { color: "#000" }]}>
                  {t === "claro" ? "Claro" : "Escuro"}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <SectionHeader label="Conta" />
      <View style={styles.card}>
        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
        >
          <View style={[styles.iconWrap, { backgroundColor: Colors.error + "1a" }]}>
            <Feather name="log-out" size={16} color={Colors.error} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowLabel, { color: Colors.error }]}>Sair da conta</Text>
            <Text style={styles.rowDesc}>Encerra a sessão neste aparelho</Text>
          </View>
          <Feather name="chevron-right" size={16} color={Colors.textMuted} />
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

function InfoRow({ icon, label, value }: { icon: keyof typeof Feather.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.iconWrap}>
        <Feather name={icon} size={16} color={Colors.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue} numberOfLines={2}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    alignItems: "center",
    paddingVertical: 22,
    paddingHorizontal: 16,
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: 4,
  },
  avatar: { width: 84, height: 84, borderRadius: 42, marginBottom: 10, borderWidth: 1, borderColor: Colors.surfaceBorder },
  avatarFallback: {
    width: 84, height: 84, borderRadius: 42, marginBottom: 10,
    backgroundColor: "rgba(196,164,106,0.15)", alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  avatarInit: { color: Colors.accent, fontFamily: "Inter_700Bold", fontSize: 26 },
  heroName: { color: Colors.text, fontFamily: "Inter_700Bold", fontSize: 17 },
  heroEmail: { color: Colors.textSecondary, fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 4 },
  heroBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(196,164,106,0.15)",
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, marginTop: 10,
  },
  heroBadgeText: { color: Colors.accent, fontFamily: "Inter_600SemiBold", fontSize: 11 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder,
  },
  iconWrap: {
    width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(196,164,106,0.15)",
  },
  rowLabel: { color: Colors.textMuted, fontSize: 11, fontFamily: "Inter_500Medium" },
  rowValue: { color: Colors.text, fontSize: 13, fontFamily: "Inter_600SemiBold", marginTop: 2 },
  rowDesc: { color: Colors.textSecondary, fontFamily: "Inter_500Medium", fontSize: 11, marginTop: 2 },
  themeRow: { flexDirection: "row", gap: 8, padding: 12 },
  themeBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 11, borderRadius: 10,
    backgroundColor: Colors.surfaceLight, borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  themeBtnActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  themeText: { color: Colors.text, fontFamily: "Inter_600SemiBold", fontSize: 13 },
});
