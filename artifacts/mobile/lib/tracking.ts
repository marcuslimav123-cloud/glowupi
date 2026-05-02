import { Platform } from "react-native";
import { getItem, setItem } from "@/lib/storage";

const ATT_ASKED_KEY = "glow_upi_att_asked";

export async function maybeRequestTrackingPermission(): Promise<void> {
  if (Platform.OS !== "ios") return;
  try {
    const already = await getItem(ATT_ASKED_KEY);
    if (already === "1") return;

    const tracking = await import("expo-tracking-transparency");
    if (typeof tracking.requestTrackingPermissionsAsync !== "function") return;

    await new Promise((r) => setTimeout(r, 800));
    await tracking.requestTrackingPermissionsAsync();
    await setItem(ATT_ASKED_KEY, "1");
  } catch (err) {
    console.warn("[ATT] erro ao solicitar permissão:", err);
  }
}
