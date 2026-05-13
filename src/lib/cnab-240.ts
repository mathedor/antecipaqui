/**
 * CNAB 240 — geração de remessa e parser de retorno (FEBRABAN, subset).
 *
 * Esta é uma implementação **mínima e bancária-agnóstica** que segue a
 * estrutura geral do layout FEBRABAN 240. Bancos têm variações específicas
 * (campos reservados, código de movimento, etc) — pra cada banco real é
 * preciso ajustar. Documentado pra ser extensível.
 *
 * Layout FEBRABAN 240 (resumido):
 *   - Header de arquivo  (registro tipo 0)
 *   - Header de lote     (registro tipo 1)
 *   - Detalhes (segmento P, Q, R) (registro tipo 3)
 *   - Trailer de lote    (registro tipo 5)
 *   - Trailer de arquivo (registro tipo 9)
 *
 * Cada linha tem exatamente 240 caracteres, com padding fixo.
 */

import { unmaskCNPJ } from "@/lib/cnpj";

export type CnabFundoConfig = {
  bancoCodigo: string; // 001 BB, 341 Itaú, 237 Bradesco, etc
  carteira: string;
  convenio: string;
  cedenteCodigo: string;
  razaoSocial: string;
  cnpj: string; // só dígitos
  bancoAgencia: string | null;
  bancoConta: string | null;
};

export type CnabParcelaRemessa = {
  nossoNumero: string;
  numeroDocumento: string; // ex: número da operação + numero da parcela
  vencimento: string; // YYYY-MM-DD
  valor: number;
  sacadoNome: string;
  sacadoCpfCnpj: string;
  sacadoEndereco: string | null;
  sacadoCidade: string | null;
  sacadoUf: string | null;
  sacadoCep: string | null;
};

function pad(s: string | number, n: number, char = " ", left = true) {
  const v = String(s ?? "");
  if (v.length >= n) return v.slice(0, n);
  return left ? v.padStart(n, char) : v.padEnd(n, char);
}

function padLeft(s: string | number, n: number, char = "0") {
  return pad(s, n, char, true);
}
function padRight(s: string | number, n: number, char = " ") {
  return pad(s, n, char, false);
}

function fmtDate(yyyymmdd: string): string {
  // "2026-05-13" → "13052026"
  const [y, m, d] = yyyymmdd.split("-");
  return `${d}${m}${y}`;
}

function fmtValor(v: number): string {
  // Centavos zero-padded em 15 dígitos
  const cents = Math.round(v * 100);
  return padLeft(cents, 15);
}

/** Gera arquivo CNAB 240 com 1 lote contendo todas as parcelas.
 *  Subset bancário-agnóstico — bancos específicos podem precisar ajustes
 *  em campos reservados (posições 17–20 do header etc). */
