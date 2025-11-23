import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Gunakan font Inter yang lebih ringan
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Dashboard Admin - Chatbot Pendaftaran",
  description: "Panel admin untuk mengelola chatbot pendaftaran sekolah",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
