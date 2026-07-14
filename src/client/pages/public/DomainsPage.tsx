import { useCallback, useEffect, useState } from "react";

import { AppShell } from "../../components/AppShell";
import { ContactModal } from "../../components/ContactModal";
import { DomainCard } from "../../components/DomainCard";
import { IconSearch } from "../../components/icons";
import { Toast, type ToastMessage } from "../../components/Toast";
import {
  EmptyState,
  ErrorState,
  FilterChips,
  Pagination,
  SearchBar,
  SegmentedControl,
  SkeletonGrid,
} from "../../components/ui";
import { api } from "../../lib/api";
import { copyText } from "../../lib/clipboard";
import { useDataVersion, useSiteSettings, type DomainFacets } from "../../lib/site";
import type { Paginated, PublicDomain } from "../../../shared/types/api";

/** 一级状态筛选。每一项都对应真实的查询字段，没有虚构的「在售 / 已售 / 保留」状态。 */
type GroupKey = "all" | "featured" | "two" | "three" | "digits";
const GROUPS: Array<{ key: GroupKey; label: string }> = [
  { key: "all", label: "全部" },
  { key: "featured", label: "精品" },
  { key: "two", label: "二字符" },
  { key: "three", label: "三字符" },
  { key: "digits", label: "纯数字" },
];

type SortKey = "default" | "added_desc" | "length_asc" | "domain_asc";
const SORTS: Array<[SortKey, string]> = [
  ["default", "默认排序"],
  ["added_desc", "最新添加"],
  ["length_asc", "按位数"],
  ["domain_asc", "按字母"],
];

interface Filters {
  q: string;
  tld: string;
  category: string;
  group: GroupKey;
  sort: SortKey;
  page: number;
}

function initialFilters(): Filters {
  const params = new URLSearchParams(window.location.search);
  const sort = params.get("sort") as SortKey | null;
  const group = params.get("group") as GroupKey | null;
  return {
    q: params.get("q") ?? "",
    tld: params.get("tld") ?? "",
    category: params.get("category") ?? "",
    group: group && GROUPS.some((item) => item.key === group) ? group : "all",
    sort: sort && SORTS.some(([key]) => key === sort) ? sort : "default",
    page: Math.max(1, Number(params.get("page") ?? 1) || 1),
  };
}

function groupParams(group: GroupKey): Record<string, string> {
  if (group === "featured") return { featured: "true" };
  if (group === "two") return { length: "2" };
  if (group === "three") return { length: "3" };
  if (group === "digits") return { kind: "digits" };
  return {};
}

