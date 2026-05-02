import React from "react";
import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import Dashboard from "./dashboard";

export default function FinanceiroIndex() {
  const router = useRouter();
  return (
    <View style={{ flex: 1 }}>
      <Dashboard />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/financeiro/menu")}
        activeOpacity={0.8}
      >
        <Feather name="menu" size={20} color="#000" />
        <Text style={styles.fabText}>Mais</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 16,
    bottom: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: { fontFamily: "Inter_700Bold", fontSize: 13, color: "#000" },
});
