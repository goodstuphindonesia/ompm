import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "O$P$ Finance Platform",
  description: "Finance processing platform for creative agency operations"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
