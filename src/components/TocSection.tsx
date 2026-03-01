"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Library, ScrollText } from "lucide-react";
import type { ArticleEntry } from "@/lib/content-types";

interface Props {
  entry: ArticleEntry;
  index?: number;
  depth?: number;
}

const levelClass = [
  "text-lg font-display font-semibold text-[var(--ink)]",
  "text-base text-[var(--ink)]",
  "text-sm text-[var(--ink-muted)]",
];

function getLevelClass(depth: number): string {
  return levelClass[Math.min(depth, levelClass.length - 1)] ?? levelClass[levelClass.length - 1];
}

export default function TocSection({ entry, index = 0, depth = 0 }: Props) {
  const hasChildren = entry.children && entry.children.length > 0;
  const isArticle = entry.isArticle;
  const levelStyle = getLevelClass(depth);
  const paddingLeft = depth * 20;

  const Icon = isArticle ? ScrollText : Library;
  const titleContent = (
    <>
      <Icon
        className={`h-4 w-4 flex-shrink-0 ${depth === 0 ? "opacity-100" : "opacity-70"}`}
        strokeWidth={depth === 0 ? 2.5 : 2}
      />
      <span>{entry.title}</span>
      {entry.titleEn && (
        <span className="text-[var(--ink-muted)] ml-2 font-medium italic">
          {entry.titleEn}
        </span>
      )}
    </>
  );

  return (
    <motion.li
      key={entry.slug}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: (index ?? 0) * 0.05 }}
      style={{ paddingLeft }}
      className={`list-none ${depth === 0 ? "mt-6 first:mt-0" : "mt-1"}`}
    >
      {isArticle ? (
        <Link
          href={`/article/${entry.slug.split("/").map(encodeURIComponent).join("/")}`}
          className={`flex items-center gap-2 py-1.5 rounded px-2 -ml-2 hover:text-[var(--gold-dark)] transition-colors glow-hover ${levelStyle}`}
        >
          {titleContent}
        </Link>
      ) : (
        <div className={`flex items-center gap-2 py-1.5 px-2 -ml-2 ${levelStyle}`}>
          {titleContent}
        </div>
      )}
      {hasChildren && (
        <ul className="list-none space-y-0 pl-0 mt-1" style={{ paddingLeft: 0 }}>
          {entry.children!.map((child, i) => (
            <TocSection
              key={child.slug}
              entry={child}
              index={i}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}
    </motion.li>
  );
}
