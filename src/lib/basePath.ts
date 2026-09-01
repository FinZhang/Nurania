/**
 * 与 next.config.ts 中 basePath 保持一致，用于图片等静态资源 URL 前缀。
 * 静态导出部署在子路径 /Nurania 时，浏览器请求的资源必须带此前缀。
 */
export const BASE_PATH = "/Nurania";

/** 站点正式域名；分享卡片与 sitemap 需要绝对地址，相对路径在别的 App 里打不开 */
export const SITE_URL = "https://finzhang.space";

/** 站点根地址（含 basePath），末尾带斜杠 */
export const SITE_BASE_URL = `${SITE_URL}${BASE_PATH}/`;

/** 把站内绝对路径（以 / 开头，不含 basePath）拼成完整外链地址 */
export function absoluteUrl(path: string): string {
  return `${SITE_URL}${BASE_PATH}${path.startsWith("/") ? path : `/${path}`}`;
}
