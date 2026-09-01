import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/basePath";

/** 静态导出下写成 out/robots.txt；全站公开，只是把 sitemap 指出来 */
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
