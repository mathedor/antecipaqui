#!/usr/bin/env python3
"""
Gera todos os ícones do app (favicon, PWA, Apple touch) a partir do
logotipo oficial em `public/brand/logo.png`.

O símbolo oficial (telhado + prédios) é recortado do lockup e centralizado
num tile branco. Antes disso, os ícones usavam um desenho aproximado —
um chevron branco genérico — que não era a marca e ficava ruim no PWA
de desktop.

Escalas por destino:
  - ícones "any" (favicon/PWA/Apple): símbolo em ~72% do canvas
  - ícone maskable: ~56%, respeitando a safe zone circular exigida
    pelo Android (o launcher recorta as bordas)

Pra rodar:
    python3 scripts/gerar-icones.py
"""

import pathlib
from PIL import Image, ImageDraw

RAIZ = pathlib.Path(__file__).resolve().parent.parent
LOGO = RAIZ / "public" / "brand" / "logo.png"
FUNDO = (255, 255, 255, 255)

# Faixa vertical do símbolo dentro do lockup (acima da tipografia).
FAIXA_SIMBOLO = (95, 488)


def carregar_simbolo() -> Image.Image:
    """Recorta o símbolo do logotipo, sem margens transparentes."""
    lockup = Image.open(LOGO).convert("RGBA")
    faixa = lockup.crop((0, FAIXA_SIMBOLO[0], lockup.width, FAIXA_SIMBOLO[1]))
    mascara = faixa.getchannel("A").point(lambda v: 255 if v > 12 else 0)
    caixa = mascara.getbbox()
    if caixa is None:
        raise SystemExit("Não encontrei o símbolo no logotipo.")
    return faixa.crop(caixa)


def compor(simbolo: Image.Image, lado: int, escala: float, raio_pct: float) -> Image.Image:
    """Monta o tile: fundo branco (arredondado ou não) + símbolo centralizado."""
    tile = Image.new("RGBA", (lado, lado), (0, 0, 0, 0))

    if raio_pct > 0:
        # Desenha em 4x e reduz — antialias das bordas arredondadas.
        ss = 4
        forma = Image.new("L", (lado * ss, lado * ss), 0)
        ImageDraw.Draw(forma).rounded_rectangle(
            (0, 0, lado * ss - 1, lado * ss - 1),
            radius=int(lado * ss * raio_pct),
            fill=255,
        )
        forma = forma.resize((lado, lado), Image.LANCZOS)
    else:
        forma = Image.new("L", (lado, lado), 255)

    fundo = Image.new("RGBA", (lado, lado), FUNDO)
    tile.paste(fundo, (0, 0), forma)

    # Fio de contorno: sem ele o tile branco some em dock/aba de fundo claro.
    if raio_pct > 0 and lado >= 32:
        contorno = Image.new("RGBA", (lado, lado), (0, 0, 0, 0))
        ImageDraw.Draw(contorno).rounded_rectangle(
            (0, 0, lado - 1, lado - 1),
            radius=int(lado * raio_pct),
            outline=(214, 219, 226, 255),
            width=max(1, lado // 128),
        )
        tile.alpha_composite(contorno)

    largura = int(lado * escala)
    altura = max(1, round(largura * simbolo.height / simbolo.width))
    arte = simbolo.resize((largura, altura), Image.LANCZOS)
    tile.alpha_composite(arte, ((lado - largura) // 2, (lado - altura) // 2))
    return tile


def main() -> None:
    simbolo = carregar_simbolo()
    print(f"símbolo recortado: {simbolo.width}x{simbolo.height}")

    saidas = [
        # (caminho, lado, escala do símbolo, raio do canto em % do lado)
        ("public/icon-192.png", 192, 0.72, 0.22),
        ("public/icon-512.png", 512, 0.72, 0.22),
        ("public/icon-maskable.png", 512, 0.56, 0.0),
        ("src/app/icon.png", 512, 0.72, 0.22),
        ("src/app/apple-icon.png", 180, 0.76, 0.0),
    ]
    for rel, lado, escala, raio in saidas:
        destino = RAIZ / rel
        compor(simbolo, lado, escala, raio).save(destino)
        print(f"  ✓ {rel} ({lado}px)")

    # favicon.ico multi-resolução — canto arredondado só a partir de 32px,
    # abaixo disso o arredondamento vira ruído.
    ico = RAIZ / "src" / "app" / "favicon.ico"
    quadros = [
        compor(simbolo, n, 0.86, 0.20 if n >= 32 else 0.0).convert("RGBA")
        for n in (16, 32, 48, 64)
    ]
    quadros[-1].save(ico, format="ICO", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
    print("  ✓ src/app/favicon.ico (16/32/48/64)")

    print("✅ ícones gerados a partir do logotipo oficial.")


if __name__ == "__main__":
    main()
