import type { Metadata, Viewport } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  applicationName: "Bon Panier Digital Menu",
  title: {
    default: "Bon Panier · Digital Menu",
    template: "%s · Bon Panier",
  },
  description:
    "Bon Panier digital restaurant menu and kitchen dashboard — NFC/QR table ordering.",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Bon Panier",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#a67066",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="dark"
      className={`${dmSans.variable} ${playfair.variable} dark h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col bg-[var(--bg)] text-[var(--text)]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
