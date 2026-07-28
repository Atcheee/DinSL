import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Providers } from "@/app/providers";
import "./globals.css";

const siteUrl = "https://dinsl.vercel.app";
const siteName = "DinSL";
const title = "DinSL – Hinner du nästa? Realtidsavgångar i Stockholm";
const description =
  "DinSL ger dig ett tydligt lämna-nu-besked utifrån din hållplats, gångtid och aktuella SL-avgångar. Se realtidsskärmar och planera pendlingen i Stockholm.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: title,
    template: `%s | ${siteName}`
  },
  description,
  keywords: [
    "SL",
    "SL avgångar",
    "realtid",
    "Stockholm",
    "pendling",
    "kollektivtrafik",
    "hållplats",
    "avgångsskärm",
    "lämna nu",
    "DinSL"
  ],
  authors: [{ name: siteName, url: siteUrl }],
  creator: siteName,
  publisher: siteName,
  applicationName: siteName,
  alternates: {
    canonical: "/"
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true
    }
  },
  openGraph: {
    type: "website",
    locale: "sv_SE",
    url: siteUrl,
    siteName,
    title,
    description
  },
  twitter: {
    card: "summary_large_image",
    title,
    description
  }
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="sv" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
