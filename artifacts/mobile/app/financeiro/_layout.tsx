import { Stack } from "expo-router";
import React from "react";
import { useColors } from "@/lib/theme";
import { AuthGuard } from "@/components/AuthGuard";

export default function FinanceiroLayout() {
  const colors = useColors();
  return (
    <AuthGuard>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      />
    </AuthGuard>
  );
}
