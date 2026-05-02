import React, { useMemo } from "react";
import { useRouter, type Href } from "expo-router";
import { View, StyleSheet } from "react-native";
import { useColors, type ColorPalette } from "@/lib/theme";
import { ScreenContainer } from "@/components/ScreenContainer";
import { ListRow } from "@/components/ListRow";
import { SectionHeader } from "@/components/SectionHeader";

export default function CadastrosIndex() {
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
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
        <ListRow
          icon="briefcase"
          label="Empresa"
          description="Dados, endereço e marca"
          onPress={go("/configuracoes/empresa")}
        />
      </View>

      <SectionHeader label="Pacotes e clube" />
      <View style={styles.card}>
        <ListRow
          icon="gift"
          label="Pacotes"
          description="Crie pacotes e venda"
          onPress={go("/pacotes")}
        />
        <ListRow
          icon="award"
          label="Clube de assinatura"
          description="Planos recorrentes para clientes"
          onPress={go("/cadastros/clubes")}
        />
        <ListRow
          icon="star"
          label="Clube de vantagens"
          description="Programa de pontos e fidelidade"
          onPress={go("/marketing/fidelidade")}
        />
      </View>

      <SectionHeader label="Clientes e segmentação" />
      <View style={styles.card}>
        <ListRow
          icon="users"
          label="Grupos de clientes"
          description="Segmentação para campanhas"
          onPress={go("/cadastros/grupos-clientes")}
        />
        <ListRow
          icon="layers"
          label="Tipos de receita e despesa"
          description="Categorias do financeiro"
          onPress={go("/cadastros/tipos")}
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
