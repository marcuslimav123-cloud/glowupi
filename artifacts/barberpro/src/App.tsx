import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import NotFound from "@/pages/not-found";

import Landing from "@/pages/Landing";
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import BarbeariaStep from "@/pages/onboarding/BarbeariaStep";
import CheckoutSuccess from "@/pages/checkout/CheckoutSuccess";
import CheckoutCancel from "@/pages/checkout/CheckoutCancel";
import Dashboard from "@/pages/Dashboard";
import Agenda from "@/pages/Agenda";
import Profissionais from "@/pages/gestao/Profissionais";
import Servicos from "@/pages/gestao/Servicos";
import Produtos from "@/pages/gestao/Produtos";
import Clientes from "@/pages/gestao/Clientes";
import Relatorios from "@/pages/Relatorios";
import Caixa from "@/pages/Caixa";
import Financeiro from "@/pages/Financeiro";
import Empresa from "@/pages/Empresa";
import Clube from "@/pages/Clube";
import Pacotes from "@/pages/Pacotes";
import ListaEspera from "@/pages/ListaEspera";
import Avaliacoes from "@/pages/Avaliacoes";
import Mensagens from "@/pages/Mensagens";
import Picos from "@/pages/agenda/Picos";

import AdminLogin from "@/pages/admin/AdminLogin";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminTenants from "@/pages/admin/AdminTenants";
import AdminSettings from "@/pages/admin/AdminSettings";
import AdminRevenue from "@/pages/admin/AdminRevenue";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/cadastro" component={Register} />

      <Route path="/onboarding/barbearia" component={BarbeariaStep} />
      <Route path="/checkout/success" component={CheckoutSuccess} />
      <Route path="/checkout/cancel" component={CheckoutCancel} />

      <Route path="/dashboard" component={Dashboard} />
      <Route path="/agenda" component={Agenda} />
      <Route path="/agenda/picos" component={Picos} />

      <Route path="/gestao/profissionais" component={Profissionais} />
      <Route path="/gestao/servicos" component={Servicos} />
      <Route path="/gestao/produtos" component={Produtos} />
      <Route path="/gestao/clientes" component={Clientes} />

      <Route path="/relatorios" component={Relatorios} />
      <Route path="/caixa" component={Caixa} />
      <Route path="/financeiro" component={Financeiro} />
      <Route path="/pacotes" component={Pacotes} />
      <Route path="/lista-espera" component={ListaEspera} />
      <Route path="/avaliacoes" component={Avaliacoes} />
      <Route path="/mensagens" component={Mensagens} />
      <Route path="/empresa" component={Empresa} />
      <Route path="/clube" component={Clube} />

      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/assinantes" component={AdminTenants} />
      <Route path="/admin/configuracoes" component={AdminSettings} />
      <Route path="/admin/receita" component={AdminRevenue} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
