import React, { useMemo } from "react";
import { useRouter, type Href } from "expo-router";
import { View, StyleSheet } from "react-native";
import { useColors, type ColorPalette } from "@/lib/theme";
import { ScreenContainer } from "@/components/ScreenContainer";
import { ListRow } from "@/components/ListRow";
import { SectionHeader } from "@/components/SectionHeader";

export default function ConfiguracoesIndex() {
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const go = (p: Href) => () => router.push(p);

  return (
    <ScreenContainer title="Configurações" subtitle="Ajustes do estabelecimento">
      <SectionHeader label="Conta" />
      <View style={styles.card}>
        <ListRow
          icon="user"
          label="Perfil"
          description="Dados pessoais, foto e tema"
          onPress={go("/configuracoes/perfil")}
        />
        <ListRow
          icon="briefcase"
          label="Empresa"
          description="Dados, endereço e marca"
          onPress={go("/configuracoes/empresa")}
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

      <SectionHeader label="Pagamentos" />
      <View style={styles.card}>
        <ListRow
          icon="link"
          label="Conexão Asaas"
          description="Conecte sua conta para receber via Pix, cartão ou boleto"
          onPress={go("/configuracoes/asaas")}
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

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.surfaceBorder,
      overflow: "hidden",
    },
  });
