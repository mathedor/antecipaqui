import { notFound } from "next/navigation";
import { getColetaTokenInfo } from "@/lib/actions/corretor-velocidade";
import { ColetaCompradorForm } from "@/components/coleta-comprador-form";

export const metadata = { title: "Cadastro de comprador" };

type Params = { params: Promise<{ token: string }> };

export default async function ColetaCompradorPage({ params }: Params) {
  const { token } = await params;
  const info = await getColetaTokenInfo(token);
  if (!info) notFound();

  const now = new Date();
  const expirou = info.expiresAt < now;
  const jaPreenchido = !!info.preenchidoEm;

  return (
    <main className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-fg-dim mb-2">
            antecipaqui · coleta de dados
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Cadastro de comprador
          </h1>
          {info.corretorNome && (
            <p className="mt-2 text-sm text-fg-muted">
              <strong>{info.corretorNome}</strong> pediu pra você preencher
              seus dados
              {info.construtoraNome && (
                <>
                  {" "}
                  pra fechar a compra com a{" "}
                  <strong>{info.construtoraNome}</strong>
                </>
              )}
              .
            </p>
          )}
        </div>

        {expirou ? (
          <div className="rounded-2xl border border-danger/40 bg-red-50 p-6 text-center">
            <div className="text-3xl mb-2">⏰</div>
            <h2 className="font-bold mb-1">Link expirado</h2>
            <p className="text-sm text-fg-muted">
              Esse link de coleta passou da validade. Peça um novo ao corretor.
            </p>
          </div>
        ) : jaPreenchido ? (
          <div className="rounded-2xl border border-success/40 bg-green-50 p-6 text-center">
            <div className="text-3xl mb-2">✓</div>
            <h2 className="font-bold mb-1">Dados enviados</h2>
            <p className="text-sm text-fg-muted">
              Seus dados já foram enviados. O corretor confirma e segue com a
              operação. Pode fechar essa página.
            </p>
          </div>
        ) : (
          <ColetaCompradorForm token={token} />
        )}
      </div>
    </main>
  );
}
