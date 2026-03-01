"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-[var(--parchment-aged)] bg-[var(--parchment-dark)]/50 mt-auto">
      <div className="container-nurania py-6 md:py-8">
        <div className="flex flex-col items-center gap-4 text-center md:flex-row md:justify-between">
          <p className="text-sm text-[var(--ink-faded)]">
            Under the Nuranian Skies: A Compendium
          </p>
          <div className="flex gap-6">
            <Link
              href="/"
              className="text-sm text-[var(--ink-muted)] hover:text-[var(--gold-dark)] transition-colors"
            >
              封面
            </Link>
            <Link
              href="/toc"
              className="text-sm text-[var(--ink-muted)] hover:text-[var(--gold-dark)] transition-colors"
            >
              目录
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
