import React from "react";
import { Feather } from "@expo/vector-icons";
import { ScreenContainer } from "@/components/ScreenContainer";
import { EmptyState } from "@/components/EmptyState";

export type PlaceholderScreenProps = {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Feather.glyphMap;
  description?: string;
};

export function PlaceholderScreen({
  title,
  subtitle,
  icon = "tool",
  description = "Esta funcionalidade chega em uma próxima atualização. Estamos trabalhando para entregar paridade total com a versão web.",
}: PlaceholderScreenProps) {
  return (
    <ScreenContainer title={title} subtitle={subtitle}>
      <EmptyState icon={icon} title="Em breve" description={description} />
    </ScreenContainer>
  );
}

export default PlaceholderScreen;
