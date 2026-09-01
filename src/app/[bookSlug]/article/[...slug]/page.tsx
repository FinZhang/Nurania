import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getSiteToc,
  getArticleBySlug,
  getAllArticleSlugs,
} from "@/lib/content";
import { getBooks, getBookBySlug } from "@/lib/books";
import ArticleLayout from "@/components/ArticleLayout";
import { absoluteUrl } from "@/lib/basePath";
import { excerpt, stripMarkdown } from "@/lib/plain-text";

export function generateStaticParams() {
  const books = getBooks();
  const params: { bookSlug: string; slug: string[] }[] = [];
  for (const book of books) {
    const slugs = getAllArticleSlugs(book.slug);
    for (const s of slugs) {
      params.push({ bookSlug: book.slug, slug: s.split("/") });
    }
  }
  return params;
}

interface Props {
  params: Promise<{ bookSlug: string; slug: string[] }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { bookSlug, slug: slugParts } = await params;
  const slug = slugParts.map((s) => decodeURIComponent(s)).join("/");

  const book = getBookBySlug(bookSlug);
  if (!book) return {};

  const article = getArticleBySlug(bookSlug, slug);
  if (!article) return {};

  const titleEn = article.titleEn ? ` | ${article.titleEn}` : "";
  const title = `${article.title}${titleEn}`;
  // 索引页正文被清空成速查视图，没有可用的开头段落，退回书籍简介
  const description = excerpt(stripMarkdown(article.content)) || excerpt(book.intro.replace(/\s+/g, " "));
  // 有题图就用题图，否则用书封面：分享出去总得有张图
  const image = absoluteUrl(article.titleImagePath ?? book.cover);
  return {
    title,
    description,
    openGraph: { type: "article", title, description, images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { bookSlug, slug: slugParts } = await params;
  const book = getBookBySlug(bookSlug);
  if (!book || !slugParts?.length) notFound();

  const slug = slugParts.map((s) => decodeURIComponent(s)).join("/");
  const article = getArticleBySlug(bookSlug, slug);
  if (!article) notFound();

  const toc = getSiteToc(bookSlug);

  return (
    <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center text-[var(--ink-muted)]">加载中…</div>}>
      <ArticleLayout
        bookSlug={bookSlug}
        toc={toc}
        currentSlug={slug}
        article={article}
      />
    </Suspense>
  );
}
