import { Document, Packer, Paragraph, HeadingLevel, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType } from "docx";
import fs from "node:fs";

const PRIMARY = "C26B5E";
const DARK = "1A1510";
const ACCENT = "D4A574";
const TEXT_DARK = "2D2D2D";
const TEXT_GRAY = "5A5A5A";

const H = (text, level = HeadingLevel.HEADING_1, color = PRIMARY) =>
  new Paragraph({
    heading: level,
    spacing: { before: 320, after: 160 },
    children: [new TextRun({ text, bold: true, color, font: "Calibri" })],
  });

const P = (text, opts = {}) =>
  new Paragraph({
    spacing: { after: 120, line: 320 },
    alignment: opts.align || AlignmentType.JUSTIFIED,
    children: [
      new TextRun({
        text,
        bold: opts.bold || false,
        italics: opts.italic || false,
        color: opts.color || TEXT_DARK,
        size: opts.size || 22,
        font: "Calibri",
      }),
    ],
  });

const Quote = (text) =>
  new Paragraph({
    spacing: { before: 160, after: 200, line: 320 },
    indent: { left: 400, right: 400 },
    alignment: AlignmentType.LEFT,
    shading: { type: ShadingType.CLEAR, color: "auto", fill: "FBF4EF" },
    children: [
      new TextRun({ text: `"${text}"`, italics: true, color: PRIMARY, size: 24, font: "Calibri" }),
    ],
  });

const Bullet = (text, level = 0) =>
  new Paragraph({
    spacing: { after: 80, line: 300 },
    bullet: { level },
    children: [new TextRun({ text, color: TEXT_DARK, size: 22, font: "Calibri" })],
  });

const KeyValueBullet = (key, value) =>
  new Paragraph({
    spacing: { after: 80, line: 300 },
    bullet: { level: 0 },
    children: [
      new TextRun({ text: `${key}: `, bold: true, color: DARK, size: 22, font: "Calibri" }),
      new TextRun({ text: value, color: TEXT_DARK, size: 22, font: "Calibri" }),
    ],
  });

const Spacer = () => new Paragraph({ spacing: { after: 100 }, children: [new TextRun(" ")] });

const Cell = (text, opts = {}) =>
  new TableCell({
    width: { size: opts.width || 33, type: WidthType.PERCENTAGE },
    shading: opts.fill ? { type: ShadingType.CLEAR, color: "auto", fill: opts.fill } : undefined,
    children: [
      new Paragraph({
        alignment: opts.align || AlignmentType.LEFT,
        spacing: { before: 80, after: 80 },
        children: [
          new TextRun({
            text,
            bold: opts.bold || false,
            color: opts.color || TEXT_DARK,
            size: opts.size || 20,
            font: "Calibri",
          }),
        ],
      }),
    ],
  });

const TitleBlock = () =>
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 100 },
    children: [
      new TextRun({ text: "GLOW UPI", bold: true, color: PRIMARY, size: 56, font: "Calibri" }),
    ],
  });

const Subtitle = (text) =>
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 240 },
    children: [
      new TextRun({ text, italics: true, color: ACCENT, size: 28, font: "Calibri" }),
    ],
  });

const Divider = () =>
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 200 },
    children: [new TextRun({ text: "✦ ✦ ✦", color: ACCENT, size: 24, font: "Calibri" })],
  });

const webinarTable = () => {
  const rows = [
    ["Bloco", "Tempo", "Objetivo"],
    ["Hook + Promessa", "5 min", "\"Você vai sair daqui sabendo X. Fica até o final que tem brinde.\""],
    ["Sua história", "10 min", "Conexão emocional. Por que você criou o Glow Upi."],
    ["Ensino do conceito", "25-30 min", "Os 3 segredos do salão lucrativo. (Aqui você QUEBRA crenças, não ensina táticas)"],
    ["Transição soft", "3 min", "\"E se eu te mostrasse uma forma de fazer isso sem esforço?\""],
    ["Demo do Glow Upi", "10 min", "Só os recursos que provam os 3 segredos"],
    ["Stack da oferta", "10 min", "Anual + bônus + bônus + bônus = R$X. Seu preço: R$979."],
    ["Q&A + urgência", "10 min", "\"Vagas limitadas, oferta válida por 24h\""],
  ];
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map((r, i) =>
      new TableRow({
        children: r.map((c, j) =>
          Cell(c, {
            bold: i === 0,
            color: i === 0 ? "FFFFFF" : TEXT_DARK,
            fill: i === 0 ? PRIMARY : (i % 2 === 0 ? "FBF4EF" : "FFFFFF"),
            width: j === 0 ? 28 : j === 1 ? 14 : 58,
          })
        ),
      })
    ),
  });
};

