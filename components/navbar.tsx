"use client";

import {
  Navbar as HeroUINavbar,
  NavbarContent,
  NavbarMenu,
  NavbarMenuToggle,
  NavbarBrand,
  NavbarItem,
  NavbarMenuItem,
} from "@heroui/navbar";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  DropdownSection,
} from "@heroui/dropdown";
import { Button } from "@heroui/button";
import { Link } from "@heroui/link";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  BookOpen,
  Award,
  LayoutDashboard,
  LogIn,
  LogOut,
  UserPlus,
  FileSpreadsheet,
  BarChart3,
  UserCircle2,
  Settings2,
} from "lucide-react";

import { ThemeSwitch } from "@/components/theme-switch";
import { VisaBrandMark } from "@/components/visa-brand";
import { useAuthStore } from "@/store/authStore";
import {
  ROLE_LABELS,
  hasPermission,
  getDashboardHref,
} from "@/lib/permissions";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

const gratifikasiGroup = [
  {
    label: "Gratifikasi",
    href: "/gratifikasi",
    icon: ShieldCheck,
    desc: "Pelaporan penerimaan gratifikasi",
  },
  {
    label: "E-Learning",
    href: "/e-learning",
    icon: BookOpen,
    desc: "Modul edukasi antikorupsi",
  },
];

const otherFeatures = [
  {
    label: "Zona Integritas",
    href: "/zona-integritas",
    icon: Award,
    desc: "Informasi program WBK/WBBM",
  },
  {
    label: "LKE Checker",
    href: "/zona-integritas/lke-checker",
    icon: FileSpreadsheet,
    desc: "Evaluasi LKE unit kerja",
  },
  {
    label: "Monitoring ZI",
    href: "/zona-integritas/monitoring",
    icon: BarChart3,
    desc: "Pantau progres evaluasi",
  },
];

const featureItems = [...gratifikasiGroup, ...otherFeatures];

const navLinks = [
  { label: "Panduan", href: "/docs" },
  { label: "Inspektorat V", href: "/about" },
];

function getAccountInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);

  if (words.length === 0) return "AK";
  return words.map((word) => word[0]?.toUpperCase() ?? "").join("");
}

