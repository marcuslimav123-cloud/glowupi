import React from "react";
import { Stack } from "expo-router";
import { AuthGuard } from "@/components/AuthGuard";

export default function CaixaLayout() {
  return (
    <AuthGuard>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
      </Stack>
    </AuthGuard>
  );
}
