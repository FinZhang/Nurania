"use client";

import { motion } from "framer-motion";
import type { ArticleEntry } from "@/lib/content-types";
import TocSection from "./TocSection";

interface Props {
  bookSlug: string;
  entries: ArticleEntry[];
}

export default function TocList({ bookSlug, entries }: Props) {
  return (
    <motion.ul
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="list-none space-y-2 pl-0"
    >
      {entries.map((entry, i) => (
        <TocSection key={entry.slug} bookSlug={bookSlug} entry={entry} index={i} depth={0} />
      ))}
    </motion.ul>
  );
}
