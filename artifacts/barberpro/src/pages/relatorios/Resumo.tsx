import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { apiUrl, formatCurrency } from "@/lib/utils";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  ShoppingCart, Users, RotateCcw, ArrowDownCircle, ArrowUpCircle,
  UserX, UserCheck, UserPlus, Package, AlertTriangle, CreditCard,
  Sparkles, ChevronRight,
} from "lucide-react";

const KPI_CONFIG = [
  { key: "caixasPendentes", label: "Caixas Pendentes", icon: ShoppingCart, color: "bg-red-500", textColor: "text-white", link: "/caixa" },
  { key: "clientesSemUsuario", label: "Clientes sem Usuário", icon: Users, color: "bg-blue-500", textColor: "text-white", link: "/gestao/clientes" },
  { key: "clientesRetorno", label: "Retorno", icon: RotateCcw, color: "bg-orange-500", textColor: "text-white", link: "/gestao/clientes" },
  { key: "contasReceberSemana", label: "Contas a Receber (7 dias)", icon: ArrowDownCircle, color: "bg-red-600", textColor: "text-white", link: "/financeiro", isCurrency: true },
  { key: "contasPagarSemana", label: "Contas a Pagar (7 dias)", icon: ArrowUpCircle, color: "bg-blue-600", textColor: "text-white", link: "/financeiro", isCurrency: true },
  { key: "clientesAusentes60", label: "Ausentes +60 dias", icon: UserX, color: "bg-purple-500", textColor: "text-white", link: "/gestao/clientes" },
  { key: "usuariosConectados", label: "Usuários Conectados", icon: UserCheck, color: "bg-yellow-500", textColor: "text-white", link: "/gestao/clientes" },
  { key: "novosClientesSemana", label: "Novos Clientes (7 dias)", icon: UserPlus, color: "bg-green-500", textColor: "text-white", link: "/gestao/clientes" },
  { key: "produtosVencer30", label: "Produtos a Vencer (30 dias)", icon: Package, color: "bg-red-500", textColor: "text-white", link: "/gestao/produtos" },
  { key: "contasPagarAtrasadas", label: "Contas Atrasadas", icon: AlertTriangle, color: "bg-purple-600", textColor: "text-white", link: "/financeiro" },
  { key: "assinaturasVencendo", label: "Assinaturas Vencendo", icon: CreditCard, color: "bg-gray-500", textColor: "text-white", link: "/cadastros/clubes" },
];

export default function Resumo() {
  const { barbeariaId } = useAuth();

  const { data, isLoading } = useQuery<any>({
    queryKey: ["dashboard-resumo", barbeariaId],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/dashboard/resumo`), { credentials: "include" });
      if (!res.ok) throw new Error("Erro ao carregar resumo");
      return res.json();
    },
    enabled: !!barbeariaId,
  });

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-[24px] font-bold text-foreground">Resumo</h1>
        <p className="text-foreground/40 text-[14px] mt-0.5">Visão geral rápida do seu negócio</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1,2,3,4,5,6,7,8].map(i => (
            <div key={i} className="h-32 bg-white rounded-2xl border border-black/[0.04] animate-pulse" />
          ))}
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {KPI_CONFIG.map(kpi => {
            const Icon = kpi.icon;
            const rawValue = data[kpi.key] ?? 0;
            const displayValue = kpi.isCurrency ? formatCurrency(rawValue) : rawValue;
            return (
              <div
                key={kpi.key}
                className={`${kpi.color} ${kpi.textColor} rounded-2xl p-5 flex flex-col justify-between min-h-[130px] shadow-lg shadow-black/10 hover:shadow-xl transition-shadow`}
              >
                <div className="flex items-start justify-between">
                  <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-3xl font-bold">{displayValue}</span>
                </div>
                <div className="flex items-end justify-between mt-3">
                  <span className="text-sm font-medium opacity-90">{kpi.label}</span>
                  <Link href={kpi.link || "#"}>
                    <span className="text-xs opacity-75 hover:opacity-100 cursor-pointer flex items-center gap-0.5">
                      Mais Informações <ChevronRight className="h-3 w-3" />
                    </span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {data?.subscriptionStatus === "trial" && (
        <div className="mt-8 bg-primary/5 border border-primary/10 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="text-sm text-foreground/60">
              Período de teste — <strong>{data.diasRestantesTrial}</strong> {data.diasRestantesTrial === 1 ? "dia restante" : "dias restantes"}
            </span>
          </div>
          <Link href="/#precos">
            <Button size="sm" className="rounded-full text-xs">Contratar</Button>
          </Link>
        </div>
      )}
    </AppLayout>
  );
}
