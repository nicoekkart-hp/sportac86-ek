import type { Metadata } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-barlow",
});

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  style: ["normal", "italic"],
  variable: "--font-barlow-condensed",
});

export const metadata: Metadata = {
  title: "Sportac 86 Deinze — EK Ropeskipping Noorwegen 2025",
  description:
    "Sportac 86 Deinze vertegenwoordigt België op het Europees Kampioenschap Ropeskipping in Noorwegen. Steun ons team!",
  openGraph: {
    title: "Sportac 86 Deinze — EK Ropeskipping Noorwegen 2025",
    description: "Steun ons ropeskippingteam op weg naar Noorwegen!",
    locale: "nl_BE",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl">
      <body
        className={`${barlow.variable} ${barlowCondensed.variable} font-sans bg-gray-warm text-gray-dark antialiased`}
      >
        <Nav />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
