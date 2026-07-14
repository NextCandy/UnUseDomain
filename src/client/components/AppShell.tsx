/**
 * 前台外壳：桌面端顶部导航，手机端底部固定导航。
 * 桌面端不出现底部悬浮导航；手机端不出现顶部导航链接。
 */
import type { ReactNode } from "react";

import { IconGlobe, IconHome, IconMail, IconShield, IconSparkle } from "./icons";

export type PublicNavKey = "home" | "domains" | "featured" | "contact" | "admin";

interface NavItem {
  key: PublicNavKey;
  label: string;
  href?: string;
  icon: ReactNode;
}

const NAV: NavItem[] = [
  { key: "home", label: "首页", href: "/", icon: <IconHome size={22} /> },
  { key: "domains", label: "域名", href: "/domains", icon: <IconGlobe size={22} /> },
  { key: "featured", label: "精品", href: "/domains?group=featured", icon: <IconSparkle size={22} /> },
  { key: "contact", label: "联系", icon: <IconMail size={22} /> },
  { key: "admin", label: "后台", href: "/admin", icon: <IconShield size={22} /> },
];

export function BrandMark({ name = "玩米", logoUrl }: { name?: string; logoUrl?: string | null }) {
  return (
    <a className="brand" href="/" aria-label={`${name} 首页`}>
      {logoUrl ? <img src={logoUrl} alt={`${name} Logo`} /> : <span className="brand-mark">玩</span>}
      <span className="brand-name">{name}</span>
    </a>
  );
}

export function AppShell({
  active,
  siteName,
  logoUrl,
  onContact,
  hasContact,
  children,
}: {
  active: PublicNavKey;
  siteName?: string;
  logoUrl?: string | null;
  onContact?: () => void;
  hasContact?: boolean;
  children: ReactNode;
}) {
  const items = NAV.filter((item) => item.key !== "contact" || hasContact);

  return (
    <div className="app-shell">
      <header className="top-nav">
        <div className="top-nav-inner">
          <BrandMark name={siteName} logoUrl={logoUrl} />
          <nav aria-label="主导航">
            {items.map((item) =>
              item.href ? (
                <a
                  key={item.key}
                  href={item.href}
                  className={`top-nav-link${active === item.key ? " active" : ""}`}
                  aria-current={active === item.key ? "page" : undefined}
                >
                  {item.label}
                </a>
              ) : (
                <button key={item.key} className="top-nav-link" onClick={onContact}>
                  {item.label}
                </button>
              ),
            )}
          </nav>
        </div>
      </header>

      <main className="app-main">{children}</main>

      <nav className="bottom-nav" aria-label="主导航">
        {items.map((item) =>
          item.href ? (
            <a
              key={item.key}
              href={item.href}
              className={`bottom-nav-item${active === item.key ? " active" : ""}`}
              aria-current={active === item.key ? "page" : undefined}
            >
              {item.icon}
              <span>{item.label}</span>
            </a>
          ) : (
            <button key={item.key} className="bottom-nav-item" onClick={onContact}>
              {item.icon}
              <span>{item.label}</span>
            </button>
          ),
        )}
      </nav>
    </div>
  );
}
