import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ptBR } from "@clerk/localizations";
import "./globals.css";
import {
  MarketingHeader,
  MarketingFooter,
} from "@/components/route-aware-chrome";
import { FeedbackProvider } from "@/components/feedback-provider";
import { ChatFabWrapper } from "@/components/chat-fab-wrapper";
import { PwaInstaller } from "@/components/pwa-installer";
import { clerkAppearance } from "@/lib/clerk-appearance";

const sans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const mono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.antecipaqui.digital"),
  title: {
    default: "Antecipaqui — Antecipação de Comissões Imobiliárias",
    template: "%s · Antecipaqui",
  },
  description:
    "Receba sua comissão hoje, mesmo que parcelada em até 4x (120 dias). Antecipação para corretores, imobiliárias e construtoras — com segurança, agilidade e sem burocracia.",
  keywords: [
    "antecipação de comissão imobiliária",
    "factoring imobiliário",
    "corretor de imóveis",
    "imobiliária",
    "construtora",
    "fluxo de caixa",
    "comissão antecipada",
  ],
  openGraph: {
    title: "Antecipaqui — Receba sua comissão hoje",
    description:
      "Antecipação de comissões imobiliárias. Em 1 dia, sua comissão parcelada vira dinheiro na conta.",
    locale: "pt_BR",
    type: "website",
  },
  robots: { index: true, follow: true },
  appleWebApp: {
    capable: true,
    title: "Antecipaqui",
    statusBarStyle: "default",
  },
  applicationName: "Antecipaqui",
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1c6dd0" },
    { media: "(prefers-color-scheme: dark)", color: "#0d4e9e" },
  ],
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider localization={ptBR} appearance={clerkAppearance}>
      <html
        lang="pt-BR"
        className={`${sans.variable} ${mono.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col bg-bg text-fg pb-14 md:pb-0">
          <FeedbackProvider>
            <MarketingHeader />
            <main className="flex-1 relative z-10">{children}</main>
            <MarketingFooter />
            <ChatFabWrapper />
            <PwaInstaller />
          </FeedbackProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
