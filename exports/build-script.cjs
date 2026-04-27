const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  BorderStyle,
} = require("docx");
const fs = require("fs");
const path = require("path");

const INK = "1A1A1A";
const ACCENT = "8C7A4B";
const GREEN = "1F3A2E";
const MUTED = "5C5C5C";

const title = (text) =>
  new Paragraph({
    spacing: { before: 0, after: 360 },
    children: [
      new TextRun({ text, bold: true, size: 36, color: INK, font: "Calibri" }),
    ],
  });

const slideHeader = (n, name) =>
  new Paragraph({
    spacing: { before: 360, after: 120 },
    border: {
      bottom: { color: ACCENT, space: 4, style: BorderStyle.SINGLE, size: 8 },
    },
    children: [
      new TextRun({
        text: `SLIDE ${String(n).padStart(2, "0")}  ·  `,
        bold: true,
        size: 22,
        color: ACCENT,
        font: "Calibri",
        characterSpacing: 30,
      }),
      new TextRun({
        text: name.toUpperCase(),
        bold: true,
        size: 22,
        color: GREEN,
        font: "Calibri",
        characterSpacing: 30,
      }),
    ],
  });

const sectionHeader = (text) =>
  new Paragraph({
    spacing: { before: 360, after: 120 },
    border: {
      bottom: { color: ACCENT, space: 4, style: BorderStyle.SINGLE, size: 8 },
    },
    children: [
      new TextRun({
        text: text.toUpperCase(),
        bold: true,
        size: 22,
        color: GREEN,
        font: "Calibri",
        characterSpacing: 30,
      }),
    ],
  });

const line = (text) =>
  new Paragraph({
    spacing: { before: 100, after: 100 },
    children: [
      new TextRun({ text, size: 24, color: INK, font: "Calibri" }),
    ],
  });

const pause = () =>
  new Paragraph({
    spacing: { before: 60, after: 100 },
    children: [
      new TextRun({
        text: "(pausa)",
        size: 20,
        italics: true,
        color: MUTED,
        font: "Calibri",
      }),
    ],
  });

const children = [];

children.push(title("Glow Upi — Texto da apresentação"));

// ---------- ABERTURA ----------
children.push(sectionHeader("Abertura"));
children.push(line("Obrigado pelo tempo."));
children.push(line("Trouxe o documento formal de sociedade da Glow Upi. Vou apresentar em cerca de 15 minutos e depois fico à disposição pra qualquer pergunta."));

// ---------- SLIDE 1 ----------
children.push(slideHeader(1, "Capa"));
children.push(line("Glow Upi é uma plataforma SaaS já em produção, dedicada ao mercado de salões e estúdios de estética em Teresina e Timon."));
children.push(line("O que vou apresentar é o convite formal pra aquisição de cinquenta por cento de equity por dezenove mil e setecentos reais."));

// ---------- SLIDE 2 ----------
children.push(slideHeader(2, "A dor traduzida em reais"));
children.push(line("O salão médio de Teresina deixa entre mil e oitocentos e três mil reais na mesa todo mês — em faltas, horários vagos e clientes que somem sem ser reativados."));
children.push(line("A mensalidade da Glow Upi é cento e sessenta e quatro reais e cinquenta. Ele paga uma vez e recupera onze a dezoito vezes esse valor todo mês."));
children.push(line("A conta fecha sozinha pro cliente. Não é um software que ele precisa querer — é um software que ele precisa não recusar."));

// ---------- SLIDE 3 ----------
children.push(slideHeader(3, "O sistema"));
children.push(line("É um SaaS multi-inquilino. Cada salão opera em ambiente isolado, com base de clientes própria, identidade visual própria e dados protegidos."));
children.push(line("Tem agenda inteligente, ficha digital, app instalável no celular, e-mail marketing nativo, pagamentos integrados via Stripe e painel financeiro."));
children.push(line("O ponto técnico importante: novos clientes não exigem novo desenvolvimento. A escala é estrutural."));
children.push(line("E está em produção hoje. Não é protótipo. Não é mockup. É código rodando."));

// ---------- SLIDE 4 ----------
children.push(slideHeader(4, "Mercado, margem e vocabulário"));
children.push(line("O mercado endereçável é Teresina e Timon — uma conurbação de mais de um milhão de habitantes separada apenas pelo Rio Parnaíba."));
children.push(line("Cinco mil e duzentos estabelecimentos formais. Receita média por cliente de cento e sessenta e quatro reais e cinquenta. Custo fixo de duzentos e oito reais por mês."));
children.push(line("Margem de software desde o primeiro cliente pagante."));

// ---------- SLIDE 5 ----------
children.push(slideHeader(5, "TAM, SAM e SOM"));
children.push(line("Mercado total: cinco mil e duzentos estabelecimentos."));
children.push(line("Mercado qualificado: dois mil e cem — aqueles com três a cinco profissionais e capacidade real de pagar mensalidade SaaS."));
children.push(line("Mercado alcançável em cinco anos: entre quinhentos e vinte e cinco e seiscentos e trinta clientes — descontando concorrência mapeada."));
children.push(line("Fonte primária: IBGE Cidades, Receita Federal, IBGE Concla e Sebrae Nacional. Não é estimativa de pitch. É número auditável."));

