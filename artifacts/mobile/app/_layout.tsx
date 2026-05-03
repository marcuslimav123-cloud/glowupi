import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, router, type Href } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { setBaseUrl } from "@workspace/api-client-react";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ATTExplainer } from "@/components/ATTExplainer";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider, ThemeSyncer, useTheme } from "@/lib/theme";
import { hasAskedATT, requestTrackingPermissionNow, markATTAsked } from "@/lib/tracking";
import { queryClient } from "@/lib/queryClient";

setBaseUrl(`https://${process.env.EXPO_PUBLIC_DOMAIN}`);

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { colors, resolved } = useTheme();
  return (
    <>
      <StatusBar style={resolved === "claro" ? "dark" : "light"} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" options={{ gestureEnabled: false }} />
        <Stack.Screen name="register" options={{ gestureEnabled: true }} />
        <Stack.Screen name="comandas" />
        <Stack.Screen name="financeiro" />
        <Stack.Screen name="cadastros" />
        <Stack.Screen name="clientes" />
        <Stack.Screen name="marketing" />
        <Stack.Screen name="configuracoes" />
        <Stack.Screen name="equipe" />
        <Stack.Screen name="relatorios" />
        <Stack.Screen name="pacotes" />
        <Stack.Screen name="caixa" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [attVisible, setAttVisible] = React.useState(false);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
      (async () => {
        const asked = await hasAskedATT();
        if (!asked) {
          setTimeout(() => setAttVisible(true), 1200);
        }
      })();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    const received = Notifications.addNotificationReceivedListener((notification) => {
      try {
        const data: any = notification.request.content.data || {};
        const tipo = String(data.type || data.tipo || "").toLowerCase();
        const prefixes = new Set<string>(["notificacoes"]);
        if (tipo.includes("agend") || tipo === "reminder" || tipo === "pending_appointments_nudge") {
          prefixes.add("agendamentos");
          prefixes.add("agendamento");
          prefixes.add("agenda");
          prefixes.add("cliente-agend");
        }
        if (tipo.includes("comanda")) {
          prefixes.add("comandas-abertas");
          prefixes.add("comandas-fechadas");
          prefixes.add("comanda-detail");
          prefixes.add("financeiro-comandas-aberto");
          prefixes.add("fin-comandas-all");
          prefixes.add("mov-comandas");
          prefixes.add("fluxo-comandas");
          prefixes.add("cliente-comandas");
        }
        if (tipo.includes("caixa")) {
          prefixes.add("caixa-atual");
          prefixes.add("caixa-historico");
          prefixes.add("mov-caixas");
        }
        if (tipo.includes("cliente")) {
          prefixes.add("clientes");
          prefixes.add("clientes-list");
          prefixes.add("cliente-dash");
          prefixes.add("fin-clientes");
        }
        queryClient.invalidateQueries({
          predicate: (q) => {
            const k0 = q.queryKey?.[0];
            return typeof k0 === "string" && prefixes.has(k0);
          },
        }).catch(() => {});
      } catch (err) {
        console.warn("[Push] erro ao processar notificação em foreground:", err);
      }
    });
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      try {
        const data: any = response.notification.request.content.data || {};
        Notifications.setBadgeCountAsync(0).catch(() => {});
        const route = data.route || data.deeplink;
        if (typeof route === "string" && route.length > 0) {
          router.push(route as Href);
          return;
        }
        if (data.type === "agendamento" || data.tipo === "agendamento") {
          router.push("/(tabs)/agenda");
        } else if (data.type === "comanda" || data.tipo === "comanda") {
          router.push("/(tabs)/comandas");
        } else if (data.type === "cliente" || data.tipo === "cliente") {
          router.push("/(tabs)/clientes");
        }
      } catch (err) {
        console.warn("[Push] erro ao processar tap de notificação:", err);
      }
    });
    return () => {
      sub.remove();
      received.remove();
    };
  }, []);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView>
            <ThemeProvider>
              <AuthProvider>
                <ThemeSyncer />
                <RootLayoutNav />
                <ATTExplainer
                  visible={attVisible}
                  onContinue={async () => {
                    setAttVisible(false);
                    await requestTrackingPermissionNow();
                  }}
                  onSkip={async () => {
                    setAttVisible(false);
                    await markATTAsked();
                  }}
                />
              </AuthProvider>
            </ThemeProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
