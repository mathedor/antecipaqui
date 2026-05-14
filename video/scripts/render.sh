#!/usr/bin/env bash
# Render do vídeo. Detecta automaticamente se public/music.mp3 existe e
# passa withMusic=true pra incluir trilha de fundo no MP4 final.

set -euo pipefail

cd "$(dirname "$0")/.."

OUTPUT="${1:-out/apresentacao-imobiliaria.mp4}"
mkdir -p "$(dirname "$OUTPUT")"

if [ -f "public/music.mp3" ]; then
  echo "✓ music.mp3 detectado — renderizando com trilha de fundo"
  PROPS='{"withMusic":true}'
else
  echo "⚠ public/music.mp3 ausente — vídeo sai sem trilha"
  echo "  Baixe uma música royalty-free e salve como video/public/music.mp3"
  echo "  Sugestões: https://mixkit.co/free-stock-music ou https://pixabay.com/music"
  PROPS='{"withMusic":false}'
fi

exec npx remotion render src/index.ts apresentacao-imobiliaria "$OUTPUT" \
  --concurrency=2 \
  --props="$PROPS"
