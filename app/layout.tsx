import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

// Visualmente idêntica à IBM Plex Sans JP para caracteres latinos (é a mesma
// família, só com conjunto de caracteres japoneses a mais) — usando a versão
// "Sans" padrão aqui porque tem suporte garantido a todos os pesos no
// next/font/google.
const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-plex-sans",
  weight: ["400", "500", "600"],
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
      <body className={`${plexSans.variable} font-body bg-white text-black antialiased`}>
        {children}
      </body>
    </html>
  );
}
