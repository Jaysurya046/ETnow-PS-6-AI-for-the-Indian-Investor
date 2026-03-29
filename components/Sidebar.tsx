"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", icon: "⚡", label: "Home" },
  { href: "/radar", icon: "📡", label: "Radar" },
  { href: "/charts", icon: "📈", label: "Charts" },
  { href: "/chat", icon: "🤖", label: "Chat" },
  { href: "/video", icon: "🎬", label: "Video" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">ET</div>
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-link ${pathname === item.href ? "active" : ""}`}
          >
            <span className="sidebar-icon">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
