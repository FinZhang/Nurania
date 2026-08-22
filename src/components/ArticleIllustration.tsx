"use client";

import React from "react";
import ArticleImageFigure from "./ArticleImageFigure";
import ImageLightbox from "./ImageLightbox";
import type { Illustration } from "@/lib/illustrations";

/** 插图未指定比例时的占位宽高比（与题图一致，加载后按真实比例修正） */
const DEFAULT_ILLUSTRATION_ASPECT = "2/3";

/** 把 "16/9" 形式的比例转成数值，供灯箱计算图框尺寸 */
function toRatioNumber(aspect: string | undefined, fallback: number): number {
  if (!aspect) return fallback;
  const [w, h] = aspect.split("/").map(Number);
  return w > 0 && h > 0 ? w / h : fallback;
}

/**
 * 正文插图：宽屏浮动于正文一侧、文字环绕，上沿与插图代码所在行的正文对齐；
 * 「整行」版式不浮动、独占一行；窄屏一律整行。
 * 标记「可放大」时点击打开灯箱（可缩放、拖动）。
 * 浮动与宽度等布局细节见 globals.css 的 .article-illustration。
 */
export default function ArticleIllustration({ illustration }: { illustration: Illustration }) {
  const { path, alt, placement, width, aspectRatio, zoomable, caption } = illustration;
  const [lightboxOpen, setLightboxOpen] = React.useState(false);
  const [naturalRatio, setNaturalRatio] = React.useState<number | null>(null);

  const handleNaturalAspect = React.useCallback((ratio: number) => {
    setNaturalRatio(ratio);
  }, []);

  const handleClose = React.useCallback(() => setLightboxOpen(false), []);

  return (
    <>
      <ArticleImageFigure
        imagePath={path}
        imageAlt={alt}
        className={`article-illustration article-illustration-${placement}`}
        defaultAspect={aspectRatio ?? DEFAULT_ILLUSTRATION_ASPECT}
        style={width ? ({ "--illustration-width": width } as React.CSSProperties) : undefined}
        caption={caption}
        sizes={placement === "block" ? "(max-width: 768px) 100vw, 80vw" : "(max-width: 768px) 100vw, 360px"}
        onActivate={zoomable ? () => setLightboxOpen(true) : undefined}
        onNaturalAspect={zoomable ? handleNaturalAspect : undefined}
      />
      {zoomable && (
        <ImageLightbox
          open={lightboxOpen}
          onClose={handleClose}
          src={path}
          alt={alt}
          aspectRatio={naturalRatio ?? toRatioNumber(aspectRatio ?? DEFAULT_ILLUSTRATION_ASPECT, 2 / 3)}
        />
      )}
    </>
  );
}
