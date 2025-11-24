import Link from "next/link";
import { ChevronRight } from "lucide-react";

export default function Breadcrumb({ items }) {
  return (
    <nav className="flex items-center text-sm text-foreground mb-5">
      {items.map((item, index) => (
        <div key={index} className="flex items-center">
          {index !== 0 && (
            <ChevronRight size={16} className="mx-2 text-foreground" />
          )}

          {item.href ? (
            <Link
              href={item.href}
              className="hover:text-pink-500 transition"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}
