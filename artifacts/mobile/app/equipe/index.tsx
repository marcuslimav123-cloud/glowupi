import React, { useMemo } from "react";
import { useRouter, type Href } from "expo-router";
import { View, StyleSheet } from "react-native";
import { useColors, type ColorPalette } from "@/lib/theme";
import { ScreenContainer } from "@/components/ScreenContainer";
import { ListRow } from "@/components/ListRow";
import { SectionHeader } from "@/components/SectionHeader";

export default function EquipeIndex() {
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const go = (p: Href) => () => router.push(p);

  return (
    <ScreenContainer title="Equipe" subtitle="Membros, convites e perfis de acesso">
      <SectionHeader label="Gestão" />
      <View style={styles.card}>
        <ListRow
          icon="users"
          label="Membros"
          description="Lista, status e funções"
          onPress={go("/equipe/membros")}
        />
        <ListRow
          icon="user-plus"
          label="Convites"
          description="Envie e gerencie convites"
          onPress={go("/equipe/convites")}
        />
        <ListRow
          icon="shield"
          label="Perfis de acesso"
          description="Permissões granulares por cargo"
          onPress={go("/configuracoes/acessos")}
        />
      </View>
    </ScreenContainer>
  );
}

const makeStyles = (c: ColorPalette) => StyleSheet.create({
  card: {
    backgroundColor: c.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.surfaceBorder,
    overflow: "hidden",
  },
});
