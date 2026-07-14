import { useCallback, useEffect, useMemo, useState } from "react";

import { IconPlus, IconSparkle, IconTag, IconTrash } from "../../../components/icons";
import { PromptModal } from "../../../components/PromptModal";
import { EmptyState, SearchBar, SegmentedControl } from "../../../components/ui";
import { api } from "../../../lib/api";
import { Panel } from "../Panel";
import type { CategoryRow, Notify } from "../types";

type Scope = "all" | "auto" | "manual";
const SCOPES: Array<{ key: Scope; label: string }> = [
  { key: "all", label: "全部" },
  { key: "auto", label: "自动分类" },
  { key: "manual", label: "人工分类" },
];

export function CategoriesView({ notify }: { notify: Notify }) {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [scope, setScope] = useState<Scope>("all");
  const [query, setQuery] = useState("");
  const [classifying, setClassifying] = useState(false);
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => {
    api<CategoryRow[]>("/api/admin/categories")
      .then(setCategories)
      .catch((reason: unknown) => notify(reason instanceof Error ? reason.message : "分类加载失败", "error"));
  }, [notify]);

  useEffect(load, [load]);

  const visible = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return categories.filter((item) => {
      if (scope === "auto" && !item.is_auto) return false;
      if (scope === "manual" && item.is_auto) return false;
      return !keyword || item.name.toLowerCase().includes(keyword);
    });
  }, [categories, query, scope]);

  async function add(name: string) {
    if (!name) return;
    try {
      await api("/api/admin/categories", { method: "POST", body: JSON.stringify({ name }) });
      notify("分类已创建");
      load();
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : "创建失败", "error");
    }
  }

  async function remove(category: CategoryRow) {
    if (!window.confirm(`删除分类「${category.name}」？其下 ${category.domain_count} 个域名将恢复为自动分类。`)) return;
    try {
      await api(`/api/admin/categories/${category.id}`, { method: "DELETE" });
      notify("分类已删除");
      load();
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : "删除失败", "error");
    }
  }

  async function autoClassify() {
    setClassifying(true);
    try {
      const result = await api<{ domains: number; tags: number }>("/api/admin/categories/auto-classify", {
        method: "POST",
      });
      notify(`已扫描 ${result.domains} 个域名，生成 ${result.tags} 个自动分类标签`);
      load();
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : "自动分类失败", "error");
    } finally {
      setClassifying(false);
    }
  }

  return (
    <Panel
      title="分类管理"
      description="自动分类由域名结构推导，只读；人工分类可覆盖自动结果"
      actions={
        <>
          <button className="btn btn-secondary btn-sm" disabled={classifying} onClick={() => void autoClassify()}>
            <IconSparkle size={16} /> {classifying ? "正在分类…" : "一键自动分类"}
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}>
            <IconPlus size={16} /> 新建分类
          </button>
        </>
      }
    >
      <div className="filter-stack" style={{ marginBottom: 18 }}>
        <SegmentedControl ariaLabel="分类范围" value={scope} options={SCOPES} onChange={setScope} />
        <SearchBar size="sm" value={query} onChange={setQuery} placeholder="搜索分类名称" />
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<IconTag size={22} />}
          title="没有匹配的分类"
          hint={query ? "换一个关键词试试。" : "先创建分类，或执行一键自动分类。"}
          action={
            <button className="btn btn-primary" onClick={() => setAdding(true)}>
              新建分类
            </button>
          }
        />
      ) : (
        <div className="icon-grid">
          {visible.map((category) => (
            <div className={`icon-card${category.is_auto ? " active" : ""}`} key={`${category.is_auto}-${category.id}`}>
              <span className="icon-count">{category.domain_count}</span>
              {!category.is_auto && (
                <button
                  className="icon-remove"
                  onClick={() => void remove(category)}
                  aria-label={`删除分类 ${category.name}`}
                  title={`删除分类 ${category.name}`}
                >
                  <IconTrash size={13} />
                </button>
              )}
              <span className="icon-shape" aria-hidden="true">
                {category.is_auto ? category.name.slice(0, 1) : <IconTag size={20} />}
              </span>
              <span className="icon-label" title={category.name}>
                {category.name}
              </span>
            </div>
          ))}
        </div>
      )}

      {adding && (
        <PromptModal
          title="新建分类"
          label="分类名称"
          hint="人工分类可在域名管理里指派，会覆盖该域名的自动分类。"
          maxLength={80}
          confirmText="创建"
          onCancel={() => setAdding(false)}
          onSubmit={(value) => {
            setAdding(false);
            void add(value);
          }}
        />
      )}
    </Panel>
  );
}
