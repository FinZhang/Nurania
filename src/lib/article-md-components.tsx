import React from "react";

/** ReactMarkdown components 配置，供所有文章正文渲染使用 */
const articleMdComponents = {
  table({ children }: { children?: React.ReactNode }) {
    return (
      <div className="article-markdown-table-wrapper">
        <table>{children}</table>
      </div>
    );
  },
};

export default articleMdComponents;
