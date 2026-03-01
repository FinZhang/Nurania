"use client";

import Link from "next/link";
import type { ArticleEntry } from "@/lib/content-types";

interface Props {
  entries: ArticleEntry[];
  currentSlug: string;
  depth?: number;
  activeLinkRef?: React.RefObject<HTMLAnchorElement | null>;
}

export default function ArticleNavTree({
  entries,
  currentSlug,
  depth = 0,
  activeLinkRef,
}: Props) {
  const paddingLeft = depth * 16;
  const isSmall = depth >= 2;

  return (
    <ul className="list-none space-y-0.5">
      {entries.map((entry) => {
        const hasChildren = entry.children && entry.children.length > 0;
        const isArticle = entry.isArticle;
        const isActive = entry.slug === currentSlug;

        if (isArticle) {
          return (
            <li key={entry.slug} style={{ paddingLeft }} className="py-0.5">
              <Link
                ref={isActive ? activeLinkRef : undefined}
                href={`/article/${entry.slug.split("/").map(encodeURIComponent).join("/")}`}
                className={`block py-1 pr-2 rounded text-sm transition-colors ${
                  isActive
                    ? "text-[var(--gold-dark)] font-medium bg-[var(--parchment-dark)]/50"
                    : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
                } ${isSmall ? "text-xs" : ""}`}
              >
                {entry.title}
              </Link>
            </li>
          );
        }

        if (hasChildren) {
          return (
            <li key={entry.slug} className="py-0.5">
              <div
                style={{ paddingLeft }}
                className={`py-1 pr-2 text-[var(--ink-faded)] ${depth === 0 ? "font-display text-[var(--gold-dark)] font-medium" : ""} ${isSmall ? "text-xs" : "text-sm"}`}
              >
                {entry.title}
              </div>
              <ArticleNavTree
                entries={entry.children!}
                currentSlug={currentSlug}
                depth={depth + 1}
                activeLinkRef={activeLinkRef}
              />
            </li>
          );
        }

        return null;
      })}
    </ul>
  );
}
