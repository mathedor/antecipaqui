/**
 * Gera o Memorial Descritivo da Antecipaqui em PDF (sem screenshots).
 *
 * Uso:
 *   npx tsx scripts/gerar-memorial.ts
 */
import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { MemorialPdf, type Shots } from "../src/lib/memorial-pdf";

async function main() {
  console.log("📄 Gerando memorial descritivo...");

  const logoPath = join(__dirname, "..", "public", "brand", "logo.png");
  let logoBase64 = "";
  try {
    const buf = readFileSync(logoPath);
    logoBase64 = `data:image/png;base64,${buf.toString("base64")}`;
    console.log("✓ Logo carregada");
  } catch (e) {
    console.warn("⚠ Logo não encontrada:", (e as Error).message);
  }

  const shots: Shots = {};

  console.log("\n🖼  Renderizando PDF...");
  const buffer = await renderToBuffer(
    createElement(MemorialPdf, { logoBase64, shots }),
  );
  console.log(`✓ PDF gerado (${(buffer.length / 1024).toFixed(0)} KB)`);

  const outPath = join(homedir(), "Desktop", "antecipaqui-memorial.pdf");
  writeFileSync(outPath, buffer);
  console.log(`\n✅ Salvo em: ${outPath}`);
}

main().catch((e) => {
  console.error("❌ Erro:", e);
  process.exit(1);
});
