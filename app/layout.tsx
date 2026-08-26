import type { Metadata } from "next";
import { Hanken_Grotesk, Permanent_Marker, IBM_Plex_Mono } from "next/font/google";
import { SITE } from "@/lib/site";
import "./globals.css";

const sans = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});
const marker = Permanent_Marker({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-marker",
  display: "swap",
});
const mono = IBM_Plex_Mono({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://egotop.lol"),
  title: `${SITE.name} — ${SITE.tagline}`,
  description: SITE.tagline,
  openGraph: {
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.tagline,
    url: "https://egotop.lol",
    siteName: SITE.name,
    images: [{ url: "/egotop-og.png", width: 1200, height: 1200 }],
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.tagline,
    images: ["/egotop-og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className={`${sans.variable} ${marker.variable} ${mono.variable}`}>
        {children}
      </body>
    </html>
  );
}
