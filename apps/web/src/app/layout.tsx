import "@monorepo/ui/globals.css";

import type { Metadata, Viewport } from "next";

import { ThemeProvider } from "../providers/theme-provider";
import Providers from "./provider";

export const metadata: Metadata = {
  description: "Dudle",
  title: "Dudle: Dudes play dudle",
};


export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#3b82f6',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <Providers>{children}</Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
