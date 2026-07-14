import { useCallback, useEffect, useState } from "react";

import { api } from "./api";
import type { PublicDomain } from "../../shared/types/api";

export interface SiteSettings {
  site_name: string;
  site_description: string;
  site_bio: string | null;
  logo_url: string | null;
  accent_color: string;
  display_density: string;
  copyright_text: string | null;
  icp_number: string | null;
  contact_email: string | null;
  contact_wechat: string | null;
  contact_telegram: string | null;
  wechat_qr_url: string | null;
}

/** 首页 Dashboard 的真实统计。库中没有估值字段，也没有跨月的 created_at，
 *  因此这里既不返回估值也不返回时间趋势——资产结构由分类 / 后缀 / 长度分布表达。 */
export interface Overview {
  total: number;
  featuredCount: number;
  tldCount: number;
  latestAddedAt: string | null;
  latestUpdatedAt: string | null;
  categories: Array<{ name: string; count: number }>;
  tlds: Array<{ name: string; count: number }>;
  lengths: Array<{ length: number; count: number }>;
  recentAdded: PublicDomain[];
  recentUpdated: PublicDomain[];
}

export interface DomainFacets {
  tlds: string[];
  categories: string[];
  categoryCounts: Record<string, number>;
  total: number;
  tldCount: number;
  featuredCount: number;
  latestAddedAt: string | null;
}

export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  useEffect(() => {
    api<SiteSettings>("/api/public/settings")
      .then((data) => {
        setSettings(data);
        document.title = `${data.site_name} · 域名资产`;
      })
      .catch(() => setSettings(null));
  }, []);
  const hasContact = Boolean(settings?.contact_email || settings?.contact_wechat || settings?.contact_telegram);
  return { settings, hasContact };
}

/** 前台数据版本轮询：后台改动后，前台无需刷新即可自动重新拉取。 */
export function useDataVersion(onChange: () => void) {
  const stable = useCallback(onChange, [onChange]);
  useEffect(() => {
    let active = true;
    let current = "";
    const check = async () => {
      try {
        const result = await api<{ version: string }>("/api/public/version");
        if (!active) return;
        if (current && result.version !== current) stable();
        current = result.version;
      } catch {
        /* 网络短暂失败时等待下一轮 */
      }
    };
    void check();
    const timer = window.setInterval(() => void check(), 8000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [stable]);
}

/**
 * 域名的有效分类标签。后端 serializePublic 已算好 categories：
 * 有人工分类时只返回该分类，否则返回全部自动标签（纯字母 / 双拼 …）。
 * 这里只做兜底，兼容 categories 缺失的旧响应。
 */
export function domainCategories(domain: Pick<PublicDomain, "categories" | "category">): string[] {
  if (domain.categories?.length) return domain.categories;
  return domain.category ? [domain.category] : [];
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("zh-CN");
}
