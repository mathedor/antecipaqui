import Link from "next/link";
import { notFound } from "next/navigation";
import { BorderoCard } from "@/components/bordero-card";
import { PrintButton } from "@/components/print-button";
import { getBorderoData } from "@/lib/bordero";

export const metadata = { title: "Borderô da operação" };

type Params = { params: Promise<{ id: string }> };

export default async function BorderoPage({ params }: Params) {
  const { id } = await params;
  const data = await getBorderoData(id);
  if (!data) notFound();

  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto max-w-5xl px-4 md:px-6 py-6 md:py-10">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-6 print:hidden">
          <Link
            href="/painel/operacoes"
            className="font-mono text-[11px] uppercase tracking-wider text-fg-muted hover:text-fg transition-colors"
          >
            ← voltar
          </Link>
          <div className="flex items-center gap-2">
            <a
              href={`/api/operacoes/${id}/bordero.pdf?download=1`}
              className="btn-primary !h-10 !px-4"
              download={`bordero-${data.numero}.pdf`}
            >
              ↓ Baixar PDF
            </a>
            <PrintButton>🖨 Imprimir</PrintButton>
          </div>
        </div>

        <BorderoCard data={data} />
      </div>
    </div>
  );
}
