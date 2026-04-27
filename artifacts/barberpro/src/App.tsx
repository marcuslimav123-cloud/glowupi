import React, { Suspense } from "react";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import NotFound from "@/pages/not-found";
import LgpdPopup from "@/components/LgpdPopup";
import { ChunkErrorBoundary } from "@/components/ChunkErrorBoundary";

import DirectSales from "@/pages/DirectSales";
import Landing from "@/pages/Landing";
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";

const CompleteProfile = React.lazy(() => import("@/pages/auth/CompleteProfile"));
const BarbeariaStep = React.lazy(() => import("@/pages/onboarding/BarbeariaStep"));
const CheckoutSuccess = React.lazy(() => import("@/pages/checkout/CheckoutSuccess"));
const CheckoutCancel = React.lazy(() => import("@/pages/checkout/CheckoutCancel"));
const Dashboard = React.lazy(() => import("@/pages/Dashboard"));
const Agenda = React.lazy(() => import("@/pages/Agenda"));
const Profissionais = React.lazy(() => import("@/pages/gestao/Profissionais"));
const Servicos = React.lazy(() => import("@/pages/gestao/Servicos"));
const Produtos = React.lazy(() => import("@/pages/gestao/Produtos"));
const Clientes = React.lazy(() => import("@/pages/gestao/Clientes"));
const Relatorios = React.lazy(() => import("@/pages/Relatorios"));
const Caixa = React.lazy(() => import("@/pages/Caixa"));
const Financeiro = React.lazy(() => import("@/pages/Financeiro"));
const Empresa = React.lazy(() => import("@/pages/Empresa"));
const MenuPage = React.lazy(() => import("@/pages/Menu"));
const Clube = React.lazy(() => import("@/pages/Clube"));
const Pacotes = React.lazy(() => import("@/pages/Pacotes"));
const ListaEspera = React.lazy(() => import("@/pages/ListaEspera"));
const Avaliacoes = React.lazy(() => import("@/pages/Avaliacoes"));
const Mensagens = React.lazy(() => import("@/pages/Mensagens"));
const Equipe = React.lazy(() => import("@/pages/Equipe"));
const Picos = React.lazy(() => import("@/pages/agenda/Picos"));
const AcceptInvite = React.lazy(() => import("@/pages/auth/AcceptInvite"));
const PoliticaPrivacidade = React.lazy(() => import("@/pages/PoliticaPrivacidade"));
const TermosDeUso = React.lazy(() => import("@/pages/TermosDeUso"));

const Tipos = React.lazy(() => import("@/pages/cadastros/Tipos"));
const Cupons = React.lazy(() => import("@/pages/cadastros/Cupons"));
const Lembretes = React.lazy(() => import("@/pages/cadastros/Lembretes"));
const ClubesAssinatura = React.lazy(() => import("@/pages/cadastros/Clubes"));
const Noticias = React.lazy(() => import("@/pages/cadastros/Noticias"));
const GruposClientes = React.lazy(() => import("@/pages/cadastros/GruposClientes"));
const Pesquisa = React.lazy(() => import("@/pages/cadastros/Pesquisa"));
const ClubeVantagens = React.lazy(() => import("@/pages/cadastros/ClubeVantagens"));
const VendaPacotes = React.lazy(() => import("@/pages/VendaPacotes"));
const PublicBooking = React.lazy(() => import("@/pages/PublicBooking"));
const PublicStorefront = React.lazy(() => import("@/pages/PublicStorefront"));
const PublicPesquisa = React.lazy(() => import("@/pages/PublicPesquisa"));

const DirectSalesSuccess = React.lazy(() => import("@/pages/DirectSalesSuccess"));
const ForgotPassword = React.lazy(() => import("@/pages/auth/ForgotPassword"));
const ResetPassword = React.lazy(() => import("@/pages/auth/ResetPassword"));
const Unsubscribe = React.lazy(() => import("@/pages/comunicacao/Unsubscribe"));

