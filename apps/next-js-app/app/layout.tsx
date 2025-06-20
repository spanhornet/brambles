import "./globals.css";

// Next.js Metadata API
import type { Metadata } from "next";

// Google Fonts
import { Geist, Geist_Mono } from "next/font/google";

// `ThemeProvider` Component
import { ThemeProvider } from "@/components/theme-provider";

// React Query Provider
import { ReactQueryProvider } from "@/lib/react-query-provider"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ReactQueryProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >

            {children}
          </ThemeProvider>
        </ReactQueryProvider>
      </body>
    </html >
  );
}