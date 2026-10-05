import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import dynamic from 'next/dynamic';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Gas Agency Management System",
  description: "By Aadhunik setup",
};

const CapacitorBackButton = dynamic(
  () => import('@/components/CapacitorBackButton').then(mod => mod.CapacitorBackButton),
  { ssr: false }
);

// Additive: PWA offline sync + real-time polling providers
const RealtimeProvider = dynamic(
  () => import('@/components/RealtimeProvider').then(mod => mod.RealtimeProvider),
  { ssr: false }
);
const OnlineBanner = dynamic(
  () => import('@/components/OnlineBanner').then(mod => mod.OnlineBanner),
  { ssr: false }
);
const InstallPrompt = dynamic(
  () => import('@/components/InstallPrompt').then(mod => mod.InstallPrompt),
  { ssr: false }
);

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#f97316" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body
        className={`${inter.className} antialiased`}
      >
        <CapacitorBackButton />
        <RealtimeProvider>
          {children}
        </RealtimeProvider>
        <OnlineBanner />
        <InstallPrompt />
      </body>
    </html>
  );
}
