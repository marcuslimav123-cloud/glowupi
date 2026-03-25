import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import NotFound from "@/pages/not-found";
import LgpdPopup from "@/components/LgpdPopup";

import Landing from "@/pages/Landing";
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import CompleteProfile from "@/pages/auth/CompleteProfile";
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
import Equipe from "@/pages/Equipe";
import Picos from "@/pages/agenda/Picos";
import AcceptInvite from "@/pages/auth/AcceptInvite";
import PoliticaPrivacidade from "@/pages/PoliticaPrivacidade";
import TermosDeUso from "@/pages/TermosDeUso";

import Tipos from "@/pages/cadastros/Tipos";
import Cupons from "@/pages/cadastros/Cupons";
import Lembretes from "@/pages/cadastros/Lembretes";
import ClubesAssinatura from "@/pages/cadastros/Clubes";
import VendaPacotes from "@/pages/VendaPacotes";
import PublicBooking from "@/pages/PublicBooking";
import PublicStorefront from "@/pages/PublicStorefront";
import Resumo from "@/pages/relatorios/Resumo";
import Aniversariantes from "@/pages/relatorios/Aniversariantes";
import AgendamentosReport from "@/pages/relatorios/AgendamentosReport";
import FinanceiroReport from "@/pages/relatorios/FinanceiroReport";
import ComandasCanceladas from "@/pages/relatorios/ComandasCanceladas";
import RankingsReport from "@/pages/relatorios/RankingsReport";
import PerfilCliente from "@/pages/relatorios/PerfilCliente";
import EstoqueReport from "@/pages/relatorios/EstoqueReport";
import PacotesReport from "@/pages/relatorios/PacotesReport";
import ComandasItensReport from "@/pages/relatorios/ComandasItensReport";
import Parametros from "@/pages/configuracoes/Parametros";
import PerfisAcesso from "@/pages/configuracoes/PerfisAcesso";
import { RodizioPage, OrdemChegadaPage, ListaEsperaConfigPage, AlertasPage } from "@/pages/configuracoes/PlaceholderConfig";
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

      <Route path="/completar-perfil" component={CompleteProfile} />
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

      <Route path="/relatorios/resumo" component={Resumo} />
      <Route path="/relatorios/aniversariantes" component={Aniversariantes} />
      <Route path="/relatorios/agendamentos" component={AgendamentosReport} />
      <Route path="/relatorios/financeiro" component={FinanceiroReport} />
      <Route path="/relatorios/canceladas" component={ComandasCanceladas} />
      <Route path="/relatorios/rankings" component={RankingsReport} />
      <Route path="/relatorios/perfil-cliente" component={PerfilCliente} />
      <Route path="/relatorios/estoque" component={EstoqueReport} />
      <Route path="/relatorios/pacotes" component={PacotesReport} />
      <Route path="/relatorios/comandas-itens" component={ComandasItensReport} />
      <Route path="/relatorios" component={Relatorios} />
      <Route path="/caixa" component={Caixa} />
      <Route path="/financeiro" component={Financeiro} />
      <Route path="/pacotes" component={Pacotes} />
      <Route path="/pacotes/vendas" component={VendaPacotes} />
      <Route path="/cadastros/tipos" component={Tipos} />
      <Route path="/cadastros/cupons" component={Cupons} />
      <Route path="/cadastros/lembretes" component={Lembretes} />
      <Route path="/cadastros/clubes" component={ClubesAssinatura} />
      <Route path="/lista-espera" component={ListaEspera} />
      <Route path="/avaliacoes" component={Avaliacoes} />
      <Route path="/mensagens" component={Mensagens} />
      <Route path="/equipe" component={Equipe} />
      <Route path="/convite/:token" component={AcceptInvite} />
      <Route path="/configuracoes/parametros" component={Parametros} />
      <Route path="/configuracoes/rodizio" component={RodizioPage} />
      <Route path="/configuracoes/ordem-chegada" component={OrdemChegadaPage} />
      <Route path="/configuracoes/lista-espera" component={ListaEsperaConfigPage} />
      <Route path="/configuracoes/alertas" component={AlertasPage} />
      <Route path="/configuracoes/acessos" component={PerfisAcesso} />
      <Route path="/empresa" component={Empresa} />
      <Route path="/clube" component={Clube} />

      <Route path="/s/:slug" component={PublicStorefront} />
      <Route path="/agendar/:slug" component={PublicBooking} />
      <Route path="/politica-de-privacidade" component={PoliticaPrivacidade} />
      <Route path="/termos-de-uso" component={TermosDeUso} />

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
        <LgpdPopup />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
