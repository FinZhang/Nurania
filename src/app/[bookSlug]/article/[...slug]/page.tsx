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
  return {
    title: `${article.title}${titleEn}`,
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
