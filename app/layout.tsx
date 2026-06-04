import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quant Catalyst Dashboard",
  description: "Free-first stock catalyst analysis dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
