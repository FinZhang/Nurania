import type { Metadata } from "next";
import ShelfPageClient from "@/components/ShelfPageClient";

export const metadata: Metadata = {
  title: "尤里梅尔全集 | Eurymare: The Complete Writings",
  description: "纪念塞勒内斯·尤里梅尔诞辰150周年系列文集",
};

export default function ShelfPage() {
  return <ShelfPageClient />;
}