// ---------- SLIDE 6 ----------
children.push(slideHeader(6, "O que já está validado e o que o aporte vai descobrir"));
children.push(line("Tem coisa que já está validada e tem coisa que só o aporte vai descobrir."));
children.push(line("Já validado: produto em produção, infraestrutura quitada em duzentos e oito reais por mês, mercado dimensionado com fonte primária e concorrência mapeada."));
children.push(line("Ainda em descoberta: custo de aquisição real, conversão do funil em escala, retenção e churn observados."));
children.push(line("O aporte de dezenove mil e setecentos reais é capital de descoberta — existe pra transformar essas premissas em métrica auditável nos próximos seis meses."));

// ---------- SLIDE 7 ----------
children.push(slideHeader(7, "Capital próprio já aplicado"));
children.push(line("Antes de pedir, eu já apliquei trinta mil quatrocentos e vinte e oito reais entre capital e trabalho ao longo de dois meses."));
children.push(line("Quatro mil oitocentos e vinte e oito em ferramentas, infraestrutura e marketing. Vinte e cinco mil e seiscentos em desenvolvimento fullstack em tempo integral, sem pro-labore — custo absorvido pelo fundador."));
children.push(line("O aporte que peço equivale a sessenta e cinco por cento do que eu já investi. Pra cada um real dela, um real e cinquenta e cinco já está aplicado."));

// ---------- SLIDE 8 ----------
children.push(slideHeader(8, "Destinação do aporte"));
children.push(line("Os dezenove mil e setecentos não são custeio. São veículo de tração."));
children.push(line("Dois mil duzentos e sessenta e um encerram o capital próprio aplicado na construção do produto."));
children.push(line("Nove mil cento e trinta e nove vão pra Meta Ads — campanha segmentada pra medir o custo de aquisição real na praça."));
children.push(line("Oito mil e trezentos financiam tráfego orgânico: vídeo vertical profissional, conteúdo recorrente e prova social com clientes reais."));
children.push(line("Custo fixo da operação permanece em duzentos e oito reais por mês."));

// ---------- SLIDE 9 ----------
children.push(slideHeader(9, "Projeção realista — somente Teresina"));
children.push(line("Três patamares, sem expansão pra outras cidades."));
children.push(line("Marco um: duzentos clientes ativos, MRR de trinta e dois mil e novecentos, ARR de trezentos e noventa e quatro mil e oitocentos. Atingível em dezoito meses."));
children.push(line("Marco dois — o marco-chave: quinhentos clientes ativos, MRR de oitenta e dois mil duzentos e cinquenta, ARR de novecentos e oitenta e sete mil. Atingível em trinta e seis meses."));
children.push(line("Horizonte cinco anos: seiscentos clientes em Teresina, ARR de um milhão cento e oitenta mil."));
children.push(line("ARR de um milhão cento e oitenta mil multiplicado por um múltiplo conservador de cinco — abaixo da média de SaaS vertical brasileiro segundo Distrito e Atlas Latam — resulta em cinco milhões e novecentos mil reais de valuation."));
children.push(line("Cinquenta por cento desse equity equivale a dois milhões e novecentos e cinquenta mil reais."));
children.push(line("Retorno aproximado de cento e cinquenta vezes sobre o aporte de dezenove mil e setecentos. Sem nenhuma cidade nova. Risco real, retorno mensurável."));

// ---------- SLIDE 10 ----------
children.push(slideHeader(10, "A proposta formal"));
children.push(line("Cinquenta por cento da Glow Upi por dezenove mil e setecentos reais."));
children.push(line("Item um: equity formal, contrato social registrado em junta comercial, com governança e regras de saída claras."));
children.push(line("Item dois: produto em produção — painel web responsivo instalável como aplicativo, com agenda, ficha digital, e-mail marketing nativo e cobrança recorrente."));
children.push(line("Item três: operação técnica integralmente coberta. O fundador responde pela engenharia, infraestrutura e produto. A sócia conduz estratégia comercial e marketing."));
children.push(line("Item quatro: tração mensurável em noventa dias. Dezessete mil quatrocentos e trinta e nove reais em tráfego pago e orgânico geram receita recorrente antes do encerramento de dois mil e vinte e seis."));
children.push(line("Cronograma dos primeiros cento e vinte dias:"));
children.push(line("D mais quinze: primeira métrica real de custo de aquisição com cinco a dez conversões piloto."));
children.push(line("D mais sessenta: vinte e cinco clientes ativos pagantes, com validação de CAC e churn iniciais."));
children.push(line("D mais cento e vinte: oitenta clientes ativos e MRR de quatorze mil reais — cenário base."));
children.push(line("Composição do aporte: onze mil e quatrocentos em capital, oito mil e trezentos em tráfego orgânico. Total dezenove mil e setecentos."));

// ---------- ENCERRAMENTO ----------
children.push(sectionHeader("Encerramento"));
children.push(line("É isso."));
children.push(pause());
children.push(line("Te deixo o documento. Pode levar o tempo que precisar pra analisar."));
children.push(line("Qualquer dúvida técnica ou de número, eu respondo por escrito pra ficar registrado."));
children.push(line("Obrigado pelo tempo."));

const doc = new Document({
  creator: "Glow Upi",
  title: "Glow Upi — Texto da apresentação",
  styles: {
    default: { document: { run: { font: "Calibri" } } },
  },
  sections: [
    {
      properties: {
        page: { margin: { top: 1000, bottom: 1000, left: 1100, right: 1100 } },
      },
      children,
    },
  ],
});

Packer.toBuffer(doc).then((buf) => {
  const out = path.join(__dirname, "GlowUpi-Texto-Apresentacao.docx");
  fs.writeFileSync(out, buf);
  console.log(`DOCX criado: ${out}`);
});
