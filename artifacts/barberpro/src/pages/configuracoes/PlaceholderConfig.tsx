import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Construction } from "lucide-react";

export default function PlaceholderConfig({ title }: { title: string }) {
  return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center py-32">
        <Construction className="h-16 w-16 text-foreground/20 mb-4" />
        <h1 className="text-[20px] font-semibold text-foreground mb-2">{title}</h1>
        <p className="text-foreground/40 text-[14px]">Em breve esta funcionalidade estará disponível.</p>
      </div>
    </AppLayout>
  );
}

export function RodizioPage() { return <PlaceholderConfig title="Rodízio de Profissionais" />; }
export function OrdemChegadaPage() { return <PlaceholderConfig title="Ordem de Chegada" />; }
export function ListaEsperaConfigPage() { return <PlaceholderConfig title="Lista de Espera (Config)" />; }
export function AlertasPage() { return <PlaceholderConfig title="Alertas" />; }
