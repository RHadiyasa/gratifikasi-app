"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

export default function DashboardBreadcrumb({ items }) {
  return (
    <nav className="flex items-center text-sm text-gray-600 mb-4">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center">
          {idx > 0 && <ChevronRight className="w-4 h-4 mx-1 text-gray-400" />}

          {item.href ? (
            <Link
              href={item.href}
              className="hover:text-primary font-medium transition"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-gray-400">{item.label}</span> // current page
          )}
        </div>
      ))}
    </nav>
  );
}
