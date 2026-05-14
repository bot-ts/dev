import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bot.ts ADMIN",
  description: "Admin panel for your Bot.ts bot",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
