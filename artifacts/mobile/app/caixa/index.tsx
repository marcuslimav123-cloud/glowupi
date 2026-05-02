import React, { useMemo } from "react";
import { Redirect } from "expo-router";

export default function CaixaIndex() {
  return <Redirect href="/financeiro/caixa-diario" />;
}
