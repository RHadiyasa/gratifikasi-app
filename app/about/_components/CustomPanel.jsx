"use client";

import Link from "next/link";
import React, { useState } from "react";
import {
  X, Wallet, Activity, Folder,
  ChevronDown, ChevronRight,
  Receipt, RefreshCcw, CreditCard
} from "lucide-react";

const CustomPanel = ({ open, setOpen }) => {
  const [kasOpen, setKasOpen] = useState(false);

  return (
    <>
      {/* Mobile Overlay */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 bg-black/60 bg-opacity-50 md:hidden"
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`
          bg-slate-900 text-white p-6 md:rounded-2xl shadow-lg
          fixed md:static 
          top-0 left-0 h-full md:h-auto w-80
          transform md:translate-x-0 transition-transform duration-300
          ${open ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        {/* Close button (mobile only) */}
        <button
          onClick={() => setOpen(false)}
          className="md:hidden mb-4 p-2 rounded hover:bg-slate-700 transition"
        >
          <X size={20} />
        </button>

        <Link href={"/about/super-admin-123"}>
          <div
            onClick={() => setOpen(false)}
            className="font-bold mb-6 mt-5 text-xl cursor-pointer hover:text-pink-400 transition"
          >
            Deskwork
          </div>
        </Link>

        <nav className="grid gap-3">

          {/* ================= UANG KAS (PARENT MENU) ================= */}
          <div className="flex items-center justify-between hover:bg-slate-800 px-3 py-2 rounded-lg transition">

            {/* Kiri: Navigate to page */}
            <Link
              href="/about/super-admin-123/kas"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 flex-1"
            >
              <Wallet size={18} />
              <span>Uang Kas</span>
            </Link>

            {/* Kanan: Chevron toggle submenu */}
            <button
              onClick={(e) => {
                e.stopPropagation(); // prevent trigger parent click
                setKasOpen(!kasOpen);
              }}
              className="p-1 hover:bg-slate-700 rounded transition"
            >
              {kasOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            </button>
          </div>

          {/* ============== SUBMENU ============== */}
          {kasOpen && (
            <div className="ml-8 mt-1 flex flex-col gap-1 animate-fadeIn">
              <Link
                href="/about/super-admin-123/kas/transaksi"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-2 py-1 hover:text-pink-400 transition"
              >
                <Receipt size={16} /> Transaksi
              </Link>

              <Link
                href="/about/super-admin-123/kas/reimburse"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-2 py-1 hover:text-pink-400 transition"
              >
                <RefreshCcw size={16} /> Reimburse
              </Link>

              <Link
                href="/about/super-admin-123/kas/tagihan"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-2 py-1 hover:text-pink-400 transition"
              >
                <CreditCard size={16} /> Tagihan
              </Link>
            </div>
          )}

          {/* Menu lain */}
          <p className="hover:bg-slate-800 px-3 py-2 rounded-lg cursor-pointer transition flex items-center gap-2">
            <Activity size={18} /> Activities
          </p>

          <p className="hover:bg-slate-800 px-3 py-2 rounded-lg cursor-pointer transition flex items-center gap-2">
            <Folder size={18} /> Categories
          </p>
        </nav>
      </aside>
    </>
  );
};

export default CustomPanel;
