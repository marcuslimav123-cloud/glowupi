import React from "react";
import { View, StyleSheet } from "react-native";
import Colors from "@/constants/colors";
import { ScreenContainer } from "@/components/ScreenContainer";
import { ListRow } from "@/components/ListRow";
import { SectionHeader } from "@/components/SectionHeader";
import { EmptyState } from "@/components/EmptyState";

export default function EquipeIndex() {
  return (
    <ScreenContainer title="Equipe" subtitle="Membros, convites e perfis de acesso">
      <SectionHeader label="Gestão" />
      <View style={styles.card}>
        <ListRow
          icon="users"
          label="Membros"
          description="Lista, status e funções"
          disabled
        />
        <ListRow
          icon="user-plus"
          label="Convites pendentes"
          description="Gerencie convites por e-mail"
          disabled
        />
        <ListRow
          icon="shield"
          label="Perfis de acesso"
          description="Permissões granulares por cargo"
          disabled
        />
      </View>

      <View style={styles.empty}>
        <EmptyState
          icon="users"
          title="Em breve"
          description="A gestão completa da equipe estará disponível em breve."
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
  empty: { marginTop: 32 },
});
