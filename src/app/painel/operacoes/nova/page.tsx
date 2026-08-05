import Link from "next/link";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { documentos, operacoes } from "@/db/schema";
import { requireActiveUser } from "@/lib/auth-user";
import { listConstrutorasForSelect } from "@/lib/actions/operacoes";
import { getTaxaMensal } from "@/lib/actions/settings";
import {
  listCorretoresForFundoSelector,
  listConstrutorasForFundoSelector,
} from "@/lib/actions/fundo-cadastrar";
import {
  listCorretoresForComercialSelector,
  listConstrutorasForComercialSelector,
} from "@/lib/actions/comercial-cadastrar";
import { getCurrentFundo } from "@/lib/actions/fundos";
import { listUnidadesOperaveis } from "@/lib/actions/imobiliaria-filiais";
import { NovaOperacaoForm } from "@/components/nova-operacao-form";
import { FundoCadastrarOperacaoForm } from "@/components/fundo-cadastrar-operacao-form";
import { ImportarContratoForm } from "@/components/importar-contrato-form";
import { PainelShell } from "@/components/painel-shell";
import { PageHelp } from "@/components/page-help";

export const metadata = {
  title: "Nova operação",
};

type Search = {
  searchParams: Promise<{ from?: string; tab?: string }>;
};

