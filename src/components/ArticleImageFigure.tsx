"use client";

import React from "react";
import Image from "next/image";

/** 未知真实尺寸时的占位宽高比（题图按 800×1200 即 2:3 排版） */
export const DEFAULT_IMAGE_ASPECT = "2/3";

function getAspectRatio(width: number, height: number) {
  // CSS `aspect-ratio` is width/height.
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  return `${width}/${height}`;
}

interface Props {
  imagePath: string;
  imageAlt: string;
  /** 外层 figure 的类名（浮动方向、外边距等由调用方决定） */
  className?: string;
  /** 加载完成前的占位宽高比 */
  defaultAspect?: string;
  /** 附加在 figure 上的行内样式（如插图宽度自定义变量） */
  style?: React.CSSProperties;
  /** 图注，渲染在图片下方 */
  caption?: string;
  sizes?: string;
}

/**
 * 文章内图片框：题图与插图共用。
 * 先按占位宽高比占位，图片加载后改用真实宽高比，避免留黑边或加载后大幅跳动。
 */
export default function ArticleImageFigure({
  imagePath,
  imageAlt,
  className,
  defaultAspect = DEFAULT_IMAGE_ASPECT,
  style,
  caption,
  sizes = "(max-width: 768px) 100vw, 400px",
}: Props) {
  const [aspectRatio, setAspectRatio] = React.useState<string>(defaultAspect);

  return (
    <figure className={className} style={style}>
      <div
        className="relative w-full rounded-lg overflow-hidden border border-[var(--parchment-aged)] shadow-md bg-[var(--parchment-dark)]/10"
        style={{ aspectRatio }}
      >
        <Image
          src={imagePath}
          alt={imageAlt}
          fill
          className="object-contain"
          sizes={sizes}
          onLoad={(e) => {
            // 仅影响布局（aspect-ratio）；即便首帧略有跳动，最终也会匹配图片真实比例而不留黑边
            const img = e.currentTarget;
            const real = getAspectRatio(img.naturalWidth, img.naturalHeight);
            if (real) setAspectRatio(real);
          }}
        />
      </div>
      {caption ? <figcaption className="article-image-caption">{caption}</figcaption> : null}
    </figure>
  );
}
