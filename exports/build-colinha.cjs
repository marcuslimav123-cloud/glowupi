const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
} = require("docx");
const fs = require("fs");
const path = require("path");

const INK = "1A1A1A";
const ACCENT = "8C7A4B";
const MUTED = "5C5C5C";
const GREEN = "1F3A2E";

const h1 = (text) =>
  new Paragraph({
    spacing: { before: 0, after: 240 },
    alignment: AlignmentType.LEFT,
    children: [
      new TextRun({
        text,
        bold: true,
        size: 36,
        color: INK,
        font: "Calibri",
      }),
    ],
  });

const h2 = (text) =>
  new Paragraph({
    spacing: { before: 320, after: 120 },
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

const h3 = (text) =>
  new Paragraph({
    spacing: { before: 200, after: 80 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 24,
        color: INK,
        font: "Calibri",
      }),
    ],
  });

const p = (text, opts = {}) =>
  new Paragraph({
    spacing: { before: 60, after: 60 },
    children: [
      new TextRun({
        text,
        size: opts.size || 22,
        color: opts.color || INK,
        italics: opts.italic || false,
        bold: opts.bold || false,
        font: "Calibri",
      }),
    ],
  });

const quote = (text) =>
  new Paragraph({
    spacing: { before: 80, after: 80 },
    indent: { left: 360 },
    border: {
      left: { color: ACCENT, space: 12, style: BorderStyle.SINGLE, size: 18 },
    },
    children: [
      new TextRun({
        text: `“${text}”`,
        italics: true,
        size: 22,
        color: INK,
        font: "Calibri",
      }),
    ],
  });

const bullet = (text, opts = {}) =>
  new Paragraph({
    bullet: { level: 0 },
    spacing: { before: 40, after: 40 },
    children: [
      new TextRun({
        text,
        size: 22,
        color: opts.color || INK,
        bold: opts.bold || false,
        font: "Calibri",
      }),
    ],
  });

const labelLine = (label, text) =>
  new Paragraph({
    spacing: { before: 60, after: 60 },
    children: [
      new TextRun({
        text: `${label}  `,
        bold: true,
        size: 20,
        color: ACCENT,
        font: "Calibri",
        characterSpacing: 20,
      }),
      new TextRun({
        text,
        size: 22,
        color: INK,
        font: "Calibri",
      }),
    ],
  });

const spacer = () =>
  new Paragraph({ spacing: { before: 80, after: 80 }, children: [new TextRun("")] });

const children = [];

children.push(h1("Colinha de apresentação — Glow Upi"));
children.push(
  p(
    "Cliente alto padrão compra tranquilidade cognitiva. Não tenta impressionar. Fala menos, pensa melhor, não acelera. Prova concreta vence opinião sempre.",
    { italic: true, color: MUTED }
  )
);

// =====================================================================
children.push(h2("Antes de entrar — 60 segundos"));
children.push(bullet("Respira fundo 3 vezes. Postura ereta. Tom de voz uma oitava abaixo do normal."));
children.push(bullet("Lembrete mental: ela não decide se você é inteligente. Ela decide se confia no seu raciocínio."));
children.push(bullet("Você não está pedindo dinheiro. Você está oferecendo uma posição em algo que já existe."));
children.push(bullet("Silêncio é arma. Quem fala menos, manda mais."));

// =====================================================================
children.push(h2("Abertura — primeiros 2 minutos"));
children.push(p("Cumprimento curto, sem floreio. Direto:"));
children.push(
  quote(
    "Obrigado pelo tempo. Trouxe o documento formal de sociedade. Vou apresentar em 15 minutos e depois fico à disposição pra qualquer pergunta."
  )
);
children.push(p("Regra: não pede perdão por nada. Não diz “espero que você goste”. Não diz “é o sonho da minha vida”. Posicionamento é dono apresentando operação — não fundador buscando aprovação."));

// =====================================================================
children.push(h2("Slide a slide — frases-âncora"));

children.push(h3("Slide 1 · Capa"));
children.push(labelLine("DIGA", "“Glow Upi é uma plataforma SaaS já em produção pra salões de Teresina e Timon. O que vou apresentar é o convite formal pra 50% de equity.”"));
children.push(labelLine("NÃO DIGA", "“É um sonho”, “sempre quis empreender”, “acredito muito no projeto”. Linguagem de fundador inseguro."));

