/** ANA — Consumo de IA do mês (Antecipaqui).
 *
 *  GET /api/ana/ia-uso?mes=YYYY-MM   (sem ?mes = mês corrente em São Paulo)
 *  Auth: Authorization: Bearer $ANA_PULSO_TOKEN (mesmo token do pulso)
 *
 *  Une as duas fontes de consumo deste sistema — cicero_mensagens (o Cícero
 *  grava modelo + tokens em toda resposta) e ia_usos (chamadas de IA fora do
 *  Cícero) — agregadas por (modelo, lote), que é como a fatura separa:
 *
 *  { ok: true, mes: "2026-08", linhas: [
 *      { modelo, lote, chamadas, tokens_in, tokens_out,
 *        tokens_cache_leitura, tokens_cache_criacao } ] }
 */

import { NextResponse, type NextRequest } from "next/server";
import { linhasIaUso, mesCorrenteSP } from "@/lib/ia-uso";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function checarAuth(req: NextRequest): NextResponse | null {
  const esperado = process.env.ANA_PULSO_TOKEN;
  const auth = req.headers.get("authorization");
  if (!esperado || auth !== `Bearer ${esperado}`) {
    return NextResponse.json({ ok: false, erro: "não autorizado" }, { status: 401 });
  }
  return null;
}

export async function GET(req: NextRequest) {
  const authErro = checarAuth(req);
  if (authErro) return authErro;

  const mes = req.nextUrl.searchParams.get("mes") ?? mesCorrenteSP();
  if (!/^\d{4}-\d{2}$/.test(mes)) {
    return NextResponse.json(
      { ok: false, erro: "mes inválido, use YYYY-MM" },
      { status: 400 },
    );
  }

  try {
    const linhas = await linhasIaUso(mes);
    return NextResponse.json({ ok: true, mes, linhas });
  } catch (e) {
    return NextResponse.json(
      { ok: false, erro: e instanceof Error ? e.message : "erro ao medir o consumo" },
      { status: 500 },
    );
  }
}
