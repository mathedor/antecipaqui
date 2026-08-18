"use server";

/**
 * DISPARO DOS ROBÔS — um clique roda todos os checks aplicáveis e devolve o
 * resultado agrupado por área. Admin vê tudo; fundo vê só o que é dele,
 * escopado pelo próprio fundo (nunca segredo global).
 */
import { requireAdmin, getCurrentDbUser } from "@/lib/auth-user";
import { getCurrentFundo } from "@/lib/actions/fundos";
import { CHECKS, ORDEM_AREAS } from "@/lib/seguranca/checks";
import {
  agregar,
  type AreaResultado,
  type CheckCtx,
  type CheckResultado,
  type DiagnosticoResultado,
  type Escopo,
  type Severidade,
} from "@/lib/seguranca/tipos";

function contarVazio(): Record<Severidade, number> {
  return { ok: 0, atencao: 0, falha: 0, erro: 0 };
}

async function executar(ctx: CheckCtx): Promise<DiagnosticoResultado> {
  const t0 = Date.now();
  const visiveis = CHECKS.filter((c) =>
    ctx.escopo === "admin"
      ? c.visibilidade === "admin" || c.visibilidade === "ambos"
      : c.visibilidade === "fundo" || c.visibilidade === "ambos",
  );

  // Roda todos em paralelo — nenhum check pode derrubar o painel: um que
  // estoure vira status 'erro', não exceção.
  const resultados: CheckResultado[] = await Promise.all(
    visiveis.map(async (c) => {
      try {
        const r = await c.run(ctx);
        return { id: c.id, area: c.area, titulo: c.titulo, peso: c.peso ?? 1, ...r };
      } catch (e) {
        return {
          id: c.id,
          area: c.area,
          titulo: c.titulo,
          peso: c.peso ?? 1,
          status: "erro" as const,
          detalhe: `O robô não conseguiu rodar: ${(e as Error).message.slice(0, 140)}`,
          recomendacao: "Falha no próprio diagnóstico — reporte ao time de desenvolvimento.",
        };
      }
    }),
  );

  // Agrupa por área, na ordem canônica; áreas fora da lista vão pro fim.
  const porArea = new Map<string, CheckResultado[]>();
  for (const r of resultados) {
    const lista = porArea.get(r.area) ?? [];
    lista.push(r);
    porArea.set(r.area, lista);
  }

  const areas: AreaResultado[] = [...porArea.keys()]
    .sort((a, b) => {
      const ia = ORDEM_AREAS.indexOf(a);
      const ib = ORDEM_AREAS.indexOf(b);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    })
    .map((area) => {
      const checks = porArea.get(area)!;
      const contagem = contarVazio();
      for (const c of checks) contagem[c.status]++;
      return {
        area,
        status: agregar(checks.map((c) => c.status)),
        checks,
        contagem,
      };
    });

  const contagem = contarVazio();
  for (const r of resultados) contagem[r.status]++;

  return {
    geradoEm: new Date().toISOString(),
    escopo: ctx.escopo,
    status: agregar(resultados.map((r) => r.status)),
    areas,
    contagem,
    duracaoMs: Date.now() - t0,
  };
}

/** Diagnóstico completo — só admin. */
export async function rodarDiagnosticoAdmin(): Promise<DiagnosticoResultado> {
  await requireAdmin();
  return executar({ escopo: "admin" });
}

/** Diagnóstico escopado ao fundo logado. */
export async function rodarDiagnosticoFundo(): Promise<
  DiagnosticoResultado | { erro: string }
> {
  const user = await getCurrentDbUser();
  if (!user || user.role !== "fundo") return { erro: "Apenas o fundo logado." };
  const fundo = await getCurrentFundo();
  if (!fundo) return { erro: "Seu usuário não está vinculado a um fundo." };
  return executar({ escopo: "fundo" as Escopo, fundoId: fundo.id });
}