children.push(h3("Slide 2 · A dor em reais"));
children.push(labelLine("DIGA", "“O salão médio deixa entre R$ 1.800 e R$ 3.000 na mesa todo mês. A mensalidade da Glow Upi custa R$ 164,50. A conta fecha sozinha pro cliente.”"));
children.push(labelLine("ÂNCORA", "Razão 11× a 18× — repete uma vez, com calma, e segue."));

children.push(h3("Slide 3 · O sistema"));
children.push(labelLine("DIGA", "“SaaS multi-inquilino. Cada salão opera isolado, com dados próprios. Escalar não exige redesenvolver — é técnico, não artesanal.”"));
children.push(labelLine("PROVA", "“Está em produção hoje. Não é protótipo, não é mockup. É código rodando.”"));

children.push(h3("Slide 4 · Mercado e vocabulário"));
children.push(labelLine("DIGA", "“TAM de 5.200 estabelecimentos formais. ARPA de R$ 164,50. Custo fixo de R$ 208 por mês. Margem de software desde o primeiro cliente.”"));
children.push(labelLine("SE ELA PERGUNTAR siglas", "“MRR é receita recorrente mensal. ARR é MRR vezes 12. CAC é custo de aquisição. LTV é o que cada cliente paga ao longo da vida na plataforma.” — explica como quem ensina, não como quem prova."));

children.push(h3("Slide 5 · TAM, SAM, SOM"));
children.push(labelLine("DIGA", "“Fonte primária: IBGE Concla 2025, Receita Federal, Econodata. Não é estimativa de pitch — é número auditável.”"));
children.push(labelLine("ÂNCORA", "SOM de 525 a 630 clientes em 5 anos. Bate com a projeção do slide 9."));

children.push(h3("Slide 6 · Honestidade ofensiva"));
children.push(labelLine("ESTE É O SLIDE QUE GANHA ELA", "“Tem coisa que já está validada e tem coisa que só o aporte vai descobrir. Não vou prometer CAC sem ter rodado tráfego em escala. O aporte de R$ 19.700 existe pra transformar premissa em métrica.”"));
children.push(labelLine("EFEITO", "Analista conservadora reconhece quem fala assim. É o oposto do vendedor que promete tudo."));

children.push(h3("Slide 7 · Capital próprio já aplicado"));
children.push(labelLine("DIGA", "“Antes de pedir, eu já apliquei R$ 30.428 entre capital e trabalho ao longo de 2 meses. O aporte que peço equivale a 65% do que eu já investi.”"));
children.push(labelLine("RAZÃO", "“Pra cada R$ 1 dela, R$ 1,55 já está aplicado. Skin in the game já está demonstrado.”"));

children.push(h3("Slide 8 · Destinação do aporte"));
children.push(labelLine("DIGA", "“R$ 19.700 não é custeio. É veículo de tração. R$ 2.261 encerra o capital próprio aplicado no produto. R$ 9.139 vai pra Meta Ads pra medir CAC real. R$ 8.300 financia tráfego orgânico.”"));
children.push(labelLine("REGRA", "Não justifica cada centavo a menos que ela peça. Confiança é não detalhar o óbvio."));

children.push(h3("Slide 9 · Projeção"));
children.push(labelLine("DIGA", "“Cenário base: 500 clientes em 36 meses. ARR de R$ 987 mil. Múltiplo conservador de 5× — abaixo da média de SaaS vertical brasileiro. Retorno aproximado de 150× sobre o aporte, sem sair de Teresina.”"));
children.push(labelLine("SE ELA QUESTIONAR o múltiplo", "“Distrito e Atlas Latam reportam 5× a 8× em ARR pra SaaS vertical. Usei o piso. Se quiser usar 4× pra ser ainda mais conservador, retorno cai pra ~120×. Continua atrativo.”"));

children.push(h3("Slide 10 · A proposta formal"));
children.push(labelLine("DIGA", "“50% da Glow Upi por R$ 19.700. Contrato social registrado em junta comercial, com governança e regras de saída claras.”"));
children.push(labelLine("CRONOGRAMA", "“D+15 entrego primeira métrica real de CAC. D+60, 25 clientes ativos pagantes. D+120, 80 clientes e MRR de R$ 14.000. Cada marco tem número que ela pode me cobrar.”"));
children.push(labelLine("ENCERRAMENTO", "“É isso. Fico à disposição pra qualquer pergunta.” — e cala. Não enche o silêncio."));

