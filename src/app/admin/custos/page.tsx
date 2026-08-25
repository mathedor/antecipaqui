import { requireAdminArea } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import { CustosPanel } from "@/components/custos-panel";
import { PageHelp } from "@/components/page-help";
import { contasDaAna, pagamentosDaAna, type ContaAna } from "@/lib/custosAna";
import { estimativaIaMes, mesCorrenteSP } from "@/lib/ia-uso";
import { formatTokens } from "@/lib/custos-data";

import PagamentosAna from "./PagamentosAna";
import { marcarPagamentoNaAna } from "./acoes-ana";
export const metadata = {
  title: "Admin · Custos & Desenvolvimento",
};

/* Quais linhas do relatório são a conta COMPARTILHADA da casa (e por isso
   recebem o valor rateado que a Ana leu na fatura). Todo o resto — servidor
   principal, backup primário e secundário, as 4 proxies, o firewall hot blind,
   a VPS de agentes e a do Cícero, o servidor de demonstração, a cloud de
   arquivos — é infra dedicada do Antecipaqui, com preço próprio, e não pode
   ser trocada pelo rateio de ninguém. */
const COMPARTILHADAS: Record<string, string> = {
  vercel: "vercel",     // hospedagem
  banco: "banco",       // Neon
  resend: "email",      // e-mail
  whatsapp: "whatsapp",
};

export default async function AdminCustosPage() {
  const pagamentosNaAna = await pagamentosDaAna("antecipaqui");
  const admin = await requireAdminArea("configuracoes");
  const mesCorrente = mesCorrenteSP();

  // o preço de verdade da infraestrutura deste mês, lido pela Ana na fatura
  const daAna = await contasDaAna("antecipaqui");
  const precosDaAna = daAna
    ? daAna.filter((c) => COMPARTILHADAS[c.id]).map((c) => ({ ...c, id: COMPARTILHADAS[c.id] }))
    : null;

  /* A linha de I.A. não é rateio: é o consumo real DESTE sistema na fatura da
     Anthropic. O número certo vem da Ana (conta id "ia"); se ela não
     responder, estimamos aqui mesmo com o que o banco já mediu — tokens do
     mês (Cícero + ia_usos) × R$ 30 o milhão — em vez do valor chumbado. */
  let ia: ContaAna | null = daAna?.find((c) => c.id === "ia") ?? null;
  if (!ia) {
    const est = await estimativaIaMes(mesCorrente);
    if (est) {
      ia = {
        id: "ia",
        nome: "I.A. em produção (Cícero)",
        valor: est.valor,
        obs: `estimativa: ${formatTokens(est.tokens)} de tokens × R$ 30/milhão`,
        fonte: "derivado",
        estimado: true,
      };
    }
  }
  const precos = ia ? [...(precosDaAna ?? []), ia] : precosDaAna;

  return (
    <AdminShell active="/admin/custos" userName={admin.nome}>
      {/* 1 · título e descrição no topo */}
      <div className="mb-8">
        <div className="eyebrow mb-2">custos &amp; desenvolvimento</div>
        <h1 className="text-display-md">
          Quanto a plataforma{" "}
          <span className="text-gradient-blue">custou e custa</span>
        </h1>
        <p className="mt-2 text-fg-muted max-w-2xl">
          O investimento inicial, as contas fixas de cada mês e tudo que foi
          entregue depois do lançamento — entrega por entrega, com data e
          valor. Marque o que já foi pago: mês fechado dá baixa direto no
          controle da Diretório Web, e baixa dada lá aparece aqui.
        </p>
        <div className="mt-2">
          <PageHelp pageKey="admin-custos" />
        </div>
      </div>

      {/* 2 · card do caixa · 3 · custos e descritivos · 4 · pagamentos (no fim) */}
      <PagamentosAna inicial={pagamentosNaAna} marcar={marcarPagamentoNaAna}>
        <CustosPanel
          mesCorrente={mesCorrente}
          precosDaAna={precos}
          pagosAna={pagamentosNaAna}
          avisarAna={marcarPagamentoNaAna}
        />
      </PagamentosAna>
    </AdminShell>
  );
}
