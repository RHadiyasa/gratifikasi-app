import "@/styles/globals.css";
import { Metadata, Viewport } from "next";
import { Link } from "@heroui/link";
import { SpeedInsights } from "@vercel/speed-insights/next";
import clsx from "clsx";

import { Providers } from "./providers";
import { siteConfig } from "@/config/site";
import { fontSans } from "@/config/fonts";
import { Navbar } from "@/components/navbar";
import ClientWrapper from "@/components/clientWrapper";
import { VisaCredit } from "@/components/visa-brand";

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s - ${siteConfig.name}`,
  },
  description: siteConfig.description,
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/visa-dark-mark.png", type: "image/png", sizes: "256x256" },
    ],
    shortcut: "/favicon.ico",
    apple: "/visa-dark-mark.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning lang="id">
      <head />
      <body
        suppressHydrationWarning
        className={clsx(
          "min-h-screen text-foreground bg-background font-sans antialiased",
          fontSans.variable
        )}
      >
        <Providers themeProps={{ attribute: "class", defaultTheme: "dark" }}>
          <ClientWrapper>
            <div className="relative flex flex-col h-screen">
              <Navbar />
              <main className="container mx-auto px-0 flex-grow">
                {children}
                <SpeedInsights />
              </main> 
              <footer className="w-full flex items-center justify-center py-5">
                <Link
                  isExternal
                  className="text-current"
                  href="https://itjen.esdm.go.id/id/profil/tugas-fungsi/inspektorat-v"
                  title="Inspektorat Jenderal Home Page"
                >
                  <VisaCredit size="sm" />
                </Link>
              </footer>
            </div>
          </ClientWrapper>
        </Providers>
      </body>
    </html>
  );
}
