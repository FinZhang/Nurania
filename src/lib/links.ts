/**
 * 站内链接拼接，统一编码规则（slug 各段分别 encodeURIComponent，保留 "/" 层级）。
 * basePath 由 next.config.ts 自动加在前面，这里不重复处理。
 */
export function articleHref(bookSlug: string, slug: string): string {
  const encoded = slug.split("/").map(encodeURIComponent).join("/");
  return `/${bookSlug}/article/${encoded}`;
}
