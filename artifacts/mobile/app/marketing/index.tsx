import React from "react";
import { useRouter } from "expo-router";
import { View, StyleSheet } from "react-native";
import Colors from "@/constants/colors";
import { ScreenContainer } from "@/components/ScreenContainer";
import { ListRow } from "@/components/ListRow";
import { SectionHeader } from "@/components/SectionHeader";

export default function MarketingIndex() {
  const router = useRouter();
  const go = (p: string) => () => router.push(p as any);

  return (
    <ScreenContainer title="Marketing" subtitle="Comunicação e fidelização">
      <SectionHeader label="Comunicação" />
      <View style={styles.card}>
        <ListRow
          icon="mail"
          label="E-mail marketing"
          description="Campanhas e estatísticas"
          onPress={go("/marketing/email-marketing")}
        />
        <ListRow
          icon="message-square"
          label="Inbox de mensagens"
          onPress={go("/marketing/inbox")}
        />
        <ListRow
          icon="send"
          label="Templates do WhatsApp"
          onPress={go("/marketing/whatsapp-templates")}
        />
      </View>

      <SectionHeader label="Fidelização" />
      <View style={styles.card}>
        <ListRow
          icon="tag"
          label="Cupons"
          description="Códigos de desconto"
          onPress={go("/marketing/cupons")}
        />
        <ListRow
          icon="award"
          label="Clube de vantagens"
          description="Programa de fidelidade"
          onPress={go("/marketing/fidelidade")}
        />
        <ListRow
          icon="smile"
          label="Pesquisas de satisfação"
          onPress={go("/marketing/pesquisas")}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    overflow: "hidden",
  },
});
