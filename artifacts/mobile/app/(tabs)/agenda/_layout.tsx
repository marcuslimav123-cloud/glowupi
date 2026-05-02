import { Stack } from "expo-router";
import React from "react";
import { useColors } from "@/lib/theme";

export default function AgendaLayout() {
  const colors = useColors();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