const kpiTable = () => {
  const rows = [
    ["Métrica", "Meta saudável"],
    ["CPL (custo por lead na captação)", "R$ 5 - R$ 12"],
    ["Taxa de show-up no webinário", "30% - 40%"],
    ["Taxa de conversão no webinário (anual)", "5% - 15%"],
    ["Taxa de ativação do trial passivo", "25% - 40%"],
    ["Conversão trial → pago", "12% - 25%"],
    ["LTV médio", "> 3x CAC"],
  ];
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map((r, i) =>
      new TableRow({
        children: r.map((c, j) =>
          Cell(c, {
            bold: i === 0 || j === 1,
            color: i === 0 ? "FFFFFF" : (j === 1 ? PRIMARY : TEXT_DARK),
            fill: i === 0 ? PRIMARY : (i % 2 === 0 ? "FBF4EF" : "FFFFFF"),
            width: j === 0 ? 65 : 35,
          })
        ),
      })
    ),
  });
};

const stackTable = () => {
  const rows = [
    ["Item", "Valor"],
    ["✓ Glow Upi Pro Anual", "R$ 1.764"],
    ["✓ Onboarding 1:1 com nossa equipe", "R$ 497"],
    ["✓ Pack de 100 templates de Stories", "R$ 197"],
    ["✓ Curso \"Lotando a Agenda em 30 dias\"", "R$ 497"],
    ["✓ Comunidade VIP no WhatsApp", "R$ 297"],
    ["✓ Garantia de 30 dias dinheiro de volta", "—"],
    ["VALOR TOTAL", "R$ 3.252"],
    ["HOJE POR APENAS", "R$ 979 (ou 12x R$ 97,90)"],
  ];
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map((r, i) => {
      const isHeader = i === 0;
      const isTotal = i === rows.length - 2;
      const isPrice = i === rows.length - 1;
      return new TableRow({
        children: r.map((c, j) =>
          Cell(c, {
            bold: isHeader || isTotal || isPrice,
            color: isHeader ? "FFFFFF" : (isPrice ? PRIMARY : (isTotal ? DARK : TEXT_DARK)),
            fill: isHeader ? PRIMARY : (isPrice ? "FFF3D6" : (isTotal ? "FBF4EF" : (i % 2 === 0 ? "FBF4EF" : "FFFFFF"))),
            width: j === 0 ? 70 : 30,
            size: isPrice ? 24 : 22,
          })
        ),
      });
    }),
  });
};

