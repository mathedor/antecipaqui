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
 * Roteiro narrado — 35 segundos a ~155 palavras/minuto = ~90 palavras total.
 * Tom: direto, sem enrolação, hook forte no início, CTA fechado.
 *
 * Cada bloco corresponde a uma cena do Remotion. Pausas naturais por
 * pontuação (ponto final = pausa maior, vírgula = pausa pequena).
 */
const ROTEIRO = [
  // 0-4s · Hero — hook agressivo
  "Vendeu? A comissão é sua. Mas o dinheiro... demora.",
  // 4-9s · Problema
  "Cento e vinte dias esperando. Banco recusando. Avalista que ninguém quer dar.",
  // 9-14s · Solução
  "Chega. Na Antecipaqui, você recebe hoje. Em três passos, sem garantia, sem burocracia.",
  // 14-20s · Mobile
  "Cadastra pelo celular em cinco minutos. Foto do contrato e a inteligência artificial preenche pra você.",
  // 20-25s · Calculadora
  "Veja agora quanto entra na sua conta. Cálculo em tempo real. Sem letra miúda.",
  // 25-30s · Desktop
  "Painel completo no computador. Operações, recebimentos, sua comissão antecipada.",
  // 30-35s · CTA
  "Antecipaqui ponto digital. Cadastre-se grátis e receba sua próxima venda hoje.",
].join(" ");

// Default agora: Sarah multilingual (feminina, próxima, soa bem em PT-BR).
// User troca via: export ELEVENLABS_VOICE_ID=xxx (rode `npm run voices` pra listar)
const VOICE_ID =
  process.env.ELEVENLABS_VOICE_ID ?? "EXAVITQu4vr4xnSDxMaL";
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
        // Settings calibrados pra som natural em PT-BR (não robotizado):
        //  stability ~0.4 → varia mais, soa mais humano
        //  similarity_boost ~0.85 → mantém característica da voz original
        //  style ~0.2 → pouco exagero dramático
        //  speed 0.95 → levemente mais devagar pra dicção clara
        voice_settings: {
          stability: 0.4,
          similarity_boost: 0.85,
          style: 0.2,
          use_speaker_boost: true,
          speed: 0.95,
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
