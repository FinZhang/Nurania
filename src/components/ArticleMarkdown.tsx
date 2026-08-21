"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import articleMdComponents from "@/lib/article-md-components";
import { parseIllustrations } from "@/lib/illustrations";
import ArticleIllustration from "./ArticleIllustration";

/** 纯 Markdown 渲染（不含插图切分），供本文件内部复用 */
function MarkdownBody({ children }: { children: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={articleMdComponents}>
      {children}
    </ReactMarkdown>
  );
}

/**
 * 文章正文统一渲染入口：集中配置 remark 插件、自定义组件与插图。
 * 所有正文（普通文章 / 折叠块正文 / 题图文章）都应经此渲染，
 * 以后新增 remark 插件或自定义元素只需改这里一处。
 *
 * 插图（<!-- 插图 ... -->）在此处按代码位置把正文切开，
 * 插图作为浮动元素排在切点上，后续正文自然环绕在其一侧。
 */
export default function ArticleMarkdown({ children }: { children: string }) {
  const segments = parseIllustrations(children);

  if (segments.length === 1 && segments[0].type === "md") {
    return <MarkdownBody>{segments[0].content}</MarkdownBody>;
  }

  return (
    <>
      {segments.map((segment, i) =>
        segment.type === "md" ? (
          <MarkdownBody key={i}>{segment.content}</MarkdownBody>
        ) : (
          <ArticleIllustration key={i} illustration={segment.illustration} />
        )
      )}
    </>
  );
}
