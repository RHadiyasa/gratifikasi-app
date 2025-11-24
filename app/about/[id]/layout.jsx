"use client";

import { useState } from "react";
import CustomPanel from "../_components/CustomPanel";
import { Menu } from "lucide-react";

export default function AdminPanelLayout({ children }) {
  const [open, setOpen] = useState(false);

  return (
    <section className="min-h-screen">
      <div className="w-full flex flex-col">
        {/* HEADER */}
        <header className="w-full p-4 flex gap-2 items-center">
          <button
            onClick={() => setOpen(!open)}
            className="md:hidden p-2 rounded hover:bg-gray-200 transition"
          >
            <Menu size={24} />
          </button>
          <h1 className="text-2xl font-bold text-foreground">Welcome Admin</h1>

          {/* Mobile Menu Button */}
        </header>

        <div className="flex mt-5 gap-5 px-5 pb-5">
          {/* SIDEBAR (Mobile → Drawer, Desktop → Static) */}
          <CustomPanel open={open} setOpen={setOpen} />

          {/* MAIN CONTENT */}
          <div className="flex-1 bg-gray-100 dark:bg-white/10 rounded-2xl p-6 shadow min-h-[70vh]">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
