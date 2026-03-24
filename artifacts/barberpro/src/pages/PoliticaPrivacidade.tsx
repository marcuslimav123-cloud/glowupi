import React, { useEffect, useState } from "react";
import { Link } from "wouter";
import { Sparkles, ArrowLeft, Shield } from "lucide-react";
import { APP_NAME, apiUrl } from "@/lib/utils";

export default function PoliticaPrivacidade() {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(apiUrl("/lgpd/terms"))
      .then(r => r.json())
      .then(data => setContent(data.privacyPolicy || ""))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const defaultContent = `1. INFORMAÇÕES GERAIS

A presente Política de Privacidade contém informações sobre coleta, uso, armazenamento, tratamento e proteção dos dados pessoais dos usuários do ${APP_NAME}, com a finalidade de demonstrar absoluta transparência quanto ao assunto e esclarecer a todos interessados sobre os tipos de dados que são coletados, os motivos da coleta e a forma como os usuários podem gerenciar ou excluir as suas informações pessoais.

Esta Política de Privacidade aplica-se a todos os usuários e visitantes do ${APP_NAME} e integra os Termos de Uso. O presente documento foi elaborado em conformidade com a Lei Geral de Proteção de Dados Pessoais (Lei 13.709/18 - LGPD), o Marco Civil da Internet (Lei 12.965/14) e o Regulamento da UE n. 2016/679 (GDPR).

2. DADOS PESSOAIS COLETADOS

Os dados pessoais coletados incluem:
- Nome completo
- Endereço de e-mail
- Número de telefone/WhatsApp
- Dados de agendamentos e serviços utilizados
- Informações de pagamento (processados via Stripe, nosso parceiro de pagamentos)
- Dados de navegação (cookies, endereço IP, tipo de navegador)
- Dados fornecidos voluntariamente pelo usuário ao utilizar nossos formulários

3. FINALIDADE DO TRATAMENTO DOS DADOS

Os dados pessoais são tratados com as seguintes finalidades:
- Prestação dos serviços de agendamento e gestão de salões
- Comunicação entre o salão e seus clientes
- Envio de notificações e lembretes de agendamentos
- Processamento de pagamentos e transações financeiras
- Melhoria da experiência do usuário na plataforma
- Geração de relatórios e análises para os proprietários dos salões
- Cumprimento de obrigações legais e regulatórias

4. BASE LEGAL PARA O TRATAMENTO

O tratamento dos dados pessoais é realizado com base nas seguintes hipóteses legais:
- Consentimento do titular (Art. 7º, I da LGPD)
- Execução de contrato (Art. 7º, V da LGPD)
- Legítimo interesse do controlador (Art. 7º, IX da LGPD)
- Cumprimento de obrigação legal (Art. 7º, II da LGPD)

5. COMPARTILHAMENTO DE DADOS

Os dados pessoais poderão ser compartilhados com:
- Stripe Inc. — para processamento de pagamentos
- Google LLC — para serviços de autenticação (quando o usuário opta por login com Google)
- Prestadores de serviços essenciais à operação da plataforma

Não vendemos, alugamos ou compartilhamos dados pessoais com terceiros para fins de marketing.

6. SEGURANÇA DOS DADOS

Empregamos medidas técnicas e organizacionais adequadas para proteger os dados pessoais, incluindo:
- Criptografia de dados em trânsito (HTTPS/TLS)
- Armazenamento seguro de senhas com hash criptográfico (bcrypt)
- Controle de acesso baseado em autenticação
- Monitoramento contínuo de segurança

7. COOKIES E TECNOLOGIAS SIMILARES

Utilizamos cookies para:
- Cookies essenciais: manter sua sessão de login ativa
- Cookies de preferências: salvar suas configurações e consentimento LGPD
- Cookies de análise: entender como você utiliza a plataforma

Você pode gerenciar suas preferências de cookies a qualquer momento nas configurações do seu navegador.

8. DIREITOS DO TITULAR DOS DADOS

Em conformidade com a LGPD, você tem direito a:
- Confirmação da existência de tratamento
- Acesso aos dados pessoais
- Correção de dados incompletos, inexatos ou desatualizados
- Anonimização, bloqueio ou eliminação de dados desnecessários
- Portabilidade dos dados
- Eliminação dos dados tratados com consentimento
- Informação sobre compartilhamento de dados
- Revogação do consentimento

Para exercer seus direitos, entre em contato conosco.

9. RETENÇÃO DE DADOS

Os dados pessoais são mantidos pelo período necessário para a prestação dos serviços contratados e cumprimento de obrigações legais. Após o encerramento da conta, os dados serão eliminados em até 30 dias, exceto quando houver obrigação legal de retenção.

10. ALTERAÇÕES NA POLÍTICA

Esta política pode ser atualizada a qualquer momento. Recomendamos que consulte esta página periodicamente. Alterações significativas serão comunicadas por e-mail ou aviso na plataforma.

Última atualização: ${new Date().toLocaleDateString("pt-BR")}`;

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <header className="border-b border-black/[0.04] bg-white/80 sticky top-0 z-50 backdrop-blur-xl">
        <div className="max-w-[740px] mx-auto px-6 py-3 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 font-semibold text-[14px] text-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            {APP_NAME}
          </Link>
        </div>
      </header>

      <main className="max-w-[740px] mx-auto px-6 py-14">
        <Link href="/" className="inline-flex items-center gap-1 text-[13px] text-primary hover:underline mb-8">
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar
        </Link>

        <div className="flex items-center gap-3 mb-10">
          <div className="h-10 w-10 rounded-xl bg-primary/8 flex items-center justify-center">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-[24px] font-bold text-foreground">Política de Privacidade</h1>
            <p className="text-foreground/40 text-[13px]">LGPD - Lei nº 13.709/2018</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="bg-white border border-black/[0.04] rounded-2xl p-8 sm:p-10 whitespace-pre-wrap text-[14px] text-foreground/55 leading-relaxed">
            {content || defaultContent}
          </div>
        )}
      </main>

      <footer className="border-t border-black/[0.04] py-8 px-6 bg-white">
        <div className="max-w-[740px] mx-auto text-center text-[12px] text-foreground/30">
          &copy; {new Date().getFullYear()} {APP_NAME}
        </div>
      </footer>
    </div>
  );
}
