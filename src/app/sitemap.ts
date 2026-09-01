import type { MetadataRoute } from "next";
import { getBooks } from "@/lib/books";
import { getAllArticleSlugs } from "@/lib/content";
import { SITE_BASE_URL, absoluteUrl } from "@/lib/basePath";
import { articleHref } from "@/lib/links";

/**
 * 静态导出下 Next 会把这里的结果写成 out/sitemap.xml。
 *
 * 地址必须是含 basePath 的绝对地址：sitemap 是给站外爬虫看的，相对路径没有意义。
 * 因此这里不用 next/link 那套自动前缀，一律走 absoluteUrl。
 */
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [
    { url: SITE_BASE_URL, changeFrequency: "monthly", priority: 1 },
  ];

  for (const book of getBooks()) {
    entries.push({
      url: absoluteUrl(`/${book.slug}/toc/`),
      changeFrequency: "weekly",
      priority: 0.8,
    });
    for (const slug of getAllArticleSlugs(book.slug)) {
      entries.push({
        // articleHref 已经把 slug 逐段编码好，只差站点前缀
        url: `${absoluteUrl(articleHref(book.slug, slug))}/`,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  }

  return entries;
}
