import Link from "next/link";
import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import { AdminCadastrarOperacaoForm } from "@/components/admin-cadastrar-operacao-form";
import {
  listCorretoresForSelector,
  listConstrutorasForSelector,
} from "@/lib/actions/admin-cadastrar";
import {
  listComerciaisForSelector,
  getDefaultComercialId,
} from "@/lib/actions/comerciais";
import { getTaxaMensal } from "@/lib/actions/settings";

export const metadata = { title: "Admin · Cadastrar operação" };

export default async function AdminCadastrarOperacaoPage() {
  const admin = await requireAdmin();
  const [
    corretores,
    construtorasList,
    comerciais,
    taxaMensal,
    defaultComercialId,
  ] = await Promise.all([
    listCorretoresForSelector(),
    listConstrutorasForSelector(),
    listComerciaisForSelector(),
    getTaxaMensal(),
    getDefaultComercialId(),
  ]);

  return (
    <AdminShell active="/admin/cadastrar" userName={admin.nome}>
      <Link
        href="/admin/cadastrar"
        className="font-mono text-[11px] uppercase tracking-wider text-fg-muted hover:text-fg transition-colors mb-3 inline-block"
      >
        ← cadastrar
      </Link>
      <h1 className="text-display-md mb-2">
        Cadastrar <span className="text-gradient-blue">operação</span>
      </h1>
      <p className="text-fg-muted mb-8 max-w-2xl">
        Você cadastra a operação no nome de um corretor / imobiliária
        existente. Documentos (contratos, NF) são opcionais aqui — admin pode
        anexar depois pela página da operação.
      </p>

      <AdminCadastrarOperacaoForm
        corretores={corretores}
        construtoras={construtorasList}
        comerciais={comerciais}
        defaultComercialId={defaultComercialId ?? ""}
        taxaMensalSugerida={taxaMensal}
      />
    </AdminShell>
  );
}
