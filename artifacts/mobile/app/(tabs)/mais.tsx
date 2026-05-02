import React from "react";
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
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
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
  to?: string;
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
  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? 67 + 16 : insets.top + 16;
  const bottomPadding = isWeb ? 118 : 100 + insets.bottom;

  const haptic = (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
    if (Platform.OS !== "web") Haptics.impactAsync(style);
  };

  const go = (path: string) => () => {
    haptic();
    router.push(path as any);
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
      description: "Caixa diário, comissões, contas e fluxo de caixa.",
      items: [
        { icon: "pie-chart", label: "Painel financeiro", description: "Visão geral de faturamento e despesas", to: "/financeiro" },
        { icon: "trending-up", label: "Fluxo de caixa", description: "Entradas e saídas detalhadas", to: "/financeiro/fluxo" },
        { icon: "arrow-down-circle", label: "Contas a pagar", to: "/financeiro/contas-pagar" },
        { icon: "arrow-up-circle", label: "Contas a receber", to: "/financeiro/contas-receber" },
        { icon: "percent", label: "Comissões", description: "Por profissional e período", to: "/financeiro/comissoes" },
        { icon: "dollar-sign", label: "Caixa diário", description: "Abertura, sangria e fechamento", to: "/financeiro/caixa-diario" },
        { icon: "list", label: "Movimentações", to: "/financeiro/movimentacoes" },
      ],
    },
    {
      label: "Cadastros",
      description: "Profissionais, serviços, produtos e filiais.",
      items: [
        { icon: "user-check", label: "Profissionais", description: "Jornada, comissões e serviços", to: "/cadastros/profissionais" },
        { icon: "scissors", label: "Serviços", description: "Catálogo, preços e duração", to: "/cadastros/servicos" },
        { icon: "package", label: "Produtos", description: "Estoque e controle de movimentação", to: "/cadastros/produtos" },
        { icon: "map-pin", label: "Filiais", to: "/cadastros/filiais" },
      ],
    },
    {
      label: "Marketing e comunicação",
      description: "Campanhas, cupons, fidelidade e mensagens.",
      items: [
        { icon: "mail", label: "E-mail marketing", description: "Campanhas e estatísticas", to: "/marketing/email-marketing" },
        { icon: "message-square", label: "Inbox de mensagens", to: "/marketing/inbox" },
        { icon: "send", label: "Templates do WhatsApp", to: "/marketing/whatsapp-templates" },
        { icon: "tag", label: "Cupons", description: "Códigos de desconto", to: "/marketing/cupons" },
        { icon: "award", label: "Clube de vantagens", description: "Programa de fidelidade", to: "/marketing/fidelidade" },
        { icon: "smile", label: "Pesquisas de satisfação", to: "/marketing/pesquisas" },
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
        { icon: "bar-chart-2", label: "Operacionais", to: "/relatorios/operacionais" },
        { icon: "users", label: "Clientes", to: "/relatorios/clientes" },
        { icon: "trending-up", label: "Financeiros e vendas", to: "/relatorios/financeiros" },
        { icon: "box", label: "Estoque", to: "/relatorios/estoque" },
      ],
    },
    {
      label: "Configurações",
      items: [
        { icon: "settings", label: "Parâmetros", description: "Agenda, notificações e integrações", to: "/configuracoes/parametros" },
        { icon: "clipboard", label: "Anamnese", description: "Formulários personalizados", to: "/configuracoes/anamnese" },
        { icon: "shield", label: "Perfis de acesso", description: "Permissões por cargo", to: "/configuracoes/acessos" },
        { icon: "clock", label: "Funcionamento", description: "Horários do estabelecimento", to: "/configuracoes/funcionamento" },
        { icon: "file-text", label: "Documentos", description: "Modelos e contratos", to: "/configuracoes/documentos" },
      ],
    },
    {
      label: "Conta",
      items: [
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
          ? [
              {
                icon: "credit-card" as const,
                label: "Gerenciar assinatura (Apple)",
                onPress: openAppleSubscriptions,
              },
            ]
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
      contentContainerStyle={[
        styles.scrollContent,
        { paddingTop: topPadding, paddingBottom: bottomPadding },
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
          <Text style={styles.profileName} numberOfLines={1}>
            {user?.nome ?? ""}
          </Text>
          <Text style={styles.profileEmail} numberOfLines={1}>
            {user?.email ?? ""}
          </Text>
          {barbearia && (
            <Text style={styles.profileBarbearia} numberOfLines={1}>
              {barbearia.nome}
            </Text>
          )}
        </View>
      </View>

      {sections.map((section) => (
        <View key={section.label}>
          <SectionHeader label={section.label} description={section.description} />
          <View style={styles.card}>
            {section.items.map((item, idx) => (
              <View
                key={`${section.label}-${item.label}`}
                style={idx === section.items.length - 1 ? styles.lastRow : null}
              >
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingHorizontal: 16 },
  logoHeader: { alignItems: "center", marginBottom: 12 },
  headerLogo: { width: 72, height: 72 },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
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
  profileInfo: { flex: 1, minWidth: 0 },
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
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    overflow: "hidden",
  },
  lastRow: {},
  version: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    textAlign: "center",
    marginTop: 24,
  },
});