export function DomainsPage() {
  const { settings, hasContact } = useSiteSettings();
  const [facets, setFacets] = useState<DomainFacets | null>(null);
  const [pageData, setPageData] = useState<Paginated<PublicDomain> | null>(null);
  const [filters, setFilters] = useState(initialFilters);
  const [draft, setDraft] = useState(filters.q);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [contactOpen, setContactOpen] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const notify = useCallback((text: string, tone: "success" | "error" = "success") => {
    setToast({ id: Date.now(), text, tone });
  }, []);

  useEffect(() => {
    api<DomainFacets>("/api/public/facets").then(setFacets).catch(() => setFacets(null));
  }, []);

  useEffect(() => {
    // URL 与筛选状态同步，保证分享链接可复现（与旧版参数完全兼容）
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.tld) params.set("tld", filters.tld);
    if (filters.category) params.set("category", filters.category);
    if (filters.group !== "all") params.set("group", filters.group);
    if (filters.sort !== "default") params.set("sort", filters.sort);
    if (filters.page > 1) params.set("page", String(filters.page));
    const query = params.toString();
    window.history.replaceState(null, "", query ? `/domains?${query}` : "/domains");

    const apiParams = new URLSearchParams({
      ...(filters.q ? { q: filters.q } : {}),
      ...(filters.tld ? { tld: filters.tld } : {}),
      ...(filters.category ? { category: filters.category } : {}),
      ...groupParams(filters.group),
      ...(filters.sort !== "default" ? { sort: filters.sort } : {}),
      page: String(filters.page),
      pageSize: "60",
    });
    setLoading(true);
    setError("");
    api<Paginated<PublicDomain>>(`/api/public/domains?${apiParams.toString()}`)
      .then(setPageData)
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "域名加载失败"))
      .finally(() => setLoading(false));
  }, [filters]);

  const reload = useCallback(() => setFilters((current) => ({ ...current })), []);
  useDataVersion(reload);

  const patch = useCallback((next: Partial<Filters>) => {
    setFilters((current) => ({ ...current, ...next, page: next.page ?? 1 }));
    if (next.page === undefined) window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const resetAll = useCallback(() => {
    setDraft("");
    setFilters({ q: "", tld: "", category: "", group: "all", sort: "default", page: 1 });
  }, []);

  async function copyDomain(name: string) {
    if (await copyText(name)) notify(`已复制 ${name}`);
    else notify("复制失败，请手动复制", "error");
  }

  const hasFilter = Boolean(
    filters.q || filters.tld || filters.category || filters.group !== "all" || filters.sort !== "default",
  );

  const categoryChips = [
    { key: "", label: "全部" },
    ...(facets?.categories ?? []).map((name) => ({
      key: name,
      label: name,
      count: facets?.categoryCounts[name],
    })),
  ];

  return (
    <AppShell
      active={filters.group === "featured" ? "featured" : "domains"}
      siteName={settings?.site_name}
      logoUrl={settings?.logo_url}
      hasContact={hasContact}
      onContact={() => setContactOpen(true)}
    >
      <div className="page">
        <div className="page-header">
          <div>
            <h1>域名列表</h1>
            <p className="page-sub">搜索、筛选并查看每个域名的详情</p>
          </div>
        </div>

        <div className="list-stack">
          {/* 顶部统计：真实的在架总数与精品数 */}
          <section className="stat-duo">
            <div>
              <span>全部域名</span>
              <strong>{facets?.total ?? "—"}</strong>
            </div>
            <div>
              <span>精品域名</span>
              <strong className="gold">{facets?.featuredCount ?? "—"}</strong>
            </div>
          </section>

          <div className="filter-stack">
            <SearchBar
              value={draft}
              onChange={setDraft}
              onSubmit={() => patch({ q: draft.trim() })}
              placeholder="搜索域名、后缀或关键词"
            />

            <SegmentedControl
              ariaLabel="域名状态筛选"
              value={filters.group}
              options={GROUPS}
              onChange={(group) => patch({ group })}
            />

            {categoryChips.length > 1 && (
              <FilterChips
                ariaLabel="分类筛选"
                value={filters.category}
                options={categoryChips}
                onChange={(category) => patch({ category })}
              />
            )}

            <div className="result-line">
              <span>{loading ? "正在读取…" : `共 ${pageData?.total ?? 0} 个域名`}</span>
              <div className="result-controls">
                <select
                  className="input"
                  value={filters.tld}
                  onChange={(event) => patch({ tld: event.target.value })}
                  aria-label="后缀筛选"
                >
                  <option value="">全部后缀</option>
                  {(facets?.tlds ?? []).map((tld) => (
                    <option key={tld} value={tld}>
                      .{tld}
                    </option>
                  ))}
                </select>
                <select
                  className="input"
                  value={filters.sort}
                  onChange={(event) => patch({ sort: event.target.value as SortKey })}
                  aria-label="排序方式"
                >
                  {SORTS.map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
                {hasFilter && (
                  <button className="reset-link" onClick={resetAll}>
                    清除筛选
                  </button>
                )}
              </div>
            </div>
          </div>

          {error && <ErrorState message={error} onRetry={reload} />}
          {loading && !error && <SkeletonGrid count={12} />}
          {!loading && !error && pageData?.items.length === 0 && (
            <EmptyState
              icon={<IconSearch size={22} />}
              title="没有匹配的域名"
              hint="换一个关键词，或清除当前筛选条件。"
              action={
                hasFilter ? (
                  <button className="btn btn-secondary" onClick={resetAll}>
                    清除筛选
                  </button>
                ) : undefined
              }
            />
          )}
          {!loading && !error && pageData && pageData.items.length > 0 && (
            <div className="domain-grid">
              {pageData.items.map((domain, index) => (
                <DomainCard key={domain.id} domain={domain} index={index} onCopy={(name) => void copyDomain(name)} />
              ))}
            </div>
          )}

          {pageData && (
            <Pagination
              page={pageData.page}
              totalPages={pageData.totalPages}
              onChange={(page) => {
                setFilters((current) => ({ ...current, page }));
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          )}
        </div>
      </div>

      {contactOpen && settings && (
        <ContactModal settings={settings} onClose={() => setContactOpen(false)} onNotify={notify} />
      )}
      <Toast message={toast} onClose={() => setToast(null)} />
    </AppShell>
  );
}
