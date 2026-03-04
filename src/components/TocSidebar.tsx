"use client";

import Image from "next/image";
import { motion } from "framer-motion";

interface Props {
  cover: string;
  intro: string;
  title?: string;
}

export default function TocSidebar({ cover, intro, title }: Props) {
  return (
    <motion.aside
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.25, ease: "easeOut" }}
      className="hidden lg:flex lg:w-auto lg:max-w-lg flex-shrink-0 lg:items-start lg:gap-4"
    >
      <div className="relative flex-shrink-0 w-40 aspect-[3/4] min-w-0">
        <Image
          src={cover}
          alt={title ? `${title}封面` : "封面"}
          fill
          className="object-contain object-center"
          sizes="10rem"
        />
      </div>
      <p className="flex-1 min-w-0 text-base text-[var(--ink-muted)] leading-relaxed whitespace-pre-wrap pt-0">
        {intro}
      </p>
    </motion.aside>
  );
}
