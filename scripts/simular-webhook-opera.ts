/**
 * SIMULADOR DE WEBHOOK DO FUNDO — exercita a peça 05 (status) e a 06
 * (duplicatas) do nosso lado, com assinatura HMAC de verdade, contra o
 * ambiente que você apontar.
 *
 * Serve pra provar que estamos prontos ANTES de a OPERA abrir a torneira:
 * eles confirmaram (03/09) que o status vem SEMPRE por webhook, conforme
 * andam a esteira do lado deles, e que as duplicatas só saem depois do
 * fechamento da operação lá.
 *
 * `--repetir N` manda o MESMO fato N vezes com eventoId diferente a cada
 * vez — que é como eles se comportam (9 avisos da mesma aprovação em
 * 02/09). O esperado é: primeira vez aplica e avisa; as demais atualizam o
 * espelho e ficam caladas.
 *
 *   npx tsx scripts/simular-webhook-opera.ts --status aguardando_pagamento
 *   npx tsx scripts/simular-webhook-opera.ts --status pago --repetir 3
 *   npx tsx scripts/simular-webhook-opera.ts --duplicatas
 *   ... --op OP-HOMOLOG-0002 --base https://www.antecipaqui.digital
 */
import { config } from "dotenv";
import crypto from "node:crypto";

config({ path: ".env.local" });
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL ausente");
process.env.DATABASE_URL = process.env.DATABASE_URL.replace(
  "/neondb?",
  "/antecipaqui_prod?",
);

function arg(nome: string, padrao?: string): string | undefined {
  const i = process.argv.indexOf(`--${nome}`);
  return i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--")
    ? process.argv[i + 1]
    : padrao;
}

async function main() {
  const { desc, eq, isNotNull } = await import("drizzle-orm");
  const { db } = await import("../src/db");
  const { fundos, operacoes, operaOperacoes, parcelasComissao } = await import(
    "../src/db/schema"
  );
  const { contratoDoFundo } = await import("../src/lib/opera/client");

  const [fundo] = await db
    .select()
    .from(fundos)
    .where(eq(fundos.integracaoTipo, "opera"))
    .limit(1);
  if (!fundo) throw new Error("nenhum fundo com integração opera");
  if (!fundo.integracaoWebhookSecret)
    throw new Error("fundo sem segredo de webhook configurado");
  const contrato = contratoDoFundo(fundo);

  // Operação alvo: a informada por número, ou a última enviada ao fundo.
  const numeroOp = arg("op");
  const alvo = numeroOp
    ? await db
        .select({
          id: operacoes.id,
          numero: operacoes.numero,
          externoId: operaOperacoes.externoId,
        })
        .from(operacoes)
        .innerJoin(operaOperacoes, eq(operaOperacoes.operacaoId, operacoes.id))
        .where(eq(operacoes.numero, numeroOp))
        .limit(1)
    : await db
        .select({
          id: operacoes.id,
          numero: operacoes.numero,
          externoId: operaOperacoes.externoId,
        })
        .from(operaOperacoes)
        .innerJoin(operacoes, eq(operacoes.id, operaOperacoes.operacaoId))
        .where(isNotNull(operaOperacoes.enviadaEm))
        .orderBy(desc(operaOperacoes.enviadaEm))
        .limit(1);
  const op = alvo[0];
  if (!op) throw new Error("operação alvo não encontrada / nunca enviada");

  const duplicatas = process.argv.includes("--duplicatas");
  const tipo = duplicatas ? "duplicatas" : "status";
  const statusCru = arg("status", "aguardando_pagamento")!;
  const repetir = Number(arg("repetir", "1"));
  const base = arg("base", "https://www.antecipaqui.digital")!;
  const url = `${base.replace(/\/+$/, "")}/api/opera/webhook/${tipo}/${fundo.id}`;

  console.log(`alvo: ${op.numero} (operacao_id do fundo: ${op.externoId})`);
  console.log(`destino: ${url}`);
  console.log(
    duplicatas ? "evento: duplicatas" : `evento: status "${statusCru}"`,
  );
  console.log(`repetições: ${repetir}\n`);

  const parcelas = duplicatas
    ? await db
        .select()
        .from(parcelasComissao)
        .where(eq(parcelasComissao.operacaoId, op.id))
        .orderBy(parcelasComissao.numero)
    : [];

  for (let i = 1; i <= repetir; i++) {
    // eventoId novo a cada entrega — é assim que eles mandam.
    const eventoId = `sim_${Date.now().toString(36)}_${i}`;
    const corpo = duplicatas
      ? {
          eventoId,
          operacaoId: op.externoId,
          numero_operacao_parceiro: op.numero,
          dataEvento: new Date().toISOString(),
          duplicatas: parcelas.map((p) => ({
            numero: `${op.numero}/${String(p.numero).padStart(3, "0")}`,
            valor: Number(p.valor),
            vencimento: p.vencimento,
            sacado: "CONSTRUTORA TESTE HOMOLOGACAO 02 ANTECIPAQUI LTDA",
            link: `https://exemplo-simulado.invalid/duplicata/${p.numero}`,
          })),
        }
      : {
          eventoId,
          operacaoId: op.externoId,
          numero_operacao_parceiro: op.numero,
          status: statusCru,
          observacao: "Evento SIMULADO pela Antecipaqui (homologação).",
          dataEvento: new Date().toISOString(),
        };

    const cru = JSON.stringify(corpo);
    const assinatura =
      contrato.assinatura.prefixo +
      crypto
        .createHmac("sha256", fundo.integracaoWebhookSecret)
        .update(cru, "utf8")
        .digest(contrato.assinatura.formato === "base64" ? "base64" : "hex");

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        [contrato.assinatura.header]: assinatura,
      },
      body: cru,
    });
    const texto = await res.text();
    console.log(`entrega ${i}/${repetir} → HTTP ${res.status} ${texto}`);
  }
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error("erro:", (e as Error).message);
    process.exit(1);
  },
);
