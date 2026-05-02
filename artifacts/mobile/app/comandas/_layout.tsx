import { Stack } from "expo-router";
import { useColors } from "@/lib/theme";

export default function ComandasLayout() {
  const colors = useColors();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
