import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter, type Href } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors, type ColorPalette } from "@/lib/theme";
import { ScreenContainer } from "@/components/ScreenContainer";

interface ChannelCfg {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  desc: string;
  href: Href;
  color: string;
}

const makeCanais = (c: ColorPalette): ChannelCfg[] => [
  {
    icon: "mail",
    title: "E-mail marketing",
    desc: "Envie campanhas em massa segmentadas por filtros de público.",
    href: "/marketing/email-marketing",
    color: c.info,
  },
  {
    icon: "send",
    title: "Mensagens WhatsApp",
    desc: "Edite e dispare templates de WhatsApp salvos.",
    href: "/marketing/whatsapp-templates",
    color: c.success,
  },
  {
    icon: "rss",
    title: "Notícia para clientes",
    desc: "Publique novidades e promoções no app dos clientes.",
    href: "/marketing/noticias",
    color: c.accent,
  },
  {
    icon: "tag",
    title: "Cupom de desconto",
    desc: "Crie cupons promocionais com validade e limite de uso.",
    href: "/marketing/cupons",
    color: c.warning,
  },
];

export default function NovaCampanhaScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();

  return (
    <ScreenContainer title="Nova campanha" subtitle="Escolha o canal de comunicação">
      {makeCanais(colors).map((c) => (
        <TouchableOpacity
          key={c.title}
          style={styles.card}
          onPress={() => router.push(c.href)}
          activeOpacity={0.7}
        >
          <View style={[styles.iconBox, { backgroundColor: c.color + "22" }]}>
            <Feather name={c.icon} size={20} color={c.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{c.title}</Text>
            <Text style={styles.desc}>{c.desc}</Text>
          </View>
          <Feather name="chevron-right" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      ))}
    </ScreenContainer>
  );
}

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
  card: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: c.surface, borderRadius: 14, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: c.surfaceBorder,
  },
  iconBox: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  title: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: c.text },
  desc: { fontSize: 12, fontFamily: "Inter_400Regular", color: c.textSecondary, marginTop: 4, lineHeight: 17 },
});
