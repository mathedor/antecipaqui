import Link from "next/link";
import { getMyUnreadCount } from "@/lib/actions/notifications";

/**
 * Bell de notificações pra usar nos headers/dashboards.
 * Renderiza badge de contagem se houver não lidas.
 */
export async function NotificationBell({
  href = "/notificacoes",
}: {
  href?: string;
}) {
  let count = 0;
  try {
    count = await getMyUnreadCount();
  } catch {
    count = 0;
  }

  return (
    <Link
      href={href}
      aria-label="Notificações"
      className="relative inline-flex items-center justify-center size-10 rounded-full border border-border hover:border-accent hover:text-accent transition-colors text-fg-muted"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
      {count > 0 && (
        <span
          className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center"
          aria-hidden
        >
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
