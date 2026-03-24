import type { Metadata } from "next";
import { Cormorant_Garamond, Cinzel, Jost } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
});

const cinzel = Cinzel({
  variable: "--font-title",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const jost = Jost({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

export const metadata: Metadata = {
  title: "Popper Tulimond",
  description: "Dark Heritage Luxury.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${cinzel.variable} ${jost.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-obsidian text-parchment overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
