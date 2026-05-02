import React from "react";
import { useRouter, type Href } from "expo-router";
import { View, StyleSheet } from "react-native";
import Colors from "@/constants/colors";
import { ScreenContainer } from "@/components/ScreenContainer";
import { ListRow } from "@/components/ListRow";
import { SectionHeader } from "@/components/SectionHeader";

export default function MarketingIndex() {
  const router = useRouter();
  const go = (p: Href) => () => router.push(p);

  return (
    <ScreenContainer title="Marketing" subtitle="Comunicação e fidelização">
      <SectionHeader label="Campanhas" />
      <View style={styles.card}>
        <ListRow
          icon="send"
          label="Nova campanha"
          description="Criação guiada por canal"
          onPress={go("/marketing/nova-campanha")}
        />
        <ListRow
          icon="mail"
          label="E-mail marketing"
          description="Campanhas e estatísticas"
          onPress={go("/marketing/email-marketing")}
        />
      </View>

      <SectionHeader label="Comunicação" />
      <View style={styles.card}>
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
        <ListRow
          icon="bell"
          label="Lembretes"
          description="Envios automáticos por evento"
          onPress={go("/marketing/lembretes")}
        />
        <ListRow
          icon="rss"
          label="Notícias"
          description="Comunicados a clientes"
          onPress={go("/marketing/noticias")}
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
