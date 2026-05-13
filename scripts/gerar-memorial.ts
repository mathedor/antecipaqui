/**
 * Gera o Memorial Descritivo da Antecipaqui em PDF.
 *
 * - Comprime cada screenshot pra um JPG temporário
 * - Passa PATH absoluto pro @react-pdf/renderer (evita base64 em memória)
 *
 * Uso:
 *   NODE_OPTIONS="--max-old-space-size=4096" npx tsx scripts/gerar-memorial.ts
 */
import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import {
  writeFileSync,
  readFileSync,
  existsSync,
  readdirSync,
  mkdirSync,
} from "node:fs";
import { join } from "node:path";
import { homedir, tmpdir } from "node:os";
import sharp from "sharp";
import { MemorialPdf, type Shots } from "../src/lib/memorial-pdf";

const SHOT_DIR = join(__dirname, "screenshots");
const TMP_DIR = join(tmpdir(), "antecipaqui-memorial-shots");
const MAX_W = 720;
const JPG_Q = 55;
// Limita altura — alguns full-page têm 5000px de altura, infla muito
const MAX_H = 1400;

async function main() {
  console.log("📄 Gerando memorial descritivo v2 (com screenshots)...");

  const logoPath = join(__dirname, "..", "public", "brand", "logo.png");
  let logoBase64 = "";
  try {
    const buf = readFileSync(logoPath);
    logoBase64 = `data:image/png;base64,${buf.toString("base64")}`;
    console.log("✓ Logo carregada");
  } catch (e) {
    console.warn("⚠ Logo não encontrada:", (e as Error).message);
  }

  mkdirSync(TMP_DIR, { recursive: true });

  const shots: Shots = {};
  if (existsSync(SHOT_DIR)) {
    const files = readdirSync(SHOT_DIR).filter((f) => f.endsWith(".png"));
    console.log(`Processando ${files.length} screenshots...`);
    for (const f of files) {
      const nome = f.replace(/\.png$/, "");
      const raw = readFileSync(join(SHOT_DIR, f));
      try {
        const tmpPath = join(TMP_DIR, `${nome}.jpg`);
        // Resize + crop topo (parte mais informativa da página)
        const meta = await sharp(raw).metadata();
        const w = meta.width ?? MAX_W;
        const h = meta.height ?? MAX_H;
        const scaledH = Math.round((MAX_W / w) * h);
        const finalH = Math.min(scaledH, MAX_H);
        await sharp(raw)
          .resize({ width: MAX_W, withoutEnlargement: false })
          .extract({ left: 0, top: 0, width: MAX_W, height: finalH })
          .jpeg({ quality: JPG_Q, progressive: true })
          .toFile(tmpPath);
        // @react-pdf aceita path absoluto direto pra ler do disco
        shots[nome] = tmpPath;
        const compressed = readFileSync(tmpPath);
        const reduction = Math.round((1 - compressed.length / raw.length) * 100);
        console.log(
          `  ✓ ${nome} · ${(raw.length / 1024).toFixed(0)}KB → ${(compressed.length / 1024).toFixed(0)}KB (-${reduction}%)`,
        );
      } catch (e) {
        console.log(`  ✗ ${nome}: ${(e as Error).message.slice(0, 80)}`);
      }
    }
  } else {
    console.warn("⚠ scripts/screenshots/ não existe");
  }

  console.log("\n🖼  Renderizando PDF...");
  const buffer = await renderToBuffer(
    createElement(MemorialPdf, { logoBase64, shots }),
  );
  console.log(`✓ PDF gerado (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);

  const outPath = join(homedir(), "Desktop", "antecipaqui-memorial.pdf");
  writeFileSync(outPath, buffer);
  console.log(`\n✅ Salvo em: ${outPath}`);
  console.log(`Abra com: open "${outPath}"`);
}

main().catch((e) => {
  console.error("❌ Erro:", e);
  process.exit(1);
});
