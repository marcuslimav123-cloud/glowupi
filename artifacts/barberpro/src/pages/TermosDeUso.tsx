import React, { useEffect, useState } from "react";
import { Link } from "wouter";
import { Sparkles, ArrowLeft, FileText } from "lucide-react";
import { APP_NAME, apiUrl } from "@/lib/utils";

export default function TermosDeUso() {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(apiUrl("/lgpd/terms"))
      .then(r => r.json())
      .then(data => setContent(data.termsOfUse || ""))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const defaultContent = `1. TERMOS GERAIS

Ao acessar e utilizar o ${APP_NAME}, você concorda com estes Termos de Uso. Por favor, leia-os atentamente antes de utilizar nossos serviços.

O ${APP_NAME} é uma plataforma SaaS (Software como Serviço) de gestão para profissionais e salões de beleza, estética e bem-estar, oferecendo ferramentas de agendamento, gestão financeira, controle de clientes e demais funcionalidades descritas na plataforma.

2. CADASTRO E CONTA

Para utilizar os serviços, é necessário criar uma conta fornecendo informações verdadeiras, completas e atualizadas. Você é responsável por manter a confidencialidade de suas credenciais de acesso e por todas as atividades realizadas em sua conta.

3. PLANOS E PAGAMENTOS

O ${APP_NAME} oferece diferentes planos de assinatura com período de teste gratuito de 30 dias. Após o período de teste, é necessário escolher um plano pago para continuar utilizando os serviços.

Os pagamentos são processados pela Stripe, nosso parceiro de pagamentos. As cobranças são realizadas conforme o plano e período escolhidos (mensal, semestral ou anual).

4. USO ADEQUADO DA PLATAFORMA

Ao utilizar o ${APP_NAME}, você se compromete a:
- Não utilizar a plataforma para fins ilegais ou não autorizados
- Não tentar acessar áreas restritas do sistema sem autorização
- Não transmitir vírus, malware ou qualquer código malicioso
- Não sobrecarregar intencionalmente os servidores da plataforma
- Manter seus dados cadastrais atualizados
- Respeitar a privacidade dos dados de seus clientes

5. RESPONSABILIDADES DO USUÁRIO

O proprietário do salão/estúdio é responsável por:
- Garantir o consentimento de seus clientes para coleta e tratamento de dados
- Manter os dados de seus clientes seguros e atualizados
- Utilizar a plataforma em conformidade com a LGPD e demais legislações aplicáveis
- Realizar backups de informações críticas para seu negócio

6. PROPRIEDADE INTELECTUAL

Todo o conteúdo, design, código-fonte, marcas e logos do ${APP_NAME} são de propriedade exclusiva da empresa e estão protegidos por leis de propriedade intelectual.

7. DISPONIBILIDADE DOS SERVIÇOS

Nos esforçamos para manter a plataforma disponível 24/7, mas não garantimos disponibilidade ininterrupta. Manutenções programadas serão comunicadas com antecedência sempre que possível.

8. LIMITAÇÃO DE RESPONSABILIDADE

O ${APP_NAME} não se responsabiliza por:
- Perdas ou danos decorrentes de uso inadequado da plataforma
- Interrupções causadas por fatores externos (internet, energia, etc.)
- Conteúdo inserido pelos usuários na plataforma
- Decisões de negócio tomadas com base nos dados da plataforma

9. CANCELAMENTO

Você pode cancelar sua assinatura a qualquer momento. Após o cancelamento:
- O acesso será mantido até o final do período já pago
- Seus dados serão preservados por 30 dias após o encerramento
- Após esse período, os dados serão permanentemente excluídos

10. ALTERAÇÕES NOS TERMOS

Reservamo-nos o direito de modificar estes Termos a qualquer momento. Alterações significativas serão comunicadas por e-mail ou aviso na plataforma. O uso continuado após as alterações constitui aceitação dos novos termos.

11. LEGISLAÇÃO APLICÁVEL

Estes Termos são regidos pela legislação brasileira. Quaisquer disputas serão resolvidas no foro da comarca da sede da empresa.

Última atualização: ${new Date().toLocaleDateString("pt-BR")}`;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 sticky top-0 z-50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-primary font-display font-bold text-lg">
            <Sparkles className="h-5 w-5" />
            {APP_NAME}
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-primary hover:underline mb-8">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-display text-foreground">Termos de Uso</h1>
            <p className="text-muted-foreground">Condições gerais de uso da plataforma {APP_NAME}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
          </div>
        ) : (
          <div className="prose prose-slate max-w-none">
            <div className="bg-card border border-border rounded-2xl p-8 sm:p-10 whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">
              {content || defaultContent}
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-border py-8 px-4 bg-card/50">
        <div className="max-w-4xl mx-auto text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} {APP_NAME}. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}
