import type { Metadata } from "next";
import { Fraunces, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["400", "500", "600"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-plex-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Catálogo de Mídias — Jornalismo TV Cultura",
  description:
    "Acervo de imagens e vídeos do jornalismo da TV Cultura, organizado por editoria e programa.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${fraunces.variable} ${inter.variable} ${plexMono.variable} font-body bg-paper text-ink antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
