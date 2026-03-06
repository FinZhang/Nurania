/**
 * 与 next.config.ts 中 basePath 保持一致，用于图片等静态资源 URL 前缀。
 * 静态导出部署在子路径 /Nurania 时，浏览器请求的资源必须带此前缀。
 */
export const BASE_PATH = "/Nurania";
