import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Game of the Day",
  description: "A new classic game every day, built by AI. Anime-powered. Browser-native. No installs.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
