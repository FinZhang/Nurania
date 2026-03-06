/**
 * 静态导出时使用：不经过 /_next/image，直接返回带 basePath 的图片路径。
 * 若 src 已含 basePath 则原样返回，避免重复前缀。
 */
const BASE_PATH = "/Nurania";

export default function nuraniaImageLoader({
  src,
}: {
  src: string;
  width: number;
  quality?: number;
}) {
  const path = src.startsWith("/") ? src : `/${src}`;
  if (path.startsWith(BASE_PATH)) return path;
  return `${BASE_PATH}${path}`;
}
