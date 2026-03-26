import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";

export default function RestricaoCliente() {
  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-[24px] font-bold text-foreground">Lista de Restrições</h1>
        <p className="text-foreground/40 text-[14px] mt-0.5">Clientes com restrições cadastradas</p>
      </div>
      <Card className="bg-white border-black/[0.04] shadow-none">
        <CardContent className="py-16 text-center">
          <ShieldAlert className="h-12 w-12 text-foreground/15 mx-auto mb-4" />
          <p className="text-foreground/40 text-[14px]">Módulo em desenvolvimento</p>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