const ComandasAbertas = React.lazy(() => import("@/pages/comandas/ComandasAbertas"));
const ComandasHistorico = React.lazy(() => import("@/pages/comandas/ComandasHistorico"));

const CaixaDiario = React.lazy(() => import("@/pages/financeiro/CaixaDiario"));
const HistoricoCaixa = React.lazy(() => import("@/pages/financeiro/HistoricoCaixa"));
const MovCaixa = React.lazy(() => import("@/pages/financeiro/MovCaixa"));
const ComissoesPage = React.lazy(() => import("@/pages/financeiro/Comissoes"));
const ContaCliente = React.lazy(() => import("@/pages/financeiro/ContaCliente"));
const FluxoCaixa = React.lazy(() => import("@/pages/financeiro/FluxoCaixa"));
const ContaProfissional = React.lazy(() => import("@/pages/financeiro/ContaProfissional"));
const CaixinhaPage = React.lazy(() => import("@/pages/financeiro/Caixinha"));

const Resumo = React.lazy(() => import("@/pages/relatorios/Resumo"));
const Aniversariantes = React.lazy(() => import("@/pages/relatorios/Aniversariantes"));
const AgendamentosReport = React.lazy(() => import("@/pages/relatorios/AgendamentosReport"));
const FinanceiroReport = React.lazy(() => import("@/pages/relatorios/FinanceiroReport"));
const ComandasCanceladas = React.lazy(() => import("@/pages/relatorios/ComandasCanceladas"));
const RankingsReport = React.lazy(() => import("@/pages/relatorios/RankingsReport"));
const PerfilCliente = React.lazy(() => import("@/pages/relatorios/PerfilCliente"));
const EstoqueReport = React.lazy(() => import("@/pages/relatorios/EstoqueReport"));
const PacotesReport = React.lazy(() => import("@/pages/relatorios/PacotesReport"));
const ComandasItensReport = React.lazy(() => import("@/pages/relatorios/ComandasItensReport"));
const DiasSemVir = React.lazy(() => import("@/pages/relatorios/DiasSemVir"));
const LucroProdutos = React.lazy(() => import("@/pages/relatorios/LucroProdutos"));
const ClienteDetalhe = React.lazy(() => import("@/pages/gestao/ClienteDetalhe"));
const Filiais = React.lazy(() => import("@/pages/gestao/Filiais"));

const Parametros = React.lazy(() => import("@/pages/configuracoes/Parametros"));
const InboxMensagens = React.lazy(() => import("@/pages/comunicacao/InboxMensagens"));
const EmailMarketing = React.lazy(() => import("@/pages/comunicacao/EmailMarketing"));
const NovaCampanha = React.lazy(() => import("@/pages/comunicacao/NovaCampanha"));
const PerfisAcesso = React.lazy(() => import("@/pages/configuracoes/PerfisAcesso"));
const RodizioPage = React.lazy(() => import("@/pages/configuracoes/PlaceholderConfig").then(m => ({ default: m.RodizioPage })));
const OrdemChegadaPage = React.lazy(() => import("@/pages/configuracoes/PlaceholderConfig").then(m => ({ default: m.OrdemChegadaPage })));
const ListaEsperaConfigPage = React.lazy(() => import("@/pages/configuracoes/PlaceholderConfig").then(m => ({ default: m.ListaEsperaConfigPage })));
const AlertasPage = React.lazy(() => import("@/pages/configuracoes/PlaceholderConfig").then(m => ({ default: m.AlertasPage })));
const EmailTemplates = React.lazy(() => import("@/pages/configuracoes/EmailTemplates"));
const AnamneseFormularios = React.lazy(() => import("@/pages/configuracoes/Anamnese").then(m => ({ default: m.AnamneseFormularios })));
const AnamneseClientes = React.lazy(() => import("@/pages/configuracoes/Anamnese").then(m => ({ default: m.AnamneseClientes })));
const DocumentosPage = React.lazy(() => import("@/pages/configuracoes/Documentos").then(m => ({ default: m.DocumentosPage })));
const DocumentosClientePage = React.lazy(() => import("@/pages/configuracoes/Documentos").then(m => ({ default: m.DocumentosClientePage })));
const DocumentosProfissionalPage = React.lazy(() => import("@/pages/configuracoes/Documentos").then(m => ({ default: m.DocumentosProfissionalPage })));
const RestricaoCliente = React.lazy(() => import("@/pages/configuracoes/RestricaoCliente"));
const Funcionamento = React.lazy(() => import("@/pages/configuracoes/Funcionamento"));

