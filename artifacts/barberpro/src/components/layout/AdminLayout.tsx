import React, { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { APP_NAME, apiUrl } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Settings,
  TrendingUp,
  LogOut,
  Sparkles,
  Menu,
  X,
  Shield,
  ExternalLink,
  History,
  Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const ADMIN_NAV = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Assinantes", href: "/admin/assinantes", icon: Users },
  { name: "Configurações", href: "/admin/configuracoes", icon: Settings },
  { name: "Receita", href: "/admin/receita", icon: TrendingUp },
  { name: "Logs", href: "/admin/logs", icon: History },
  { name: "LGPD", href: "/admin/lgpd", icon: Shield },
  { name: "Links de Trial", href: "/admin/trial-links", icon: Link2 },
];

interface AdminUser {
  id: number;
  nome: string;
  email: string;
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch(apiUrl("/admin/me"), { credentials: "include" });
      if (!res.ok) throw new Error("Not authenticated");
      const data = await res.json();
      setAdmin(data);
      localStorage.setItem("admin_user", JSON.stringify(data));
    } catch {
      localStorage.removeItem("admin_user");
      setLocation("/admin/login");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(apiUrl("/admin/logout"), { method: "POST", credentials: "include" });
    } catch {}
    localStorage.removeItem("admin_user");
    setLocation("/admin/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!admin) return null;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#0a0a0a] text-white">
      <div className="md:hidden flex items-center justify-between px-5 py-3 border-b border-white/[0.06] bg-[#111]">
        <div className="flex items-center gap-2 font-semibold text-[15px] text-white tracking-tight">
          <Shield className="h-4 w-4 text-primary" /> Admin
        </div>
        <Button variant="ghost" size="icon" className="text-white h-8 w-8" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-[220px] bg-[#111] border-r border-white/[0.06] transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 flex flex-col",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="px-5 py-5 hidden md:flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-primary/15 flex items-center justify-center">
            <Shield className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div className="text-primary font-semibold text-[14px]">{APP_NAME}</div>
            <div className="text-[11px] text-white/30">Super Admin</div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
          {ADMIN_NAV.map(item => (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150",
                location === item.href
                  ? "bg-primary text-white"
                  : "text-white/40 hover:text-white hover:bg-white/[0.05]"
              )}
              onClick={() => setMobileMenuOpen(false)}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          ))}
        </div>

        <div className="p-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-2.5 px-2 py-2 mb-3">
            <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center text-primary font-semibold text-[12px]">
              {admin.nome.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-white truncate">{admin.nome}</p>
              <p className="text-[11px] text-white/30 truncate">{admin.email}</p>
            </div>
          </div>
          <Link
            href="/"
            className="flex items-center w-full justify-start text-white/30 hover:text-white hover:bg-white/[0.05] text-[13px] h-8 rounded-lg px-3 mb-1 transition-colors"
          >
            <ExternalLink className="mr-2 h-3.5 w-3.5" /> Voltar ao Site
          </Link>
          <Button
            variant="ghost"
            className="w-full justify-start text-white/30 hover:text-red-400 hover:bg-red-500/10 text-[13px] h-8 rounded-lg"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-3.5 w-3.5" /> Sair
          </Button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <div className="flex-1 overflow-y-auto p-5 md:p-8">
          {children}
        </div>
      </main>

      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}
    </div>
  );
}
