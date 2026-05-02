import React from "react";
import { useRouter } from "expo-router";
import { View, StyleSheet } from "react-native";
import Colors from "@/constants/colors";
import { ScreenContainer } from "@/components/ScreenContainer";
import { ListRow } from "@/components/ListRow";
import { SectionHeader } from "@/components/SectionHeader";

export default function FinanceiroIndex() {
  const router = useRouter();
  const go = (p: string) => () => router.push(p as any);

  return (
    <ScreenContainer title="Financeiro" subtitle="Gestão financeira da barbearia">
      <SectionHeader label="Visão geral" />
      <View style={styles.card}>
        <ListRow
          icon="pie-chart"
          label="Painel financeiro"
          description="Faturamento, despesas e indicadores"
          onPress={go("/financeiro/dashboard")}
        />
        <ListRow
          icon="trending-up"
          label="Fluxo de caixa"
          description="Entradas e saídas com filtros"
          onPress={go("/financeiro/fluxo")}
        />
      </View>

      <SectionHeader label="Contas e movimentações" />
      <View style={styles.card}>
        <ListRow
          icon="arrow-down-circle"
          label="Contas a pagar"
          onPress={go("/financeiro/contas-pagar")}
        />
        <ListRow
          icon="arrow-up-circle"
          label="Contas a receber"
          onPress={go("/financeiro/contas-receber")}
        />
        <ListRow
          icon="list"
          label="Movimentações"
          description="Log de todas as transações"
          onPress={go("/financeiro/movimentacoes")}
        />
      </View>

      <SectionHeader label="Operação" />
      <View style={styles.card}>
        <ListRow
          icon="dollar-sign"
          label="Caixa diário"
          description="Abertura, sangria e fechamento"
          onPress={go("/financeiro/caixa-diario")}
        />
        <ListRow
          icon="percent"
          label="Comissões"
          description="Por profissional e período"
          onPress={go("/financeiro/comissoes")}
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
