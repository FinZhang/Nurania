"use client";

import React from "react";
import ArticleImageFigure from "./ArticleImageFigure";
import type { Illustration } from "@/lib/illustrations";

/** 插图未指定比例时的占位宽高比（与题图一致，加载后按真实比例修正） */
const DEFAULT_ILLUSTRATION_ASPECT = "2/3";

/**
 * 正文插图：宽屏浮动于正文一侧、文字环绕，上沿与插图代码所在行的正文对齐；
 * 窄屏退化为整行图片。浮动与宽度等布局细节见 globals.css 的 .article-illustration。
 */
export default function ArticleIllustration({ illustration }: { illustration: Illustration }) {
  const { path, alt, side, width, aspectRatio, caption } = illustration;

  return (
    <ArticleImageFigure
      imagePath={path}
      imageAlt={alt}
      className={`article-illustration article-illustration-${side}`}
      defaultAspect={aspectRatio ?? DEFAULT_ILLUSTRATION_ASPECT}
      style={width ? ({ "--illustration-width": width } as React.CSSProperties) : undefined}
      caption={caption}
      sizes="(max-width: 768px) 100vw, 360px"
    />
  );
}
