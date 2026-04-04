"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function NavigationProgress() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(true);
    const timer = setTimeout(() => setActive(false), 700);
    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key={pathname}
          className="fixed top-0 left-0 right-0 z-[9999] h-[2px] origin-left"
          style={{
            background: "hsl(var(--heroui-primary))",
            boxShadow: "0 0 12px hsl(var(--heroui-primary) / 0.8)",
          }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 0.92 }}
          exit={{ scaleX: 1, opacity: 0 }}
          transition={{
            scaleX: { duration: 0.55, ease: [0.25, 0.1, 0.25, 1] },
            opacity: { duration: 0.25, delay: 0.05 },
          }}
        />
      )}
    </AnimatePresence>
  );
}
