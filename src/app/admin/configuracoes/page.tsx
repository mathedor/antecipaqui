import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import { AdminTaxaForm } from "@/components/admin-taxa-form";
import { AdminSpreadMinimoForm } from "@/components/admin-spread-minimo-form";
import { AdminCdiForm } from "@/components/admin-cdi-form";
import { AdminScoreForm } from "@/components/admin-score-form";
import { getSettingsSnapshot } from "@/lib/actions/settings";
import { PageHelp } from "@/components/page-help";

export const metadata = {
  title: "Admin · Configurações",
};

export default async function AdminConfiguracoesPage() {
  const admin = await requireAdmin();
  const settings = await getSettingsSnapshot();

  return (
    <AdminShell active="/admin/configuracoes" userName={admin.nome}>
      <div className="mb-8">
        <div className="eyebrow mb-2">configurações</div>
        <h1 className="text-display-md">
          Parâmetros do <span className="text-gradient-blue">sistema</span>
        </h1>
        <p className="mt-2 text-fg-muted max-w-2xl">
          Ajustes que afetam toda a plataforma. A taxa configurada aqui é
          apenas a sugestão padrão — durante a aprovação de cada operação
          você pode editar a taxa específica daquele negócio.
        </p>
        <div className="mt-2">
          <PageHelp pageKey="admin-configuracoes" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <section className="rounded-2xl border border-border bg-bg-elev p-6 md:p-8">
          <div className="flex items-baseline justify-between mb-5 gap-3 flex-wrap">
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                Taxa de juros sugerida
              </h2>
              <p className="text-sm text-fg-muted mt-1">
                Aplicada nas calculadoras (landing + área da imobiliária) e como
                taxa padrão de operações novas.
              </p>
            </div>
            <span className="font-mono tabular text-3xl font-bold text-accent">
              {(settings.taxaMensal.value * 100).toFixed(2).replace(".", ",")}%
              <span className="text-xs text-fg-muted font-normal ml-1">a.m.</span>
            </span>
          </div>
          <AdminTaxaForm
            taxaAtual={settings.taxaMensal.value}
            updatedAt={settings.taxaMensal.updatedAt}
          />
        </section>

        <section className="rounded-2xl border border-border bg-bg-elev p-6 md:p-8">
          <div className="flex items-baseline justify-between mb-5 gap-3 flex-wrap">
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                Spread mínimo por operação
              </h2>
              <p className="text-sm text-fg-muted mt-1">
                Bloqueia aprovações onde a diferença entre taxa da operação e
                taxa do fundo é menor que esse limite — protege a margem da
                Antecipaqui.
              </p>
            </div>
            <span className="font-mono tabular text-3xl font-bold text-accent">
              {(settings.spreadMinimo.value * 100)
                .toFixed(2)
                .replace(".", ",")}%
              <span className="text-xs text-fg-muted font-normal ml-1">a.m.</span>
            </span>
          </div>
          <AdminSpreadMinimoForm
            spreadAtual={settings.spreadMinimo.value}
            updatedAt={settings.spreadMinimo.updatedAt}
          />
        </section>

        <section className="rounded-2xl border border-border bg-bg-elev p-6 md:p-8">
          <div className="flex items-baseline justify-between mb-5 gap-3 flex-wrap">
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                CDI mensal (benchmark do fundo)
              </h2>
              <p className="text-sm text-fg-muted mt-1">
                Taxa usada como referência na tela de Daily do fundo pra
                comparar rentabilidade da carteira vs CDI.
              </p>
            </div>
            <span className="font-mono tabular text-3xl font-bold text-accent">
              {(settings.cdiMensal.value * 100).toFixed(2).replace(".", ",")}%
              <span className="text-xs text-fg-muted font-normal ml-1">a.m.</span>
            </span>
          </div>
          <AdminCdiForm
            cdiAtual={settings.cdiMensal.value}
            updatedAt={settings.cdiMensal.updatedAt}
          />
        </section>

        <section className="rounded-2xl border border-border bg-bg-elev p-6 md:p-8">
          <div className="flex items-baseline justify-between mb-5 gap-3 flex-wrap">
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                Score de inadimplência
              </h2>
              <p className="text-sm text-fg-muted mt-1">
                Pesos do score 0–100 aplicado em construtoras, imobiliárias e
                corretores. Afeta a fila de decisão admin/fundo e o painel de
                risco.
              </p>
            </div>
          </div>
          <AdminScoreForm
            pesoVencidaAtual={settings.scorePesoVencida.value}
            pesoVencidaGraveAtual={settings.scorePesoVencidaGrave.value}
            diasGraveAtual={settings.scoreDiasGrave.value}
            updatedAt={
              settings.scoreDiasGrave.updatedAt ??
              settings.scorePesoVencida.updatedAt ??
              settings.scorePesoVencidaGrave.updatedAt
            }
          />
        </section>
      </div>
    </AdminShell>
  );
}
