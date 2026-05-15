#!/usr/bin/env bash
# Render do vídeo. Aceita arg da composition (default: imobiliaria).
# Detecta automaticamente se public/music.mp3 existe e passa withMusic=true.
#
# Uso:
#   npm run render                 # apresentacao-imobiliaria
#   npm run render -- fundo        # apresentacao-fundo
#   bash scripts/render.sh fundo out/custom.mp4

set -euo pipefail

cd "$(dirname "$0")/.."

KIND="${1:-imobiliaria}"
case "$KIND" in
  imobiliaria|imob) COMPOSITION="apresentacao-imobiliaria" ;;
  fundo|fundos)     COMPOSITION="apresentacao-fundo" ;;
  *)                COMPOSITION="$KIND" ;;
esac

OUTPUT="${2:-out/$COMPOSITION.mp4}"
mkdir -p "$(dirname "$OUTPUT")"

if [ -f "public/music.mp3" ]; then
  echo "✓ music.mp3 detectado — renderizando com trilha"
  PROPS='{"withMusic":true}'
else
  echo "⚠ public/music.mp3 ausente — vídeo sai sem trilha"
  PROPS='{"withMusic":false}'
fi

echo "→ Composition: $COMPOSITION"
echo "→ Output: $OUTPUT"

exec npx remotion render src/index.ts "$COMPOSITION" "$OUTPUT" \
  --concurrency=2 \
  --props="$PROPS"
