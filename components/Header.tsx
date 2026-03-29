"use client";
import { useEffect, useState } from "react";

interface TickerItem {
  name: string;
  price: string;
  change: string;
  pct: string;
  up: boolean;
}

export default function Header() {
  const [items, setItems] = useState<TickerItem[]>([]);

  useEffect(() => {
    async function fetchTickers() {
      try {
        const res = await fetch("/api/market");
        const data = await res.json();
        if (Array.isArray(data)) {
          setItems([...data, ...data]); // duplicate for seamless loop
        }
      } catch (err) {
        console.error("Failed to load tickers", err);
      }
    }
    fetchTickers();
    const interval = setInterval(fetchTickers, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="header">
      <div className="header-brand">
        <div className="header-logo">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Red gradient background */}
            <defs>
              <linearGradient id="etGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#E74C3C" />
                <stop offset="100%" stopColor="#C0392B" />
              </linearGradient>
            </defs>
            <rect width="32" height="32" rx="8" fill="url(#etGradient)" />
            
            {/* ET Text */}
            <text x="16" y="22" fontFamily="Arial, sans-serif" fontSize="16" fontWeight="900" fill="white" textAnchor="middle" letterSpacing="-0.5">
              ET
            </text>
          </svg>
        </div>
        <div>
          <div className="header-title">ETNow AI</div>
          <div className="header-subtitle">Intelligence for the Indian Investor</div>
        </div>
      </div>

      <div className="header-ticker">
        <div className="ticker-track">
          {items.map((item, i) => (
            <div key={i} className="ticker-item">
              <span className="ticker-name">{item.name}</span>
              <span className="ticker-price">{item.price}</span>
              <span className={`ticker-change ${item.up ? "ticker-up" : "ticker-down"}`}>
                {item.change} ({item.pct})
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="header-actions">
        <div className="live-badge">
          <span className="live-dot" />
          LIVE
        </div>
      </div>
    </header>
  );
}
