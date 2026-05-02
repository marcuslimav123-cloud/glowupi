import { Platform } from "react-native";
import { getItem, setItem } from "@/lib/storage";

const ATT_ASKED_KEY = "glow_upi_att_asked";

export async function hasAskedATT(): Promise<boolean> {
  if (Platform.OS !== "ios") return true;
  const v = await getItem(ATT_ASKED_KEY);
  return v === "1";
}

export async function markATTAsked(): Promise<void> {
  await setItem(ATT_ASKED_KEY, "1");
}

export async function requestTrackingPermissionNow(): Promise<void> {
  if (Platform.OS !== "ios") return;
  try {
    const tracking = await import("expo-tracking-transparency");
    if (typeof tracking.requestTrackingPermissionsAsync !== "function") return;
    await tracking.requestTrackingPermissionsAsync();
  } catch (err) {
    console.warn("[ATT] erro ao solicitar permissão:", err);
  } finally {
    await markATTAsked();
  }
}

export async function maybeRequestTrackingPermission(): Promise<void> {
  if (Platform.OS !== "ios") return;
  const asked = await hasAskedATT();
  if (asked) return;
  await requestTrackingPermissionNow();
}
