#!/usr/bin/env bash
# Render do vídeo. Detecta automaticamente se public/narration.mp3 existe
# e passa withAudio=true pra incluir áudio no MP4 final.

set -euo pipefail

cd "$(dirname "$0")/.."

OUTPUT="${1:-out/apresentacao-imobiliaria.mp4}"
mkdir -p "$(dirname "$OUTPUT")"

if [ -f "public/narration.mp3" ]; then
  echo "✓ narration.mp3 detectado — renderizando com áudio"
  PROPS='{"withAudio":true}'
else
  echo "⚠ public/narration.mp3 ausente — vídeo sai sem narração"
  echo "  rode 'npm run narration' antes pra incluir voz"
  PROPS='{"withAudio":false}'
fi

exec npx remotion render src/index.ts apresentacao-imobiliaria "$OUTPUT" \
  --concurrency=2 \
  --props="$PROPS"
