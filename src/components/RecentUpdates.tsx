"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import type { RecentArticle } from "@/lib/content";

interface Props {
  bookSlug: string;
  items: RecentArticle[];
}

export default function RecentUpdates({ bookSlug, items }: Props) {
  if (items.length === 0) return null;

  return (
    <section className="mt-8 md:mt-10" aria-label="最近更新">
      <h2 className="text-sm uppercase tracking-wider text-[var(--ink-faded)] mb-3">
        New
      </h2>
      <ul className="list-none space-y-2">
        {items.map((item) => (
          <li key={item.slug} className="list-none">
            <Link
              href={`/${bookSlug}/article/${item.slug.split("/").map(encodeURIComponent).join("/")}`}
              className="@container flex items-start gap-2 py-1.5 rounded px-2 -ml-2 hover:text-[var(--gold-dark)] transition-colors glow-hover @toc-entry-wide:items-center text-base text-[var(--ink)]"
            >
              <Sparkles
                className="h-4 w-4 flex-shrink-0 mt-0.5 @toc-entry-wide:mt-0 opacity-80"
                strokeWidth={2}
                aria-hidden
              />
              <div className="flex flex-col min-w-0 flex-1 gap-0 @toc-entry-wide:flex-row @toc-entry-wide:items-center @toc-entry-wide:flex-initial">
                <span className="break-words">{item.title}</span>
                {item.titleEn && (
                  <span className="text-[var(--ink-muted)] font-medium italic break-words @toc-entry-wide:ml-2">
                    {item.titleEn}
                  </span>
                )}
                <span className="text-[var(--ink-faded)] text-sm mt-0.5 @toc-entry-wide:mt-0 @toc-entry-wide:ml-2">
                  {item.updatedAt}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
