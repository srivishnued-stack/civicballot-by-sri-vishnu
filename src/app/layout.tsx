import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CivicBallot — Secure Digital Elections",
  description: "Institution-grade election administration and private digital voting.",
};

export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="en"><body>{children}</body></html>;
}
