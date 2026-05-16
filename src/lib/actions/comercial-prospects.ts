"use server";

import { and, desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  comerciais,
  comercialLeads,
  comercialProspectPontos,
  construtoras,
  imobiliarias,
} from "@/db/schema";
import { requireActiveUser } from "@/lib/auth-user";

function extractRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (
    result &&
    typeof result === "object" &&
    "rows" in result &&
    Array.isArray((result as { rows: unknown[] }).rows)
  ) {
    return (result as { rows: T[] }).rows;
  }
  return [];
}

async function getCurrentComercialId(): Promise<string> {
  const user = await requireActiveUser();
  if (user.role !== "comercial") throw new Error("Apenas comercial");
  const [c] = await db
    .select({ id: comerciais.id })
    .from(comerciais)
    .where(eq(comerciais.ownerUserId, user.id))
    .limit(1);
  if (!c) throw new Error("Comercial não vinculado");
  return c.id;
}

/* ============================================================
   LISTAR PONTOS — vai pro mapa
   ============================================================ */

export async function listMyProspectPontos() {
  const comercialId = await getCurrentComercialId();
  return db
    .select()
    .from(comercialProspectPontos)
    .where(eq(comercialProspectPontos.comercialId, comercialId))
    .orderBy(desc(comercialProspectPontos.updatedAt));
}

/* ============================================================
   GEOCODING — Nominatim (OSM) gratuito
   ============================================================ */

export type GeocodeResult = {
  lat: number;
  lng: number;
  endereco: string;
  cidade?: string;
  uf?: string;
};

