"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ScanLine, ChartCandlestick, MessagesSquare, Clapperboard } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", icon: LayoutDashboard, label: "Overview", key: "01" },
  { href: "/radar", icon: ScanLine, label: "Signal monitor", key: "02" },
  { href: "/charts", icon: ChartCandlestick, label: "Chart analysis", key: "03" },
  { href: "/chat", icon: MessagesSquare, label: "Research desk", key: "04" },
  { href: "/video", icon: Clapperboard, label: "Market briefing", key: "05" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <Link href="/" className="sidebar-brand" aria-label="ETNow overview"><span className="sidebar-logo">ET</span><span>ETNow<span className="sidebar-edition">MARKET TERMINAL</span></span></Link>
      <div className="sidebar-label">WORKSPACES</div>
      <nav className="sidebar-nav" aria-label="Primary navigation">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-link ${pathname === item.href ? "active" : ""}`}
            aria-current={pathname === item.href ? "page" : undefined}
            title={item.label}
          >
            <item.icon size={17} strokeWidth={1.6} aria-hidden="true" />
            <span className="nav-label">{item.label}</span><span className="nav-key">{item.key}</span>
          </Link>
        ))}
      </nav>
      <div className="sidebar-footer"><span className="status-dot" /> NSE / BSE<span className="sidebar-edition">INDIA EQUITIES</span></div>
    </aside>
  );
}
