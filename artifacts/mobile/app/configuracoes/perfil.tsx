import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Feather } from "@expo/vector-icons";
import { useColors, useTheme, useTemaLayoutSync, type ColorPalette, type ThemeMode } from "@/lib/theme";
import { ScreenContainer } from "@/components/ScreenContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { useAuth } from "@/contexts/AuthContext";
import { API_BASE, apiUrl, fetchJson, formatPhone, getErrorMessage, stripPhone } from "@/lib/api";
import { getItem } from "@/lib/storage";

const TOKEN_KEY = "glow_upi_auth_token";

const ROLE_LABELS: Record<string, string> = {
  dono: "Proprietário(a)",
  gerente: "Gerente",
  colaborador: "Colaborador(a)",
};

const TEMA_OPTIONS: { value: ThemeMode; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { value: "claro", label: "Claro", icon: "sun" },
  { value: "escuro", label: "Escuro", icon: "moon" },
  { value: "auto", label: "Auto", icon: "smartphone" },
];

export default function PerfilScreen() {
  const { user, barbearia, logout, refreshUser } = useAuth();
  const colors = useColors();
  const { mode } = useTheme();
  const { saveMode, isSaving: temaSalvando } = useTemaLayoutSync();

  const handleSetMode = async (m: ThemeMode) => {
    try {
      await saveMode(m);
    } catch (e) {
      Alert.alert("Erro", getErrorMessage(e));
    }
  };
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [editing, setEditing] = useState(false);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    if (user && !editing) {
      setNome(user.nome || "");
      setTelefone(formatPhone(user.telefone || ""));
      setFotoUrl(user.fotoUrl || null);
    }
  }, [user, editing]);

  const handleLogout = () => {
    Alert.alert("Sair", "Deseja realmente sair da conta?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: () => logout() },
    ]);
  };

  const handleStartEdit = () => {
    if (!user) return;
    setNome(user.nome || "");
    setTelefone(formatPhone(user.telefone || ""));
    setFotoUrl(user.fotoUrl || null);
    setEditing(true);
  };

  const handleCancelEdit = () => {
    if (!user) return;
    setNome(user.nome || "");
    setTelefone(formatPhone(user.telefone || ""));
    setFotoUrl(user.fotoUrl || null);
    setEditing(false);
  };

  const pickImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permissão necessária", "Precisamos de acesso às suas fotos para alterar o avatar.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets || !result.assets[0]) return;
      const asset = result.assets[0];
      await uploadAvatar(asset.uri, asset.mimeType, asset.fileName);
    } catch (e) {
      Alert.alert("Erro", getErrorMessage(e, "Não foi possível selecionar a imagem"));
    }
  };

  const uploadAvatar = async (uri: string, mimeType?: string | null, fileName?: string | null) => {
    setUploadingPhoto(true);
    try {
      const token = await getItem(TOKEN_KEY);
      if (!token) throw new Error("Sessão expirada");

      const inferredType = mimeType
        || (uri.toLowerCase().endsWith(".png") ? "image/png"
          : uri.toLowerCase().endsWith(".webp") ? "image/webp" : "image/jpeg");
      const inferredName = fileName || `avatar-${Date.now()}.${inferredType.split("/")[1] || "jpg"}`;

      const blob = await (await fetch(uri)).blob();
      const size = blob.size || 0;

      const reqRes = await fetch(apiUrl("/storage/uploads/request-url"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: inferredName, size, contentType: inferredType }),
      });
      if (!reqRes.ok) {
        const err = await reqRes.json().catch(() => ({}));
        throw new Error(err.error || "Falha ao preparar upload");
      }
      const { uploadURL, objectPath } = await reqRes.json();
      if (!uploadURL || !objectPath) throw new Error("Resposta inválida do servidor");

      const putRes = await fetch(uploadURL, { method: "PUT", headers: { "Content-Type": inferredType }, body: blob });
      if (!putRes.ok) throw new Error("Falha ao enviar imagem");

      const path = objectPath.startsWith("/") ? objectPath : `/${objectPath}`;
      const servingUrl = `${API_BASE}/api/storage${path}`;
      setFotoUrl(servingUrl);
    } catch (e) {
      Alert.alert("Erro", getErrorMessage(e, "Não foi possível enviar a foto"));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = () => {
    Alert.alert("Remover foto", "Deseja remover sua foto de perfil?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Remover", style: "destructive", onPress: () => setFotoUrl(null) },
    ]);
  };

  const handleSave = async () => {
    if (!user) return;
    const trimmedNome = nome.trim();
    if (trimmedNome.length < 2) {
      Alert.alert("Nome inválido", "Informe seu nome com pelo menos 2 caracteres.");
      return;
    }
    const telDigits = stripPhone(telefone);
    if (telDigits && (telDigits.length < 10 || telDigits.length > 11)) {
      Alert.alert("Telefone inválido", "Use DDD + número (10 ou 11 dígitos).");
      return;
    }

    setSaving(true);
    try {
      const body: { nome: string; telefone: string | null; fotoUrl: string | null } = {
        nome: trimmedNome,
        telefone: telDigits ? telefone : null,
        fotoUrl: fotoUrl || null,
      };
      await fetchJson(`/auth/me`, { method: "PUT", body });
      await refreshUser();
      setEditing(false);
      if (Platform.OS !== "web") {
        Alert.alert("Pronto", "Perfil atualizado com sucesso.");
      }
    } catch (e) {
      Alert.alert("Erro", getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <ScreenContainer title="Perfil">
        <Text style={{ color: colors.textMuted, textAlign: "center", marginTop: 40 }}>
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

  const displayedFotoUrl = editing ? fotoUrl : user.fotoUrl;

  return (
    <ScreenContainer
      title="Perfil"
      subtitle="Sua conta e preferências"
      rightAction={editing ? undefined : { icon: "edit-2", label: "Editar", onPress: handleStartEdit }}
    >
      <View style={styles.heroCard}>
        <Pressable
          onPress={editing ? pickImage : undefined}
          disabled={!editing || uploadingPhoto}
          style={styles.avatarPressable}
        >
          {displayedFotoUrl ? (
            <Image source={{ uri: displayedFotoUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInit}>{initials}</Text>
            </View>
          )}
          {editing ? (
            <View style={styles.avatarOverlay}>
              {uploadingPhoto ? <ActivityIndicator color="#fff" /> : <Feather name="camera" size={18} color="#fff" />}
            </View>
          ) : null}
        </Pressable>
        {editing && fotoUrl ? (
          <Pressable onPress={handleRemovePhoto} hitSlop={8} style={styles.removePhotoBtn}>
            <Feather name="trash-2" size={12} color={colors.error} />
            <Text style={styles.removePhotoText}>Remover foto</Text>
          </Pressable>
        ) : null}
        <Text style={styles.heroName}>{editing ? (nome || "Seu nome") : user.nome}</Text>
        <Text style={styles.heroEmail}>{user.email}</Text>
        <View style={styles.heroBadge}>
          <Feather name="shield" size={12} color={colors.accent} />
          <Text style={styles.heroBadgeText}>{ROLE_LABELS[user.role] ?? user.role}</Text>
        </View>
      </View>

      <SectionHeader label="Dados pessoais" />
      <View style={styles.card}>
        {editing ? (
          <>
            <EditRow icon="user" label="Nome" colors={colors} styles={styles}>
              <TextInput
                value={nome}
                onChangeText={setNome}
                placeholder="Seu nome completo"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                autoCapitalize="words"
                editable={!saving}
              />
            </EditRow>
            <InfoRow icon="mail" label="E-mail" value={user.email} colors={colors} styles={styles} />
            <EditRow icon="phone" label="Telefone" last colors={colors} styles={styles}>
              <TextInput
                value={telefone}
                onChangeText={(v) => setTelefone(formatPhone(v))}
                placeholder="(11) 99999-9999"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                keyboardType="phone-pad"
                editable={!saving}
                maxLength={16}
              />
            </EditRow>
          </>
        ) : (
          <>
            <InfoRow icon="user" label="Nome" value={user.nome} colors={colors} styles={styles} />
            <InfoRow icon="mail" label="E-mail" value={user.email} colors={colors} styles={styles} />
            <InfoRow icon="phone" label="Telefone" value={user.telefone ? formatPhone(user.telefone) : "—"} last colors={colors} styles={styles} />
          </>
        )}
      </View>

      {editing ? (
        <View style={styles.actionRow}>
          <Pressable
            onPress={handleCancelEdit}
            disabled={saving || uploadingPhoto}
            style={({ pressed }) => [styles.btn, styles.btnGhost, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.btnGhostText}>Cancelar</Text>
          </Pressable>
          <Pressable
            onPress={handleSave}
            disabled={saving || uploadingPhoto}
            style={({ pressed }) => [styles.btn, styles.btnPrimary, (pressed || saving) && { opacity: 0.85 }]}
          >
            {saving ? (
              <ActivityIndicator color={colors.invertedText} />
            ) : (
              <>
                <Feather name="check" size={14} color={colors.invertedText} />
                <Text style={styles.btnPrimaryText}>Salvar</Text>
              </>
            )}
          </Pressable>
        </View>
      ) : null}

      {barbearia ? (
        <>
          <SectionHeader label="Estabelecimento" />
          <View style={styles.card}>
            <InfoRow icon="briefcase" label="Nome" value={barbearia.nome} colors={colors} styles={styles} />
            <InfoRow icon="link" label="Slug" value={barbearia.slug} last={!barbearia.subscriptionStatus} colors={colors} styles={styles} />
            {barbearia.subscriptionStatus ? (
              <InfoRow icon="award" label="Plano" value={barbearia.subscriptionStatus} last colors={colors} styles={styles} />
            ) : null}
          </View>
        </>
      ) : null}

      <SectionHeader label="Aparência" description="O tema é sincronizado entre todos os dispositivos da sua barbearia." />
      <View style={styles.card}>
        <View style={styles.themeRow}>
          {TEMA_OPTIONS.map((opt) => {
            const active = mode === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => handleSetMode(opt.value)}
                disabled={temaSalvando}
                style={[styles.themeBtn, active && styles.themeBtnActive, temaSalvando && { opacity: 0.7 }]}
              >
                <Feather name={opt.icon} size={14} color={active ? colors.invertedText : colors.textSecondary} />
                <Text style={[styles.themeText, active && { color: colors.invertedText }]}>
                  {opt.label}
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
          style={({ pressed }) => [styles.row, { borderBottomWidth: 0 }, pressed && { opacity: 0.7 }]}
        >
          <View style={[styles.iconWrap, { backgroundColor: colors.error + "1a" }]}>
            <Feather name="log-out" size={16} color={colors.error} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowLabel, { color: colors.error }]}>Sair da conta</Text>
            <Text style={styles.rowDesc}>Encerra a sessão neste aparelho</Text>
          </View>
          <Feather name="chevron-right" size={16} color={colors.textMuted} />
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

function InfoRow({
  icon, label, value, last, colors, styles,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  last?: boolean;
  colors: ColorPalette;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={[styles.row, last && { borderBottomWidth: 0 }]}>
      <View style={styles.iconWrap}>
        <Feather name={icon} size={16} color={colors.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue} numberOfLines={2}>{value}</Text>
      </View>
    </View>
  );
}

function EditRow({
  icon, label, children, last, colors, styles,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  children: React.ReactNode;
  last?: boolean;
  colors: ColorPalette;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={[styles.row, last && { borderBottomWidth: 0 }]}>
      <View style={styles.iconWrap}>
        <Feather name={icon} size={16} color={colors.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {children}
      </View>
    </View>
  );
}

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
    heroCard: {
      alignItems: "center",
      paddingVertical: 22,
      paddingHorizontal: 16,
      backgroundColor: c.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: c.surfaceBorder,
      marginBottom: 4,
    },
    avatarPressable: { position: "relative", marginBottom: 10 },
    avatar: { width: 84, height: 84, borderRadius: 42, borderWidth: 1, borderColor: c.surfaceBorder },
    avatarFallback: {
      width: 84, height: 84, borderRadius: 42,
      backgroundColor: c.accent + "26", alignItems: "center", justifyContent: "center",
      borderWidth: 1, borderColor: c.surfaceBorder,
    },
    avatarInit: { color: c.accent, fontFamily: "Inter_700Bold", fontSize: 26 },
    avatarOverlay: {
      position: "absolute", top: 0, right: 0, bottom: 0, left: 0,
      borderRadius: 42, backgroundColor: c.overlay,
      alignItems: "center", justifyContent: "center",
    },
    removePhotoBtn: {
      flexDirection: "row", alignItems: "center", gap: 4,
      marginTop: -4, marginBottom: 6, paddingHorizontal: 8, paddingVertical: 4,
    },
    removePhotoText: { color: c.error, fontFamily: "Inter_600SemiBold", fontSize: 11 },
    heroName: { color: c.text, fontFamily: "Inter_700Bold", fontSize: 17 },
    heroEmail: { color: c.textSecondary, fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 4 },
    heroBadge: {
      flexDirection: "row", alignItems: "center", gap: 5,
      backgroundColor: c.accent + "26",
      paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, marginTop: 10,
    },
    heroBadgeText: { color: c.accent, fontFamily: "Inter_600SemiBold", fontSize: 11 },
    card: {
      backgroundColor: c.surface, borderRadius: 14,
      borderWidth: 1, borderColor: c.surfaceBorder, overflow: "hidden",
    },
    row: {
      flexDirection: "row", alignItems: "center", gap: 12,
      paddingHorizontal: 14, paddingVertical: 12,
      borderBottomWidth: 1, borderBottomColor: c.surfaceBorder,
    },
    iconWrap: {
      width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center",
      backgroundColor: c.accent + "26",
    },
    rowLabel: { color: c.textMuted, fontSize: 11, fontFamily: "Inter_500Medium" },
    rowValue: { color: c.text, fontSize: 13, fontFamily: "Inter_600SemiBold", marginTop: 2 },
    rowDesc: { color: c.textSecondary, fontFamily: "Inter_500Medium", fontSize: 11, marginTop: 2 },
    input: {
      color: c.text, fontSize: 14, fontFamily: "Inter_600SemiBold",
      paddingVertical: 4, paddingHorizontal: 0, marginTop: 2,
    },
    themeRow: { flexDirection: "row", gap: 8, padding: 12 },
    themeBtn: {
      flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
      paddingVertical: 11, borderRadius: 10,
      backgroundColor: c.surfaceLight, borderWidth: 1, borderColor: c.surfaceBorder,
    },
    themeBtnActive: { backgroundColor: c.accent, borderColor: c.accent },
    themeText: { color: c.text, fontFamily: "Inter_600SemiBold", fontSize: 13 },
    actionRow: { flexDirection: "row", gap: 10, marginTop: 10 },
    btn: {
      flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
      paddingVertical: 13, borderRadius: 12,
    },
    btnGhost: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.surfaceBorder },
    btnGhostText: { color: c.text, fontFamily: "Inter_600SemiBold", fontSize: 14 },
    btnPrimary: { backgroundColor: c.accent },
    btnPrimaryText: { color: c.invertedText, fontFamily: "Inter_700Bold", fontSize: 14 },
  });
