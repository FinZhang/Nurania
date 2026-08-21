"use client";

import ArticleMarkdown from "./ArticleMarkdown";
import ArticleImageFigure from "./ArticleImageFigure";

interface Props {
  content: string;
  imagePath: string;
  imageAlt: string;
  /** 题图代码所在行（0-based），窄屏时在此行位置插入图片 */
  insertLine: number;
}

export default function MarkdownWithTitleImage({ content, imagePath, imageAlt, insertLine }: Props) {
  const lines = content.split("\n");
  const contentBefore = lines.slice(0, insertLine).join("\n");
  const contentAfter = lines.slice(insertLine).join("\n");

  return (
    <div className="flex flex-col md:contents">
      {/* 窄屏：题图代码所在行插入图片 */}
      <div className="order-1 article-markdown md:hidden">{contentBefore.trim() ? <ArticleMarkdown>{contentBefore}</ArticleMarkdown> : null}</div>

      <ArticleImageFigure
        imagePath={imagePath}
        imageAlt={imageAlt}
        className="order-2 my-6 w-full md:order-none md:float-right md:mt-[-5rem] md:mb-4 md:ml-6 md:w-[400px]"
      />

      <div className="order-3 article-markdown md:hidden">{contentAfter.trim() ? <ArticleMarkdown>{contentAfter}</ArticleMarkdown> : null}</div>

      {/* 宽屏：题图 float-right，正文全宽从左侧排，流到图下 */}
      <div className="order-none hidden md:block article-markdown">
        <ArticleMarkdown>{content}</ArticleMarkdown>
      </div>
    </div>
  );
}
