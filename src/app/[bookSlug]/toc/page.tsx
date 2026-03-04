import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getBooks, getBookBySlug } from "@/lib/books";
import { getSiteToc, getRecentArticles } from "@/lib/content";
import TocList from "@/components/TocList";
import TocSidebar from "@/components/TocSidebar";
import RecentUpdates from "@/components/RecentUpdates";

export function generateStaticParams() {
  return getBooks().map((b) => ({ bookSlug: b.slug }));
}

interface Props {
  params: Promise<{ bookSlug: string }>;
}

export default async function TocPage({ params }: Props) {
  const { bookSlug } = await params;
  const book = getBookBySlug(bookSlug);
  if (!book) notFound();

  const siteToc = getSiteToc(bookSlug);
  const recentArticles = getRecentArticles(bookSlug, 5);

  return (
    <div className="relative min-h-[calc(100vh-8rem)]">
      <div className="fixed inset-0 z-0 overflow-hidden">
        <Image
          src="/Nurania/world-map.jpg"
          alt=""
          fill
          className="object-cover object-center opacity-10 min-w-full min-h-full lg:scale-110 xl:scale-125"
          sizes="100vw"
          loading="eager"
        />
      </div>
      <div className="relative z-10 container-nurania py-12 lg:py-20">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[var(--ink-muted)] hover:text-[var(--gold-dark)] mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          返回书架
        </Link>

        <div className="lg:hidden mb-6 text-base text-[var(--ink-muted)] leading-relaxed whitespace-pre-wrap">
          {book.intro}
        </div>

        <div className="lg:hidden mb-8">
          <RecentUpdates bookSlug={bookSlug} items={recentArticles} />
        </div>

        <div className="flex flex-col lg:flex-row lg:items-start gap-8 lg:gap-12">
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-2xl lg:text-3xl font-semibold text-[var(--ink)] mb-2">
              目录
            </h1>
            <p className="text-[var(--ink-muted)] mb-12">
              Table of Contents
            </p>
            <TocList bookSlug={bookSlug} entries={siteToc} />
          </div>

          <div className="hidden lg:flex lg:flex-col lg:w-auto lg:max-w-lg lg:flex-shrink-0 lg:gap-4 lg:sticky lg:top-24 lg:self-start">
            <TocSidebar cover={book.cover} intro={book.intro} title={book.title} />
            <RecentUpdates bookSlug={bookSlug} items={recentArticles} />
          </div>
        </div>
      </div>
    </div>
  );
}
