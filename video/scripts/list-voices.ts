/** Lista vozes PT-BR disponíveis na conta ElevenLabs (chamada pública /v1/voices).
 *  Filtra por idioma português brasileiro e ordena por melhor match.
 *
 *  Uso:
 *    cd video && ELEVENLABS_API_KEY=sk_xxx npm run voices
 *    cd video && ELEVENLABS_API_KEY=sk_xxx npm run voices -- feminina
 */

type Voice = {
  voice_id: string;
  name: string;
  category?: string;
  labels?: Record<string, string>;
  description?: string;
  preview_url?: string;
  fine_tuning?: {
    language?: string;
    is_allowed_to_fine_tune?: boolean;
  };
  verified_languages?: Array<{ language: string; accent?: string }>;
};

async function main() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    console.error("✕ ELEVENLABS_API_KEY ausente. Use: export ELEVENLABS_API_KEY=sk_xxx");
    process.exit(1);
  }

  const filtroGenero = process.argv[2]?.toLowerCase() ?? "";

  // Voice library pública (shared voices) + minhas vozes
  const res = await fetch("https://api.elevenlabs.io/v1/voices", {
    headers: { "xi-api-key": apiKey },
  });

  if (!res.ok) {
    console.error(`✕ ${res.status}: ${await res.text()}`);
    process.exit(1);
  }

  const data = (await res.json()) as { voices: Voice[] };

  // Filtra por PT-BR
  const ptbr = data.voices.filter((v) => {
    const lang = (v.fine_tuning?.language ?? "").toLowerCase();
    const langs = (v.verified_languages ?? []).map((l) =>
      l.language.toLowerCase(),
    );
    const inLabels = Object.values(v.labels ?? {})
      .join(" ")
      .toLowerCase();
    return (
      lang === "pt" ||
      lang === "pt-br" ||
      lang === "portuguese" ||
      langs.includes("pt") ||
      langs.includes("portuguese") ||
      inLabels.includes("portuguese") ||
      inLabels.includes("brazil") ||
      // multilingual (servem pra PT-BR)
      (v.labels?.use_case ?? "").toLowerCase().includes("multilingual")
    );
  });

  if (ptbr.length === 0) {
    console.log("\nNenhuma voz PT-BR específica na sua conta.");
    console.log(
      "→ Vá em https://elevenlabs.io/app/voice-library, busque 'Portuguese' e clique 'Add to Voices'.",
    );
    console.log("\nVozes multilingual (servem pra PT, qualidade média):");
    data.voices
      .filter((v) =>
        Object.values(v.labels ?? {})
          .join(" ")
          .toLowerCase()
          .includes("multilingual"),
      )
      .slice(0, 10)
      .forEach((v) => {
        console.log(`  ${v.name.padEnd(20)}  ${v.voice_id}`);
      });
    return;
  }

  console.log(`\n✓ ${ptbr.length} voz(es) PT-BR disponíveis:\n`);

  // Filtra por gênero se solicitado
  const filtered = filtroGenero
    ? ptbr.filter((v) => {
        const gender = (v.labels?.gender ?? "").toLowerCase();
        if (filtroGenero.startsWith("f") || filtroGenero.startsWith("muj"))
          return gender === "female";
        if (filtroGenero.startsWith("m") || filtroGenero.startsWith("hom"))
          return gender === "male";
        return true;
      })
    : ptbr;

  filtered.forEach((v) => {
    const gender = v.labels?.gender ?? "?";
    const age = v.labels?.age ?? "?";
    const desc = v.labels?.description ?? "";
    const useCase = v.labels?.use_case ?? "";
    console.log(`  ${v.name}`);
    console.log(`    voice_id: ${v.voice_id}`);
    console.log(`    ${gender} · ${age} · ${desc || useCase}`);
    if (v.preview_url) console.log(`    preview: ${v.preview_url}`);
    console.log();
  });

  console.log(
    "Pra usar uma dessas, exporte antes do build:\n  export ELEVENLABS_VOICE_ID=xxxx\n  npm run build\n",
  );
}

main().catch((e) => {
  console.error("✕", e);
  process.exit(1);
});
