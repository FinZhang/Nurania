import React from "react";
import IndexTermMark from "@/components/IndexTermMark";
import { parseTermHref } from "./index-terms";

/** ReactMarkdown components 配置，供所有文章正文渲染使用 */
const articleMdComponents = {
  table({ children }: { children?: React.ReactNode }) {
    return (
      <div className="article-markdown-table-wrapper">
        <table>{children}</table>
      </div>
    );
  },
  /**
   * 索引名词由 src/lib/index-terms.ts 标记成 [原文](#idx-e123) 形式的链接，
   * 在此换成可悬停的名词标记；其余链接照常渲染。
   */
  a({ href, title, children }: { href?: string; title?: string; children?: React.ReactNode }) {
    const termId = parseTermHref(href);
    if (termId) return <IndexTermMark termId={termId}>{children}</IndexTermMark>;
    return (
      <a href={href} title={title}>
        {children}
      </a>
    );
  },
};

export default articleMdComponents;
