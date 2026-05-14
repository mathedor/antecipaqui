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
 * Roteiro de venda — 35 segundos, tom conversacional brasileiro.
 * Estrutura AIDA: Atenção → Interesse (dor) → Desejo (solução) → Ação.
 *
 * NÃO é descrição de feature, é argumento de venda. Como um amigo experiente
 * conversando com o corretor.
 *
 * Cada bloco = uma cena do Remotion. Sinais de pausa:
 *  - reticências "..." → pausa maior (suspense)
 *  - vírgulas → pausa curta
 *  - ponto → pausa média
 *
 * IMPORTANTE: pra soar BR (e não PT-PT), exporte ELEVENLABS_VOICE_ID com
 * uma voz brasileira nativa. Rode `npm run voices` pra listar as
 * disponíveis na sua conta.
 */
const ROTEIRO = [
  // 0-4s · Hero — captura atenção
  "Você vende. Tá no flow. Mas o dinheiro?",
  // 4-9s · Problema — agita a dor
  "Parcelado em 4 vezes. 120 dias correndo atrás. Banco que recusa. Cansou?",
  // 9-14s · Solução — promessa clara
  "Tem um jeito melhor. A Antecipaqui paga sua comissão à vista. Hoje.",
  // 14-20s · Mobile — facilidade
  "Foto do contrato pelo celular. A inteligência artificial preenche. A gente aprova em 24 horas.",
  // 20-25s · Calculadora — transparência
  "Você vê quanto entra na conta antes de fechar. Sem letra miúda. Sem surpresa.",
  // 25-30s · Desktop — controle
  "Painel completo. Agenda, ranking, recebimentos. Tudo na palma da sua mão.",
  // 30-35s · CTA — chamada urgente
  "Próxima venda já vira PIX. Cadastra grátis. Antecipaqui ponto digital.",
].join(" ");

const VOICE_ID =
  process.env.ELEVENLABS_VOICE_ID ?? "EXAVITQu4vr4xnSDxMaL";
const MODEL = "eleven_multilingual_v2";

// Aviso se está usando voz default (multilingual genérica — soa portuguesa de PT)
if (!process.env.ELEVENLABS_VOICE_ID) {
  console.warn(
    "\n⚠ Usando voice_id default (Bella/Sarah multilingual).\n" +
      "  Isso soa como Português de Portugal, não Brasil.\n" +
      "  Rode 'npm run voices -- feminina' pra listar vozes PT-BR autênticas\n" +
      "  e exporte com 'export ELEVENLABS_VOICE_ID=xxx' antes do build.\n",
  );
}

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
        // Settings pra voz PT-BR autêntica soar humana e natural:
        //  stability 0.5 → equilíbrio entre consistência e variação humana
        //  similarity_boost 0.9 → mantém timbre original (fundamental pra voz BR não desviar pra PT)
        //  style 0.3 → leve expressividade (ênfase em pontos-chave)
        //  speed 1.0 → ritmo natural de conversa
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.9,
          style: 0.3,
          use_speaker_boost: true,
          speed: 1.0,
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
