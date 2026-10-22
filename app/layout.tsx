import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "ETNow Terminal — Indian markets",
  description:
    "Indian market quotes, chart analysis, portfolio research and market briefings.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <a href="#workspace" className="skip-link">Skip to workspace</a>
        <div className="app-shell">
          <Sidebar />
          <div className="main-content">
            <Header />
            <main id="workspace" tabIndex={-1}>{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
