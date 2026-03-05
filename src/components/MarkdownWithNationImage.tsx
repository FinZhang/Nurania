"use client";

import ReactMarkdown from "react-markdown";
import Image from "next/image";

/** 竖版 800×1200，比例 2:3，框与图完全贴合 */
const IMAGE_ASPECT = "2/3";

/** 题图 figure，供题图+折叠块共存时复用；竖版 2:3 */
export function TitleImageFigure({
  imagePath,
  imageAlt,
  className,
}: {
  imagePath: string;
  imageAlt: string;
  className?: string;
}) {
  return (
    <figure
      className={className}
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
  );
}

interface Props {
  content: string;
  imagePath: string;
  imageAlt: string;
  /** 题图代码所在行（0-based），窄屏时在此行位置插入图片 */
  insertLine: number;
}

export default function MarkdownWithNationImage({
  content,
  imagePath,
  imageAlt,
  insertLine,
}: Props) {
  const lines = content.split("\n");
  const contentBefore = lines.slice(0, insertLine).join("\n");
  const contentAfter = lines.slice(insertLine).join("\n");

  return (
    <div className="flex flex-col md:contents">
      {/* 窄屏：题图代码所在行插入图片 */}
      <div className="order-1 article-markdown md:hidden">
        {contentBefore.trim() ? <ReactMarkdown>{contentBefore}</ReactMarkdown> : null}
      </div>
      <TitleImageFigure
        imagePath={imagePath}
        imageAlt={imageAlt}
        className="order-2 my-6 w-full md:order-none md:float-right md:mt-[-5rem] md:mb-4 md:ml-6 md:w-[400px]"
      />
      <div className="order-3 article-markdown md:hidden">
        {contentAfter.trim() ? <ReactMarkdown>{contentAfter}</ReactMarkdown> : null}
      </div>
      {/* 宽屏：题图 float-right，正文全宽从左侧排，流到图下 */}
      <div className="order-none hidden md:block article-markdown">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </div>
  );
}
