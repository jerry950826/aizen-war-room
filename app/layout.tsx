import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;

  return {
    title: "Aizen 戰情室｜行政業務入口",
    description: "集中管理請假、請款、講師看板與團隊頁面權限。",
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
    },
    openGraph: {
      title: "Aizen 戰情室",
      description: "行政業務，一站掌握",
      images: [{ url: `${origin}/og.png`, width: 1536, height: 1024, alt: "Aizen 戰情室" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Aizen 戰情室",
      description: "行政業務，一站掌握",
      images: [`${origin}/og.png`],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
