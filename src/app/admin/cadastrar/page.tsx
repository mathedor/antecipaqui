import Link from "next/link";
import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";

export const metadata = { title: "Admin · Cadastrar" };

const ITEMS = [
  {
    href: "/admin/cadastrar/imobiliaria",
    title: "Imobiliária / Corretor",
    desc: "Cria a empresa cedente e dispara convite Clerk pro responsável definir senha.",
    icon: "🏠",
    border: "border-accent/30 bg-accent-soft",
  },
  {
    href: "/admin/cadastrar/construtora",
    title: "Construtora",
    desc: "Cadastra a construtora com CNPJ + endereço + contato. Convite opcional pro acesso.",
    icon: "🏗",
    border: "border-violet-300/40 bg-violet-50",
  },
  {
    href: "/admin/cadastrar/comercial",
    title: "Comercial",
    desc: "Membro da equipe comercial (PF ou PJ) com login próprio. Recebe convite por email.",
    icon: "👤",
    border: "border-orange-300/40 bg-orange-50",
  },
  {
    href: "/admin/fundos/novo",
    title: "Fundo de investimento",
    desc: "Investidor que aporta capital. Cada fundo tem taxa-base, contrato e login próprios.",
    icon: "🏦",
    border: "border-yellow-300/40 bg-yellow-50",
  },
  {
    href: "/admin/cadastrar/operacao",
    title: "Operação",
    desc: "Registra operação como admin — você escolhe a imobiliária / corretor cedente e a construtora.",
    icon: "📝",
    border: "border-success/40 bg-green-50",
  },
];

export default async function AdminCadastrarHub() {
  const admin = await requireAdmin();

  return (
    <AdminShell active="/admin/cadastrar" userName={admin.nome}>
      <div className="mb-8">
        <div className="eyebrow mb-2">cadastrar</div>
        <h1 className="text-display-md">
          Cadastros <span className="text-gradient-blue">administrativos</span>
        </h1>
        <p className="mt-2 text-fg-muted max-w-2xl">
          Atalhos pra criar imobiliárias, construtoras e operações sem esperar
          o cedente cadastrar pelo painel.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {ITEMS.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            className={`rounded-2xl border ${it.border} p-6 hover:shadow-lg transition-all group`}
          >
            <div className="text-4xl mb-3">{it.icon}</div>
            <h3 className="text-lg font-bold tracking-tight mb-1 group-hover:text-accent">
              {it.title}
            </h3>
            <p className="text-sm text-fg-muted leading-relaxed">{it.desc}</p>
            <div className="mt-4 text-xs font-mono text-accent uppercase tracking-wider">
              cadastrar →
            </div>
          </Link>
        ))}
      </div>
    </AdminShell>
  );
}
