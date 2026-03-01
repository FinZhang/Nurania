"use client";

import ReactMarkdown from "react-markdown";
import Image from "next/image";
import { splitAfterFirstBlockquote } from "@/lib/markdown-utils";

/** 竖版 800×1200，比例 2:3，框与图完全贴合 */
const IMAGE_ASPECT = "2/3";

interface Props {
  content: string;
  imagePath: string;
  imageAlt: string;
}

export default function MarkdownWithNationImage({
  content,
  imagePath,
  imageAlt,
}: Props) {
  const [part1, part2] = splitAfterFirstBlockquote(content);

  return (
    <div className="flex flex-col md:contents">
      {/* 窄屏：引用块 → 图片 → 正文；宽屏：图片 float-right，引用块与正文都从图片左侧开始排，自然流到图片下方后全宽 */}
      <figure
        className="order-2 my-6 w-full md:order-none md:float-right md:mt-[-5rem] md:mb-4 md:ml-6 md:w-[400px]"
        style={{ aspectRatio: IMAGE_ASPECT }}
      >
        <div className="relative w-full h-full rounded-lg overflow-hidden border border-[var(--parchment-aged)] shadow-md bg-[var(--parchment-dark)]/10">
          <Image
            src={imagePath}
            alt={imageAlt}
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, 400px"
          />
        </div>
      </figure>
      <div className="order-1 article-markdown">
        <ReactMarkdown>{part1}</ReactMarkdown>
      </div>
      {part2 ? (
        <div className="order-3 article-markdown">
          <ReactMarkdown>{part2}</ReactMarkdown>
        </div>
      ) : null}
    </div>
  );
}
