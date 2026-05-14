import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Antecipaqui — Antecipação de Comissões",
    short_name: "Antecipaqui",
    description:
      "Antecipação de comissões imobiliárias. Painel completo para corretores, imobiliárias, construtoras, fundos e admin.",
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
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable.png",
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
