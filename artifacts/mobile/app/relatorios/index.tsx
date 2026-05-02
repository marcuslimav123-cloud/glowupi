import React from "react";
import { useRouter } from "expo-router";
import { View, StyleSheet } from "react-native";
import Colors from "@/constants/colors";
import { ScreenContainer } from "@/components/ScreenContainer";
import { ListRow } from "@/components/ListRow";
import { SectionHeader } from "@/components/SectionHeader";

export default function RelatoriosIndex() {
  const router = useRouter();
  const go = (p: string) => () => router.push(p as any);

  return (
    <ScreenContainer title="Relatórios" subtitle="Acompanhe seus indicadores">
      <SectionHeader label="Categorias" />
      <View style={styles.card}>
        <ListRow
          icon="bar-chart-2"
          label="Operacionais"
          description="Agendamentos, cancelamentos e itens"
          onPress={go("/relatorios/operacionais")}
        />
        <ListRow
          icon="users"
          label="Clientes"
          description="Aniversariantes, recuperação e ranking"
          onPress={go("/relatorios/clientes")}
        />
        <ListRow
          icon="trending-up"
          label="Financeiros e vendas"
          description="Faturamento, lucro e cupons"
          onPress={go("/relatorios/financeiros")}
        />
        <ListRow
          icon="box"
          label="Estoque"
          description="Posição e necessidade de reposição"
          onPress={go("/relatorios/estoque")}
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
