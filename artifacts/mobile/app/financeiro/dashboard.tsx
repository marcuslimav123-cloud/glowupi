import React from "react";
import { PlaceholderScreen } from "@/components/PlaceholderScreen";

export default function Dashboard() {
  return (
    <PlaceholderScreen
      title="Painel financeiro"
      icon="pie-chart"
      description="Faturamento total, contas a receber/pagar, comissões do mês e gráfico de evolução serão exibidos aqui."
    />
  );
}
