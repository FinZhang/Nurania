"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import articleMdComponents from "@/lib/article-md-components";

interface Props {
  content: string;
}

export default function MarkdownContent({ content }: Props) {
  return (
    <div className="article-markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={articleMdComponents}>{content}</ReactMarkdown>
    </div>
  );
}
