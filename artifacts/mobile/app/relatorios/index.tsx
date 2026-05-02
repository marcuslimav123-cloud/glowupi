import React from "react";
import { useRouter, type Href } from "expo-router";
import { View, StyleSheet } from "react-native";
import Colors from "@/constants/colors";
import { ScreenContainer } from "@/components/ScreenContainer";
import { ListRow } from "@/components/ListRow";
import { SectionHeader } from "@/components/SectionHeader";

export default function RelatoriosIndex() {
  const router = useRouter();
  const go = (p: Href) => () => router.push(p);

  return (
    <ScreenContainer title="Relatórios" subtitle="Acompanhe seus indicadores">
      <SectionHeader label="Visão geral" />
      <View style={styles.card}>
        <ListRow
          icon="bar-chart-2"
          label="Resumo geral"
          description="Indicadores consolidados do período"
          onPress={go("/relatorios/resumo")}
        />
      </View>

      <SectionHeader label="Operacionais" />
      <View style={styles.card}>
        <ListRow
          icon="calendar"
          label="Agendamentos"
          description="Status, profissional e período"
          onPress={go("/relatorios/agendamentos")}
        />
        <ListRow
          icon="x-circle"
          label="Comandas canceladas"
          onPress={go("/relatorios/comandas-canceladas")}
        />
        <ListRow
          icon="list"
          label="Itens de comanda"
          description="Produtos e serviços vendidos"
          onPress={go("/relatorios/comandas-itens")}
        />
        <ListRow
          icon="bar-chart-2"
          label="Picos de demanda"
          description="Análise de horários de pico"
          onPress={go("/relatorios/picos")}
        />
      </View>

      <SectionHeader label="Clientes" />
      <View style={styles.card}>
        <ListRow
          icon="gift"
          label="Aniversariantes"
          onPress={go("/relatorios/aniversariantes")}
        />
        <ListRow
          icon="user-minus"
          label="Clientes inativos"
          description="Recuperação de quem não retorna"
          onPress={go("/relatorios/dias-sem-vir")}
        />
        <ListRow
          icon="pie-chart"
          label="Perfil dos clientes"
          description="Demografia e ticket médio"
          onPress={go("/relatorios/perfil-cliente")}
        />
        <ListRow
          icon="award"
          label="Rankings"
          description="Profissionais, serviços e clientes"
          onPress={go("/relatorios/rankings")}
        />
      </View>

      <SectionHeader label="Financeiros e vendas" />
      <View style={styles.card}>
        <ListRow
          icon="dollar-sign"
          label="Financeiro"
          description="Faturamento, despesas e fluxo"
          onPress={go("/relatorios/financeiro")}
        />
        <ListRow
          icon="trending-up"
          label="Lucro por produto"
          onPress={go("/relatorios/lucro-produtos")}
        />
        <ListRow
          icon="package"
          label="Pacotes"
          description="Venda e consumo de pacotes"
          onPress={go("/relatorios/pacotes")}
        />
        <ListRow
          icon="tag"
          label="Cupons"
          description="Receita gerada e desconto concedido"
          onPress={go("/relatorios/cupons")}
        />
      </View>

      <SectionHeader label="Estoque" />
      <View style={styles.card}>
        <ListRow
          icon="box"
          label="Posição de estoque"
          description="Saldos e necessidade de reposição"
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
