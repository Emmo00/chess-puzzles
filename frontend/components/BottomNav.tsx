"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Store, User, Trophy, CircleHelp } from "lucide-react";
import styles from "@/app/page.module.css";

interface NavItem {
  href: string;
  label: string;
  icon: typeof Home;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/store", label: "Store", icon: Store },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/leaderboard", label: "Ranks", icon: Trophy },
  { href: "/faq", label: "FAQ", icon: CircleHelp },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav() {
  const pathname = usePathname() ?? "/";

  return (
    <nav className={styles.bottomNav} aria-label="Primary">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.navItem} ${active ? styles.navItemActive : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <span className={styles.navIconBubble}>
              <Icon strokeWidth={3} aria-hidden="true" />
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
