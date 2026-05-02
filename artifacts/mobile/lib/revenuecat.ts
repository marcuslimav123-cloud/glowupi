import { Platform } from "react-native";

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

let initialized = false;

export interface RCConfig {
  configured: boolean;
  apiKeyIos: string;
  offeringId: string;
  appUserId: string | null;
}

export interface RCPackage {
  identifier: string;
  productIdentifier: string;
  price: number;
  priceString: string;
  title: string;
  description: string;
  periodType?: "monthly" | "annual" | string;
}

export async function fetchRCConfig(authToken: string): Promise<RCConfig | null> {
  try {
    const res = await fetch(`${API_BASE}/api/revenuecat/config`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.ok) return null;
    return (await res.json()) as RCConfig;
  } catch {
    return null;
  }
}

export async function syncEntitlementsToBackend(opts: {
  authToken: string;
  entitlements: Record<string, { isActive: boolean }>;
  productId?: string;
  expiresAtMs?: number;
}): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/revenuecat/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${opts.authToken}`,
      },
      body: JSON.stringify({
        entitlements: opts.entitlements,
        productId: opts.productId,
        expiresAtMs: opts.expiresAtMs,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function initRevenueCat(authToken: string): Promise<boolean> {
  if (Platform.OS !== "ios") return false;
  if (initialized) return true;

  const config = await fetchRCConfig(authToken);
  if (!config?.configured || !config.apiKeyIos || !config.appUserId) {
    return false;
  }

  try {
    const Purchases = (await import("react-native-purchases")).default;
    Purchases.configure({
      apiKey: config.apiKeyIos,
      appUserID: config.appUserId,
    });
    initialized = true;
    return true;
  } catch (err) {
    console.warn("[RevenueCat] init falhou:", err);
    return false;
  }
}

export async function getOfferings(): Promise<RCPackage[]> {
  if (!initialized) return [];
  try {
    const Purchases = (await import("react-native-purchases")).default;
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;
    if (!current) return [];
    return current.availablePackages.map((p: any) => ({
      identifier: p.identifier,
      productIdentifier: p.product?.identifier ?? "",
      price: p.product?.price ?? 0,
      priceString: p.product?.priceString ?? "",
      title: p.product?.title ?? "",
      description: p.product?.description ?? "",
      periodType: p.packageType?.toLowerCase?.() ?? "monthly",
    }));
  } catch (err) {
    console.warn("[RevenueCat] getOfferings falhou:", err);
    return [];
  }
}

export async function purchasePackage(packageId: string, authToken: string): Promise<boolean> {
  if (!initialized) return false;
  try {
    const Purchases = (await import("react-native-purchases")).default;
    const offerings = await Purchases.getOfferings();
    const pkg = offerings.current?.availablePackages.find((p: any) => p.identifier === packageId);
    if (!pkg) return false;

    const result = await Purchases.purchasePackage(pkg);
    const customerInfo = result.customerInfo;
    const isPro = !!customerInfo?.entitlements?.active?.["pro"];

    if (isPro) {
      const expiresMs = customerInfo.entitlements.active["pro"]?.expirationDateMillis ?? undefined;
      const productId = customerInfo.entitlements.active["pro"]?.productIdentifier;
      await syncEntitlementsToBackend({
        authToken,
        entitlements: { pro: { isActive: true } },
        productId,
        expiresAtMs: expiresMs,
      });
    }
    return isPro;
  } catch (err: any) {
    if (err?.userCancelled) return false;
    console.warn("[RevenueCat] purchase falhou:", err);
    return false;
  }
}

export async function restorePurchases(authToken: string): Promise<boolean> {
  if (!initialized) return false;
  try {
    const Purchases = (await import("react-native-purchases")).default;
    const customerInfo = await Purchases.restorePurchases();
    const isPro = !!customerInfo?.entitlements?.active?.["pro"];
    if (isPro) {
      const expiresMs = customerInfo.entitlements.active["pro"]?.expirationDateMillis ?? undefined;
      const productId = customerInfo.entitlements.active["pro"]?.productIdentifier;
      await syncEntitlementsToBackend({
        authToken,
        entitlements: { pro: { isActive: true } },
        productId,
        expiresAtMs: expiresMs,
      });
    }
    return isPro;
  } catch (err) {
    console.warn("[RevenueCat] restore falhou:", err);
    return false;
  }
}
