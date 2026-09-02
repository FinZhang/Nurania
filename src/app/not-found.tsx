import Link from "next/link";
import Image from "next/image";
import { BASE_PATH } from "@/lib/basePath";

/**
 * 404 页。静态导出会把它写成 out/404.html，多数静态主机会自动拿它兜底。
 * 与 error.tsx 的区别：那里是「加载出错，重试有用」，这里是「这个地址本来就不存在」。
 */
export default function NotFound() {
  return (
    <div className="relative min-h-[calc(100vh-8rem)]">
      <div className="fixed inset-0 z-0 overflow-hidden">
        <Image
          src={`${BASE_PATH}/compendium/world_map.webp`}
          alt=""
          fill
          className="object-cover object-center world-map-backdrop min-w-full min-h-full"
          sizes="100vw"
          loading="eager"
        />
      </div>

      <div className="relative z-10 container-nurania py-20 md:py-28 flex flex-col items-center text-center gap-5">
        <h1 className="font-display text-2xl md:text-3xl font-semibold text-[var(--ink)]">
          此处并无记载
        </h1>
        <p className="text-[var(--ink-muted)] italic">Nothing is recorded here</p>
        <p className="max-w-md leading-relaxed text-[var(--ink-muted)]">
          您要找的这一页不在全集之中——或许是地址抄漏了一段，或许它还未被写下。
        </p>
        <Link href="/" prefetch={false} className="message-page-button">
          回到书架
        </Link>
      </div>
    </div>
  );
}
