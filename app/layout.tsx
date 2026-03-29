import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "ETNow AI — Intelligence for the Indian Investor",
  description:
    "AI-powered market intelligence: Opportunity Radar, Chart Pattern Intelligence, Market Chat, and Video Engine for NSE/BSE investors.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <Sidebar />
          <div className="main-content">
            <Header />
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
