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
  ShieldCheck,
  BookOpen,
  Award,
  LayoutDashboard,
  LogIn,
  LogOut,
  UserPlus,
  FileSpreadsheet,
  BarChart3,
} from "lucide-react";

import { ThemeSwitch } from "@/components/theme-switch";
import { Logo } from "@/components/icons";
import { useAuthStore } from "@/store/authStore";
import { hasPermission, getDashboardHref } from "@/lib/permissions";
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

export const Navbar = () => {
  const { isLoggedIn, role, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const dashboardHref = getDashboardHref(role);

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
            <Logo />
            <span className="font-semibold text-sm text-foreground hidden sm:block">
              Pencegahan Korupsi
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
      <NavbarContent className="hidden md:flex gap-2" justify="end">
        <NavbarItem>
          <ThemeSwitch />
        </NavbarItem>
        <NavbarItem>
          {!isLoggedIn ? (
            <div className="flex gap-2">
              <Button
                as={NextLink}
                href="/register"
                size="sm"
                variant="flat"
                className="text-sm font-medium text-default-600 bg-default-100 hover:bg-default-200"
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
                startContent={<LogIn size={14} />}
              >
                Login
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              {hasPermission(role, "register:access") && (
                <Button
                  as={NextLink}
                  href="/register"
                  size="sm"
                  variant="flat"
                  className="text-default-600 bg-default-100"
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
                startContent={<LayoutDashboard size={14} />}
              >
                Dashboard
              </Button>
              <Button
                size="sm"
                variant="flat"
                color="danger"
                onPress={handleLogout}
                startContent={<LogOut size={14} />}
              >
                Logout
              </Button>
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
