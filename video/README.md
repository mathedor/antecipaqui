# Antecipaqui · vídeo de apresentação

Projeto **Remotion** standalone para gerar o reel de 35 segundos da Antecipaqui
voltado a imobiliárias e corretores.

- Resolução: **1080×1920** (vertical · Instagram/TikTok/Reels/Shorts)
- Duração: **35s** a 30fps (= 1050 frames)
- Narração: **ElevenLabs** (voz IA em PT-BR)
- 7 cenas: Hero → Problema → Solução → Mobile → Calculadora → Desktop → CTA

## Como rodar (uma vez)

```bash
cd video
npm install        # instala Remotion + tsx (não afeta o app principal)
```

## Como gerar o vídeo final

```bash
# 1. Exporte sua key do ElevenLabs (pega em https://elevenlabs.io)
export ELEVENLABS_API_KEY="sk_..."

# Opcional: escolher voz (default = Bella multilingual)
export ELEVENLABS_VOICE_ID="EXAVITQu4vr4xnSDxMaL"

# 2. Gera narração + renderiza MP4 (gravando em ./out/)
npm run build
```

Saída: `out/apresentacao-imobiliaria.mp4`

## Comandos úteis

| Comando             | O que faz                                                    |
| ------------------- | ------------------------------------------------------------ |
| `npm run studio`    | Abre o studio interativo (preview com timeline)              |
| `npm run narration` | Gera só o `public/narration.mp3` via ElevenLabs              |
| `npm run render`    | Renderiza só o MP4 (usa narration.mp3 se existir)            |
| `npm run build`     | Narração + render num passo só                               |

## Editar o roteiro

[`scripts/gen-narration.ts`](scripts/gen-narration.ts) — array `ROTEIRO`, 1 string por cena.
Cada bloco corresponde a uma cena do Remotion. Mude o texto, rode `npm run narration` de novo.

## Editar cenas / mockups

- Tempo de cada cena: [`src/constants.ts`](src/constants.ts) → `SCENES`
- Componentes de cena: [`src/scenes/`](src/scenes/)
- Mockups de tela (mobile/desktop): [`src/components/`](src/components/)
- Animações helpers: [`src/anim.ts`](src/anim.ts)

## Voz alternativa (ElevenLabs)

Algumas voice_ids populares em PT-BR / multilingual:

| Nome    | voice_id                  | Característica          |
| ------- | ------------------------- | ----------------------- |
| Bella   | `EXAVITQu4vr4xnSDxMaL`    | Feminina, calorosa      |
| Adam    | `pNInz6obpgDQGcFmaJgB`    | Masculina, séria        |
| Antoni  | `ErXwobaYiN019PkySvjV`    | Masculina, jovem        |
| Domi    | `AZnzlk1XvdvUeBnXmlld`    | Feminina, neutra        |

## Sem ElevenLabs?

O vídeo renderiza sem áudio caso `public/narration.mp3` não exista — Remotion
gera o MP4 só com motion graphics. Adicione narração depois externamente, ou
troque o componente `<NarrationTrack/>` em `compositions/ApresentacaoImobiliaria.tsx`
por outra fonte de áudio.

## Como compartilhar

Saída fica em `out/apresentacao-imobiliaria.mp4` (~5-10MB). Pronto pra subir em:

- Instagram Reels (1080×1920 ✓)
- TikTok (1080×1920 ✓)
- WhatsApp (cabe em mídia direta)
- LinkedIn (em vídeo nativo)
- YouTube Shorts (vertical ✓)