const children = [
  TitleBlock(),
  Subtitle("PGMIT v2 — Refinamento Estratégico da Campanha"),
  P("Sete pontos críticos para transformar a primeira versão do PGMIT em uma campanha com performance real, baseada na metodologia Russell Brunson aplicada ao mercado brasileiro de beleza.", { align: AlignmentType.CENTER, italic: true, color: TEXT_GRAY }),
  Divider(),

  P("A primeira versão é um esqueleto sólido, mas para uma campanha real ter performance de verdade, precisamos refinar 7 pontos críticos. Vou direto ao que importa."),

  H("1. Definir o \"Big Domino\" (a quebra de crença central)"),
  P("Esse é o conceito mais importante do Russell que ficou de fora. Toda campanha que vende milhões tem UMA crença que precisa ser quebrada. Sem isso, você só está mostrando recursos."),
  P("Para o Glow Upi, o Big Domino seria algo como:"),
  Quote("Você não precisa contratar mais gente, baixar preço, nem trabalhar mais horas para faturar 2x. O que separa um salão que fatura R$10k de um que fatura R$30k não é talento — é gestão. E gestão de verdade leva 15 minutos por dia, não 8 horas."),
  P("Quando a profissional acredita NISSO, todo o resto (o webinário, a oferta, o software) faz sentido. Sem isso, é só mais um software."),

  H("2. Refinar o Avatar (não é \"profissional de beleza\")"),
  P("\"Profissional de beleza\" é amplo demais. Para a campanha, precisamos de UMA pessoa específica. Eu sugiro começar por:"),
  H("Avatar Primário — \"Carla, a Solo que Cresceu Demais\"", HeadingLevel.HEADING_2, DARK),
  Bullet("28-40 anos, tem 2-5 anos de profissão"),
  Bullet("Já saiu do salão dos outros, atende sozinha ou tem 1-2 funcionárias"),
  Bullet("Fatura entre R$8k-R$25k/mês"),
  Bullet("Anota agendamento no caderninho ou WhatsApp"),
  Bullet("Está perdendo cliente por falta de organização"),
  Bullet("Sente culpa por não conseguir crescer mais"),
  Bullet("Tem medo de \"virar empresária\" e perder o lado artista"),
  P("Por que esse avatar? Tem dor real, tem dinheiro pra pagar, é a maioria do mercado, e a transformação é dramática (de caderninho pra sistema profissional)."),
  P("Depois você cria avatares secundários (clínica, dona de salão grande, esmalteria) cada um com sua própria campanha."),

  H("3. Estruturar o Webinário no formato \"Perfect Webinar\""),
  P("O Russell tem um roteiro testado pra venda de SaaS. Não é \"dar aula bonitinha\" — é um roteiro psicológico de 60-75 minutos:"),
  Spacer(),
  webinarTable(),
  Spacer(),
  P("Os \"3 Segredos\" são o coração. Cada um tem que quebrar uma crença errada e instalar a certa. Exemplos:"),
  KeyValueBullet("Segredo 1", "Por que descontar não é a solução (e o que fazer no lugar)"),
  KeyValueBullet("Segredo 2", "Como cobrar mais SEM perder cliente"),
  KeyValueBullet("Segredo 3", "O sistema dos salões que dobram em 90 dias"),

  H("4. O \"Stack\" da Oferta (a parte que mais converte)"),
  P("Essa é a hora de \"empilhar valor\". Em vez de dizer \"Plano Anual R$979\", você apresenta assim:"),
  Spacer(),
  stackTable(),
  Spacer(),
  P("A pessoa não compra um SaaS — compra um pacote de transformação onde o SaaS é só o motor."),

  H("5. Sequência de Email (aqui a maioria erra)"),
  P("Não basta ter a página, precisa nutrir antes e depois:"),

  H("Pré-webinário (5 emails)", HeadingLevel.HEADING_2, DARK),
  KeyValueBullet("Dia 0", "Sua vaga está confirmada + entrega do PGMIT"),
  KeyValueBullet("Dia 1", "O erro #1 que faz 80% dos salões estagnarem"),
  KeyValueBullet("Dia 2", "Caso real: Como Juliana saiu de R$8k pra R$22k em 4 meses"),
  KeyValueBullet("Dia 3", "AMANHÃ — bloqueia 1h na sua agenda"),
  KeyValueBullet("Dia 4 (manhã)", "Em 6h começa. Link aqui."),

  H("Pós-webinário (carrinho aberto, 4 dias)", HeadingLevel.HEADING_2, DARK),
  KeyValueBullet("Dia 0 (após webinário)", "Replay + oferta válida por 24h"),
  KeyValueBullet("Dia 1", "Dúvidas? Veja as 5 perguntas mais feitas"),
  KeyValueBullet("Dia 2", "Última chamada — depoimento + CTA"),
  KeyValueBullet("Dia 3 (manhã)", "Encerramos hoje às 23h59"),

  H("Quem não comprou (vai pro trial passivo)", HeadingLevel.HEADING_2, DARK),
  Bullet("Sequência de 14 emails educacionais durante o trial"),

  H("6. Tráfego: Comece Pequeno e Validado"),
  P("Erro comum: gastar R$10k em ads sem validar. Faz assim:"),

  H("Fase 1 — Validação (R$30-50/dia, 7 dias)", HeadingLevel.HEADING_2, DARK),
  Bullet("3 criativos diferentes no Meta Ads"),
  Bullet("Públicos quentes primeiro (lookalike de quem já é cliente seu)"),
  Bullet("Métrica-alvo: custo por lead < R$8"),

  H("Fase 2 — Otimização (R$100-200/dia, 14 dias)", HeadingLevel.HEADING_2, DARK),
  Bullet("Pega o criativo vencedor"),
  Bullet("Testa títulos da landing"),
  Bullet("Métrica-alvo: trial ativado < R$40, venda anual < R$300"),

  H("Fase 3 — Escala (R$500+/dia)", HeadingLevel.HEADING_2, DARK),
  Bullet("Só depois que o ROAS estiver previsível"),

  H("7. KPIs que Você PRECISA Medir"),
  Spacer(),
  kpiTable(),
  Spacer(),
  P("Sem medir isso, você está cego. O Glow Upi precisa ter um painel admin pra acompanhar essas métricas."),

  Divider(),

  H("Próximos Passos Recomendados"),
  P("Tem 3 caminhos que podemos seguir agora — me diz qual faz mais sentido pra você:"),

  H("A) Documento Word v2 expandido", HeadingLevel.HEADING_2, DARK),
  P("Eu gero um documento com TODOS esses pontos detalhados (incluindo o roteiro completo do webinário palavra por palavra, os emails escritos, o avatar refinado)."),

  H("B) Construir a landing page do PGMIT no sistema", HeadingLevel.HEADING_2, DARK),
  P("Página de captação + entrega do pacote + integração com Brevo pra capturar contatos."),

  H("C) Pesquisa profunda do avatar e Big Domino", HeadingLevel.HEADING_2, DARK),
  P("Faço primeiro a definição do avatar e o Big Domino numa sessão de pesquisa profunda, com pesquisa de mercado real do nicho de beleza brasileiro, antes de partir pra execução."),

  Divider(),
  P("Glow Upi — PGMIT v2 — Documento Estratégico Interno", { align: AlignmentType.CENTER, italic: true, color: TEXT_GRAY, size: 18 }),
];

const doc = new Document({
  creator: "Glow Upi",
  title: "PGMIT v2 — Refinamento Estratégico",
  styles: {
    default: {
      heading1: { run: { size: 32, bold: true, color: PRIMARY, font: "Calibri" } },
      heading2: { run: { size: 26, bold: true, color: DARK, font: "Calibri" } },
    },
  },
  sections: [
    {
      properties: { page: { margin: { top: 1000, right: 1100, bottom: 1000, left: 1100 } } },
      children,
    },
  ],
});

const buf = await Packer.toBuffer(doc);
fs.writeFileSync("generated_docs/PGMIT_v2_Refinamento_Estrategico.docx", buf);
console.log("OK", buf.length, "bytes");
