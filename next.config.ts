import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 仅在生产构建时静态导出，避免 dev 下 generateStaticParams 严格校验导致文章页报错
  ...(process.env.NODE_ENV === "production" ? { output: "export" as const } : {}),
  basePath: "/Nurania",
  assetPrefix: "/Nurania/",
  images: {
    loader: "custom",
    loaderFile: "./image-loader.ts",
  },
};

export default nextConfig;