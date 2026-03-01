/**
 * 静态导出时使用：不经过 /_next/image，直接返回带 basePath 的图片路径，
 * 这样构建出的 HTML 引用 /Nurania/xxx.jpg，与 out 目录中 public 资源一致。
 */
const basePath = "/Nurania";

export default function nuraniaImageLoader({
  src,
}: {
  src: string;
  width: number;
  quality?: number;
}) {
  const path = src.startsWith("/") ? src : `/${src}`;
  return `${basePath}${path}`;
}
