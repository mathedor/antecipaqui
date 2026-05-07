import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { fundos } from "@/db/schema";

/** CNPJ canônico da Antecipaqui (sem máscara). Usado pra localizar o
 *  registro principal na tabela `fundos`. Se o CNPJ mudar no futuro,
 *  altere aqui ou setando ANTECIPAQUI_CNPJ no env. */
const ANTECIPAQUI_CNPJ_DEFAULT = "63027806000193";

export type AntecipaquiData = {
  razaoSocial: string;
  nomeFantasia: string | null;
  cnpj: string;
  endereco: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
  telefone: string | null;
  email: string | null;
  bancoNome: string | null;
  bancoCodigo: string | null;
  bancoAgencia: string | null;
  bancoConta: string | null;
  bancoPix: string | null;
};

const FALLBACK: AntecipaquiData = {
  razaoSocial: "ANTECIPAQUI SOLUCOES FINANCEIRAS LTDA",
  nomeFantasia: "AntecipAqui",
  cnpj: ANTECIPAQUI_CNPJ_DEFAULT,
  endereco: null,
  cidade: null,
  uf: null,
  cep: null,
  telefone: null,
  email: null,
  bancoNome: null,
  bancoCodigo: null,
  bancoAgencia: null,
  bancoConta: null,
  bancoPix: null,
};

let cache: { at: number; data: AntecipaquiData } | null = null;
const CACHE_MS = 5 * 60 * 1000;

/** Busca o registro do fundo "Antecipaqui" pelos seus dados oficiais
 *  (razão/CNPJ/endereço/banco). Cacheia 5 min. Usado pra emissão de
 *  invoice e banners administrativos. */
export async function getAntecipaquiData(): Promise<AntecipaquiData> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.data;

  const cnpj = (process.env.ANTECIPAQUI_CNPJ ?? ANTECIPAQUI_CNPJ_DEFAULT).replace(
    /\D/g,
    "",
  );
  const [byCnpj] = await db
    .select()
    .from(fundos)
    .where(eq(fundos.cnpj, cnpj))
    .limit(1);

  // Fallback: tenta por nome contendo "antecipaqui"
  const row =
    byCnpj ??
    (
      await db
        .select()
        .from(fundos)
        .where(sql`LOWER(${fundos.razaoSocial}) LIKE '%antecipaqui%'`)
        .limit(1)
    )[0];

  if (!row) {
    cache = { at: Date.now(), data: FALLBACK };
    return FALLBACK;
  }

  const data: AntecipaquiData = {
    razaoSocial: row.razaoSocial,
    nomeFantasia: row.nomeFantasia,
    cnpj: row.cnpj,
    endereco: row.endereco,
    cidade: row.cidade,
    uf: row.uf,
    cep: row.cep,
    telefone: row.telefone,
    email: row.emailComercial,
    bancoNome: row.bancoNome,
    bancoCodigo: row.bancoCodigo,
    bancoAgencia: row.bancoAgencia,
    bancoConta: row.bancoConta,
    bancoPix: row.bancoPix,
  };
  cache = { at: Date.now(), data };
  return data;
}