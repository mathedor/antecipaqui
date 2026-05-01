import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth-user";
import {
  getConstrutoraByOwnerId,
  getDuplicatasParaPagar,
} from "@/lib/actions/operacoes";
import { PainelShell } from "@/components/painel-shell";
import { DuplicatasTable } from "@/components/duplicatas-table";
import { formatBRL } from "@/lib/format";

export const metadata = {
  title: "Duplicatas",
};

function isOverdue(vencimento: string, status: string) {
  if (status !== "a_vencer") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const v = new Date(vencimento + "T00:00:00");
  return v < today;
}

export default async function DuplicatasPage() {
  const user = await getCurrentDbUser();
  if (!user) redirect("/entrar");

  if (user.role !== "construtora") {
    redirect("/painel");
  }

  const construtora = await getConstrutoraByOwnerId(user.id);
  if (!construtora) {
    redirect("/painel/onboarding");
  }

  const duplicatas = await getDuplicatasParaPagar(construtora.id);

  const totals = {
    aPagar: duplicatas
      .filter((d) => d.statusParcela === "a_vencer")
      .reduce((s, d) => s + parseFloat(d.valor), 0),
    vencidas: duplicatas
      .filter(
        (d) =>
          d.statusParcela === "vencida" ||
          isOverdue(d.vencimento, d.statusParcela),
      )
      .reduce((s, d) => s + parseFloat(d.valor), 0),
    pagas: duplicatas
      .filter((d) => d.statusParcela === "paga")
      .reduce((s, d) => s + parseFloat(d.pagoValor ?? d.valor), 0),
  };

  return (
    <PainelShell
      role="construtora"
      userName={user.nome}
      active="/painel/duplicatas"
    >
      <div className="flex items-end justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-display-md">
            <span className="text-gradient-blue">Duplicatas</span> a pagar
          </h1>
          <p className="mt-2 text-fg-muted">
            Cronograma das parcelas que você deve pra Antecipaqui pelas
            comissões antecipadas dos corretores.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-8">
        <Stat label="A vencer" value={formatBRL(totals.aPagar)} />
        <Stat label="Vencidas" value={formatBRL(totals.vencidas)} tone="warn" />
        <Stat label="Já pagas" value={formatBRL(totals.pagas)} />
      </div>

      {duplicatas.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border-strong bg-bg-card p-10 text-center">
          <div className="text-5xl mb-3">📭</div>
          <h2 className="text-xl font-bold">Nenhuma duplicata pendente</h2>
          <p className="mt-2 text-fg-muted">
            Quando uma operação vinculada à sua construtora for aprovada, as
            parcelas aparecem aqui.
          </p>
        </div>
      ) : (
        <DuplicatasTable rows={duplicatas} />
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
  tone?: "default" | "warn";
}) {
  const isWarn = tone === "warn";
  return (
    <div
      className={`rounded-2xl border p-5 ${
        isWarn ? "border-warn/40 bg-yellow-50" : "border-border bg-bg-elev"
      }`}
    >
      <div
        className={`font-mono text-[10px] uppercase tracking-[0.2em] mb-2 ${
          isWarn ? "text-warn" : "text-fg-dim"
        }`}
      >
        {label}
      </div>
      <div className="font-mono tabular text-base sm:text-xl md:text-2xl lg:text-3xl font-bold tracking-tight leading-tight break-words text-fg">
        {value}
      </div>
    </div>
  );
}