export function gerarRemessa240({
  fundo,
  parcelas,
  numeroSequencialArquivo = 1,
}: {
  fundo: CnabFundoConfig;
  parcelas: CnabParcelaRemessa[];
  numeroSequencialArquivo?: number;
}): string {
  const dataGeracao = new Date()
    .toISOString()
    .slice(0, 10);
  const dataGeracaoCnab = fmtDate(dataGeracao);
  const horaGeracao = new Date()
    .toISOString()
    .slice(11, 19)
    .replace(/:/g, "");
  const cnpj = unmaskCNPJ(fundo.cnpj);

  const linhas: string[] = [];

  // ─── Header de arquivo (tipo 0) ─────────────────────────────────────
  linhas.push(
    padLeft(fundo.bancoCodigo, 3) +
      "0000" + // lote sempre 0000 no header de arquivo
      "0" + // registro tipo 0
      padRight("", 9) + // 9 brancos reservados
      "2" + // tipo de inscrição (2=CNPJ)
      padLeft(cnpj, 14) +
      padLeft(fundo.convenio, 20) +
      padLeft(fundo.bancoAgencia ?? "0", 5) +
      "0" + // dac agência
      padLeft(fundo.bancoConta ?? "0", 12) +
      "0" + // dac conta
      "0" + // dac agência+conta
      padRight(fundo.razaoSocial, 30) +
      padRight("BANCO", 30) +
      padRight("", 10) +
      "1" + // código de remessa (1) ou retorno (2)
      dataGeracaoCnab +
      horaGeracao +
      padLeft(numeroSequencialArquivo, 6) +
      "087" + // versão do layout (FEBRABAN)
      "00000" + // densidade de gravação
      padRight("", 20) + // reservado banco
      padRight("", 20) + // reservado empresa
      padRight("", 29), // brancos
  );

  // ─── Header de lote (tipo 1) ────────────────────────────────────────
  linhas.push(
    padLeft(fundo.bancoCodigo, 3) +
      "0001" + // lote 0001
      "1" + // registro tipo 1
      "R" + // operação remessa
      "01" + // tipo de serviço (01=cobrança)
      "00" + // forma de lançamento
      "030" + // versão do layout do lote
      " " + // CNAB
      "2" + // tipo inscrição empresa
      padLeft(cnpj, 15) +
      padRight(fundo.convenio, 20) +
      padLeft(fundo.bancoAgencia ?? "0", 5) +
      "0" +
      padLeft(fundo.bancoConta ?? "0", 12) +
      "0" +
      "0" +
      padRight(fundo.razaoSocial, 30) +
      padRight("", 40) + // mensagem 1
      padRight("", 40) + // mensagem 2
      padLeft(numeroSequencialArquivo, 8) +
      dataGeracaoCnab +
      padRight("", 8) + // data crédito (cobrança não usa)
      padRight("", 33),
  );

  // ─── Detalhes ──────────────────────────────────────────────────────
  let numRegistro = 1;
  for (const p of parcelas) {
    // Segmento P (dados do título)
    linhas.push(
      padLeft(fundo.bancoCodigo, 3) +
        "0001" +
        "3" +
        padLeft(numRegistro++, 5) +
        "P" +
        " " +
        "01" + // código de movimento (01=entrada de títulos)
        padLeft(fundo.bancoAgencia ?? "0", 5) +
        "0" +
        padLeft(fundo.bancoConta ?? "0", 12) +
        "0" +
        "0" +
        padRight(p.nossoNumero, 20) +
        padRight(fundo.carteira, 1) +
        "1" + // forma cadastramento
        "0" + // tipo documento
        "2" + // emissão do boleto
        "2" + // distribuição do boleto
        padRight(p.numeroDocumento, 15) +
        fmtDate(p.vencimento) +
        fmtValor(p.valor) +
        padLeft(0, 5) + // agência cobradora
        "0" +
        "02" + // espécie título (02=DM)
        "N" + // aceite
        dataGeracaoCnab +
        "0" + // código juros
        padRight("", 8) +
        padLeft(0, 15) + // juros valor por dia
        "0" + // código desconto
        padRight("", 8) +
        padLeft(0, 15) + // desconto valor
        padLeft(0, 15) + // valor IOF
        padLeft(0, 15) + // valor abatimento
        padRight(p.numeroDocumento, 25) +
        "3" + // código protesto (3=não protestar)
        "00" + // dias protesto
        "1" + // baixa devolução
        "060" + // dias baixa
        "09" + // moeda (09=Real)
        padRight("", 10) +
        padRight("", 1),
    );

    // Segmento Q (sacado)
    const docDigits = p.sacadoCpfCnpj.replace(/\D/g, "");
    linhas.push(
      padLeft(fundo.bancoCodigo, 3) +
        "0001" +
        "3" +
        padLeft(numRegistro++, 5) +
        "Q" +
        " " +
        "01" +
        (docDigits.length === 11 ? "1" : "2") +
        padLeft(docDigits, 15) +
        padRight(p.sacadoNome, 40) +
        padRight(p.sacadoEndereco ?? "", 40) +
        padRight("", 15) + // bairro
        padLeft(p.sacadoCep ?? "0", 8) +
        padRight(p.sacadoCidade ?? "", 15) +
        padRight(p.sacadoUf ?? "", 2) +
        // sacador/avalista
        "0" +
        padLeft(0, 15) +
        padRight("", 40) +
        padRight("", 3) +
        padRight("", 20) +
        padRight("", 8),
    );
  }

  // ─── Trailer de lote (tipo 5) ──────────────────────────────────────
  linhas.push(
    padLeft(fundo.bancoCodigo, 3) +
      "0001" +
      "5" +
      padRight("", 9) +
      padLeft(parcelas.length * 2 + 2, 6) + // total de registros no lote (P+Q por parcela + header+trailer)
      padLeft(parcelas.length, 6) +
      fmtValor(parcelas.reduce((s, p) => s + p.valor, 0)) +
      padLeft(0, 6) +
      padLeft(0, 17) +
      padLeft(0, 6) +
      padLeft(0, 17) +
      padLeft(0, 6) +
      padLeft(0, 17) +
      padRight("", 31) +
      padRight("", 117),
  );

  // ─── Trailer de arquivo (tipo 9) ────────────────────────────────────
  linhas.push(
    padLeft(fundo.bancoCodigo, 3) +
      "9999" +
      "9" +
      padRight("", 9) +
      padLeft(1, 6) + // qtd lotes
      padLeft(parcelas.length * 2 + 4, 6) + // total de registros (todos)
      padLeft(0, 6) +
      padRight("", 205),
  );

  // Garante 240 caracteres por linha
  return linhas.map((l) => padRight(l, 240)).join("\r\n") + "\r\n";
}

/** Parse de arquivo de retorno CNAB 240. Identifica registros de baixa por
 *  liquidação (código movimento 06) e devolve nosso_numero + valor pago. */
export type CnabRetornoLiquidacao = {
  nossoNumero: string;
  numeroDocumento: string;
  dataOcorrencia: string; // YYYY-MM-DD
  valorPago: number;
  codigoMovimento: string;
};

export function parseRetorno240(content: string): CnabRetornoLiquidacao[] {
  const linhas = content.split(/\r?\n/).filter((l) => l.length >= 240);
  const out: CnabRetornoLiquidacao[] = [];

  for (const linha of linhas) {
    const tipoRegistro = linha.charAt(7);
    const segmento = linha.charAt(13);
    if (tipoRegistro !== "3" || segmento !== "T") continue;

    const codigoMovimento = linha.slice(15, 17);
    // Códigos de liquidação variam por banco. Os mais comuns:
    // 06 = liquidação normal
    // 17 = liquidação após baixa
    // 09 = baixa simples
    if (!["06", "17", "09"].includes(codigoMovimento)) continue;

    const nossoNumero = linha.slice(37, 57).trim();
    const numeroDocumento = linha.slice(58, 73).trim();
    const dataRaw = linha.slice(73, 81); // DDMMYYYY
    const dataOcorrencia = dataRaw.length === 8
      ? `${dataRaw.slice(4, 8)}-${dataRaw.slice(2, 4)}-${dataRaw.slice(0, 2)}`
      : "";
    const valorPagoCents = parseInt(linha.slice(81, 96), 10) || 0;
    const valorPago = valorPagoCents / 100;

    if (!nossoNumero) continue;

    out.push({
      nossoNumero,
      numeroDocumento,
      dataOcorrencia,
      valorPago,
      codigoMovimento,
    });
  }

  return out;
}
