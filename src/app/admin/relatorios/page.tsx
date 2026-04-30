import Link from "next/link";
import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";

export const metadata = {
  title: "Admin · Relatórios",
};

const RELATORIOS = [
  {
    href: "/admin/relatorios/construtoras",
    title: "Ranking de construtoras",
    desc: "Construtoras que mais operaram no período. Valor operado, pago, em aberto e quantidade de operações.",
    icon: "🏗️",
  },
  {
    href: "/admin/relatorios/imobiliarias",
    title: "Ranking de imobiliárias / corretores",
    desc: "Imobiliárias e corretores que mais cederam comissões. Comparativo de volume e status de cadastro.",
    icon: "🏢",
  },
];

export default async function RelatoriosIndexPage() {
  const admin = await requireAdmin();
  return (
    <AdminShell active="/admin/relatorios" userName={admin.nome}>
      <div className="mb-8">
        <div className="eyebrow mb-2">relatórios</div>
        <h1 className="text-display-md">
          Painel de <span className="text-gradient-blue">análise</span>
        </h1>
        <p className="mt-2 text-fg-muted max-w-2xl">
          Rankings, comparativos e métricas operacionais. Todos os relatórios
          aceitam filtros de período, status do cadastro e status da operação.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {RELATORIOS.map((r) => (
          <Link
            key={r.href}
            href={r.href}
            className="rounded-3xl border border-border bg-bg-elev p-7 hover:border-accent hover:shadow-xl transition-all group"
          >
            <div className="text-4xl mb-4">{r.icon}</div>
            <h2 className="text-xl font-bold tracking-tight group-hover:text-accent transition-colors">
              {r.title}
            </h2>
            <p className="mt-2 text-sm text-fg-muted leading-relaxed">
              {r.desc}
            </p>
            <span className="mt-5 inline-flex items-center gap-2 text-sm text-accent font-semibold">
              Abrir relatório
              <span className="transition-transform group-hover:translate-x-1">
                →
              </span>
            </span>
          </Link>
        ))}
      </div>
    </AdminShell>
  );
}
