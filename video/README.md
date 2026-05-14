# Antecipaqui · vídeo de apresentação

Projeto **Remotion** standalone para gerar um reel de 35 segundos da
Antecipaqui voltado a imobiliárias e corretores.

- Resolução: **1080×1920** (vertical · Instagram/TikTok/Reels/Shorts)
- Duração: **35s** a 30fps (= 1050 frames)
- Sem narração — texto na tela + **stickers** chamativos por cena
- Música ambiente (royalty-free, você escolhe e adiciona)
- 7 cenas: Hero → Problema → Solução → Mobile → Calculadora → Desktop → CTA
- Paleta da marca: **branco, preto e azul Antecipaqui** (sem carnaval)

## Setup (uma vez)

```bash
cd video
npm install
```

## Como gerar o vídeo final

### 1. Baixe uma música royalty-free e salve como `public/music.mp3`

Sugestões (todas grátis, sem créditos obrigatórios):

- **[Mixkit Free Stock Music](https://mixkit.co/free-stock-music)** — busque "corporate", "uplifting" ou "motivational"
- **[Pixabay Music](https://pixabay.com/music)** — filtre por "upbeat" ou "background"
- **[YouTube Audio Library](https://studio.youtube.com/channel/UC/music)** — biblioteca oficial

Recomendo algo tipo **"corporate uplifting"** — clima de elevador animado,
sem letra, BPM moderado. Salve o arquivo como `video/public/music.mp3`.

### 2. Renderize

```bash
npm run render
```

Saída: `out/apresentacao-imobiliaria.mp4` (~5-6 MB)

O script `render.sh` detecta automaticamente o `music.mp3` e injeta a
trilha de fundo no MP4 final (volume 35%, loop). Sem o arquivo, o vídeo
sai sem áudio.

## Comandos

| Comando             | O que faz                                                      |
| ------------------- | -------------------------------------------------------------- |
| `npm run studio`    | Abre o studio interativo (preview com timeline + scrubbing)    |
| `npm run render`    | Gera o MP4 final (detecta `music.mp3` automaticamente)         |
| `npm run build`     | Alias pra `render`                                             |

### Comandos opcionais (não usados nesse fluxo)

| Comando             | O que faz                                                      |
| ------------------- | -------------------------------------------------------------- |
| `npm run narration` | Gera narração TTS via ElevenLabs (descontinuado nesse projeto) |
| `npm run voices`    | Lista vozes ElevenLabs da sua conta (descontinuado)            |

## Editar conteúdo

- **Tempo de cada cena**: [`src/constants.ts`](src/constants.ts) → `SCENES`
- **Cores da marca**: [`src/constants.ts`](src/constants.ts) → `COLORS`
- **Cenas individuais**: [`src/scenes/`](src/scenes/)
- **Stickers (chamadas de texto)**: cada cena tem `<Sticker text="..." />`
  no final — edite texto, emoji, posição e variante (`yellow`, `white`,
  `accent`, `dark`, `success`)
- **Mockups das telas**: [`src/components/PhoneScreen*.tsx`](src/components/)

## Pasta de saída

`out/` (gitignored) — contém o MP4 renderizado. Pronto pra:

- Instagram Reels (1080×1920 ✓)
- TikTok / YouTube Shorts (1080×1920 ✓)
- WhatsApp (cabe em mídia direta)
- LinkedIn vídeo nativo
