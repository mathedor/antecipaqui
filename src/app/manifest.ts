import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Antecipaqui — Antecipação de Comissões",
    short_name: "Antecipaqui",
    description:
      "Antecipação de comissões imobiliárias. Painel completo para corretores, imobiliárias, construtoras, fundos e admin.",
    id: "/painel",
    start_url: "/painel",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#1c6dd0",
    lang: "pt-BR",
    dir: "ltr",
    categories: ["finance", "business", "productivity"],
    // O sufixo de versão no nome do arquivo é proposital. O Chrome só troca o
    // ícone de um app já instalado quando a URL no manifest muda — regravar
    // /icon-192.png com outro desenho ele ignora, e o atalho fica com o ícone
    // antigo pra sempre. Ao redesenhar: sobe a versão aqui, no gerador
    // (scripts/gerar-icones.py) e no sw.js.
    icons: [
      {
        src: "/icon-192-v2.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512-v2.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-v2.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Painel",
        short_name: "Painel",
        description: "Abrir painel",
        url: "/painel",
      },
      {
        name: "Nova operação",
        short_name: "Nova op",
        description: "Cadastrar nova operação",
        url: "/painel/operacoes/nova",
      },
      {
        name: "Notificações",
        short_name: "Notif",
        description: "Ver notificações",
        url: "/notificacoes",
      },
    ],
  };
}
