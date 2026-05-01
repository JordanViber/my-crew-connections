import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import { ThemeBootstrap } from "@/components/theme-bootstrap";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "My Crew Connections",
  description: "A warm relationship app for keeping up with the people and groups that matter most.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" data-theme="light" suppressHydrationWarning>
      <body className={`${fraunces.variable} ${manrope.variable} antialiased`}>
        <ThemeBootstrap />
        {children}
      </body>
    </html>
  );
}
