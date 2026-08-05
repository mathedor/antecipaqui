import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import {
  construtoras,
  operacoes,
  parcelasComissao,
  parcelaAntecipacoes,
  parcelaRenegociacoes,
  users,
} from "@/db/schema";
import { requireActiveUser } from "@/lib/auth-user";
import { PainelShell } from "@/components/painel-shell";
import { DuplicataAcoesPanel } from "@/components/duplicata-acoes-panel";
import { formatBRL } from "@/lib/format";

export const metadata = { title: "Parcela" };

function formatDate(s: string) {
  return new Date(s + "T00:00:00").toLocaleDateString("pt-BR");
}
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

type Params = { params: Promise<{ id: string }> };

export default async function DuplicataDetalhePage({ params }: Params) {
  const user = await requireActiveUser();
  if (user.role !== "construtora") redirect("/painel");
  const { id } = await params;

  const [c] = await db
    .select()
    .from(construtoras)
    .where(eq(construtoras.ownerUserId, user.id))
    .limit(1);
  if (!c) redirect("/painel");

  const [row] = await db
    .select({
      parcela: parcelasComissao,
      operacao: operacoes,
    })
    .from(parcelasComissao)
    .innerJoin(operacoes, eq(operacoes.id, parcelasComissao.operacaoId))
    .where(eq(parcelasComissao.id, id))
    .limit(1);
  if (!row) notFound();
  if (row.operacao.construtoraId !== c.id) notFound();

  // Antecipações + renegociações já solicitadas
  const antecipacoes = await db
    .select({
      a: parcelaAntecipacoes,
      decidoPor: users.nome,
    })
    .from(parcelaAntecipacoes)
    .leftJoin(users, eq(users.id, parcelaAntecipacoes.decidoPorUserId))
    .where(eq(parcelaAntecipacoes.parcelaId, id))
    .orderBy(desc(parcelaAntecipacoes.createdAt));
  const renegociacoes = await db
    .select({
      r: parcelaRenegociacoes,
      decidoPor: users.nome,
    })
    .from(parcelaRenegociacoes)
    .leftJoin(users, eq(users.id, parcelaRenegociacoes.decidoPorUserId))
    .where(eq(parcelaRenegociacoes.parcelaId, id))
    .orderBy(desc(parcelaRenegociacoes.createdAt));

  const valorOriginal = parseFloat(row.parcela.valor);
  const valorAtualizado = row.parcela.valorAtualizado
    ? parseFloat(row.parcela.valorAtualizado)
    : valorOriginal;
  const isPaga = row.parcela.status === "paga";
  const isCancelada = row.parcela.status === "cancelada";
  const hoje = new Date().toISOString().slice(0, 10);
  const isVencida = !isPaga && row.parcela.vencimento < hoje;

  return (
    <PainelShell
      role="construtora"
      userName={user.nome}
      active="/painel/duplicatas"
    >
      <Link
        href="/painel/duplicatas"
        className="font-mono text-[11px] uppercase tracking-wider text-fg-muted hover:text-fg mb-3 inline-block"
      >
        ← duplicatas
      </Link>

      <div className="mb-6">
        <div className="eyebrow mb-2">parcela</div>
        <h1 className="text-display-md">
          <span className="text-gradient-blue">
            {row.parcela.numero.toString().padStart(2, "0")}
          </span>{" "}
          ·{" "}
          <Link
            href={`/painel/operacoes/${row.operacao.id}`}
            className="hover:underline"
          >
            op {row.operacao.numero}
          </Link>
        </h1>
        <p className="mt-2 text-fg-muted">
          Vencimento {formatDate(row.parcela.vencimento)} ·{" "}
          {isPaga
            ? "Paga"
            : isCancelada
              ? "Cancelada (renegociada)"
              : isVencida
                ? "Vencida"
                : "A vencer"}
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-3 mb-6">
        <Stat label="Valor original" value={formatBRL(valorOriginal)} />
        <Stat
          label={isVencida ? "Atualizado (com encargos)" : "A pagar hoje"}
          value={formatBRL(valorAtualizado)}
          tone={isVencida ? "warn" : "default"}
        />
        <Stat
          label="Status"
          value={
            isPaga
              ? formatBRL(parseFloat(row.parcela.pagoValor ?? row.parcela.valor)) + " pago"
              : isCancelada
                ? "cancelada"
                : isVencida
                  ? "vencida"
                  : "a vencer"
          }
          tone={isPaga ? "success" : isVencida ? "warn" : "default"}
        />
      </div>

      {isPaga && (
        <div className="rounded-2xl border border-success/40 bg-green-50 p-5 mb-6">
          <h3 className="font-bold mb-1 text-success">✓ Parcela paga</h3>
          <p className="text-sm">
            Pago em{" "}
            <strong>
              {row.parcela.pagoEm
                ? formatDate(row.parcela.pagoEm)
                : "—"}
            </strong>{" "}
            · valor R$ {parseFloat(row.parcela.pagoValor ?? "0").toFixed(2)}
          </p>
          {row.parcela.comprovanteUrl && (
            <p className="text-xs text-fg-muted mt-1">
              📎 Comprovante anexado · {row.parcela.comprovanteNome}
            </p>
          )}
          <Link
            href={`/painel/duplicatas/${id}/recibo`}
            className="mt-3 inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent-dark"
          >
            📄 Ver recibo
          </Link>
        </div>
      )}

      {!isPaga && !isCancelada && (
        <DuplicataAcoesPanel
          parcelaId={id}
          valorOriginal={valorOriginal}
          valorAtualizado={valorAtualizado}
          vencimento={row.parcela.vencimento}
          temAntecipacaoPendente={antecipacoes.some(
            (a) => a.a.status === "pendente",
          )}
          temRenegociacaoPendente={renegociacoes.some(
            (r) => r.r.status === "pendente",
          )}
        />
      )}

      {antecipacoes.length > 0 && (
        <section className="mt-8">
          <h3 className="font-bold mb-3">Histórico de antecipação</h3>
          <ul className="space-y-2">
            {antecipacoes.map(({ a, decidoPor }) => (
              <li
                key={a.id}
                className="px-4 py-3 rounded-xl border border-border bg-bg-elev"
              >
                <div className="flex justify-between flex-wrap gap-2">
                  <div>
                    <div className="text-xs text-fg-muted">
                      Pedido em {formatDateTime(a.createdAt)}
                    </div>
                    <div className="font-semibold mt-0.5">
                      Antecipar para {formatDate(a.dataPretendida)} ·{" "}
                      {(parseFloat(a.descontoPct) * 100).toFixed(2)}% desconto ·{" "}
                      {formatBRL(parseFloat(a.valorAntecipado))}
                    </div>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
                {a.motivoRecusa && (
                  <div className="text-xs text-danger mt-1">
                    Motivo: {a.motivoRecusa}
                  </div>
                )}
                {a.decidoEm && (
                  <div className="text-[10px] font-mono text-fg-dim mt-1">
                    Decidido por {decidoPor ?? "—"} em{" "}
                    {formatDateTime(a.decidoEm)}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {renegociacoes.length > 0 && (
        <section className="mt-8">
          <h3 className="font-bold mb-3">Histórico de renegociação</h3>
          <ul className="space-y-2">
            {renegociacoes.map(({ r, decidoPor }) => (
              <li
                key={r.id}
                className="px-4 py-3 rounded-xl border border-border bg-bg-elev"
              >
                <div className="flex justify-between flex-wrap gap-2">
                  <div>
                    <div className="text-xs text-fg-muted">
                      Pedido em {formatDateTime(r.createdAt)} · tipo{" "}
                      <strong>{r.tipo}</strong>
                    </div>
                    <div className="font-semibold mt-0.5">{r.motivo}</div>
                    {r.tipo === "prorrogar" && r.novoVencimento && (
                      <div className="text-sm">
                        Novo vencimento: {formatDate(r.novoVencimento)}
                      </div>
                    )}
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                {r.motivoRecusa && (
                  <div className="text-xs text-danger mt-1">
                    Motivo: {r.motivoRecusa}
                  </div>
                )}
                {r.decidoEm && (
                  <div className="text-[10px] font-mono text-fg-dim mt-1">
                    Decidido por {decidoPor ?? "—"} em{" "}
                    {formatDateTime(r.decidoEm)}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </PainelShell>
  );
}

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "warn";
}) {
  const cls =
    tone === "success"
      ? "text-success"
      : tone === "warn"
        ? "text-danger"
        : "text-fg";
  return (
    <div className="rounded-2xl border border-border bg-bg-elev p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim mb-1">
        {label}
      </div>
      <div className={`text-xl font-bold tracking-tight ${cls}`}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pendente: "bg-yellow-50 text-warn",
    aprovada: "bg-green-50 text-success",
    aplicada: "bg-green-50 text-success",
    quitada: "bg-green-50 text-success",
    recusada: "bg-red-50 text-danger",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${
        map[status] ?? "bg-bg-card text-fg-muted"
      }`}
    >
      {status}
    </span>
  );
}
