import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { ForceRefreshOnLoad } from "@/components/layout/ForceRefreshOnLoad";
import { getCacheFreshness } from "@/lib/data/store";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SportLog — KI-Leistungscoach",
  description: "Persönlicher KI-gestützter Sport- und Gesundheitsassistent für Leistungssportler",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { staleDays } = await getCacheFreshness();
  const freshnessLabel =
    staleDays <= 0 ? "Daten: heute aktualisiert" : `Daten: vor ${staleDays} Tag${staleDays === 1 ? "" : "en"} aktualisiert`;

  return (
    <html
      lang="de"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex bg-background text-foreground">
        <ForceRefreshOnLoad />
        <Sidebar freshnessLabel={freshnessLabel} />
        <div className="flex-1 min-w-0 flex flex-col">{children}</div>
      </body>
    </html>
  );
}
