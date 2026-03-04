"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { getBooks } from "@/lib/books";

export default function ShelfPage() {
  const books = getBooks();

  return (
    <div className="relative min-h-[calc(100vh-13rem)] md:h-[calc(100vh-13rem)] md:max-h-[calc(100vh-13rem)] flex items-center justify-center overflow-hidden">
      {/* 地图背景固定铺满视口，覆盖到页脚区域，避免中间留白 */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        <Image
          src="/Nurania/world-map.jpg"
          alt="诺拉尼亚大陆地图"
          fill
          className="object-cover object-center opacity-40 min-w-full min-h-full md:scale-110 lg:scale-125"
          sizes="100vw"
          priority
          loading="eager"
        />
      </div>

      <div className="relative z-10 w-full max-w-4xl mx-auto px-4 py-8 md:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 md:gap-12 place-items-center">
          {books.map((book, i) => (
            <motion.div
              key={book.slug}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="flex flex-col items-center"
            >
              <Link
                href={`/${book.slug}/toc`}
                className="group block w-[min(45vw,38vh)] sm:w-[min(50vw,42vh)] md:w-[min(42vw,48vh)] lg:w-[min(36vw,52vh)] max-w-xs cursor-pointer glow-hover"
              >
                <div className="relative w-full aspect-[3/4] overflow-hidden rounded-lg border-2 border-[var(--gold-dark)]/60 bg-transparent shadow-[0_8px_30px_rgba(0,0,0,0.25),0_12px_40px_rgba(0,0,0,0.15)]">
                  <Image
                    src={book.cover}
                    alt={`${book.title}封面`}
                    fill
                    priority={i === 0}
                    className="object-cover object-center group-hover:scale-[1.02] transition-transform duration-300"
                  />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
