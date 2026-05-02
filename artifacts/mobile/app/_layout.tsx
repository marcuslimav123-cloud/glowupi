import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, router, type Href } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { setBaseUrl } from "@workspace/api-client-react";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ATTExplainer } from "@/components/ATTExplainer";
import { AuthProvider } from "@/contexts/AuthContext";
import Colors from "@/constants/colors";
import { hasAskedATT, requestTrackingPermissionNow, markATTAsked } from "@/lib/tracking";

setBaseUrl(`https://${process.env.EXPO_PUBLIC_DOMAIN}`);

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="login" options={{ gestureEnabled: false }} />
      <Stack.Screen name="register" options={{ gestureEnabled: true }} />
      <Stack.Screen name="comandas" />
      <Stack.Screen name="financeiro" />
      <Stack.Screen name="cadastros" />
      <Stack.Screen name="marketing" />
      <Stack.Screen name="configuracoes" />
      <Stack.Screen name="equipe" />
      <Stack.Screen name="relatorios" />
    </Stack>
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
    return () => sub.remove();
  }, []);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView>
            <AuthProvider>
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
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
