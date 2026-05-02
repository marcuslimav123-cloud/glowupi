import React from "react";
import { Stack } from "expo-router";
import { AuthGuard } from "@/components/AuthGuard";

export default function PacotesLayout() {
  return (
    <AuthGuard>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="vendas" />
      </Stack>
    </AuthGuard>
  );
}
