import { redirect } from "next/navigation";
import { requireActiveUser } from "@/lib/auth-user";
import { PainelShell } from "@/components/painel-shell";
import { WebhooksManager } from "@/components/webhooks-manager";
import { FichaConexaoFundo } from "@/components/ficha-conexao-fundo";
import { listMeusWebhooks } from "@/lib/actions/webhooks";
import { getFundoDoUsuario } from "@/lib/fundo-acesso";
import { montarFichaConexao } from "@/lib/fundo-conexao";
import { PageHelp } from "@/components/page-help";

export const metadata = { title: "Webhooks" };

export default async function FundoWebhooksPage() {
  const user = await requireActiveUser();
  if (user.role !== "fundo") redirect("/painel");

  const [webhooks, fundo] = await Promise.all([
    listMeusWebhooks(),
    getFundoDoUsuario(user.id),
  ]);
  const ficha = fundo ? montarFichaConexao(fundo) : null;

  return (
    <PainelShell role="fundo" userName={user.nome} active="/painel/webhooks">
      <div className="mb-6">
        <div className="eyebrow mb-2">integrações</div>
        <h1 className="text-display-md">
          <span className="text-gradient-blue">Webhooks</span>
        </h1>
        <p className="mt-2 text-fg-muted max-w-2xl">
          Os dois sentidos da conversa: o que a gente manda pro seu sistema e
          os endereços que o seu sistema chama aqui. Todo delivery de saída vai
          assinado com HMAC-SHA256 no header{" "}
          <code className="font-mono">x-antecipaqui-signature</code>.
        </p>
        <div className="mt-2">
          <PageHelp pageKey="painel-webhooks" />
        </div>
      </div>

      {ficha && (
        <div className="mb-8">
          <FichaConexaoFundo
            ficha={ficha}
            subtitulo="Estes são os dados que o time técnico precisa pra plugar o sistema de vocês no Antecipaqui. O ID do fundo é o que identifica vocês em cada endereço."
          />
        </div>
      )}

      <h2 className="text-lg font-bold tracking-tight mb-1">
        Avisos que mandamos pro seu sistema
      </h2>
      <p className="text-sm text-fg-muted mb-4 max-w-2xl">
        Cadastre uma URL sua e escolha os eventos. A cada acontecimento a gente
        entrega o JSON assinado — com retentativa se o seu endpoint estiver
        fora do ar.
      </p>
      <WebhooksManager
        webhooks={webhooks.map((w) => ({
          id: w.id,
          nome: w.nome,
          targetUrl: w.targetUrl,
          eventos: w.eventos as string[],
          isActive: w.isActive,
          createdAt: w.createdAt,
          lastDeliveryAt: w.lastDeliveryAt,
          lastDeliveryStatus: w.lastDeliveryStatus,
          ownerRole: w.ownerRole,
        }))}
      />
    </PainelShell>
  );
}
