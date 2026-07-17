import type { Metadata } from "next";
import "./styles.css";
import "maplibre-gl/dist/maplibre-gl.css";
import { AppNav } from "@/components/app-nav";

export const metadata: Metadata = {
  title: "Origin Graph",
  description: "A source-grounded comparative research workspace",
  robots: { index: false, follow: false }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><AppNav />{children}</body>
    </html>
  );
}
