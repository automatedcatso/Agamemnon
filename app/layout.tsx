import type { Metadata, Viewport } from "next";
import { Cinzel, Manrope } from "next/font/google";
import "./globals.css";

const displayFont = Cinzel({
  subsets: ["latin"],
  variable: "--font-cinzel",
  display: "swap",
});

const bodyFont = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const siteUrl =
  process.env.NEXT_PUBLIC_APP_URL?.trim() ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "") ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
  "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Agamemnon — Academic Command",
  description: "A college command centre for day orders, reminders, notes, study material, and Odysseus AI.",
  applicationName: "Agamemnon",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Agamemnon",
  },
  formatDetection: { telephone: false },
  openGraph: {
    title: "Agamemnon — Academic Command",
    description: "Day-order calendar, reminders, notes, study vault, and Odysseus AI.",
    type: "website",
    images: [{ url: "/og.png", width: 1536, height: 910, alt: "Agamemnon Academic Command" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Agamemnon — Academic Command",
    description: "Your college campaign, under command.",
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#07111f",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${displayFont.variable} ${bodyFont.variable}`}>{children}</body>
    </html>
  );
}
