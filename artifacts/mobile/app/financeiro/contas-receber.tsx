import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Colors from "@/constants/colors";
import ContasScreen from "./_contas";

export default function ContasReceber() {
  const router = useRouter();
  return (
    <ContasScreen
      tipo="receber"
      headerExtra={
        <TouchableOpacity
          style={styles.linkCard}
          onPress={() => router.push("/financeiro/conta-cliente")}
          activeOpacity={0.7}
        >
          <View style={styles.linkIcon}>
            <Feather name="users" size={16} color={Colors.accent} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.linkTitle}>Receber de clientes (conta-cliente)</Text>
            <Text style={styles.linkSub}>Comandas e saldos em aberto por cliente</Text>
          </View>
          <Feather name="chevron-right" size={18} color={Colors.textMuted} />
        </TouchableOpacity>
      }
    />
  );
}

const styles = StyleSheet.create({
  linkCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: 12,
  },
  linkIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.accent + "1f",
    alignItems: "center",
    justifyContent: "center",
  },
  linkTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.text },
  linkSub: { fontSize: 11, color: Colors.textMuted, fontFamily: "Inter_400Regular", marginTop: 2 },
});
