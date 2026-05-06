/** Helpers compartilhados pra parsing/validação de compradores submetidos
 *  via FormData (campo "compradores" como JSON). */

import { unmaskCNPJ, isValidCNPJ, isValidCPF, unmaskCPF } from "@/lib/cnpj";

export type CompradorParseado = {
  tipoPessoa: "fisica" | "juridica";
  nome: string;
  documento: string;
  telefone: string;
  email: string;
  cep: string | null;
  endereco: string | null;
  cidade: string | null;
  uf: string | null;
};

export type ParseResult =
  | { ok: true; compradores: CompradorParseado[] }
  | { ok: false; error: string };

/** Parseia o JSON do form e valida. Retorna lista normalizada (documento
 *  sem máscara). Quando pagador for "construtora", chame com [] / null. */
export function parseCompradoresFromForm(raw: string | null): ParseResult {
  if (!raw || raw.trim() === "" || raw.trim() === "null") {
    return { ok: true, compradores: [] };
  }
  let arr: unknown;
  try {
    arr = JSON.parse(raw);
  } catch {
    return { ok: false, error: "Compradores: JSON inválido" };
  }
  if (!Array.isArray(arr)) {
    return { ok: false, error: "Compradores: formato inválido" };
  }
  if (arr.length === 0) {
    return { ok: false, error: "Adicione pelo menos um comprador" };
  }
  const out: CompradorParseado[] = [];
  for (let i = 0; i < arr.length; i++) {
    const r = arr[i] as Record<string, unknown>;
    const tipoPessoa =
      r.tipoPessoa === "juridica" ? "juridica" : "fisica";
    const nome = String(r.nome ?? "").trim();
    const docRaw = String(r.documento ?? "").trim();
    const documento =
      tipoPessoa === "fisica" ? unmaskCPF(docRaw) : unmaskCNPJ(docRaw);
    const telefoneRaw = String(r.telefone ?? "");
    const telefone = telefoneRaw.replace(/\D/g, "");
    const email = String(r.email ?? "").trim().toLowerCase();
    const cep = String(r.cep ?? "").replace(/\D/g, "") || null;
    const endereco = String(r.endereco ?? "").trim() || null;
    const cidade = String(r.cidade ?? "").trim() || null;
    const uf = (String(r.uf ?? "").trim().toUpperCase() || null) as
      | string
      | null;

    if (!nome)
      return {
        ok: false,
        error: `Comprador #${i + 1}: informe nome / razão social`,
      };
    if (tipoPessoa === "fisica" && !isValidCPF(documento))
      return { ok: false, error: `Comprador #${i + 1}: CPF inválido` };
    if (tipoPessoa === "juridica" && !isValidCNPJ(documento))
      return { ok: false, error: `Comprador #${i + 1}: CNPJ inválido` };
    if (telefone.length < 10)
      return {
        ok: false,
        error: `Comprador #${i + 1}: telefone inválido`,
      };
    if (!email.includes("@"))
      return { ok: false, error: `Comprador #${i + 1}: email inválido` };

    out.push({
      tipoPessoa,
      nome,
      documento,
      telefone,
      email,
      cep,
      endereco,
      cidade,
      uf,
    });
  }
  return { ok: true, compradores: out };
}

/** Validação rápida do pagadorTipo. */
export function parsePagadorTipo(raw: string | null): "construtora" | "compradores" {
  return raw === "compradores" ? "compradores" : "construtora";
}