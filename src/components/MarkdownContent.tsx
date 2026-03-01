"use client";

import ReactMarkdown from "react-markdown";

interface Props {
  content: string;
}

export default function MarkdownContent({ content }: Props) {
  return (
    <div className="article-markdown">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
