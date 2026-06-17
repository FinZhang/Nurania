"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import articleMdComponents from "@/lib/article-md-components";

/**
 * 文章正文统一渲染入口：集中配置 remark 插件与自定义组件。
 * 所有正文（普通文章 / 折叠块正文 / 题图文章）都应经此渲染，
 * 以后新增 remark 插件或自定义元素只需改这里一处。
 */
export default function ArticleMarkdown({ children }: { children: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={articleMdComponents}>
      {children}
    </ReactMarkdown>
  );
}