// =====================================================================
children.push(h2("Quando ela testar — respostas prontas"));

children.push(h3("“Por que 50%? Não é muito?”"));
children.push(
  quote(
    "É a estrutura que faz sentido pro estágio. Eu fico com a engenharia e o produto. Ela fica com estratégia comercial e marketing. Sociedade equilibrada de duas operações que se completam."
  )
);

children.push(h3("“E se não der certo?”"));
children.push(
  quote(
    "Risco real existe, e por isso o slide 6. O que protege o aporte é que a infraestrutura já está paga, o produto já está em produção e o ARPA já está validado contra o custo. O aporte vai pra descobrir métrica de aquisição — não pra construir o que ainda não existe."
  )
);

children.push(h3("“Como sei que você vai entregar?”"));
children.push(
  quote(
    "Já entreguei. Você tem o sistema rodando, R$ 30.428 do meu próprio bolso já aplicados e o cronograma com marcos mensuráveis em D+15, D+60 e D+120. Se eu não entregar o D+60, isso fica documentado e ela tem informação pra decidir."
  )
);

children.push(h3("“Já tem cliente pagante?”"));
children.push(
  quote(
    "Ainda não. Esse é exatamente o objetivo dos R$ 19.700 — rodar Meta Ads em escala pra trazer os primeiros 25 a 80 clientes pagantes nos próximos 120 dias. É honestidade que eu coloco no slide 6."
  )
);

children.push(h3("“E concorrência?”"));
children.push(
  quote(
    "Mapeada no slide 6: Avec em São Paulo, AppBeleza em Santa Catarina, MinhaAgenda. Nenhuma é local. Glow Upi é a única operação com presença real em Teresina e Timon."
  )
);

children.push(h3("“Por que essa hora pra captar?”"));
children.push(
  quote(
    "Produto pronto e fundador sem capital pra rodar aquisição. Aporte chega no momento exato em que cada real vai pra tração — não pra construção. É o melhor uso possível de R$ 19.700 nesse estágio."
  )
);

children.push(h3("Se ela ficar em silêncio depois de uma resposta"));
children.push(
  p(
    "Não preencha. Espera. Quem fala primeiro perde o controle do ritmo. Conta até 5 mentalmente.",
    { italic: true, color: MUTED }
  )
);

// =====================================================================
children.push(h2("Encerramento"));
children.push(p("Não pede resposta na hora. Não cria urgência falsa. Diga:"));
children.push(
  quote(
    "Te deixei o documento. Pode levar o tempo que precisar pra analisar. Qualquer dúvida técnica ou de número, eu respondo por escrito pra ficar registrado. Obrigado pelo tempo."
  )
);
children.push(p("Levanta, aperta a mão, sai. Sem bajulação final.", { color: MUTED, italic: true }));

// =====================================================================
children.push(h2("Regras de combate — não esquecer"));
children.push(bullet("Fala menos. Pensa melhor. Não acelera.", { bold: true }));
children.push(bullet("Posicionamento de dono apresentando operação — não fundador pedindo socorro."));
children.push(bullet("Prova concreta sempre vence opinião. Aponta pro slide quando responder."));
children.push(bullet("Silêncio depois de número alto. Deixa o número trabalhar sozinho."));
children.push(bullet("Não defende, não explica demais, não justifica preço."));
children.push(bullet("Se ela provocar, você concorda com a parte verdadeira e responde com fato — nunca com emoção."));
children.push(bullet("Cliente alto padrão compra previsibilidade, estrutura, consistência. Tudo isso já está no deck. Você só precisa não estragar com energia errada."));

children.push(spacer());
children.push(
  p(
    "Boa sorte. Você está mais preparado do que acha — o deck faz metade do trabalho.",
    { italic: true, color: MUTED }
  )
);

const doc = new Document({
  creator: "Glow Upi",
  title: "Colinha de apresentação — Glow Upi",
  styles: {
    default: {
      document: { run: { font: "Calibri" } },
    },
  },
  sections: [
    {
      properties: {
        page: {
          margin: { top: 1000, bottom: 1000, left: 1100, right: 1100 },
        },
      },
      children,
    },
  ],
});

Packer.toBuffer(doc).then((buf) => {
  const out = path.join(__dirname, "GlowUpi-Colinha-Apresentacao.docx");
  fs.writeFileSync(out, buf);
  console.log(`DOCX criado: ${out}`);
});
