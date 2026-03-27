import React from "react";
import {
  Platform,
  ScrollView,
  KeyboardAvoidingView,
  StyleSheet,
} from "react-native";
import type { ScrollViewProps } from "react-native";

type Props = ScrollViewProps & {
  bottomOffset?: number;
  children: React.ReactNode;
};

export function KeyboardAwareScrollViewCompat({
  children,
  keyboardShouldPersistTaps = "handled",
  bottomOffset,
  ...props
}: Props) {
  if (Platform.OS === "web") {
    return (
      <ScrollView keyboardShouldPersistTaps={keyboardShouldPersistTaps} {...props}>
        {children}
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={bottomOffset ?? 0}
    >
      <ScrollView
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        bounces={false}
        {...props}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
