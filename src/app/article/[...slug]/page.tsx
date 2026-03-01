import { Suspense } from "react";
import { notFound } from "next/navigation";
import {
  getSiteToc,
  getArticleBySlug,
  getAllArticleSlugs,
  getNationImagePath,
} from "@/lib/content";
import ArticleLayout from "@/components/ArticleLayout";

interface Props {
  params: Promise<{ slug: string[] }>;
}

export async function generateStaticParams() {
  const slugs = getAllArticleSlugs();
  return slugs.map((slug) => ({
    slug: slug.split("/"),
  }));
}

export default async function ArticlePage({ params }: Props) {
  const { slug: slugParts } = await params;
  if (!slugParts?.length) notFound();
  const slug = slugParts.map((s) => decodeURIComponent(s)).join("/");
  const article = getArticleBySlug(slug);
  if (!article) notFound();

  const toc = getSiteToc();
  const nationImagePath = getNationImagePath(slug);

  return (
    <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center text-[var(--ink-muted)]">加载中…</div>}>
      <ArticleLayout
        toc={toc}
        currentSlug={slug}
        article={article}
        nationImagePath={nationImagePath}
      />
    </Suspense>
  );
}
