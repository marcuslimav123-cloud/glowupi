import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "wouter";
import { getRoleLabel, apiUrl } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { applyTheme, THEMES } from "@/components/layout/HeaderBar";
import type { LucideProps } from "lucide-react";
import {
  Users,
  Heart,
  Package,
  Boxes,
  BarChart3,
  Clock,
  Building2,
  LogOut,
  ChevronRight,
  Palette,
  Sun,
  Moon,
  Monitor,
  Shield,
  Settings,
  Star,
  UsersRound,
  Check,
  GitBranch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { InstallAppButton } from "@/components/InstallAppButton";

type LucideIcon = React.ForwardRefExoticComponent<LucideProps & React.RefAttributes<SVGSVGElement>>;

type MenuItem = {
  name: string;
  href: string;
  icon: LucideIcon;
  description?: string;
  roles?: string[];
};

type MenuSection = {
  label: string;
  roles?: string[];
  items: MenuItem[];
};

const MENU_SECTIONS: MenuSection[] = [
  {
    label: "Gestão",
    roles: ["dono", "gerente"],
    items: [
      { name: "Profissionais", href: "/gestao/profissionais", icon: UsersRound, description: "Equipe e comissões" },
      { name: "Serviços", href: "/gestao/servicos", icon: Heart, description: "Catálogo e preços" },
      { name: "Produtos / Estoque", href: "/gestao/produtos", icon: Package, description: "Estoque e controle" },
      { name: "Pacotes", href: "/pacotes", icon: Boxes, description: "Pacotes de serviços" },
      { name: "Filiais", href: "/gestao/filiais", icon: GitBranch, description: "Múltiplas unidades", roles: ["dono"] },
    ],
  },
  {
    label: "Relatórios",
    roles: ["dono", "gerente"],
    items: [
      { name: "Faturamento", href: "/relatorios", icon: BarChart3, description: "Receita por período" },
      { name: "Rankings", href: "/relatorios/rankings", icon: Star, description: "Profissionais e serviços" },
      { name: "Resumo", href: "/relatorios/resumo", icon: BarChart3, description: "Visão geral" },
    ],
  },
  {
    label: "Configurações",
    roles: ["dono", "gerente"],
    items: [
      { name: "Meu Estúdio", href: "/empresa", icon: Building2, description: "Dados do estabelecimento" },
      { name: "Funcionamento", href: "/configuracoes/funcionamento", icon: Clock, description: "Horários e regras" },
      { name: "Parâmetros", href: "/configuracoes/parametros", icon: Settings, description: "Configurações gerais" },
      { name: "Perfis de Acesso", href: "/configuracoes/acessos", icon: Shield, description: "Permissões", roles: ["dono"] },
    ],
  },
];

const HREF_TO_PERMISSION: Record<string, string> = {
  "/gestao/profissionais": "profissionais",
  "/gestao/servicos": "servicos",
  "/gestao/produtos": "produtos",
  "/pacotes": "pacotes",
  "/relatorios": "relatorios",
  "/relatorios/rankings": "relatorios",
  "/relatorios/resumo": "relatorios",
  "/empresa": "empresa",
  "/configuracoes/funcionamento": "configuracoes",
  "/configuracoes/parametros": "configuracoes",
  "/configuracoes/acessos": "configuracoes",
};

function hasPermission(href: string, perms: string[] | null): boolean {
  if (!perms) return true;
  const key = HREF_TO_PERMISSION[href];
  if (!key) return true;
  return perms.includes(key);
}

export default function MenuPage() {
  const { user, logout, role, barbeariaNome, logoUrl, isDono, isGerente, barbeariaId, perfilPermissoes } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [themeOpen, setThemeOpen] = useState(false);

  const { data: layoutParams } = useQuery({
    queryKey: ["parametros-layout", barbeariaId],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/parametros`), { credentials: "include" });
      const rows: { chave: string; valor: string }[] = await res.json();
      const map: Record<string, string> = {};
      for (const r of rows) map[r.chave] = r.valor;
      return map;
    },
    enabled: !!barbeariaId,
    staleTime: 5 * 60 * 1000,
  });

  const currentTema = user?.tema || "blue";
  const temaLayout = layoutParams?.["tema_layout"] || "Claro";

  const handleTheme = async (tema: string) => {
    try {
      const res = await fetch(apiUrl("/auth/tema"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ tema }),
      });
      if (!res.ok) throw new Error("Falha ao salvar tema");
      qc.invalidateQueries({ queryKey: ["getCurrentUser"] });
      setThemeOpen(false);
      toast({ title: "Tema atualizado!" });
      applyTheme(tema);
    } catch {
      toast({ title: "Erro ao salvar tema", variant: "destructive" });
    }
  };

  const handleDarkMode = async (mode: string) => {
    try {
      const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/parametros/tema_layout`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ valor: mode }),
      });
      if (!res.ok) throw new Error("Falha ao salvar modo");
      qc.invalidateQueries({ queryKey: ["parametros-layout"] });
      const html = document.documentElement;
      html.classList.remove("dark");
      if (mode === "Escuro") html.classList.add("dark");
      else if (mode === "Automático") {
        if (window.matchMedia("(prefers-color-scheme: dark)").matches) html.classList.add("dark");
      }
      toast({ title: "Modo de exibição atualizado!" });
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  };

  if (!user) return null;

  const filteredSections = MENU_SECTIONS.filter(
    (s) => !s.roles || s.roles.includes(role)
  ).map((s) => ({
    ...s,
    items: s.items.filter(
      (item) =>
        (!item.roles || item.roles.includes(role)) &&
        hasPermission(item.href, perfilPermissoes)
    ),
  })).filter((s) => s.items.length > 0);

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto pb-20">
        <div className="bg-card border border-border rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-bold text-xl border border-primary/15">
              {user.nome.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-foreground truncate">{user.nome}</h2>
              <p className="text-sm text-muted-foreground capitalize">{getRoleLabel(role)}</p>
              {barbeariaNome && (
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {barbeariaNome}
                </p>
              )}
            </div>
            {logoUrl && (
              <img src={logoUrl} alt="Logo" className="h-10 w-10 rounded-lg object-cover border border-border" />
            )}
          </div>
        </div>

        <div className="mb-5 md:hidden">
          <InstallAppButton
            nome={barbeariaNome || undefined}
            className="w-full h-12 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
            variant="default"
          />
        </div>

        {filteredSections.map((section) => (
          <div key={section.label} className="mb-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
              {section.label}
            </h3>
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              {section.items.map((item, i) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors ${
                    i !== 0 ? "border-t border-border" : ""
                  }`}
                >
                  <div className="h-9 w-9 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
                    <item.icon className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{item.name}</p>
                    {item.description && (
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        ))}

        <div className="mb-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
            Aparência
          </h3>
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <button
              onClick={() => setThemeOpen(!themeOpen)}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors"
            >
              <div className="h-9 w-9 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
                <Palette className="h-4.5 w-4.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-foreground">Cor do Tema</p>
                <p className="text-xs text-muted-foreground">Personalize as cores do app</p>
              </div>
              <div
                className="h-5 w-5 rounded-full border-2 border-white shadow-sm shrink-0"
                style={{ backgroundColor: THEMES.find((t) => t.id === currentTema)?.color || "#3b82f6" }}
              />
            </button>

            {themeOpen && (
              <div className="px-4 pb-4 pt-1 border-t border-border">
                <div className="grid grid-cols-6 gap-2 mt-2">
                  {THEMES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleTheme(t.id)}
                      className="relative flex items-center justify-center h-10 w-full rounded-lg border-2 transition-all"
                      style={{
                        backgroundColor: t.color,
                        borderColor: currentTema === t.id ? "white" : "transparent",
                      }}
                      title={t.label}
                    >
                      {currentTema === t.id && <Check className="h-4 w-4 text-white drop-shadow-md" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-border">
              <div className="px-4 py-3.5">
                <p className="text-sm font-medium text-foreground mb-2">Modo de Exibição</p>
                <div className="flex gap-2">
                  {[
                    { id: "Claro", icon: Sun, label: "Claro" },
                    { id: "Escuro", icon: Moon, label: "Escuro" },
                    { id: "Automático", icon: Monitor, label: "Auto" },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => handleDarkMode(mode.id)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                        temaLayout === mode.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <mode.icon className="h-3.5 w-3.5" />
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <Button
            variant="outline"
            className="w-full h-12 rounded-2xl text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200 dark:border-red-900/30"
            onClick={logout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sair da Conta
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
