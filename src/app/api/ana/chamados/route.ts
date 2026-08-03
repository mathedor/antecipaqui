/** ANA — Chamados um a um (Antecipaqui).
 *
 *  GET /api/ana/chamados
 *  Auth: Authorization: Bearer $ANA_PULSO_TOKEN
 *
 *  Lista os tickets ABERTOS (mesma entidade do chamados_abertos do pulso):
 *  status aberto/aguardando_resposta e não arquivados, máx 50, mais antigos
 *  primeiro. Query defensiva — falha devolve lista vazia, nunca 500.
 */

import { NextResponse, type NextRequest } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const expected = process.env.ANA_PULSO_TOKEN;
  const auth = req.headers.get("authorization");
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let chamados: Record<string, unknown>[] = [];
  try {
    const res = await db.execute(sql`
      SELECT
        t.id,
        t.assunto,
        t.status,
        t.categoria,
        t.created_at,
        u.nome AS de_nome,
        u.email AS de_email,
        (SELECT m.body FROM ticket_messages m
          WHERE m.ticket_id = t.id AND m.kind = 'user'
          ORDER BY m.created_at DESC LIMIT 1) AS ultima_msg
      FROM tickets t
      JOIN users u ON u.id = t.user_id
      WHERE t.status IN ('aberto', 'aguardando_resposta')
        AND t.arquivado_em IS NULL
      ORDER BY t.created_at ASC
      LIMIT 50
    `);
    const rows = (
      res as unknown as {
        rows: {
          id: string;
          assunto: string;
          status: string;
          categoria: string;
          created_at: string | Date;
          de_nome: string | null;
          de_email: string;
          ultima_msg: string | null;
        }[];
      }
    ).rows ?? [];

    chamados = rows.map((r) => {
      const criadoEm = new Date(r.created_at);
      const paradoDias =
        (Date.now() - criadoEm.getTime()) / (1000 * 60 * 60 * 24);
      // Alta: saque de cashback (dinheiro do user) ou ticket parado há 3+ dias
      const alta = r.categoria === "cashback" || paradoDias >= 3;
      const detalheParts = [`categoria: ${r.categoria}`];
      if (r.ultima_msg) {
        detalheParts.push(
          `última mensagem: ${r.ultima_msg.slice(0, 280)}`,
        );
      }
      return {
        id: r.id,
        titulo: r.assunto,
        de: r.de_nome ? `${r.de_nome} <${r.de_email}>` : r.de_email,
        status: r.status,
        prioridade: alta ? "alta" : "normal",
        criado_em: criadoEm.toISOString(),
        detalhe: detalheParts.join(" · "),
        url: `https://www.antecipaqui.digital/admin/tickets/${r.id}`,
      };
    });
  } catch {
    chamados = [];
  }

  return NextResponse.json({ sistema: "antecipaqui", chamados });
}
