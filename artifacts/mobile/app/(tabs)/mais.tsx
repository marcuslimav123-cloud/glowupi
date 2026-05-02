import React, { useMemo } from "react";
import {
  Alert,
  Image,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, type Href } from "expo-router";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { Feather } from "@expo/vector-icons";
import { useColors, type ColorPalette } from "@/lib/theme";
import { useAuth } from "@/contexts/AuthContext";
import { ListRow } from "@/components/ListRow";
import { SectionHeader } from "@/components/SectionHeader";

const PRIVACY_URL = "https://glowupi.com/legal/privacidade";
const TERMS_URL = "https://glowupi.com/legal/termos";
const SUPPORT_URL = "https://glowupi.com/suporte";
const SUPPORT_EMAIL = "suporte@glowupi.com";
const APPLE_SUBSCRIPTIONS_URL = "https://apps.apple.com/account/subscriptions";

type ItemDef = {
  icon: Parameters<typeof ListRow>[0]["icon"];
  label: string;
  description?: string;
  to?: Href;
  onPress?: () => void;
  badge?: string;
  badgeTone?: Parameters<typeof ListRow>[0]["badgeTone"];
  destructive?: boolean;
};

type SectionDef = {
  label: string;
  description?: string;
  items: ItemDef[];
};

export default function MaisScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, barbearia, logout, token } = useAuth();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? 67 + 16 : insets.top + 16;
  const bottomPadding = isWeb ? 118 : 100 + insets.bottom;

  const haptic = (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
    if (Platform.OS !== "web") Haptics.impactAsync(style);
  };

  const go = (path: Href) => () => {
    haptic();
    router.push(path);
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

  const handleLogout = () => {
    haptic(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Sair", "Deseja realmente sair da sua conta?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: () => logout() },
    ]);
  };

  const handleDeleteAccount = () => {
    haptic(Haptics.ImpactFeedbackStyle.Medium);
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

  const sections: SectionDef[] = [
    {
      label: "Financeiro",
      description: "Caixa, comissões, contas e fluxo de caixa.",
      items: [
        { icon: "grid", label: "Visão geral do financeiro", description: "Acessar o módulo completo", to: "/financeiro" },
        { icon: "pie-chart", label: "Painel financeiro", to: "/financeiro/dashboard" },
        { icon: "trending-up", label: "Fluxo de caixa", to: "/financeiro/fluxo" },
        { icon: "dollar-sign", label: "Caixa", to: "/caixa" },
      ],
    },
    {
      label: "Cadastros",
      description: "Profissionais, serviços, produtos e filiais.",
      items: [
        { icon: "grid", label: "Visão geral de cadastros", description: "Acessar o módulo completo", to: "/cadastros" },
        { icon: "user-check", label: "Profissionais", to: "/cadastros/profissionais" },
        { icon: "scissors", label: "Serviços", to: "/cadastros/servicos" },
        { icon: "package", label: "Produtos", to: "/cadastros/produtos" },
        { icon: "gift", label: "Pacotes", to: "/pacotes" },
      ],
    },
    {
      label: "Marketing e comunicação",
      description: "Campanhas, cupons, fidelidade e mensagens.",
      items: [
        { icon: "grid", label: "Visão geral do marketing", description: "Acessar o módulo completo", to: "/marketing" },
        { icon: "send", label: "Nova campanha", to: "/marketing/nova-campanha" },
        { icon: "tag", label: "Cupons", to: "/marketing/cupons" },
        { icon: "award", label: "Clube de vantagens", to: "/marketing/fidelidade" },
        { icon: "star", label: "Avaliações", to: "/marketing/avaliacoes" },
      ],
    },
    {
      label: "Equipe",
      items: [
        { icon: "users", label: "Membros e convites", description: "Gerencie sua equipe e perfis", to: "/equipe" },
      ],
    },
    {
      label: "Relatórios",
      description: "Operacionais, clientes, financeiros e estoque.",
      items: [
        { icon: "grid", label: "Visão geral de relatórios", description: "Acessar o módulo completo", to: "/relatorios" },
        { icon: "calendar", label: "Agendamentos", to: "/relatorios/agendamentos" },
        { icon: "tag", label: "Cupons", to: "/relatorios/cupons" },
      ],
    },
    {
      label: "Configurações",
      items: [
        { icon: "grid", label: "Visão geral das configurações", description: "Acessar o módulo completo", to: "/configuracoes" },
        { icon: "briefcase", label: "Empresa", to: "/configuracoes/empresa" },
        { icon: "settings", label: "Parâmetros", to: "/configuracoes/parametros" },
        { icon: "clock", label: "Funcionamento", to: "/configuracoes/funcionamento" },
        { icon: "shield", label: "Perfis de acesso", to: "/configuracoes/acessos" },
      ],
    },
    {
      label: "Conta",
      items: [
        { icon: "user", label: "Perfil", description: "Dados pessoais, foto e tema", to: "/configuracoes/perfil" },
        {
          icon: "award",
          label: "Plano e assinatura",
          badge: "Pro",
          badgeTone: "accent",
          onPress: () => {
            haptic();
            router.push("/paywall");
          },
        },
        ...(Platform.OS === "ios"
          ? [{ icon: "credit-card" as const, label: "Gerenciar assinatura (Apple)", onPress: openAppleSubscriptions }]
          : []),
        { icon: "mail", label: "Falar com o suporte", onPress: openMail },
        { icon: "help-circle", label: "Central de ajuda", onPress: () => openUrl(SUPPORT_URL) },
        { icon: "shield", label: "Política de privacidade", onPress: () => openUrl(PRIVACY_URL) },
        { icon: "file-text", label: "Termos de uso", onPress: () => openUrl(TERMS_URL) },
        { icon: "log-out", label: "Sair", destructive: true, onPress: handleLogout },
        { icon: "trash-2", label: "Excluir conta", destructive: true, onPress: handleDeleteAccount },
      ],
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.scrollContent, { paddingTop: topPadding, paddingBottom: bottomPadding }]}
    >
      <View style={styles.logoHeader}>
        <Image source={require("@/assets/images/logo.png")} style={styles.headerLogo} resizeMode="contain" />
      </View>

      <View style={styles.profileSection}>
        {user?.fotoUrl ? (
          <Image source={{ uri: user.fotoUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Feather name="user" size={28} color={colors.accent} />
          </View>
        )}
        <View style={styles.profileInfo}>
          <Text style={styles.profileName} numberOfLines={1}>{user?.nome ?? ""}</Text>
          <Text style={styles.profileEmail} numberOfLines={1}>{user?.email ?? ""}</Text>
          {barbearia && <Text style={styles.profileBarbearia} numberOfLines={1}>{barbearia.nome}</Text>}
        </View>
      </View>

      {sections.map((section) => (
        <View key={section.label}>
          <SectionHeader label={section.label} description={section.description} />
          <View style={styles.card}>
            {section.items.map((item) => (
              <View key={`${section.label}-${item.label}`}>
                <ListRow
                  icon={item.icon}
                  label={item.label}
                  description={item.description}
                  badge={item.badge}
                  badgeTone={item.badgeTone}
                  destructive={item.destructive}
                  onPress={item.to ? go(item.to) : item.onPress}
                />
              </View>
            ))}
          </View>
        </View>
      ))}

      <Text style={styles.version}>Glow Upi Pro v1.0.0</Text>
    </ScrollView>
  );
}

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    scrollContent: { paddingHorizontal: 16 },
    logoHeader: { alignItems: "center", marginBottom: 12 },
    headerLogo: { width: 72, height: 72 },
    profileSection: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: c.surfaceBorder,
      gap: 14,
    },
    avatar: { width: 56, height: 56, borderRadius: 28 },
    avatarPlaceholder: {
      width: 56, height: 56, borderRadius: 28,
      backgroundColor: c.accent + "20",
      alignItems: "center", justifyContent: "center",
    },
    profileInfo: { flex: 1, minWidth: 0 },
    profileName: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: c.text, marginBottom: 2 },
    profileEmail: { fontSize: 13, fontFamily: "Inter_400Regular", color: c.textSecondary },
    profileBarbearia: { fontSize: 12, fontFamily: "Inter_500Medium", color: c.accent, marginTop: 4 },
    card: { backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.surfaceBorder, overflow: "hidden" },
    version: { fontSize: 12, fontFamily: "Inter_400Regular", color: c.textMuted, textAlign: "center", marginTop: 24 },
  });