export default async function NovaOperacaoPage({ searchParams }: Search) {
  const user = await requireActiveUser();
  const params = await searchParams;

  // Fundo: cadastra usando seu próprio fundo
  if (user.role === "fundo") {
    const [fundo, corretoresF, construtorasF] = await Promise.all([
      getCurrentFundo(),
      listCorretoresForFundoSelector(),
      listConstrutorasForFundoSelector(),
    ]);
    if (!fundo) redirect("/painel");
    return (
      <PainelShell
        role="fundo"
        userName={user.nome}
        active="/painel/operacoes/nova"
      >
        <div className="mb-8">
          <h1 className="text-display-md">
            Nova <span className="text-gradient-blue">operação</span>
          </h1>
          <p className="mt-2 text-fg-muted">
            Cadastre uma operação em nome de uma imobiliária / corretor
            existente. A operação fica vinculada ao seu fundo automaticamente.
          </p>
          <div className="mt-2">
            <PageHelp pageKey="painel-operacoes-nova" />
          </div>
        </div>
        <FundoCadastrarOperacaoForm
          corretores={corretoresF}
          construtoras={construtorasF}
          taxaMensalBaseFundo={parseFloat(fundo.taxaMensalBase)}
          fundoNome={fundo.nomeFantasia ?? fundo.razaoSocial}
        />
      </PainelShell>
    );
  }

  // Comercial: cadastra em nome de imobiliária/corretor + construtora.
  // Vai pra mesa AQ sem fundo atribuído (admin escolhe). Comercial fica
  // vinculado como responsável (= comissão dele depois).
  if (user.role === "comercial") {
    const [corretoresC, construtorasC, taxaPadrao] = await Promise.all([
      listCorretoresForComercialSelector(),
      listConstrutorasForComercialSelector(),
      getTaxaMensal(),
    ]);
    return (
      <PainelShell
        role="comercial"
        userName={user.nome}
        active="/painel/operacoes/nova"
      >
        <div className="mb-8">
          <h1 className="text-display-md">
            Nova <span className="text-gradient-blue">operação</span>
          </h1>
          <p className="mt-2 text-fg-muted">
            Cadastre uma operação em nome da imobiliária/corretor + construtora.
            Você fica como comercial responsável e recebe comissão quando a
            operação for realizada.
          </p>
          <div className="mt-2">
            <PageHelp pageKey="painel-operacoes-nova" />
          </div>
        </div>
        <FundoCadastrarOperacaoForm
          mode="comercial"
          corretores={corretoresC}
          construtoras={construtorasC}
          taxaMensalBaseFundo={taxaPadrao}
          fundoNome=""
        />
      </PainelShell>
    );
  }

  if (user.onboardingStatus === "pendente") {
    redirect("/painel/onboarding");
  }

  // Bloqueio: corretor/imobiliária precisa ter docs antes de operar
  const docsFaltando: string[] = [];
  if (user.role === "corretor" || user.role === "imobiliaria") {
    const userDocs = await db
      .select({ tipo: documentos.tipo })
      .from(documentos)
      .where(eq(documentos.userId, user.id));
    const tipos = new Set(userDocs.map((d) => d.tipo));
    if (!tipos.has("contrato_social"))
      docsFaltando.push("Contrato social");
    if (!tipos.has("comprovante_endereco"))
      docsFaltando.push("Comprovante de endereço");
  }

  const [construtoras, taxaMensalSugerida, unidades] = await Promise.all([
    listConstrutorasForSelect(),
    getTaxaMensal(),
    listUnidadesOperaveis(),
  ]);

  // Se "from" param presente, carrega a op base pra replicar
  let preset: {
    construtoraId: string;
    valorVenda: number;
    valorComissao: number;
    numeroParcelas: number;
  } | null = null;
  if (params.from) {
    const [src] = await db
      .select({
        construtoraId: operacoes.construtoraId,
        valorVenda: operacoes.valorVenda,
        valorComissao: operacoes.valorComissao,
        numeroParcelas: operacoes.numeroParcelas,
      })
      .from(operacoes)
      .where(
        and(
          eq(operacoes.id, params.from),
          eq(operacoes.corretorUserId, user.id),
        ),
      )
      .limit(1);
    if (src) {
      preset = {
        construtoraId: src.construtoraId,
        valorVenda: parseFloat(src.valorVenda),
        valorComissao: parseFloat(src.valorComissao),
        numeroParcelas: src.numeroParcelas,
      };
    }
  }

  const role = (user.role === "imobiliaria" ? "imobiliaria" : "corretor") as
    | "corretor"
    | "imobiliaria";

  const tab = params.tab === "importar" ? "importar" : "formulario";

  return (
    <PainelShell
      role={role}
      userName={user.nome}
      active="/painel/operacoes/nova"
    >
      <div className="mb-6">
        <h1 className="text-display-md">
          Nova <span className="text-gradient-blue">operação</span>
        </h1>
        <p className="mt-2 text-fg-muted">
          Preencha o formulário ou importe um contrato e deixe a IA preencher.
        </p>
        <div className="mt-2">
          <PageHelp pageKey="painel-operacoes-nova" />
        </div>
      </div>

      {docsFaltando.length > 0 ? (
        <div className="rounded-3xl border border-warn/40 bg-yellow-50 p-8 md:p-10 text-center">
          <div className="size-12 mx-auto rounded-full bg-warn/15 text-warn flex items-center justify-center text-2xl mb-4">
            📎
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            Faltam documentos pra você operar
          </h2>
          <p className="mt-3 text-fg-muted max-w-lg mx-auto">
            Antes de cadastrar uma operação, você precisa enviar:
          </p>
          <ul className="mt-3 inline-block text-left space-y-1">
            {docsFaltando.map((d) => (
              <li key={d} className="text-fg font-medium">
                • {d}
              </li>
            ))}
          </ul>
          <div className="mt-6">
            <Link
              href="/painel/onboarding/dados"
              className="btn-primary !h-12 !px-6"
            >
              Enviar documentos agora <span className="arrow">→</span>
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div
            role="tablist"
            className="mb-6 inline-flex p-1 bg-bg-card border border-border rounded-xl"
          >
            <Link
              href="/painel/operacoes/nova"
              role="tab"
              aria-selected={tab === "formulario"}
              className={`px-4 h-10 inline-flex items-center text-sm font-semibold rounded-lg transition-colors ${
                tab === "formulario"
                  ? "bg-accent text-white shadow-sm"
                  : "text-fg-muted hover:text-fg"
              }`}
            >
              📝 Preencher formulário
            </Link>
            <Link
              href="/painel/operacoes/nova?tab=importar"
              role="tab"
              aria-selected={tab === "importar"}
              className={`px-4 h-10 inline-flex items-center text-sm font-semibold rounded-lg transition-colors ${
                tab === "importar"
                  ? "bg-accent text-white shadow-sm"
                  : "text-fg-muted hover:text-fg"
              }`}
            >
              📄 Importar contrato
            </Link>
          </div>

          {tab === "importar" ? (
            <>
              <p className="mb-5 text-sm text-fg-muted max-w-2xl">
                Tire foto ou suba o PDF do contrato. Nossa IA extrai os
                campos-chave (valor, data, parcelas) e pré-preenche o
                formulário. Você confere antes de enviar.
              </p>
              <ImportarContratoForm />
            </>
          ) : (
            <>
              <p className="mb-5 text-sm text-fg-muted max-w-2xl">
                O valor presente é calculado em tempo real conforme você
                digita. Sem letra miúda, sem surpresa.
              </p>
              <NovaOperacaoForm
                construtoras={construtoras}
                unidades={unidades}
                taxaMensalSugerida={taxaMensalSugerida}
                preset={preset}
              />
            </>
          )}
        </>
      )}
    </PainelShell>
  );
}
