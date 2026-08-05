#!/usr/bin/env python3
"""
Gera todos os ícones do app (favicon, PWA, Apple touch) a partir do
logotipo oficial em `public/brand/logo.png`.

O símbolo oficial (telhado + prédios) é recortado do lockup e centralizado
num tile branco. Antes disso, os ícones usavam um desenho aproximado —
um chevron branco genérico — que não era a marca e ficava ruim no PWA
de desktop.

Escalas por destino:
  - ícones "any" (favicon/PWA/Apple): símbolo em 86% do canvas — só o
    símbolo, sem moldura nem respiro sobrando, igual ao favicon
  - ícone maskable: 68%, o máximo que cabe na safe zone circular do
    Android (o launcher recorta as bordas)

Pra rodar:
    python3 scripts/gerar-icones.py
"""

import pathlib
from PIL import Image, ImageDraw

RAIZ = pathlib.Path(__file__).resolve().parent.parent
LOGO = RAIZ / "public" / "brand" / "logo.png"
FUNDO = (255, 255, 255, 255)

# Os ícones do manifest são gravados com o número da versão no nome.
# Motivo: o Chrome decide se atualiza o ícone de um app já instalado
# comparando as URLs do manifest — trocar os bytes de /icon-192.png não
# adianta nada, ele mantém o bitmap antigo no atalho pra sempre. Trocar o
# nome muda a URL, o Chrome vê diferença e reemite o ícone.
# Ao mexer no desenho: sobe VERSAO_PWA aqui, no manifest.ts e no sw.js.
VERSAO_PWA = "v2"

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


    largura = int(lado * escala)
    altura = max(1, round(largura * simbolo.height / simbolo.width))
    arte = simbolo.resize((largura, altura), Image.LANCZOS)
    tile.alpha_composite(arte, ((lado - largura) // 2, (lado - altura) // 2))
    return tile


def main() -> None:
    simbolo = carregar_simbolo()
    print(f"símbolo recortado: {simbolo.width}x{simbolo.height}")

    v = VERSAO_PWA
    saidas = [
        # (caminho, lado, escala do símbolo, raio do canto em % do lado)
        (f"public/icon-192-{v}.png", 192, 0.86, 0.22),
        (f"public/icon-512-{v}.png", 512, 0.86, 0.22),
        # Maskable é recortado num círculo de 80% do diâmetro pelo launcher
        # Android. Medido: em 0,68 o ponto mais distante do símbolo fica a
        # 201px de um raio seguro de 205px — cabe, com margem pequena.
        # Não subir mais que isso sem medir de novo.
        (f"public/icon-maskable-{v}.png", 512, 0.68, 0.0),
        # Nomes sem versão: ninguém mais aponta pra eles no manifest, mas
        # instalações antigas ainda pedem — servir o desenho novo evita 404.
        ("public/icon-192.png", 192, 0.86, 0.22),
        ("public/icon-512.png", 512, 0.86, 0.22),
        ("public/icon-maskable.png", 512, 0.68, 0.0),
        # Esses o Next versiona sozinho por hash de conteúdo (?icon.<hash>).
        ("src/app/icon.png", 512, 0.86, 0.22),
        ("src/app/apple-icon.png", 180, 0.86, 0.0),
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
