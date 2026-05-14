"use client";

import { UserButton } from "@clerk/nextjs";

/**
 * UserButton do Clerk com info de perfil + item custom "Editar dados"
 * adicionados ao dropdown (logo abaixo de Gerenciar conta).
 */
export function UserButtonWithPerfil({
  profileLabel,
  userName,
}: {
  profileLabel?: string | null;
  userName?: string | null;
} = {}) {
  // Mostra o tipo de conta logo abaixo do nome completo do Clerk no dropdown.
  // O Clerk já exibe nome+email no header padrão; aqui complementamos com role.
  void userName;
  const info = profileLabel ? profileLabel.toLowerCase() : null;

  return (
    <UserButton>
      <UserButton.MenuItems>
        {info ? (
          <UserButton.Action
            label={info}
            labelIcon={<BadgeIcon />}
            onClick={() => {}}
          />
        ) : (
          <></>
        )}
        <UserButton.Link
          label="Editar dados"
          labelIcon={<EditIcon />}
          href="/painel/perfil"
        />
      </UserButton.MenuItems>
    </UserButton>
  );
}

function BadgeIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 2 4 6v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6l-8-4z" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}
