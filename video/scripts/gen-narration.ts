/** Gera narration.mp3 via ElevenLabs API e salva em video/public/.
 *
 *  Requer:
 *   - ELEVENLABS_API_KEY no env
 *   - (opcional) ELEVENLABS_VOICE_ID — voz em PT-BR. Sem isso, usa um default.
 *
 *  Uso:
 *    cd video && ELEVENLABS_API_KEY=xxx npm run narration
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Roteiro narrado — 35 segundos a ~145 palavras/minuto = ~85 palavras
 * total. Cada bloco corresponde a uma cena.
 *
 * O ElevenLabs concatena em um único MP3 sincronizado pelas cenas do
 * Remotion (sem timestamps explícitos — só ritmo natural de leitura).
 */
const ROTEIRO = [
  // 0-4s · Hero
  "Vendeu um imóvel? A comissão pode cair na sua conta hoje.",
  // 4-9s · Problema
  "Esperar 120 dias. Banco que recusa. Avalista que ninguém quer dar.",
  // 9-14s · Solução
  "A Antecipaqui resolve isso. Em 3 passos: cadastra, aprovamos em 24 horas, e o PIX cai em 1 dia útil.",
  // 14-20s · Mobile
  "Tudo pelo celular. Fotografa o contrato — a inteligência artificial preenche os dados pra você.",
  // 20-25s · Calculadora
  "Veja em tempo real quanto vai receber. Sem letra miúda, sem surpresa.",
  // 25-30s · Desktop
  "No computador, painel completo. Operações, recebimentos, ranking de construtoras.",
  // 30-35s · CTA
  "Sua próxima venda pode virar dinheiro hoje. Acesse antecipaqui.digital e cadastre-se grátis.",
].join(" "); // junta com 1 espaço — pausa natural

const VOICE_ID =
  process.env.ELEVENLABS_VOICE_ID ?? "EXAVITQu4vr4xnSDxMaL"; // Bella (multilingual)
const MODEL = "eleven_multilingual_v2";

async function main() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    console.error("✕ ELEVENLABS_API_KEY ausente no env.");
    console.error("  Defina em .env.local ou export ELEVENLABS_API_KEY=xxx");
    process.exit(1);
  }

  console.log("→ Gerando narração com voice_id:", VOICE_ID);
  console.log("→ Modelo:", MODEL);
  console.log("→ Roteiro:", ROTEIRO.length, "chars\n");

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "content-type": "application/json",
        accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: ROTEIRO,
        model_id: MODEL,
        voice_settings: {
          stability: 0.55,
          similarity_boost: 0.75,
          style: 0.45,
          use_speaker_boost: true,
        },
      }),
    },
  );

  if (!res.ok) {
    const errBody = await res.text();
    console.error(`✕ ElevenLabs ${res.status}: ${errBody.slice(0, 300)}`);
    process.exit(1);
  }

  const buf = Buffer.from(await res.arrayBuffer());
  const outDir = join(__dirname, "..", "public");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "narration.mp3");
  writeFileSync(outPath, buf);
  console.log(`✓ Salvo: ${outPath} (${(buf.length / 1024).toFixed(0)}kb)`);
}

main().catch((e) => {
  console.error("✕", e);
  process.exit(1);
});
