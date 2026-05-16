import Link from "next/link";
import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import { PageHelp } from "@/components/page-help";

export const metadata = {
  title: "Admin · Relatórios",
};

const RELATORIOS = [
  {
    href: "/admin/relatorios/indices",
    title: "Índices · KPIs do negócio",
    desc: "Painel completo: valor médio das ops, distribuição por faixa, funil de conversão, taxa de recusa, inadimplência e gráficos por fundo.",
    icon: "📊",
    section: "Visão geral",
  },
  {
    href: "/admin/relatorios/recaps",
    title: "Recaps Enviados",
    desc: "Resumos diários, semanais e mensais enviados por email pra admins e fundos. Histórico completo com filtro por data e gerador on-demand.",
    icon: "🗞️",
    section: "Visão geral",
  },
  {
    href: "/admin/api-docs",
    title: "API Docs · fundos integradores",
    desc: "Swagger UI da API externa do fundo (/api/external/fundo/*). Operações, parcelas, decisão. Útil pra fundos parceiros integrarem com seus próprios sistemas.",
    icon: "🔌",
    section: "Visão geral",
  },
  {
    href: "/admin/relatorios/saude",
    title: "Saúde da plataforma",
    desc: "Status do sistema: Resend, Clerk, blob, integrações externas e configurações críticas.",
    icon: "🩺",
    section: "Visão geral",
  },
  {
    href: "/admin/relatorios/construtoras",
    title: "Ranking de construtoras",
    desc: "Construtoras que mais operaram. Valor operado, pago, em aberto e quantidade de operações.",
    icon: "🏗️",
    section: "Rankings",
  },
  {
    href: "/admin/relatorios/imobiliarias",
    title: "Ranking de imobiliárias / corretores",
    desc: "Imobiliárias e corretores que mais cederam comissões. Comparativo de volume.",
    icon: "🏢",
    section: "Rankings",
  },
  {
    href: "/admin/relatorios/fundos",
    title: "Ranking de fundos",
    desc: "Fundos que mais aportaram. Total operado, pago, em aberto e nº de ops por fundo.",
    icon: "🏦",
    section: "Rankings",
  },
  {
    href: "/admin/relatorios/comerciais",
    title: "Ranking de comerciais",
    desc: "Comerciais com mais operações sob responsabilidade — resultado gerado e comissão.",
    icon: "💼",
    section: "Rankings",
  },
  {
    href: "/admin/relatorios/daily",
    title: "Daily · parcelas em aberto",
    desc: "Cronograma diário das parcelas a vencer e em atraso. Cálculo de encargos automático + ações de notificação e boleto.",
    icon: "📅",
    section: "Operacional",
  },
  {
    href: "/admin/relatorios/borderos",
    title: "Borderôs consolidados",
    desc: "Lista de operações com totais agregados (bruto, deságio, líquido, custos). Filtra por período/fundo/construtora/cedente. Exporta CSV e PDF consolidado.",
    icon: "📄",
    section: "Operacional",
  },
  {
    href: "/admin/relatorios/inadimplentes",
    title: "Inadimplentes",
    desc: "Lista de operações com parcelas vencidas. Filtros por período e fundo.",
    icon: "⚠️",
    section: "Operacional",
  },
  {
    href: "/admin/relatorios/logs",
    title: "Audit log",
    desc: "Histórico completo de ações de usuários: logins, leituras, escritas, mudanças de status.",
    icon: "📜",
    section: "Operacional",
  },
];

const SECOES = ["Visão geral", "Rankings", "Operacional"];

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
        <div className="mt-2">
          <PageHelp pageKey="admin-relatorios" />
        </div>
      </div>

      <div className="space-y-10">
        {SECOES.map((secao) => {
          const items = RELATORIOS.filter((r) => r.section === secao);
          if (items.length === 0) return null;
          return (
            <section key={secao}>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim mb-4">
                {secao}
              </div>
              <div className="grid md:grid-cols-2 gap-5">
                {items.map((r) => (
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
            </section>
          );
        })}
      </div>
    </AdminShell>
  );
}
