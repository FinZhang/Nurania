import Link from "next/link";
import { BookOpen } from "lucide-react";

/**
 * 自定义 404：静态导出生成 out/404.html，替代 Next 默认的英文白底页，
 * 与站点羊皮纸风格一致，并提供回书架入口。
 */
export default function NotFound() {
  return (
    <div className="container-nurania py-20 md:py-28 flex flex-col items-center text-center gap-5">
      <p className="font-display text-5xl md:text-6xl font-semibold text-[var(--ink-faded)]">
        404
      </p>
      <h1 className="font-display text-2xl md:text-3xl font-semibold text-[var(--ink)]">
        此页不存于卷册之中
      </h1>
      <p className="max-w-md leading-relaxed text-[var(--ink-muted)]">
        你所寻找的书页或许已被移动、更名，或从未被书写。
      </p>
      <Link
        href="/"
        prefetch={false}
        className="inline-flex items-center gap-2 rounded border border-[var(--parchment-aged)] bg-[var(--parchment-light)] px-4 py-2 text-[var(--ink)] transition-colors hover:text-[var(--gold-dark)] glow-hover"
      >
        <BookOpen className="h-4 w-4" />
        返回书架
      </Link>
    </div>
  );
}