const AdminLogin = React.lazy(() => import("@/pages/admin/AdminLogin"));
const AdminDashboard = React.lazy(() => import("@/pages/admin/AdminDashboard"));
const AdminTenants = React.lazy(() => import("@/pages/admin/AdminTenants"));
const AdminSettings = React.lazy(() => import("@/pages/admin/AdminSettings"));
const AdminRevenue = React.lazy(() => import("@/pages/admin/AdminRevenue"));
const AdminLogs = React.lazy(() => import("@/pages/admin/AdminLogs"));
const AdminCampanha = React.lazy(() => import("@/pages/admin/AdminCampanha"));
const AdminLgpdConsents = React.lazy(() => import("@/pages/admin/AdminLgpdConsents"));
const AdminTrialLinks = React.lazy(() => import("@/pages/admin/AdminTrialLinks"));
const AdminAdmins = React.lazy(() => import("@/pages/admin/AdminAdmins"));
const TrialRegister = React.lazy(() => import("@/pages/TrialRegister"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function LazyFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function Router() {
  return (
    <ChunkErrorBoundary>
    <Suspense fallback={<LazyFallback />}>
    <Switch>
      <Route path="/" component={DirectSales} />
      <Route path="/sucesso" component={DirectSalesSuccess} />
      <Route path="/pdvd" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/cadastro" component={Register} />
      <Route path="/esqueci-senha" component={ForgotPassword} />
      <Route path="/redefinir-senha" component={ResetPassword} />
      <Route path="/descadastrar/:token" component={Unsubscribe} />

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
      <Route path="/gestao/clientes/:clienteId" component={ClienteDetalhe} />
      <Route path="/gestao/clientes" component={Clientes} />
      <Route path="/gestao/filiais" component={Filiais} />

      <Route path="/comandas/abertas" component={ComandasAbertas} />
      <Route path="/comandas/historico" component={ComandasHistorico} />

      <Route path="/financeiro/caixa" component={CaixaDiario} />
      <Route path="/financeiro/historico" component={HistoricoCaixa} />
      <Route path="/financeiro/movimentacoes" component={MovCaixa} />
      <Route path="/financeiro/comissoes" component={ComissoesPage} />
      <Route path="/financeiro/conta-cliente" component={ContaCliente} />
      <Route path="/financeiro/fluxo" component={FluxoCaixa} />
      <Route path="/financeiro/conta-profissional" component={ContaProfissional} />
      <Route path="/financeiro/caixinha" component={CaixinhaPage} />

      <Route path="/relatorios/resumo" component={Resumo} />
      <Route path="/relatorios/aniversariantes" component={Aniversariantes} />
      <Route path="/relatorios/agendamentos" component={AgendamentosReport} />
      <Route path="/relatorios/financeiro" component={FinanceiroReport} />
      <Route path="/relatorios/canceladas" component={ComandasCanceladas} />
      <Route path="/relatorios/rankings" component={RankingsReport} />
      <Route path="/relatorios/rankings-gerencial" component={RankingsReport} />
      <Route path="/relatorios/perfil-cliente" component={PerfilCliente} />
      <Route path="/relatorios/estoque" component={EstoqueReport} />
      <Route path="/relatorios/pacotes" component={PacotesReport} />
      <Route path="/relatorios/comandas-itens" component={ComandasItensReport} />
      <Route path="/relatorios/dias-sem-vir" component={DiasSemVir} />
      <Route path="/relatorios/lucro-produtos" component={LucroProdutos} />
      <Route path="/relatorios" component={Relatorios} />

      <Route path="/caixa" component={Caixa} />
      <Route path="/financeiro" component={Financeiro} />
      <Route path="/pacotes" component={Pacotes} />
      <Route path="/pacotes/vendas" component={VendaPacotes} />

      <Route path="/cadastros/tipos" component={Tipos} />
      <Route path="/cadastros/cupons" component={Cupons} />
      <Route path="/cadastros/lembretes" component={Lembretes} />
      <Route path="/cadastros/clubes" component={ClubesAssinatura} />
      <Route path="/cadastros/assinantes" component={ClubesAssinatura} />
      <Route path="/cadastros/noticias" component={Noticias} />
      <Route path="/cadastros/grupos" component={GruposClientes} />
      <Route path="/cadastros/pesquisa" component={Pesquisa} />
      <Route path="/cadastros/clube-vantagens" component={ClubeVantagens} />

      <Route path="/lista-espera" component={ListaEspera} />
      <Route path="/avaliacoes" component={Avaliacoes} />
      <Route path="/mensagens" component={Mensagens} />
      <Route path="/comunicacao/inbox" component={InboxMensagens} />
      <Route path="/comunicacao/email-marketing/nova" component={NovaCampanha} />
      <Route path="/comunicacao/email-marketing" component={EmailMarketing} />
      <Route path="/equipe" component={Equipe} />
      <Route path="/convite/:token" component={AcceptInvite} />

      <Route path="/configuracoes/parametros" component={Parametros} />
      <Route path="/configuracoes/rodizio" component={RodizioPage} />
      <Route path="/configuracoes/ordem-chegada" component={OrdemChegadaPage} />
      <Route path="/configuracoes/lista-espera" component={ListaEsperaConfigPage} />
      <Route path="/configuracoes/alertas" component={AlertasPage} />
      <Route path="/configuracoes/acessos" component={PerfisAcesso} />
      <Route path="/configuracoes/templates" component={EmailTemplates} />
      <Route path="/configuracoes/anamnese-formularios" component={AnamneseFormularios} />
      <Route path="/configuracoes/anamnese-clientes" component={AnamneseClientes} />
      <Route path="/configuracoes/documentos" component={DocumentosPage} />
      <Route path="/configuracoes/documentos-clientes" component={DocumentosClientePage} />
      <Route path="/configuracoes/documentos-profissionais" component={DocumentosProfissionalPage} />
      <Route path="/configuracoes/restricoes" component={RestricaoCliente} />
      <Route path="/configuracoes/funcionamento" component={Funcionamento} />

      <Route path="/menu" component={MenuPage} />
      <Route path="/empresa" component={Empresa} />
      <Route path="/clube" component={Clube} />

      <Route path="/pesquisa/:barbeariaId/:pesquisaId" component={PublicPesquisa} />
      <Route path="/s/:slug" component={PublicStorefront} />
      <Route path="/agendar/:slug" component={PublicBooking} />
      <Route path="/politica-de-privacidade" component={PoliticaPrivacidade} />
      <Route path="/termos-de-uso" component={TermosDeUso} />

      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/assinantes" component={AdminTenants} />
      <Route path="/admin/configuracoes" component={AdminSettings} />
      <Route path="/admin/receita" component={AdminRevenue} />
      <Route path="/admin/campanha" component={AdminCampanha} />
      <Route path="/admin/logs" component={AdminLogs} />
      <Route path="/admin/lgpd" component={AdminLgpdConsents} />
      <Route path="/admin/trial-links" component={AdminTrialLinks} />
      <Route path="/admin/admins" component={AdminAdmins} />

      <Route path="/trial/:token" component={TrialRegister} />

      <Route component={NotFound} />
    </Switch>
    </Suspense>
    </ChunkErrorBoundary>
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
