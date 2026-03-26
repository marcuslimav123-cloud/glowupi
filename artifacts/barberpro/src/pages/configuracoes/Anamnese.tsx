import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { FileText } from "lucide-react";

export function AnamneseFormularios() {
  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-[24px] font-bold text-foreground">Formulários de Anamnese</h1>
        <p className="text-foreground/40 text-[14px] mt-0.5">Crie formulários para avaliação dos clientes</p>
      </div>
      <Card className="bg-white border-black/[0.04] shadow-none">
        <CardContent className="py-16 text-center">
          <FileText className="h-12 w-12 text-foreground/15 mx-auto mb-4" />
          <p className="text-foreground/40 text-[14px]">Módulo em desenvolvimento</p>
        </CardContent>
      </Card>
    </AppLayout>
  );
}

export function AnamneseClientes() {
  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-[24px] font-bold text-foreground">Anamnese - Clientes</h1>
        <p className="text-foreground/40 text-[14px] mt-0.5">Fichas de anamnese preenchidas</p>
      </div>
      <Card className="bg-white border-black/[0.04] shadow-none">
        <CardContent className="py-16 text-center">
          <FileText className="h-12 w-12 text-foreground/15 mx-auto mb-4" />
          <p className="text-foreground/40 text-[14px]">Módulo em desenvolvimento</p>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
