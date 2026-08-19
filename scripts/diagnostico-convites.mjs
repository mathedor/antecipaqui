// Diagnóstico: lista convites do Clerk (qualquer status) sem expor chaves.
// Uso: node scripts/diagnostico-convites.mjs
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);

const sk = env.CLERK_SECRET_KEY ?? "";
const pk = env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
console.log("secret key tipo:", sk.startsWith("sk_live") ? "LIVE (produção)" : sk.startsWith("sk_test") ? "TEST (dev)" : "ausente");
console.log("publishable tipo:", pk.startsWith("pk_live") ? "LIVE (produção)" : pk.startsWith("pk_test") ? "TEST (dev)" : "ausente");

for (const status of ["pending", "revoked", "accepted", "expired"]) {
  const r = await fetch(`https://api.clerk.com/v1/invitations?status=${status}&limit=50&order_by=-created_at`, {
    headers: { Authorization: `Bearer ${sk}` },
  });
  const data = await r.json();
  const list = Array.isArray(data) ? data : (data?.data ?? []);
  console.log(`\n== ${status} (${list.length}) ==`);
  for (const inv of list) {
    console.log(
      inv.email_address,
      "| criado:", new Date(inv.created_at).toISOString().slice(0, 16),
      "| redirect:", inv.url ? "(tem url)" : "-",
      "|", inv.public_metadata ? JSON.stringify(inv.public_metadata) : "",
    );
  }
}
