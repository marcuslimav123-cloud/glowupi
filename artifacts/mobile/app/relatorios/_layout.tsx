import { Stack } from "expo-router";
import React from "react";
import Colors from "@/constants/colors";
import { AuthGuard } from "@/components/AuthGuard";

export default function RelatoriosLayout() {
  return (
    <AuthGuard>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
        }}
      />
    </AuthGuard>
  );
}
