import Link from "next/link";
import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { imobiliarias, construtoras } from "@/db/schema";
import { getCurrentDbUser } from "@/lib/auth-user";

export const metadata = {
  title: "Painel",
};

const ROLE_LABEL: Record<string, string> = {
  corretor: "Corretor",
  imobiliaria: "Imobiliária",
  construtora: "Construtora",
  admin: "Administrador",
};

const STATUS_LABEL: Record<string, { label: string; tone: string }> = {
  pendente: { label: "Onboarding pendente", tone: "warn" },
  documentos_enviados: {
    label: "Aguardando análise",
    tone: "warn",
  },
  aprovado: { label: "Aprovado", tone: "success" },
  recusado: { label: "Recusado", tone: "danger" },
};

export default async function PainelPage() {
  const user = await getCurrentDbUser();
  if (!user) redirect("/entrar");

  // Pega empresa associada se tiver
  const empresa =
    user.role === "construtora"
      ? (
          await db
            .select()
            .from(construtoras)
            .where(eq(construtoras.ownerUserId, user.id))
            .limit(1)
        )[0]
      : (
          await db
            .select()
            .from(imobiliarias)
            .where(eq(imobiliarias.ownerUserId, user.id))
            .limit(1)
        )[0];

  const status = STATUS_LABEL[user.onboardingStatus] ?? STATUS_LABEL.pendente;
  const onboardingPendente = user.onboardingStatus === "pendente";
  const docsEnviados = user.onboardingStatus === "documentos_enviados";
  const aprovado = user.onboardingStatus === "aprovado";

  return (
    <section className="mx-auto max-w-6xl px-6 py-16 md:py-20 min-h-[60vh]">
      <div className="rounded-3xl border border-border bg-bg-elev p-8 md:p-12">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
          <div>
            <div className="eyebrow mb-3">painel</div>
            <h1 className="text-display-md">
              Olá,{" "}
              <span className="text-gradient-blue">
                {user.nome?.split(" ")[0] ?? "bem-vindo"}
              </span>
              .
            </h1>
            <p className="mt-3 text-fg-muted text-lg max-w-xl">
              {ROLE_LABEL[user.role] ?? user.role}
              {empresa && (
                <>
                  {" · "}
                  <span className="text-fg">{empresa.razaoSocial}</span>
                </>
              )}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <span
                className={`size-2 rounded-full ${
                  status.tone === "success"
                    ? "bg-success"
                    : status.tone === "danger"
                      ? "bg-danger"
                      : "bg-warn"
                }`}
              />
              <span className="font-mono text-[11px] uppercase tracking-wider text-fg-muted">
                {status.label}
              </span>
            </div>
          </div>
          <UserButton />
        </div>

        {onboardingPendente && (
          <div className="rounded-2xl border border-accent/30 bg-accent-soft p-6 mb-6">
            <div className="font-mono text-[10px] uppercase tracking-wider text-accent mb-2">
              próximo passo
            </div>
            <h2 className="text-xl font-bold">Complete seu cadastro</h2>
            <p className="mt-2 text-fg-muted">
              Em 5 minutos: escolha o tipo de perfil e preencha os dados da
              empresa. Depois é só enviar os documentos.
            </p>
            <Link
              href="/painel/onboarding"
              className="btn-primary mt-5 !h-11 !px-5"
            >
              Iniciar cadastro <span className="arrow">→</span>
            </Link>
          </div>
        )}

        {docsEnviados && (
          <div className="rounded-2xl border border-warn/30 bg-yellow-50 p-6 mb-6">
            <div className="font-mono text-[10px] uppercase tracking-wider text-warn mb-2">
              em análise
            </div>
            <h2 className="text-xl font-bold">Cadastro recebido</h2>
            <p className="mt-2 text-fg-muted">
              Seus dados foram salvos. A próxima etapa (em construção) é o
              upload dos documentos KYC. Em breve você poderá enviar pelo
              próprio painel.
            </p>
          </div>
        )}

        {aprovado && (
          <div className="rounded-2xl border border-success/30 bg-green-50 p-6 mb-6">
            <div className="font-mono text-[10px] uppercase tracking-wider text-success mb-2">
              tudo certo
            </div>
            <h2 className="text-xl font-bold">Conta aprovada</h2>
            <p className="mt-2 text-fg-muted">
              Você pode cadastrar suas operações.
            </p>
          </div>
        )}

        <div className="rounded-2xl border border-dashed border-border-strong bg-bg-card p-6">
          <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim mb-3">
            roadmap deste painel
          </div>
          <ul className="space-y-3 text-fg-muted text-sm">
            <Item done label="Conta Clerk + sync com DB Postgres" />
            <Item
              done={!onboardingPendente}
              label="Escolher perfil + dados da empresa (onboarding step 1 e 2)"
            />
            <Item
              done={false}
              label="Upload de documentos KYC (onboarding step 3) — em construção"
            />
            <Item
              done={false}
              label="Cadastro de operação + simulador integrado — Phase 3"
            />
            <Item
              done={false}
              label="Dashboard de operações + duplicatas — Phase 3"
            />
          </ul>
        </div>

        <div className="mt-8 flex justify-between items-center">
          <Link href="/" className="link-underline text-fg-muted hover:text-fg">
            ← Home
          </Link>
          <span className="font-mono text-[10px] uppercase tracking-wider text-fg-dim">
            user · {user.id.slice(0, 12)}…
          </span>
        </div>
      </div>
    </section>
  );
}

function Item({ done, label }: { done: boolean; label: string }) {
  return (
    <li className="flex items-start gap-3">
      <span
        className={`size-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5 ${
          done
            ? "bg-accent text-white"
            : "bg-bg-elev border border-border text-fg-dim"
        }`}
      >
        {done ? "✓" : "·"}
      </span>
      <span>{label}</span>
    </li>
  );
}
