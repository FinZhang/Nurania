"use client";

import { usePathname } from "next/navigation";
import { getBookBySlug } from "@/lib/books";

export default function Footer() {
  const pathname = usePathname();
  const isShelf = pathname === "/";
  const bookSlug = pathname?.split("/")[1];
  const book = bookSlug ? getBookBySlug(bookSlug) : null;
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative border-t border-[var(--parchment-aged)] mt-auto overflow-hidden">
      {/* 实色衬底层，完全遮住背后内容 */}
      <div
        className="absolute inset-0 z-0"
        style={{ backgroundColor: "#b8956e" }}
        aria-hidden
      />
      <div className="container-nurania py-3 md:py-4 relative z-10">
        <div className="flex flex-col items-center gap-2 text-center md:flex-row md:justify-between">
          <p className="text-xs md:text-sm text-[var(--ink)]">
            {isShelf ? "Selenus: The Complete Writings" : (book?.footerSubline ?? "Under the Nuranian Skies: A Compendium")}
          </p>
          <div className="flex flex-col items-center md:items-end text-xs md:text-sm text-[var(--ink)]">
            <span>Fin Zhang © {currentYear}</span>
            <span>Contact: shininglight441@gmail.com</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
