/**
 * Sanitiza nome de arquivo pra evitar caracteres que quebram URLs do
 * Vercel Blob (espaços viram `+`, retorna 400 Bad Request). Mantém extensão.
 */
export function sanitizeFileName(name: string): string {
  const lastDot = name.lastIndexOf(".");
  const base = lastDot > 0 ? name.slice(0, lastDot) : name;
  const ext = lastDot > 0 ? name.slice(lastDot) : "";
  const noAccents = base.normalize("NFD").replace(/[̀-ͯ]/g, "");
  const cleaned = noAccents
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .replace(/_{2,}/g, "_")
    .toLowerCase();
  const cleanExt = ext.toLowerCase().replace(/[^.a-z0-9]/g, "");
  return (cleaned || "arquivo") + cleanExt;
}
