import React, { useMemo } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors, type ColorPalette } from "@/lib/theme";

export interface ATTExplainerProps {
  visible: boolean;
  onContinue: () => void;
  onSkip: () => void;
}

export function ATTExplainer({ visible, onContinue, onSkip }: ATTExplainerProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  if (Platform.OS !== "ios") return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onSkip}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Feather name="shield" size={28} color={colors.accent} />
          </View>

          <Text style={styles.title}>Sua privacidade vem primeiro</Text>

          <Text style={styles.body}>
            O Glow Upi Pro <Text style={styles.bold}>não rastreia você</Text> em outros apps ou sites.
            {"\n\n"}
            Na próxima tela o iOS vai perguntar se você permite o "rastreamento". Você pode escolher tranquilamente <Text style={styles.bold}>"Pedir ao app para não rastrear"</Text> — o app continua funcionando 100%.
            {"\n\n"}
            Pedimos essa permissão apenas porque, se um dia você ativar campanhas de marketing no painel web, ela melhora a medição dos seus próprios anúncios.
          </Text>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={onContinue}
            accessibilityRole="button"
            accessibilityLabel="Continuar"
          >
            <Text style={styles.primaryText}>Entendi, continuar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipBtn}
            onPress={onSkip}
            accessibilityRole="button"
            accessibilityLabel="Agora não"
          >
            <Text style={styles.skipText}>Agora não</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: c.overlay,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    },
    card: {
      width: "100%",
      maxWidth: 380,
      backgroundColor: c.surface,
      borderRadius: 20,
      padding: 24,
      borderWidth: 1,
      borderColor: c.surfaceBorder,
    },
    iconWrap: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: c.accent + "20",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
      alignSelf: "center",
    },
    title: {
      fontSize: 20,
      fontFamily: "Inter_700Bold",
      color: c.text,
      textAlign: "center",
      marginBottom: 14,
    },
    body: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: c.textSecondary,
      lineHeight: 20,
      marginBottom: 20,
    },
    bold: { fontFamily: "Inter_600SemiBold", color: c.text },
    primaryBtn: {
      height: 48,
      borderRadius: 12,
      backgroundColor: c.accent,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 8,
    },
    primaryText: {
      fontSize: 15,
      fontFamily: "Inter_700Bold",
      color: c.invertedText,
    },
    skipBtn: {
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    skipText: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      color: c.textSecondary,
    },
  });
