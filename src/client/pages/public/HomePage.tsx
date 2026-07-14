import { useCallback, useEffect, useState } from "react";

import { AppShell } from "../../components/AppShell";
import { ContactModal } from "../../components/ContactModal";
import { DomainRow } from "../../components/DomainCard";
import { IconArrowUpRight, IconGlobe, IconLayers, IconSparkle } from "../../components/icons";
import { Toast, type ToastMessage } from "../../components/Toast";
import { ErrorState, SectionHead, SkeletonGrid } from "../../components/ui";
import { api } from "../../lib/api";
import { formatDate, useDataVersion, useSiteSettings, type Overview } from "../../lib/site";

const TABS = [
  ["added", "最近添加"],
  ["updated", "最近更新"],
] as const;
type TabKey = (typeof TABS)[number][0];

export function HomePage() {
  const { settings, hasContact } = useSiteSettings();
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<TabKey>("added");
  const [contactOpen, setContactOpen] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const load = useCallback(() => {
    setError("");
    api<Overview>("/api/public/overview")
      .then(setData)
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "资产概览加载失败"));
  }, []);

  useEffect(load, [load]);
  useDataVersion(load);

  const today = new Date().toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" });
  const featuredPct = data && data.total > 0 ? Math.round((data.featuredCount / data.total) * 100) : 0;
  const recent = data ? (tab === "added" ? data.recentAdded : data.recentUpdated) : [];
  // 图例只展示前 5 个分类，其余合并为「其他」，避免亮卡底部信息过载
  const legend = data?.categories.slice(0, 5) ?? [];
  const topTldMax = data?.tlds[0]?.count ?? 1;
  const topCatMax = data?.categories[0]?.count ?? 1;

  return (
    <AppShell
      active="home"
      siteName={settings?.site_name}
      logoUrl={settings?.logo_url}
      hasContact={hasContact}
      onContact={() => setContactOpen(true)}
    >
      <div className="page">
        <div className="page-header">
          <div>
            <h1>域名资产总览</h1>
            <p className="page-sub">{settings?.site_description || "精选域名展示与资产管理"}</p>
          </div>
          <div className="page-header-meta">
            <strong>{today}</strong>
            {data?.latestUpdatedAt && <span>最近更新 {formatDate(data.latestUpdatedAt)}</span>}
          </div>
        </div>

        {error && <ErrorState message={error} onRetry={load} />}

        {!error && !data && <SkeletonGrid count={5} className="dash-stack" />}

        {!error && data && (
          <div className="dash-stack">
            {/* 反差亮卡：资产总览。数字与构成条全部来自 D1 真实统计 */}
            <section className="hero-card">
              <div className="hero-top">
                <span>Domain Asset Overview</span>
                <a href="/domains">
                  查看全部 <IconArrowUpRight size={16} />
                </a>
              </div>
              <div className="hero-value">
                <strong>{data.total.toLocaleString("en-US")}</strong>
                <span>个域名在库</span>
              </div>
              <div className="hero-bar" role="img" aria-label="域名分类构成">
                {data.categories.map((item) => (
                  <i key={item.name} style={{ flexGrow: item.count }} />
                ))}
              </div>
              <div className="hero-legend">
                {legend.map((item) => (
                  <span key={item.name}>
                    {item.name} <b>{item.count}</b>
                  </span>
                ))}
              </div>
            </section>

            {/* 核心指标三栏 */}
            <section className="stat-trio">
              <div className="stat-cell">
                <span className="stat-icon">
                  <IconGlobe size={20} />
                </span>
                <div className="stat-body">
                  <strong>{data.total}</strong>
                  <span>全部域名</span>
                </div>
              </div>
              <div className="stat-cell">
                <span className="stat-icon">
                  <IconSparkle size={20} />
                </span>
                <div className="stat-body">
                  <strong>{data.featuredCount}</strong>
                  <span>精品域名</span>
                </div>
              </div>
              <div className="stat-cell">
                <span className="stat-icon">
                  <IconLayers size={20} />
                </span>
                <div className="stat-body">
                  <strong>{data.tldCount}</strong>
                  <span>后缀种类</span>
                </div>
              </div>
            </section>

            {/* 资产结构：精品占比 / 后缀分布 / 分类分布 */}
            <section>
              <SectionHead title="资产结构" />
              <div className="structure-grid">
                <div className="structure-card">
                  <h3>精品占比</h3>
                  <div className="ratio-ring">
                    <div className="ring" style={{ ["--pct" as string]: featuredPct }}>
                      <b>{featuredPct}%</b>
                    </div>
                    <div className="ratio-note">
                      <strong>{data.featuredCount} 个精品</strong>
                      <span>共 {data.total} 个在架域名</span>
                    </div>
                  </div>
                </div>

                <div className="structure-card">
                  <h3>后缀分布 · Top {data.tlds.length}</h3>
                  <div className="dist-list">
                    {data.tlds.map((item) => (
                      <a
                        className="dist-row"
                        key={item.name}
                        href={`/domains?tld=${encodeURIComponent(item.name)}`}
                        aria-label={`查看后缀 .${item.name} 的 ${item.count} 个域名`}
                      >
                        <span className="dist-label">.{item.name}</span>
                        <span className="dist-track">
                          <i style={{ width: `${Math.max(4, (item.count / topTldMax) * 100)}%` }} />
                        </span>
                        <b>{item.count}</b>
                      </a>
                    ))}
                  </div>
                </div>

                <div className="structure-card">
                  <h3>分类分布</h3>
                  <div className="dist-list">
                    {data.categories.map((item) => (
                      <a
                        className="dist-row"
                        key={item.name}
                        href={`/domains?category=${encodeURIComponent(item.name)}`}
                        aria-label={`查看分类 ${item.name} 的 ${item.count} 个域名`}
                      >
                        <span className="dist-label">{item.name}</span>
                        <span className="dist-track">
                          <i style={{ width: `${Math.max(4, (item.count / topCatMax) * 100)}%` }} />
                        </span>
                        <b>{item.count}</b>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* 最近添加 / 最近更新 */}
            <section>
              <div className="section-head">
                <div className="tab-row" role="tablist" aria-label="最近动态">
                  {TABS.map(([key, label]) => (
                    <button
                      key={key}
                      role="tab"
                      aria-selected={tab === key}
                      className={`tab-btn${tab === key ? " active" : ""}`}
                      onClick={() => setTab(key)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <a className="link-more" href="/domains">
                  查看全部 <IconArrowUpRight size={14} />
                </a>
              </div>
              <div className="recent-list">
                {recent.map((item) => (
                  <DomainRow key={item.id} domain={item} />
                ))}
              </div>
            </section>
          </div>
        )}
      </div>

      {contactOpen && settings && (
        <ContactModal
          settings={settings}
          onClose={() => setContactOpen(false)}
          onNotify={(text, tone) => setToast({ id: Date.now(), text, tone })}
        />
      )}
      <Toast message={toast} onClose={() => setToast(null)} />
    </AppShell>
  );
}
