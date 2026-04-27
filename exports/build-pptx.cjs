const PptxGenJS = require("pptxgenjs");
const path = require("path");
const fs = require("fs");

const pptx = new PptxGenJS();
pptx.layout = "LAYOUT_WIDE";
pptx.title = "Glow Upi — Pitch Investidor";
pptx.author = "Marcus Vinícius Lima Silva";
pptx.company = "Glow Upi";
pptx.subject = "Documento de Sociedade — 50% por R$ 19.700";

const slidesDir = path.join(__dirname, "pitch");
const files = fs
  .readdirSync(slidesDir)
  .filter((f) => /^slide-\d+\.jpg$/i.test(f))
  .sort();

for (const file of files) {
  const slide = pptx.addSlide();
  slide.background = { color: "F5F0E6" };
  slide.addImage({
    path: path.join(slidesDir, file),
    x: 0,
    y: 0,
    w: "100%",
    h: "100%",
    sizing: { type: "contain", w: 13.333, h: 7.5 },
  });
}

const outPath = path.join(__dirname, "GlowUpi-Pitch-Investidor.pptx");
pptx
  .writeFile({ fileName: outPath })
  .then((name) => console.log(`PPTX criado: ${name}`))
  .catch((err) => {
    console.error("Erro:", err);
    process.exit(1);
  });
