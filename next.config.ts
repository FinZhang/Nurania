import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 仅在生产构建时静态导出，避免 dev 下 generateStaticParams 严格校验导致文章页报错
  ...(process.env.NODE_ENV === "production" ? { output: "export" as const } : {}),
  basePath: "/Nurania",
  assetPrefix: "/Nurania/",
  // 生成 compendium/toc/index.html，便于多数静态托管正确响应 /Nurania/compendium/toc/
  trailingSlash: true,
  images: {
    loader: "custom",
    loaderFile: "./image-loader.ts",
  },
};

export default nextConfig;