export async function geocodeEndereco(
  texto: string,
): Promise<GeocodeResult | null> {
  await requireActiveUser();
  if (!texto.trim()) return null;

  const params = new URLSearchParams({
    q: texto + ", Brasil",
    format: "json",
    addressdetails: "1",
    limit: "1",
    countrycodes: "br",
  });
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?${params.toString()}`,
    {
      headers: {
        "User-Agent": "Antecipaqui (mathe@diretoriow.com.br)",
      },
    },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as Array<{
    lat: string;
    lon: string;
    display_name: string;
    address?: {
      city?: string;
      town?: string;
      village?: string;
      municipality?: string;
      state?: string;
      state_code?: string;
    };
  }>;
  if (!Array.isArray(data) || data.length === 0) return null;
  const r = data[0];
  const cidade =
    r.address?.city ??
    r.address?.town ??
    r.address?.village ??
    r.address?.municipality;
  const uf =
    r.address?.state_code ?? r.address?.state?.slice(0, 2).toUpperCase();
  return {
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
    endereco: r.display_name,
    cidade,
    uf,
  };
}

/* ============================================================
   ADICIONAR PONTO MANUAL — geocoda endereço e salva
   ============================================================ */

export type AddPontoInput = {
  nome: string;
  categoria: "imobiliaria" | "construtora" | "outro";
  endereco: string;
  telefone?: string;
  email?: string;
  website?: string;
  notas?: string;
};

export async function addProspectPontoManual(
  input: AddPontoInput,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const comercialId = await getCurrentComercialId();
  if (!input.nome.trim())
    return { ok: false, error: "Nome obrigatório" };
  if (!input.endereco.trim())
    return { ok: false, error: "Endereço obrigatório" };

  const geo = await geocodeEndereco(input.endereco);
  if (!geo)
    return {
      ok: false,
      error: "Endereço não localizado. Tente ser mais específico.",
    };

  // Match com base existente
  const matchedImob = await db
    .select({ id: imobiliarias.id })
    .from(imobiliarias)
    .where(sql`LOWER(${imobiliarias.razaoSocial}) = LOWER(${input.nome})`)
    .limit(1);
  const matchedConstr = await db
    .select({ id: construtoras.id })
    .from(construtoras)
    .where(sql`LOWER(${construtoras.razaoSocial}) = LOWER(${input.nome})`)
    .limit(1);

  const [row] = await db
    .insert(comercialProspectPontos)
    .values({
      comercialId,
      nome: input.nome.trim(),
      categoria: input.categoria,
      endereco: geo.endereco,
      cidade: geo.cidade ?? null,
      uf: geo.uf ?? null,
      lat: String(geo.lat),
      lng: String(geo.lng),
      telefone: input.telefone?.trim() || null,
      email: input.email?.trim() || null,
      website: input.website?.trim() || null,
      notas: input.notas?.trim() || null,
      imobiliariaId: matchedImob[0]?.id ?? null,
      construtoraId: matchedConstr[0]?.id ?? null,
    })
    .returning({ id: comercialProspectPontos.id });

  revalidatePath("/painel/prospects");
  return { ok: true, id: row.id };
}

/* ============================================================
   BUSCA GOOGLE PLACES — Nearby Search
   ============================================================ */

export type GooglePlaceItem = {
  placeId: string;
  nome: string;
  endereco: string;
  lat: number;
  lng: number;
  telefone?: string;
  website?: string;
  rating?: number;
  /** True se já existe nas tabelas imobiliarias/construtoras OU em
   *  comercial_prospect_pontos. */
  jaExiste: boolean;
  jaPontoMeu: boolean;
};

export async function buscarGooglePlacesPorCoords(input: {
  lat: number;
  lng: number;
  radius: number; // metros
  categoria: "imobiliaria" | "construtora";
}): Promise<{ ok: boolean; items: GooglePlaceItem[]; error?: string }> {
  const comercialId = await getCurrentComercialId();

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      items: [],
      error:
        "Busca automática requer GOOGLE_PLACES_API_KEY configurada. Use adição manual por enquanto.",
    };
  }

  const type =
    input.categoria === "imobiliaria"
      ? "real_estate_agency"
      : "general_contractor";

  const params = new URLSearchParams({
    location: `${input.lat},${input.lng}`,
    radius: String(input.radius),
    type,
    key: apiKey,
  });
  const res = await fetch(
    `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params.toString()}`,
  );
  if (!res.ok)
    return {
      ok: false,
      items: [],
      error: `Google Places retornou ${res.status}`,
    };
  const data = (await res.json()) as {
    status?: string;
    error_message?: string;
    results?: Array<{
      place_id: string;
      name: string;
      vicinity?: string;
      formatted_address?: string;
      geometry?: { location?: { lat: number; lng: number } };
      rating?: number;
    }>;
  };
  if (data.status && data.status !== "OK" && data.status !== "ZERO_RESULTS")
    return {
      ok: false,
      items: [],
      error: `Google Places: ${data.status} ${data.error_message ?? ""}`,
    };

  const results = data.results ?? [];
  if (results.length === 0) return { ok: true, items: [] };

  // Verificar match com base e com pontos já salvos.
  // Drizzle serializa arrays JS como CSV, então ANY(array) com cast quebra.
  // Usamos sql.join + IN com placeholders individuais.
  const nomesLower = results.map((r) => r.name.toLowerCase());
  const placeIds = results.map((r) => r.place_id);
  const nomesPlaceholder = sql.join(
    nomesLower.map((n) => sql`${n}`),
    sql`, `,
  );
  const placeIdsPlaceholder = sql.join(
    placeIds.map((p) => sql`${p}`),
    sql`, `,
  );

  const baseImobsMatch = await db.execute(sql`
    SELECT LOWER(razao_social) AS n FROM imobiliarias
    WHERE LOWER(razao_social) IN (${nomesPlaceholder})
  `);
  const baseConstrMatch = await db.execute(sql`
    SELECT LOWER(razao_social) AS n FROM construtoras
    WHERE LOWER(razao_social) IN (${nomesPlaceholder})
  `);
  const meusPontosMatch = await db.execute(sql`
    SELECT google_place_id FROM comercial_prospect_pontos
    WHERE comercial_id = ${comercialId}::uuid
      AND google_place_id IN (${placeIdsPlaceholder})
  `);

  const baseSet = new Set<string>([
    ...extractRows<{ n: string }>(baseImobsMatch).map((r) => r.n),
    ...extractRows<{ n: string }>(baseConstrMatch).map((r) => r.n),
  ]);
  const meusSet = new Set<string>(
    extractRows<{ google_place_id: string }>(meusPontosMatch).map(
      (r) => r.google_place_id,
    ),
  );

  return {
    ok: true,
    items: results.map((r) => ({
      placeId: r.place_id,
      nome: r.name,
      endereco: r.vicinity ?? r.formatted_address ?? "",
      lat: r.geometry?.location?.lat ?? input.lat,
      lng: r.geometry?.location?.lng ?? input.lng,
      rating: r.rating,
      jaExiste: baseSet.has(r.name.toLowerCase()),
      jaPontoMeu: meusSet.has(r.place_id),
    })),
  };
}

/** Salva um item retornado pelo Places como ponto do comercial. */
export async function saveProspectPontoFromGoogle(
  input: GooglePlaceItem & {
    categoria: "imobiliaria" | "construtora";
    telefone?: string;
    email?: string;
  },
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const comercialId = await getCurrentComercialId();

  // Não duplicar
  const dup = await db
    .select({ id: comercialProspectPontos.id })
    .from(comercialProspectPontos)
    .where(
      and(
        eq(comercialProspectPontos.comercialId, comercialId),
        eq(comercialProspectPontos.googlePlaceId, input.placeId),
      ),
    )
    .limit(1);
  if (dup[0]) return { ok: false, error: "Já está no seu mapa" };

  const [row] = await db
    .insert(comercialProspectPontos)
    .values({
      comercialId,
      googlePlaceId: input.placeId,
      nome: input.nome,
      categoria: input.categoria,
      endereco: input.endereco,
      lat: String(input.lat),
      lng: String(input.lng),
      telefone: input.telefone ?? null,
      email: input.email ?? null,
      website: null,
    })
    .returning({ id: comercialProspectPontos.id });

  revalidatePath("/painel/prospects");
  return { ok: true, id: row.id };
}

/* ============================================================
   ATUALIZAR / DELETAR PONTO
   ============================================================ */

export async function updateProspectPontoStatus(input: {
  id: string;
  status: "novo" | "contactado" | "reuniao_agendada" | "descartado" | "virou_lead";
  notas?: string;
}) {
  const comercialId = await getCurrentComercialId();
  await db
    .update(comercialProspectPontos)
    .set({
      status: input.status,
      notas: input.notas?.trim() || undefined,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(comercialProspectPontos.id, input.id),
        eq(comercialProspectPontos.comercialId, comercialId),
      ),
    );
  revalidatePath("/painel/prospects");
  return { ok: true };
}

export async function deleteProspectPonto(id: string) {
  const comercialId = await getCurrentComercialId();
  await db
    .delete(comercialProspectPontos)
    .where(
      and(
        eq(comercialProspectPontos.id, id),
        eq(comercialProspectPontos.comercialId, comercialId),
      ),
    );
  revalidatePath("/painel/prospects");
  return { ok: true };
}

/** Promove um ponto pra lead no pipeline. */
export async function promoverPontoParaLead(input: {
  pontoId: string;
  valorEstimado?: number;
}): Promise<{ ok: boolean; leadId?: string; error?: string }> {
  const comercialId = await getCurrentComercialId();
  const [p] = await db
    .select()
    .from(comercialProspectPontos)
    .where(
      and(
        eq(comercialProspectPontos.id, input.pontoId),
        eq(comercialProspectPontos.comercialId, comercialId),
      ),
    )
    .limit(1);
  if (!p) return { ok: false, error: "Ponto não encontrado" };
  if (p.leadId) return { ok: false, error: "Já virou lead" };

  const [lead] = await db
    .insert(comercialLeads)
    .values({
      comercialId,
      nome: p.nome,
      empresa: p.nome,
      email: p.email,
      telefone: p.telefone,
      cidade: p.cidade,
      uf: p.uf,
      origem: "mapa-prospects",
      status: "prospect",
      valorEstimado: input.valorEstimado
        ? String(input.valorEstimado.toFixed(2))
        : null,
    })
    .returning({ id: comercialLeads.id });

  await db
    .update(comercialProspectPontos)
    .set({
      status: "virou_lead",
      leadId: lead.id,
      updatedAt: new Date(),
    })
    .where(eq(comercialProspectPontos.id, input.pontoId));

  revalidatePath("/painel/prospects");
  revalidatePath("/painel/prospeccao");
  return { ok: true, leadId: lead.id };
}
