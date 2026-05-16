"use client";

import { UserButton } from "@clerk/nextjs";

/**
 * UserButton do Clerk com info de perfil + items custom no dropdown:
 *  - Editar dados (link pra /painel/perfil)
 *  - Onboarding (dispara evento global pra reabrir tour) — só aparece se
 *    `tourId` for passado.
 */
export function UserButtonWithPerfil({
  profileLabel,
  userName,
  tourId,
}: {
  profileLabel?: string | null;
  userName?: string | null;
  /** Quando passado, mostra item 'Onboarding' que dispara
   *  'open-onboarding-tour:<tourId>' (consumido pelo Mount component). */
  tourId?: string | null;
} = {}) {
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
        {tourId ? (
          <UserButton.Action
            label="Onboarding"
            labelIcon={<BookIcon />}
            onClick={() => {
              if (typeof window !== "undefined") {
                window.dispatchEvent(
                  new CustomEvent(`open-onboarding-tour:${tourId}`),
                );
              }
            }}
          />
        ) : (
          <></>
        )}
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

function BookIcon() {
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
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}