export const Navbar = () => {
  const { isLoggedIn, role, user, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const dashboardHref = getDashboardHref(role);
  const accountLabel = user.name?.trim() || "Akun";
  const roleLabel = role ? (ROLE_LABELS[role] ?? role) : null;
  const accountInitials = getAccountInitials(accountLabel);

  const handleLogout = useCallback(() => {
    logout();
    router.push("/");
  }, [logout, router]);

  const isFeatureActive = featureItems.some((f) =>
    pathname?.startsWith(f.href),
  );

  return (
    <HeroUINavbar
      maxWidth="xl"
      position="sticky"
      isMenuOpen={isMenuOpen}
      onMenuOpenChange={setIsMenuOpen}
      className="border-b border-default-100 bg-background/80 backdrop-blur-md"
    >
      {/* ── Brand ─────────────────────────────────────── */}
      <NavbarContent justify="start">
        <NavbarBrand>
          <NextLink href="/" className="flex items-center gap-2">
            <VisaBrandMark className="h-8 w-8" />
            <span className="font-semibold text-sm text-foreground hidden sm:block">
              Visa Assistant
            </span>
          </NextLink>
        </NavbarBrand>
      </NavbarContent>

      {/* ── Desktop nav ───────────────────────────────── */}
      <NavbarContent className="hidden md:flex gap-1" justify="center">
        <NavbarItem>
          <NextLink
            href="/"
            className={clsx(
              "px-3 py-1.5 rounded-lg text-sm transition-colors",
              pathname === "/"
                ? "text-primary font-medium"
                : "text-default-600 hover:text-foreground hover:bg-default-100",
            )}
          >
            Home
          </NextLink>
        </NavbarItem>

        {/* Fitur dropdown */}
        <NavbarItem>
          <Dropdown placement="bottom-start">
            <DropdownTrigger>
              <button
                className={clsx(
                  "flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors outline-none",
                  isFeatureActive
                    ? "text-primary font-medium"
                    : "text-default-600 hover:text-foreground hover:bg-default-100",
                )}
              >
                Fitur
                <ChevronDown size={13} className="opacity-60" />
              </button>
            </DropdownTrigger>
            <DropdownMenu
              aria-label="Fitur"
              className="w-60"
              itemClasses={{
                base: "gap-3 rounded-xl data-[hover=true]:bg-default-100",
              }}
            >
              <DropdownSection title="Gratifikasi" showDivider>
                {gratifikasiGroup.map((item) => {
                  const Icon = item.icon;
                  return (
                    <DropdownItem
                      key={item.href}
                      href={item.href}
                      as={NextLink}
                      startContent={
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Icon size={15} className="text-primary" />
                        </div>
                      }
                      description={
                        <span className="text-xs text-default-400">
                          {item.desc}
                        </span>
                      }
                    >
                      <span className="text-sm font-medium">{item.label}</span>
                    </DropdownItem>
                  );
                })}
              </DropdownSection>
              <DropdownSection title="Program">
                {otherFeatures.map((item) => {
                  const Icon = item.icon;
                  return (
                    <DropdownItem
                      key={item.href}
                      href={item.href}
                      as={NextLink}
                      startContent={
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Icon size={15} className="text-primary" />
                        </div>
                      }
                      description={
                        <span className="text-xs text-default-400">
                          {item.desc}
                        </span>
                      }
                    >
                      <span className="text-sm font-medium">{item.label}</span>
                    </DropdownItem>
                  );
                })}
              </DropdownSection>
            </DropdownMenu>
          </Dropdown>
        </NavbarItem>

        {navLinks.map((link) => (
          <NavbarItem key={link.href}>
            <NextLink
              href={link.href}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-sm transition-colors",
                pathname?.startsWith(link.href)
                  ? "text-primary font-medium"
                  : "text-default-600 hover:text-foreground hover:bg-default-100",
              )}
            >
              {link.label}
            </NextLink>
          </NavbarItem>
        ))}
      </NavbarContent>

      {/* ── Desktop right ─────────────────────────────── */}
      {/* ── Desktop right ─────────────────────────────── */}
      <NavbarContent
        className="hidden md:flex items-center gap-2"
        justify="end"
      >
        <NavbarItem className="flex items-center">
          <ThemeSwitch />
        </NavbarItem>

        <NavbarItem className="flex items-center">
          {!isLoggedIn ? (
            <div className="flex items-center gap-2">
              <Button
                as={NextLink}
                href="/register"
                size="sm"
                variant="flat"
                className="h-10 rounded-xl text-sm font-medium text-default-600 bg-default-100 hover:bg-default-200"
                startContent={<UserPlus size={14} />}
              >
                Register
              </Button>

              <Button
                as={NextLink}
                href="/login"
                size="sm"
                color="primary"
                variant="flat"
                className="h-10 rounded-xl font-medium"
                startContent={<LogIn size={14} />}
              >
                Login
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {hasPermission(role, "register:access") && (
                <Button
                  as={NextLink}
                  href="/register"
                  size="sm"
                  variant="flat"
                  className="h-10 rounded-xl text-default-600 bg-default-100 font-medium"
                  startContent={<UserPlus size={14} />}
                >
                  Register
                </Button>
              )}

              <Button
                as={NextLink}
                href={dashboardHref}
                size="sm"
                color="primary"
                variant="flat"
                className="h-10 rounded-xl px-3 font-medium"
                startContent={<LayoutDashboard size={14} />}
              >
                Dashboard
              </Button>

              <Dropdown placement="bottom-end" offset={12}>
                <DropdownTrigger>
                  <Button
                    size="sm"
                    variant="flat"
                    className="h-10 min-w-[236px] max-w-[272px] items-center justify-between gap-3 rounded-xl border border-default-200 bg-default-50 px-3 text-default-700 shadow-sm transition-all hover:bg-default-100"
                    endContent={
                      <ChevronDown
                        size={14}
                        className="shrink-0 text-default-400"
                      />
                    }
                  >
                    <span className="flex min-w-0 flex-1 items-center gap-2.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[11px] font-semibold text-primary">
                        {accountInitials}
                      </span>

                      <span className="min-w-0 flex-1 text-left">
                        <span className="block truncate text-sm font-medium leading-4">
                          {accountLabel}
                        </span>

                        <span className="mt-0.5 flex items-center gap-1.5 text-[11px] leading-3 text-default-400">
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary/70" />
                          <span className="truncate">{roleLabel}</span>
                        </span>
                      </span>
                    </span>
                  </Button>
                </DropdownTrigger>

                <DropdownMenu
                  aria-label="Menu akun"
                  className="w-[312px] rounded-2xl border border-default-200 bg-background p-2 shadow-xl"
                  itemClasses={{
                    base: "rounded-xl px-3 py-2 data-[hover=true]:bg-default-100",
                  }}
                >
                  <DropdownSection showDivider>
                    <DropdownItem
                      key="account-summary"
                      isReadOnly
                      className="cursor-default px-3 py-2.5 opacity-100"
                      textValue={`${accountLabel} ${roleLabel ?? ""}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                          {accountInitials}
                        </div>

                        <div className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold leading-5 text-foreground">
                            {accountLabel}
                          </span>

                          <div className="mt-1 flex items-center gap-2 text-[11px] text-default-400">
                            {roleLabel && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
                                <UserCircle2 size={11} />
                                {roleLabel}
                              </span>
                            )}
                          </div>

                          {user.unitKerja && (
                            <p className="mt-1 truncate text-xs leading-5 text-default-400">
                              {user.unitKerja}
                            </p>
                          )}
                        </div>
                      </div>
                    </DropdownItem>
                  </DropdownSection>

                  <DropdownSection>
                    <DropdownItem
                      key="profile"
                      href="/profile"
                      as={NextLink}
                      endContent={
                        <ChevronRight size={16} className="text-default-300" />
                      }
                      startContent={
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-default-100 text-default-600">
                          <Settings2 size={16} />
                        </div>
                      }
                      description="Lihat dan perbarui informasi akun"
                    >
                      Profile
                    </DropdownItem>

                    <DropdownItem
                      key="logout"
                      color="danger"
                      endContent={
                        <ChevronRight size={16} className="text-danger/40" />
                      }
                      startContent={
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-danger-50 text-danger">
                          <LogOut size={16} />
                        </div>
                      }
                      description="Keluar dari sesi yang sedang aktif"
                      onPress={handleLogout}
                    >
                      Logout
                    </DropdownItem>
                  </DropdownSection>
                </DropdownMenu>
              </Dropdown>
            </div>
          )}
        </NavbarItem>
      </NavbarContent>

      {/* ── Mobile toggle ─────────────────────────────── */}
      <NavbarContent className="md:hidden" justify="end">
        <ThemeSwitch />
        <NavbarMenuToggle
          aria-label={isMenuOpen ? "Tutup menu" : "Buka menu"}
        />
      </NavbarContent>

      {/* ── Mobile menu ───────────────────────────────── */}
      <NavbarMenu className="pt-4 pb-8 gap-1">
        <NavbarMenuItem>
          <Link
            as={NextLink}
            href="/"
            color="foreground"
            size="sm"
            className="w-full px-2 py-2 font-medium"
            onPress={() => setIsMenuOpen(false)}
          >
            Home
          </Link>
        </NavbarMenuItem>

        {/* Gratifikasi group */}
        <NavbarMenuItem>
          <p className="px-2 pt-3 pb-1 text-xs font-semibold text-default-400 uppercase tracking-widest">
            Gratifikasi
          </p>
        </NavbarMenuItem>
        {gratifikasiGroup.map((item) => {
          const Icon = item.icon;
          return (
            <NavbarMenuItem key={item.href}>
              <Link
                as={NextLink}
                href={item.href}
                color="foreground"
                size="sm"
                className="w-full px-2 py-2 flex items-center gap-3"
                onPress={() => setIsMenuOpen(false)}
              >
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon size={13} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-default-400">{item.desc}</p>
                </div>
              </Link>
            </NavbarMenuItem>
          );
        })}

        {/* Program group */}
        <NavbarMenuItem>
          <p className="px-2 pt-3 pb-1 text-xs font-semibold text-default-400 uppercase tracking-widest">
            Program
          </p>
        </NavbarMenuItem>
        {otherFeatures.map((item) => {
          const Icon = item.icon;
          return (
            <NavbarMenuItem key={item.href}>
              <Link
                as={NextLink}
                href={item.href}
                color="foreground"
                size="sm"
                className="w-full px-2 py-2 flex items-center gap-3"
                onPress={() => setIsMenuOpen(false)}
              >
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon size={13} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-default-400">{item.desc}</p>
                </div>
              </Link>
            </NavbarMenuItem>
          );
        })}

        {/* Other links */}
        <NavbarMenuItem>
          <p className="px-2 pt-3 pb-1 text-xs font-semibold text-default-400 uppercase tracking-widest">
            Lainnya
          </p>
        </NavbarMenuItem>
        {navLinks.map((link) => (
          <NavbarMenuItem key={link.href}>
            <Link
              as={NextLink}
              href={link.href}
              color="foreground"
              size="sm"
              className="w-full px-2 py-2 font-medium"
              onPress={() => setIsMenuOpen(false)}
            >
              {link.label}
            </Link>
          </NavbarMenuItem>
        ))}

        {/* Auth */}
        <NavbarMenuItem className="mt-4">
          {!isLoggedIn ? (
            <Button
              as={NextLink}
              href="/login"
              color="primary"
              fullWidth
              onPress={() => setIsMenuOpen(false)}
              startContent={<LogIn size={15} />}
            >
              Login UPG
            </Button>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="rounded-2xl border border-default-200 bg-background/80 px-3 py-3 text-left shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-xs font-semibold text-primary ring-1 ring-primary/10">
                    {accountInitials}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {accountLabel}
                    </p>
                    <p className="truncate text-xs text-default-400">
                      {roleLabel}
                    </p>
                    {user.unitKerja && (
                      <p className="truncate text-[11px] text-default-400">
                        {user.unitKerja}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              {hasPermission(role, "register:access") && (
                <Button
                  as={NextLink}
                  href="/register"
                  variant="flat"
                  fullWidth
                  className="bg-default-100"
                  onPress={() => setIsMenuOpen(false)}
                  startContent={<UserPlus size={15} />}
                >
                  Tambah Akun
                </Button>
              )}
              <Button
                as={NextLink}
                href={dashboardHref}
                color="primary"
                fullWidth
                onPress={() => setIsMenuOpen(false)}
                startContent={<LayoutDashboard size={15} />}
              >
                Dashboard
              </Button>
              <Button
                as={NextLink}
                href="/profile"
                variant="flat"
                fullWidth
                className="bg-default-100"
                onPress={() => setIsMenuOpen(false)}
                startContent={<Settings2 size={15} />}
              >
                Profile
              </Button>
              <Button
                color="danger"
                variant="flat"
                fullWidth
                onPress={handleLogout}
                startContent={<LogOut size={15} />}
              >
                Logout
              </Button>
            </div>
          )}
        </NavbarMenuItem>
      </NavbarMenu>
    </HeroUINavbar>
  );
};
