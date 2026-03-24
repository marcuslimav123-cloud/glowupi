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
} from "lucide-react";
import { Button } from "@/components/ui/button";

const ADMIN_NAV = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Assinantes", href: "/admin/assinantes", icon: Users },
  { name: "Configurações", href: "/admin/configuracoes", icon: Settings },
  { name: "Receita", href: "/admin/receita", icon: TrendingUp },
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
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary"></div>
      </div>
    );
  }

  if (!admin) return null;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-900 text-white">
      <div className="md:hidden flex items-center justify-between p-4 border-b border-white/10 bg-slate-800">
        <div className="flex items-center gap-2 text-primary font-display font-bold text-xl">
          <Shield className="h-5 w-5" /> Admin
        </div>
        <Button variant="ghost" size="icon" className="text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X /> : <Menu />}
        </Button>
      </div>

      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-slate-800 border-r border-white/10 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 flex flex-col",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 hidden md:flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="text-primary font-display font-bold text-lg">{APP_NAME}</div>
            <div className="text-xs text-slate-400">Super Admin</div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {ADMIN_NAV.map(item => (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                location === item.href
                  ? "bg-primary text-white shadow-lg shadow-primary/20"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              )}
              onClick={() => setMobileMenuOpen(false)}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          ))}
        </div>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-3 py-2 mb-4">
            <div className="h-10 w-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold">
              {admin.nome.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{admin.nome}</p>
              <p className="text-xs text-slate-400 truncate">{admin.email}</p>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full justify-start text-slate-400 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 border-white/20"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" /> Sair
          </Button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </div>
      </main>

      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}
    </div>
  );
}
