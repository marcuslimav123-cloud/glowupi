import React from "react";
import { useRouter, type Href } from "expo-router";
import { View, StyleSheet } from "react-native";
import Colors from "@/constants/colors";
import { ScreenContainer } from "@/components/ScreenContainer";
import { ListRow } from "@/components/ListRow";
import { SectionHeader } from "@/components/SectionHeader";

export default function CadastrosIndex() {
  const router = useRouter();
  const go = (p: Href) => () => router.push(p);

  return (
    <ScreenContainer title="Cadastros" subtitle="Profissionais, serviços, produtos">
      <SectionHeader label="Equipe e atendimentos" />
      <View style={styles.card}>
        <ListRow
          icon="user-check"
          label="Profissionais"
          description="Jornada, comissões e serviços"
          onPress={go("/cadastros/profissionais")}
        />
        <ListRow
          icon="scissors"
          label="Serviços"
          description="Catálogo, preços e duração"
          onPress={go("/cadastros/servicos")}
        />
      </View>

      <SectionHeader label="Estoque e estrutura" />
      <View style={styles.card}>
        <ListRow
          icon="package"
          label="Produtos"
          description="Estoque, custo e movimentações"
          onPress={go("/cadastros/produtos")}
        />
        <ListRow
          icon="map-pin"
          label="Filiais"
          description="Gestão de unidades"
          onPress={go("/cadastros/filiais")}
        />
      </View>

      <SectionHeader label="Clientes e fidelização" />
      <View style={styles.card}>
        <ListRow
          icon="users"
          label="Grupos de clientes"
          description="Segmentação para campanhas"
          onPress={go("/cadastros/grupos-clientes")}
        />
        <ListRow
          icon="award"
          label="Clube de vantagens"
          description="Programa de fidelidade"
          onPress={go("/cadastros/clube-vantagens")}
        />
        <ListRow
          icon="layers"
          label="Tipos"
          description="Categorias de receita e despesa"
          onPress={go("/cadastros/tipos")}
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
