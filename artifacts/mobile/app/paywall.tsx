import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Linking,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, Stack } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { useColors, type ColorPalette } from "@/lib/theme";
import { useAuth } from "@/contexts/AuthContext";
import {
  initRevenueCat,
  getOfferings,
  purchasePackage,
  restorePurchases,
  type RCPackage,
} from "@/lib/revenuecat";

const TERMS_URL = "https://glowupi.com/legal/termos";
const PRIVACY_URL = "https://glowupi.com/legal/privacidade";

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [packages, setPackages] = useState<RCPackage[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    (async () => {
      if (!token || Platform.OS !== "ios") {
        setLoading(false);
        return;
      }
      const ok = await initRevenueCat(token);
      setAvailable(ok);
      if (ok) {
        const offers = await getOfferings();
        setPackages(offers);
        if (offers.length) setSelected(offers[0].identifier);
      }
      setLoading(false);
    })();
  }, [token]);

  const handlePurchase = async () => {
    if (!selected || !token) return;
    setPurchasing(true);
    try {
      const ok = await purchasePackage(selected, token);
      if (ok) {
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Sucesso", "Sua assinatura está ativa!", [
          { text: "OK", onPress: () => router.back() },
        ]);
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    if (!token) return;
    setRestoring(true);
    try {
      const ok = await restorePurchases(token);
      Alert.alert(
        ok ? "Compras restauradas" : "Nada a restaurar",
        ok ? "Sua assinatura foi reativada." : "Não encontramos compras anteriores.",
        [{ text: "OK" }]
      );
    } finally {
      setRestoring(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.closeBtn}
          accessibilityRole="button"
          accessibilityLabel="Fechar"
        >
          <Feather name="x" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Glow Upi Pro</Text>
        <Text style={styles.subtitle}>
          Agenda profissional, comandas, lembretes automáticos, relatórios e muito mais.
        </Text>

        <View style={styles.benefits}>
          {[
            { icon: "calendar", t: "Agenda ilimitada" },
            { icon: "message-circle", t: "Lembretes automáticos para clientes" },
            { icon: "bar-chart-2", t: "Relatórios financeiros completos" },
            { icon: "users", t: "Cadastro de clientes ilimitado" },
            { icon: "headphones", t: "Suporte prioritário" },
          ].map((b) => (
            <View key={b.t} style={styles.benefitRow}>
              <View style={styles.benefitIcon}>
                <Feather name={b.icon as any} size={16} color={colors.accent} />
              </View>
              <Text style={styles.benefitText}>{b.t}</Text>
            </View>
          ))}
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : !available || packages.length === 0 ? (
          <View style={styles.notice}>
            <Feather name="info" size={18} color={colors.warning} />
            <Text style={styles.noticeText}>
              Os planos não estão disponíveis no momento.
              {"\n"}
              Tente novamente mais tarde ou contate o suporte.
            </Text>
          </View>
        ) : (
          <>
            {packages.map((p) => {
              const isSel = selected === p.identifier;
              return (
                <TouchableOpacity
                  key={p.identifier}
                  style={[styles.planCard, isSel && styles.planCardActive]}
                  onPress={() => {
                    if (Platform.OS !== "web") Haptics.selectionAsync();
                    setSelected(p.identifier);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSel }}
                  accessibilityLabel={`${p.title} ${p.priceString}`}
                >
                  <View style={styles.planLeft}>
                    <Text style={styles.planTitle}>{p.title || p.productIdentifier}</Text>
                    <Text style={styles.planDesc} numberOfLines={2}>{p.description}</Text>
                  </View>
                  <View style={styles.planRight}>
                    <Text style={styles.planPrice}>{p.priceString}</Text>
                    <View style={[styles.radio, isSel && styles.radioActive]}>
                      {isSel && <View style={styles.radioDot} />}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={[styles.cta, (purchasing || !selected) && { opacity: 0.6 }]}
              onPress={handlePurchase}
              disabled={purchasing || !selected}
              accessibilityRole="button"
              accessibilityLabel="Assinar agora"
            >
              {purchasing ? (
                <ActivityIndicator color={colors.invertedText} />
              ) : (
                <Text style={styles.ctaText}>Assinar agora</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.restoreBtn}
              onPress={handleRestore}
              disabled={restoring}
              accessibilityRole="button"
              accessibilityLabel="Restaurar compras"
            >
              {restoring ? (
                <ActivityIndicator size="small" color={colors.textSecondary} />
              ) : (
                <Text style={styles.restoreText}>Restaurar compras</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        <Text style={styles.legal}>
          A assinatura é cobrada na sua conta Apple ID e renovada automaticamente, salvo cancelamento até 24h antes do término. Gerencie em Ajustes &gt; Apple ID &gt; Assinaturas.
        </Text>

        <View style={styles.legalLinks}>
          <TouchableOpacity onPress={() => WebBrowser.openBrowserAsync(TERMS_URL)} accessibilityRole="link">
            <Text style={styles.legalLink}>Termos de Uso</Text>
          </TouchableOpacity>
          <Text style={styles.legalDot}></Text>
          <TouchableOpacity onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL)} accessibilityRole="link">
            <Text style={styles.legalLink}>Privacidade</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const makeStyles = (c: ColorPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  header: { flexDirection: "row", justifyContent: "flex-end", padding: 12 },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: c.surface, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: c.surfaceBorder,
  },
  scroll: { padding: 20, paddingBottom: 60 },
  title: { fontSize: 30, fontFamily: "Inter_700Bold", color: c.text, marginBottom: 8 },
  subtitle: { fontSize: 15, fontFamily: "Inter_400Regular", color: c.textSecondary, marginBottom: 24 },
  benefits: { marginBottom: 28 },
  benefitRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  benefitIcon: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: c.accent + "20", alignItems: "center", justifyContent: "center",
  },
  benefitText: { fontSize: 14, fontFamily: "Inter_500Medium", color: c.text, flex: 1 },
  center: { paddingVertical: 40, alignItems: "center" },
  notice: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: c.warning + "15",
    borderColor: c.warning + "40", borderWidth: 1,
    padding: 14, borderRadius: 12, marginBottom: 20,
  },
  noticeText: { flex: 1, fontSize: 13, color: c.text, fontFamily: "Inter_400Regular" },
  planCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: c.surface, borderRadius: 16, padding: 16,
    borderWidth: 2, borderColor: c.surfaceBorder, marginBottom: 12,
  },
  planCardActive: { borderColor: c.accent },
  planLeft: { flex: 1 },
  planTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: c.text, marginBottom: 4 },
  planDesc: { fontSize: 12, fontFamily: "Inter_400Regular", color: c.textSecondary },
  planRight: { alignItems: "flex-end", gap: 8 },
  planPrice: { fontSize: 16, fontFamily: "Inter_700Bold", color: c.text },
  radio: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: c.surfaceBorder,
    alignItems: "center", justifyContent: "center",
  },
  radioActive: { borderColor: c.accent },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: c.accent },
  cta: {
    marginTop: 16, height: 52, borderRadius: 14,
    backgroundColor: c.accent, alignItems: "center", justifyContent: "center",
  },
  ctaText: { fontSize: 16, fontFamily: "Inter_700Bold", color: c.invertedText },
  restoreBtn: { marginTop: 12, alignItems: "center", paddingVertical: 8 },
  restoreText: { fontSize: 13, fontFamily: "Inter_500Medium", color: c.textSecondary, textDecorationLine: "underline" },
  legal: { fontSize: 11, fontFamily: "Inter_400Regular", color: c.textMuted, marginTop: 24, lineHeight: 16, textAlign: "center" },
  legalLinks: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 10, gap: 6 },
  legalLink: { fontSize: 12, fontFamily: "Inter_500Medium", color: c.accent, textDecorationLine: "underline" },
  legalDot: { fontSize: 12, color: c.textMuted },
});
