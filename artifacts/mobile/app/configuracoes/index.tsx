import React from "react";
import { useRouter } from "expo-router";
import { View, StyleSheet } from "react-native";
import Colors from "@/constants/colors";
import { ScreenContainer } from "@/components/ScreenContainer";
import { ListRow } from "@/components/ListRow";
import { SectionHeader } from "@/components/SectionHeader";

export default function ConfiguracoesIndex() {
  const router = useRouter();
  const go = (p: string) => () => router.push(p as any);

  return (
    <ScreenContainer title="Configurações" subtitle="Ajustes do estabelecimento">
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
