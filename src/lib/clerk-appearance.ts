/**
 * Appearance configuration to make Clerk components match the Antecipaqui brand.
 * Used in <ClerkProvider>, <SignIn>, <SignUp>, <UserButton>, etc.
 */
export const clerkAppearance = {
  variables: {
    colorPrimary: "#1c6dd0",
    colorText: "#0c1a2c",
    colorTextSecondary: "#5a6571",
    colorBackground: "#ffffff",
    colorInputBackground: "#fbfbfa",
    colorInputText: "#0c1a2c",
    colorDanger: "#b91c1c",
    colorSuccess: "#15803d",
    colorWarning: "#b45309",
    borderRadius: "0.75rem",
    fontFamily: "var(--font-sans), system-ui, sans-serif",
    fontSize: "0.95rem",
  },
  elements: {
    rootBox: "w-full",
    card: "shadow-xl border border-[#e6e7e9] !rounded-3xl bg-white",
    headerTitle: "text-2xl font-bold tracking-tight text-[#0c1a2c]",
    headerSubtitle: "text-sm text-[#5a6571]",
    formButtonPrimary:
      "!bg-[#1c6dd0] hover:!bg-[#0d4e9e] !rounded-xl !h-12 !text-base !font-semibold transition-colors",
    formFieldInput:
      "!rounded-xl !border-[#e6e7e9] focus:!border-[#1c6dd0] !h-11",
    formFieldLabel: "!text-xs !uppercase !tracking-[0.18em] !font-mono !font-medium",
    socialButtonsBlockButton:
      "!rounded-xl !border-[#e6e7e9] hover:!border-[#1c6dd0] !h-11",
    footerActionLink: "!text-[#1c6dd0] hover:!text-[#0d4e9e] font-semibold",
    identityPreviewEditButton: "!text-[#1c6dd0]",
    formResendCodeLink: "!text-[#1c6dd0]",
    badge: "!bg-[#1c6dd0]/10 !text-[#1c6dd0]",
  },
  layout: {
    logoImageUrl: "https://www.antecipaqui.digital/brand/logo.png",
    logoPlacement: "inside" as const,
    socialButtonsPlacement: "top" as const,
    socialButtonsVariant: "blockButton" as const,
  },
};
