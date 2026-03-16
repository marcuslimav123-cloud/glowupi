import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import NotFound from "@/pages/not-found";

// Pages
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import BarbeariaStep from "@/pages/onboarding/BarbeariaStep";
import Dashboard from "@/pages/Dashboard";
import Agenda from "@/pages/Agenda";
import Profissionais from "@/pages/gestao/Profissionais";
import Servicos from "@/pages/gestao/Servicos";

const queryClient = new QueryClient();

// Placeholder for unbuilt pages for maximum completeness
const Placeholder = ({ title }: { title: string }) => (
  <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground p-8">
    <div className="text-center bg-card p-12 rounded-2xl border border-border shadow-2xl">
      <h1 className="text-4xl font-display text-primary mb-4">{title}</h1>
      <p className="text-muted-foreground max-w-md">Esta página está em desenvolvimento. A navegação e estrutura foram criadas, mas a UI específica desta tela virá em breve.</p>
      <div className="mt-8">
        <a href="/dashboard" className="text-primary hover:underline">Voltar ao Dashboard</a>
      </div>
    </div>
  </div>
);

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <Redirect to="/dashboard" />} />
      <Route path="/login" component={Login} />
      <Route path="/cadastro" component={Register} />
      
      <Route path="/onboarding/barbearia" component={BarbeariaStep} />
      
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/agenda" component={Agenda} />
      <Route path="/agenda/picos" component={() => <Placeholder title="Horários de Pico" />} />
      
      <Route path="/gestao/profissionais" component={Profissionais} />
      <Route path="/gestao/servicos" component={Servicos} />
      <Route path="/gestao/produtos" component={() => <Placeholder title="Estoque e Produtos" />} />
      
      <Route path="/relatorios" component={() => <Placeholder title="Relatórios Avançados" />} />
      <Route path="/caixa" component={() => <Placeholder title="Fluxo de Caixa" />} />
      <Route path="/financeiro" component={() => <Placeholder title="Gestão Financeira" />} />
      <Route path="/empresa" component={() => <Placeholder title="Configurações da Empresa" />} />
      <Route path="/clube" component={() => <Placeholder title="Clube do Assinante" />} />
      
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
