"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { SignInButton, SignUpButton, useAuth } from "@clerk/nextjs";

/**
 * CTAs reutilizáveis na landing/marketing.
 *
 * Comportamento:
 *  - CtaCadastro:  abre modal SignUp se deslogado / vai pra /painel se logado
 *  - CtaEntrar:    abre modal SignIn se deslogado / vai pra /painel se logado
 *  - CtaSimular:   leva pra `#simulador` da home com scroll suave
 *                  (resolve o problema do Next App Router não fazer scroll
 *                  pra âncora após mudança de pathname)
 *
 * Todos aceitam `className` + `children` como label do botão.
 */

type ButtonProps = {
  children: React.ReactNode;
  className?: string;
};

export function CtaCadastro({ children, className }: ButtonProps) {
  const { isLoaded, isSignedIn } = useAuth();

  if (isLoaded && isSignedIn) {
    return (
      <Link href="/painel" className={className}>
        {children}
      </Link>
    );
  }

  return (
    <SignUpButton
      mode="modal"
      forceRedirectUrl="/painel"
      signInForceRedirectUrl="/painel"
    >
      <button type="button" className={className}>
        {children}
      </button>
    </SignUpButton>
  );
}

export function CtaEntrar({ children, className }: ButtonProps) {
  const { isLoaded, isSignedIn } = useAuth();

  if (isLoaded && isSignedIn) {
    return (
      <Link href="/painel" className={className}>
        {children}
      </Link>
    );
  }

  return (
    <SignInButton
      mode="modal"
      forceRedirectUrl="/painel"
      signUpForceRedirectUrl="/painel"
    >
      <button type="button" className={className}>
        {children}
      </button>
    </SignInButton>
  );
}

/**
 * Botão "Simular" — leva pra /#simulador com scroll suave.
 * Se já está na home, só rola; senão navega + rola depois do paint.
 */
export function CtaSimular({ children, className }: ButtonProps) {
  const router = useRouter();
  const pathname = usePathname();

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    if (pathname === "/") {
      const el = document.getElementById("simulador");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        // atualiza hash sem reload
        history.replaceState(null, "", "#simulador");
      }
      return;
    }
    // Em outra página → navega + faz scroll após render
    router.push("/#simulador");
    // fallback: tenta rolar depois de um tick (cobre caso o Next não faça)
    setTimeout(() => {
      const el = document.getElementById("simulador");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 350);
  }

  return (
    <a
      href="/#simulador"
      onClick={handleClick}
      className={className}
    >
      {children}
    </a>
  );
}
