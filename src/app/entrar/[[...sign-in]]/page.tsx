import { SignIn } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";

export const metadata = {
  title: "Entrar",
  description: "Acesse sua conta Antecipaqui.",
};

export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Resgate de convite perdido: quem clicou num convite antigo caiu aqui com
  // o __clerk_ticket enterrado dentro do redirect_url (o <SignIn> não trata e
  // a tela ficava em branco). Extraímos o ticket e mandamos pro cadastro.
  const params = await searchParams;
  const redirectUrl = params.redirect_url;
  if (typeof redirectUrl === "string" && redirectUrl.includes("__clerk_ticket")) {
    let ticket: string | null = null;
    let status = "sign_up";
    try {
      const interna = new URL(redirectUrl);
      ticket = interna.searchParams.get("__clerk_ticket");
      status = interna.searchParams.get("__clerk_status") ?? status;
    } catch {
      // redirect_url malformado: segue pro login normal.
    }
    if (ticket) {
      redirect(
        `/cadastre-se?__clerk_ticket=${encodeURIComponent(ticket)}&__clerk_status=${encodeURIComponent(status)}`,
      );
    }
  }

  return (
    <section className="min-h-[80vh] flex items-center justify-center px-6 py-16 relative">
      <div className="absolute inset-0 bg-mesh pointer-events-none" aria-hidden />
      <div className="relative w-full max-w-md flex flex-col items-center">
        <div className="flex justify-center mb-6">
          <Logo size={40} />
        </div>
        <SignIn
          signUpUrl="/cadastre-se"
          forceRedirectUrl="/painel"
          signUpForceRedirectUrl="/painel"
        />
        <p className="mt-6 text-center text-xs text-fg-dim max-w-sm">
          Sua conta é protegida com criptografia de ponta. Em conformidade com
          a LGPD.
        </p>
      </div>
    </section>
  );
}
