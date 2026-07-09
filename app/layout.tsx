import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono, Libre_Caslon_Text } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

const libreCaslon = Libre_Caslon_Text({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: ["400", "700"],
  style: ["normal", "italic"],
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Attesta — raw recordings in, signed minutes out",
  description:
    "Attesta turns raw meeting audio into signed, compliance-ready minutes — drafted by AI in minutes, then checked, corrected and locked by a specialist before anything enters the record.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(archivo.variable, libreCaslon.variable, plexMono.variable)}
    >
      <body className="antialiased">{children}</body>
    </html>
  );
}
