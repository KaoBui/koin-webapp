import type { Metadata } from "next";
import Script from "next/script";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

// Notion's type is a tuned cut of Inter — substitute Inter directly.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Koin",
  description: "Invite-only personal finance tracker",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <Script
          src="https://cdn.weglot.com/weglot.min.js"
          strategy="beforeInteractive"
        />
        <Script id="weglot-init" strategy="beforeInteractive">
          {`Weglot.initialize({ api_key: 'wg_a376ab5cdc3bbbbd17b97ca80eb931025' });`}
        </Script>
      </head>
      <body
        className={`${inter.variable} ${geistMono.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
