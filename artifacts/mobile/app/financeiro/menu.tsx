import React from "react";
import { useRouter, type Href } from "expo-router";
import { View, StyleSheet } from "react-native";
import Colors from "@/constants/colors";
import { ScreenContainer } from "@/components/ScreenContainer";
import { ListRow } from "@/components/ListRow";
import { SectionHeader } from "@/components/SectionHeader";

export default function FinanceiroIndex() {
  const router = useRouter();
  const go = (p: Href) => () => router.push(p);

  return (
    <ScreenContainer title="Financeiro" subtitle="Gestão financeira da barbearia">
      <SectionHeader label="Visão geral" />
      <View style={styles.card}>
        <ListRow
          icon="pie-chart"
          label="Painel financeiro"
          description="Faturamento, despesas e indicadores"
          onPress={go("/financeiro")}
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

      <SectionHeader label="Caixa" />
      <View style={styles.card}>
        <ListRow
          icon="dollar-sign"
          label="Caixa diário"
          description="Abertura, sangria e fechamento"
          onPress={go("/financeiro/caixa")}
        />
        <ListRow
          icon="archive"
          label="Histórico de caixa"
          description="Caixas fechados anteriores"
          onPress={go("/financeiro/historico")}
        />
        <ListRow
          icon="dollar-sign"
          label="Caixinha"
          description="Gorjetas por profissional"
          onPress={go("/financeiro/caixinha")}
        />
      </View>

      <SectionHeader label="Comissões e contas" />
      <View style={styles.card}>
        <ListRow
          icon="percent"
          label="Comissões"
          description="Por profissional e período"
          onPress={go("/financeiro/comissoes")}
        />
        <ListRow
          icon="user-check"
          label="Conta do profissional"
          description="Saldos e adiantamentos"
          onPress={go("/financeiro/conta-profissional")}
        />
        <ListRow
          icon="user"
          label="Conta do cliente"
          description="Saldos e quitação"
          onPress={go("/financeiro/conta-cliente")}
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
