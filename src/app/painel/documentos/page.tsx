import Link from "next/link";
import { redirect } from "next/navigation";
import { requireActiveUser } from "@/lib/auth-user";
import { PainelShell } from "@/components/painel-shell";
import { listDocumentosConstrutora } from "@/lib/actions/construtora-operacional";
import { toBlobProxyHref } from "@/lib/blob-url";

export const metadata = { title: "Documentos" };

const TIPO_LABEL: Record<string, string> = {
  cartao_cnpj: "Cartão CNPJ",
  contrato_social: "Contrato social",
  comprovante_endereco: "Comprovante de endereço",
  rg: "RG",
  cpf: "CPF",
  creci: "CRECI",
  contrato_venda: "Contrato de venda",
  contrato_comissao: "Contrato de comissão",
  nota_fiscal: "Nota fiscal",
  comprovante_entrada: "Comprovante de entrada",
  outro: "Outro",
};

function formatDateTime(d: Date | string) {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatBytes(n: number | null) {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

type Search = {
  searchParams: Promise<{
    q?: string;
    tipo?: string;
    operacaoId?: string;
  }>;
};

export default async function DocumentosPage({ searchParams }: Search) {
  const user = await requireActiveUser();
  if (user.role !== "construtora") redirect("/painel");

  const sp = await searchParams;
  const docs = await listDocumentosConstrutora({
    q: sp.q || undefined,
    tipo: sp.tipo || undefined,
    operacaoId: sp.operacaoId || undefined,
  });

  return (
    <PainelShell
      role="construtora"
      userName={user.nome}
      active="/painel/documentos"
    >
      <div className="mb-6">
        <div className="eyebrow mb-2">central</div>
        <h1 className="text-display-md">
          Seus <span className="text-gradient-blue">documentos</span>
        </h1>
        <p className="mt-2 text-fg-muted max-w-2xl">
          Todos os documentos anexados em qualquer operação ou no cadastro da
          sua construtora.
        </p>
      </div>

      <form
        method="get"
        action="/painel/documentos"
        className="mb-6 rounded-2xl border border-border bg-bg-elev p-4 grid grid-cols-12 gap-3"
      >
        <input
          type="text"
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder="Buscar pelo nome do arquivo..."
          className="col-span-12 md:col-span-6 h-10 px-3 rounded-lg border border-border bg-bg text-fg text-sm focus:border-accent outline-none"
        />
        <select
          name="tipo"
          defaultValue={sp.tipo ?? ""}
          className="col-span-8 md:col-span-4 h-10 px-3 rounded-lg border border-border bg-bg text-fg text-sm focus:border-accent outline-none"
        >
          <option value="">Todos os tipos</option>
          {Object.entries(TIPO_LABEL).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="col-span-4 md:col-span-2 h-10 rounded-lg bg-accent text-white font-semibold text-sm hover:bg-accent-dark"
        >
          Filtrar
        </button>
      </form>

      {docs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-strong bg-bg-card p-10 text-center">
          <div className="text-4xl mb-3">📁</div>
          <p className="text-fg-muted">Nenhum documento por aqui.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {docs.map((d) => (
            <li key={d.id}>
              <div className="grid grid-cols-12 gap-3 px-4 py-3 rounded-xl border border-border bg-bg-elev hover:border-accent transition-colors items-center">
                <div className="col-span-12 md:col-span-6">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xl">📄</span>
                    <a
                      href={toBlobProxyHref(d.url)}
                      target="_blank"
                      rel="noopener"
                      className="font-semibold text-sm hover:text-accent truncate"
                    >
                      {d.nome}
                    </a>
                  </div>
                  <div className="text-xs text-fg-muted mt-0.5">
                    {TIPO_LABEL[d.tipo] ?? d.tipo} ·{" "}
                    {formatBytes(d.sizeBytes)} ·{" "}
                    {formatDateTime(d.createdAt)}
                  </div>
                </div>
                <div className="col-span-8 md:col-span-4 text-xs">
                  {d.operacaoNumero ? (
                    <Link
                      href={`/painel/operacoes/${d.operacaoId}`}
                      className="text-accent hover:underline font-mono"
                    >
                      op {d.operacaoNumero} →
                    </Link>
                  ) : (
                    <span className="text-fg-dim">cadastro construtora</span>
                  )}
                </div>
                <div className="col-span-4 md:col-span-2 flex justify-end">
                  {d.validacaoStatus === "ok" && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-50 text-success text-[10px] uppercase font-bold">
                      ✓ ok
                    </span>
                  )}
                  {d.validacaoStatus === "revisao" && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-yellow-50 text-warn text-[10px] uppercase font-bold">
                      revisar
                    </span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </PainelShell>
  );
}
