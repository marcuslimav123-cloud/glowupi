import React from "react";
import { useRouter, type Href } from "expo-router";
import { View, StyleSheet } from "react-native";
import Colors from "@/constants/colors";
import { ScreenContainer } from "@/components/ScreenContainer";
import { ListRow } from "@/components/ListRow";
import { SectionHeader } from "@/components/SectionHeader";

export default function ConfiguracoesIndex() {
  const router = useRouter();
  const go = (p: Href) => () => router.push(p);

  return (
    <ScreenContainer title="Configurações" subtitle="Ajustes do estabelecimento">
      <SectionHeader label="Conta" />
      <View style={styles.card}>
        <ListRow
          icon="user"
          label="Perfil"
          description="Dados pessoais e preferências"
          onPress={go("/configuracoes/perfil")}
        />
      </View>

      <SectionHeader label="Operação" />
      <View style={styles.card}>
        <ListRow
          icon="settings"
          label="Parâmetros"
          description="Agenda, notificações e integrações"
          onPress={go("/configuracoes/parametros")}
        />
        <ListRow
          icon="clock"
          label="Funcionamento"
          description="Horários do estabelecimento"
          onPress={go("/configuracoes/funcionamento")}
        />
      </View>

      <SectionHeader label="Acessos e formulários" />
      <View style={styles.card}>
        <ListRow
          icon="shield"
          label="Perfis de acesso"
          description="Permissões granulares por cargo"
          onPress={go("/configuracoes/acessos")}
        />
        <ListRow
          icon="clipboard"
          label="Anamnese"
          description="Formulários personalizados"
          onPress={go("/configuracoes/anamnese")}
        />
        <ListRow
          icon="file-text"
          label="Documentos"
          description="Modelos de contratos e termos"
          onPress={go("/configuracoes/documentos")}
        />
      </View>

      <SectionHeader label="Comunicação" />
      <View style={styles.card}>
        <ListRow
          icon="message-circle"
          label="Comunicação"
          description="Envios automáticos por canal"
          onPress={go("/configuracoes/comunicacao")}
        />
        <ListRow
          icon="mail"
          label="Templates de e-mail"
          description="Modelos de e-mails do sistema"
          onPress={go("/configuracoes/email-templates")}
        />
      </View>

      <SectionHeader label="Clientes" />
      <View style={styles.card}>
        <ListRow
          icon="user-x"
          label="Restrições de clientes"
          description="Bloqueios para agendamento online"
          onPress={go("/configuracoes/restricoes-clientes")}
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
