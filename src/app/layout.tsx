import type { Metadata, Viewport } from "next";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { Noto_Sans, Noto_Sans_Armenian, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { PrefsProvider } from "@/components/providers/prefs-provider";
import { ConvexClientProvider } from "@/components/providers/convex-provider";
import { PWARegister } from "@/components/providers/pwa-register";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

const notoSansArmenian = Noto_Sans_Armenian({
  variable: "--font-armenian",
  subsets: ["armenian"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const notoSans = Noto_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "Դրամապանակ",
  title: {
    default: "Դրամապանակ — Անձնական ֆինանսներ",
    template: "%s · Դրամապանակ",
  },
  description: "Ձեր անձնական ֆինանսների կառավարիչը։ Հետևեք ծախսերին, եկամուտներին ու բյուջեին, ստեղծեք նպատակներ և ստացեք խելացի վերլուծություն։",
  keywords: [
    "դրամապանակ",
    "անձնական ֆինանսներ",
    "բյուջե",
    "ծախսեր",
    "եկամուտ",
    "խնայողություն",
    "ֆինանսների կառավարում",
    "finance",
    "budget",
    "expense tracker",
    "Armenia",
  ],
  authors: [{ name: "Դրամապանակ" }],
  creator: "Դրամապանակ",
  publisher: "Դրամապանակ",
  category: "finance",
  manifest: "/manifest.json",
  formatDetection: { telephone: false, email: false, address: false },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Դրամապանակ" },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icons/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    locale: "hy_AM",
    url: siteUrl,
    siteName: "Դրամապանակ",
    title: "Դրամապանակ — Անձնական ֆինանսներ",
    description: "Ձեր անձնական ֆինանսների կառավարիչը։ Հետևեք ծախսերին, եկամուտներին ու բյուջեին։",
  },
  twitter: {
    card: "summary_large_image",
    title: "Դրամապանակ — Անձնական ֆինանսներ",
    description: "Ձեր անձնական ֆինանսների կառավարիչը։ Հետևեք ծախսերին, եկամուտներին ու բյուջեին։",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5fdf9" },
    { media: "(prefers-color-scheme: dark)", color: "#1a2e2a" },
  ],
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ConvexAuthNextjsServerProvider>
      <html
        lang="hy"
        suppressHydrationWarning
        className={`${notoSansArmenian.variable} ${notoSans.variable} ${geistMono.variable} h-full`}
      >
        <head>
          <script
            // Apply saved visual prefs before paint to avoid a flash.
            dangerouslySetInnerHTML={{
              __html: `(function(){try{var p=JSON.parse(localStorage.getItem('dramapanak-prefs')||'{}').state||{};var r=document.documentElement;r.dataset.accent=p.accent||'emerald';r.dataset.density=p.density||'comfortable';r.dataset.privacy=p.privacy?'on':'off';}catch(e){}})();`,
            }}
          />
        </head>
        <body className="h-full antialiased">
          <ConvexClientProvider>
            <ThemeProvider>
              <PrefsProvider>
                <TooltipProvider delayDuration={200}>
                  {children}
                  <Toaster richColors position="top-right" />
                  <PWARegister />
                </TooltipProvider>
              </PrefsProvider>
            </ThemeProvider>
          </ConvexClientProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
