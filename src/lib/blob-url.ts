/**
 * Converte uma URL do Vercel Blob (private) num href do nosso proxy
 * autenticado em /api/blob/[...pathname]. Aceita já o formato proxy ou
 * URL ainda nula (pra preview pré-upload).
 *
 * Exemplo:
 *   https://lubzb6.private.blob.vercel-storage.com/fundos/contratos/123-c.pdf
 *   → /api/blob/fundos/contratos/123-c.pdf
 */
export function toBlobProxyHref(url: string | null | undefined): string {
  if (!url) return "#";
  if (url.startsWith("/api/blob/")) return url;
  try {
    const u = new URL(url);
    if (!u.hostname.endsWith(".blob.vercel-storage.com")) {
      return url;
    }
    return `/api/blob${u.pathname}`;
  } catch {
    return url;
  }
}
