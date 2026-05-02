import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function clearAppBadge(): Promise<void> {
  try {
    await Notifications.setBadgeCountAsync(0);
  } catch {}
}

export interface RegisterPushOptions {
  token: string;
  barbeariaId: number;
  apiBase: string;
}

export async function registerExpoPushToken(): Promise<string | null> {
  if (Platform.OS === "web") return null;
  if (Constants.isDevice === false) return null;

  try {
    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;

    if (status !== "granted") {
      const ask = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      status = ask.status;
    }

    if (status !== "granted") return null;

    if (Platform.OS === "android") {
      try {
        await Notifications.setNotificationChannelAsync("default", {
          name: "Padrão",
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 250, 250, 250],
        });
      } catch {}
    }

    const projectId =
      (Constants.expoConfig as any)?.extra?.eas?.projectId ||
      (Constants.easConfig as any)?.projectId ||
      undefined;

    const tokenResult = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    return tokenResult.data;
  } catch (err) {
    console.warn("[Push] erro ao obter token:", err);
    return null;
  }
}

export async function sendPushTokenToBackend(opts: RegisterPushOptions & { authToken: string }): Promise<boolean> {
  try {
    const res = await fetch(
      `${opts.apiBase}/api/barbearias/${opts.barbeariaId}/push-tokens/register`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${opts.authToken}`,
        },
        body: JSON.stringify({
          token: opts.token,
          platform: Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "web",
        }),
      }
    );
    return res.ok;
  } catch (err) {
    console.warn("[Push] erro ao registrar no backend:", err);
    return false;
  }
}
