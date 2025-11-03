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
import { Button } from "@heroui/button";
import { Link } from "@heroui/link";
import { link as linkStyles } from "@heroui/theme";
import NextLink from "next/link";
import clsx from "clsx";

import { siteConfig } from "@/config/site";
import { ThemeSwitch } from "@/components/theme-switch";
import { Logo, LoginIcon } from "@/components/icons";
import { useAuthStore } from "@/store/authStore";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboardIcon } from "lucide-react";

export const Navbar = () => {
  const { isLoggedIn, logout } = useAuthStore();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = useCallback(() => {
    logout();
    router.push("/");
  }, [logout, router]);

  const handleMenuItemClick = useCallback(() => {
    // Tutup menu saat link di klik (khusus mobile)
    setIsMenuOpen(false);
  }, []);

  return (
    <HeroUINavbar
      maxWidth="xl"
      position="sticky"
      isMenuOpen={isMenuOpen}
      onMenuOpenChange={setIsMenuOpen}
    >
      <NavbarContent className="basis-1/5 sm:basis-full" justify="start">
        <NavbarBrand as="li" className="gap-3 max-w-fit">
          <NextLink className="flex justify-start items-center gap-1" href="/">
            <Logo />
            <p className="font-bold text-inherit">Lapor Gratifikasi</p>
          </NextLink>
        </NavbarBrand>
        <ul className="hidden md:flex gap-4 justify-start ml-2">
          {siteConfig.navItems.map((item) => (
            <NavbarItem key={item.href}>
              <NextLink
                className={clsx(
                  linkStyles({ color: "foreground" }),
                  "data-[active=true]:text-primary data-[active=true]:font-medium"
                )}
                href={item.href}
              >
                {item.label}
              </NextLink>
            </NavbarItem>
          ))}
        </ul>
      </NavbarContent>

      <NavbarContent
        className="hidden lg:flex basis-1/5 sm:basis-full"
        justify="end"
      >
        <NavbarItem className="hidden md:flex gap-2">
          <ThemeSwitch />
        </NavbarItem>
        <NavbarItem className="hidden md:flex">
          {!isLoggedIn ? (
            <Button
              as={Link}
              className="flex items-center justify-center text-sm font-semibold text-foreground bg-default-100"
              href={"/login"}
              variant="flat"
            >
              <LoginIcon />
              <p>Login UPG</p>
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                as={Link}
                href={"/dashboard"}
                variant="solid"
                color="primary"
              >
                Dashboard
              </Button>
              <Button onPress={handleLogout} variant="solid" color="danger">
                Logout
              </Button>
            </div>
          )}
        </NavbarItem>
      </NavbarContent>

      {/* MOBILE SECTION */}
      <NavbarContent className="lg:hidden basis-1 pl-4" justify="end">
        <ThemeSwitch />
        <NavbarMenuToggle
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        />
      </NavbarContent>

      <NavbarMenu>
        <div className="mx-4 flex flex-col gap-2">
          {siteConfig.navMenuItems.map((item, index) => (
            <NavbarMenuItem key={`${item.href}-${index}`}>
              <Link
                color={
                  index === 2
                    ? "foreground"
                    : index === siteConfig.navMenuItems.length - 1
                      ? "warning"
                      : "foreground"
                }
                href={item.href}
                size="lg"
                onClick={handleMenuItemClick} // ✅ Tutup menu setelah klik
                className="grid md:hidden"
              >
                {item.label}
              </Link>
            </NavbarMenuItem>
          ))}
          {isLoggedIn ? (
            <NavbarMenuItem className="grid">
              <div className="grid py-6 md:py-0 gap-3">
                <Button
                  as={Link}
                  href="/dashboard"
                  color="primary"
                  size="lg"
                  variant="shadow"
                  onPress={handleMenuItemClick}
                >
                  Go to Dashboard
                  <LayoutDashboardIcon />
                </Button>
                <Button onPress={handleLogout} color="danger" fullWidth>
                  Logout
                </Button>
              </div>
            </NavbarMenuItem>
          ) : (
            <NavbarMenuItem>
              <Button as={Link} href="/login" color="primary" fullWidth>
                Login
              </Button>
            </NavbarMenuItem>
          )}
        </div>
      </NavbarMenu>
    </HeroUINavbar>
  );
};
