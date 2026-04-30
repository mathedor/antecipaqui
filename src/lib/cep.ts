/**
 * Busca de CEP via ViaCEP (gratuita, sem auth, sem rate limit prático).
 * Cliente-side. Em caso de falha, retorna null e o usuário preenche manual.
 *
 * Docs: https://viacep.com.br/
 */

export type CepInfo = {
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
};

/** Mantém só os dígitos. */
export function unmaskCep(input: string): string {
  return (input ?? "").replace(/\D/g, "");
}

export async function buscarCep(rawCep: string): Promise<CepInfo | null> {
  const cep = unmaskCep(rawCep);
  if (cep.length !== 8) return null;
  try {
    const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (!r.ok) return null;
    const j = (await r.json()) as {
      cep?: string;
      logradouro?: string;
      bairro?: string;
      localidade?: string;
      uf?: string;
      erro?: boolean;
    };
    if (j.erro) return null;
    return {
      cep: j.cep ?? rawCep,
      logradouro: j.logradouro ?? "",
      bairro: j.bairro ?? "",
      cidade: j.localidade ?? "",
      uf: (j.uf ?? "").toUpperCase(),
    };
  } catch {
    return null;
  }
}
