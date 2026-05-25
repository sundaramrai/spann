import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Spann",
  description: "A lightweight chatbot, inference logging SDK, ingestion API, and dashboard.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
