import type { Metadata } from "next";
import AuthProvider from "./auth-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Freshly | Pantry Expiration Tracker",
  description: "Use what you have, before it goes bad.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" data-scroll-behavior="smooth"><body><AuthProvider>{children}</AuthProvider></body></html>;
}
