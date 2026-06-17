"use client";

import ArticleMarkdown from "./ArticleMarkdown";

interface Props {
  content: string;
}

export default function MarkdownContent({ content }: Props) {
  return (
    <div className="article-markdown">
      <ArticleMarkdown>{content}</ArticleMarkdown>
    </div>
  );
}
