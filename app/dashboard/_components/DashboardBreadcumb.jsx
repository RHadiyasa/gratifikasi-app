"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

// Warna memakai token `default-*` agar ikut tema terang/gelap — versi lama
// memakai `text-gray-600`/`text-gray-400` yang nyaris hilang di mode gelap.
export default function DashboardBreadcrumb({ items }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm">
      {items.map((item, idx) => {
        const terakhir = idx === items.length - 1;

        return (
          <div key={idx} className="flex min-w-0 items-center gap-1">
            {idx > 0 && (
              <ChevronRight className="h-4 w-4 shrink-0 text-default-300" />
            )}

            {item.href && !terakhir ? (
              <Link
                className="truncate text-default-500 transition-colors hover:text-primary"
                href={item.href}
              >
                {item.label}
              </Link>
            ) : (
              <span
                aria-current={terakhir ? "page" : undefined}
                className="truncate font-medium text-foreground"
              >
                {item.label}
              </span>
            )}
          </div>
        );
      })}
    </nav>
  );
}
