import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth-user";
import { getRecebimentosFundo } from "@/lib/actions/fundos";
import { PainelShell } from "@/components/painel-shell";
import { RecebimentosTable } from "@/components/recebimentos-table";
import { formatBRL } from "@/lib/format";

export const metadata = {
  title: "Recebimentos",
};

function isOverdue(vencimento: string, status: string) {
  if (status !== "a_vencer") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(vencimento + "T00:00:00") < today;
}

export default async function RecebimentosPage() {
  const user = await getCurrentDbUser();
  if (!user) redirect("/entrar");
  if (user.role !== "fundo") redirect("/painel");

  const data = await getRecebimentosFundo();
  if (!data) redirect("/painel");

  const totals = {
    aReceber: data.parcelas
      .filter((p) => p.statusParcela === "a_vencer" && !isOverdue(p.vencimento, p.statusParcela))
      .reduce((s, p) => s + parseFloat(p.valor), 0),
    atrasadas: data.parcelas
      .filter(
        (p) =>
          p.statusParcela === "vencida" ||
          isOverdue(p.vencimento, p.statusParcela),
      )
      .reduce((s, p) => s + parseFloat(p.valor), 0),
    recebidas: data.parcelas
      .filter((p) => p.statusParcela === "paga")
      .reduce((s, p) => s + parseFloat(p.pagoValor ?? p.valor), 0),
  };

  return (
    <PainelShell role="fundo" userName={user.nome} active="/painel/recebimentos">
      <div className="flex items-end justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-display-md">
            <span className="text-gradient-blue">Recebimentos</span> a receber
          </h1>
          <p className="mt-2 text-fg-muted">
            Cronograma das parcelas das operações que você financia. Cada
            parcela é paga pela construtora à Antecipaqui e repassada ao fundo.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-8">
        <Stat label="A receber" value={formatBRL(totals.aReceber)} />
        <Stat
          label="Atrasadas"
          value={formatBRL(totals.atrasadas)}
          tone="warn"
        />
        <Stat
          label="Já recebido"
          value={formatBRL(totals.recebidas)}
          tone="success"
        />
      </div>

      {data.parcelas.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border-strong bg-bg-card p-10 text-center">
          <div className="text-5xl mb-3">📭</div>
          <h2 className="text-xl font-bold">Nenhuma parcela a receber</h2>
          <p className="mt-2 text-fg-muted">
            Quando uma operação financiada por este fundo for aprovada, as
            parcelas aparecem aqui com seu cronograma.
          </p>
        </div>
      ) : (
        <RecebimentosTable rows={data.parcelas} />
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
  tone?: "default" | "warn" | "success";
}) {
  const toneCls =
    tone === "warn"
      ? "border-warn/40 bg-yellow-50"
      : tone === "success"
        ? "border-success/40 bg-green-50"
        : "border-border bg-bg-elev";
  const labelCls =
    tone === "warn"
      ? "text-warn"
      : tone === "success"
        ? "text-success"
        : "text-fg-dim";
  return (
    <div className={`rounded-2xl border p-5 ${toneCls}`}>
      <div
        className={`font-mono text-[10px] uppercase tracking-[0.2em] mb-2 ${labelCls}`}
      >
        {label}
      </div>
      <div className="font-mono tabular text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl font-bold tracking-tight leading-tight break-words text-fg">
        {value}
      </div>
    </div>
  );
}
