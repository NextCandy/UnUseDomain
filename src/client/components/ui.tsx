/**
 * 黑金设计系统的基础组件。
 * 前台与后台共用这一套，避免各页面重复实现按钮 / 徽章 / 搜索框。
 */
import { FormEvent, ReactNode, useEffect, useRef } from "react";

import { IconChevronLeft, IconChevronRight, IconClose, IconSearch } from "./icons";

/* ---------- 搜索框 ---------- */

export function SearchBar({
  value,
  onChange,
  onSubmit,
  placeholder = "搜索域名、后缀、简介或标签",
  size = "lg",
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  size?: "lg" | "sm";
}) {
  function submit(event: FormEvent) {
    event.preventDefault();
    onSubmit?.();
  }
  return (
    <form className={`searchbar searchbar-${size}`} onSubmit={submit} role="search">
      <IconSearch size={size === "lg" ? 20 : 18} />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        // 表单里没有 submit 按钮（设计上不需要），浏览器的隐式提交不可靠，
        // 因此显式处理回车，保证键盘用户能提交搜索
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onSubmit?.();
          }
        }}
        placeholder={placeholder}
        aria-label={placeholder}
        enterKeyHint="search"
      />
      {value && (
        <button type="button" className="searchbar-clear" onClick={() => onChange("")} aria-label="清空搜索">
          <IconClose size={16} />
        </button>
      )}
    </form>
  );
}

/* ---------- 一级状态：Segmented Control ---------- */

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: Array<{ key: T; label: string }>;
  onChange: (key: T) => void;
  ariaLabel: string;
}) {
  return (
    <div className="segmented" role="tablist" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.key}
          role="tab"
          aria-selected={value === option.key}
          className={value === option.key ? "active" : ""}
          onClick={() => onChange(option.key)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- 二级分类：横向滚动 Chip ---------- */

export function FilterChips({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: string;
  options: Array<{ key: string; label: string; count?: number }>;
  onChange: (key: string) => void;
  ariaLabel: string;
}) {
  return (
    <div className="chips-row" role="group" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.key}
          className={`chip-filter${value === option.key ? " active" : ""}`}
          aria-pressed={value === option.key}
          onClick={() => onChange(option.key)}
        >
          {option.label}
          {option.count !== undefined && <em>{option.count}</em>}
        </button>
      ))}
    </div>
  );
}

/* ---------- 徽章 ---------- */

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "gold" | "success" | "warning" | "danger" | "info";
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

/* ---------- 状态面板：空 / 错误 / 骨架 ---------- */

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      {icon && <span className="empty-icon">{icon}</span>}
      <strong>{title}</strong>
      {hint && <span>{hint}</span>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="empty-state error-state" role="alert">
      <strong>加载失败</strong>
      <span>{message}</span>
      {onRetry && (
        <button className="btn btn-secondary" onClick={onRetry}>
          重试
        </button>
      )}
    </div>
  );
}

export function SkeletonGrid({ count = 12, className = "domain-grid" }: { count?: number; className?: string }) {
  return (
    <div className={className} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div className="skeleton-card" key={index} />
      ))}
    </div>
  );
}

/* ---------- 分页 ---------- */

export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  // 桌面端展示页码窗口；两端总是可见，中间围绕当前页展开
  const window = new Set<number>([1, totalPages, page, page - 1, page + 1]);
  const pages = [...window].filter((item) => item >= 1 && item <= totalPages).sort((a, b) => a - b);
  return (
    <nav className="pagination" aria-label="分页">
      <button className="page-btn" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="上一页">
        <IconChevronLeft size={18} />
      </button>
      <div className="page-numbers">
        {pages.map((item, index) => (
          <span key={item} className="page-slot">
            {index > 0 && item - pages[index - 1] > 1 && <i className="page-gap">…</i>}
            <button
              className={`page-btn${item === page ? " active" : ""}`}
              aria-current={item === page ? "page" : undefined}
              onClick={() => onChange(item)}
            >
              {item}
            </button>
          </span>
        ))}
      </div>
      <button
        className="page-btn"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        aria-label="下一页"
      >
        <IconChevronRight size={18} />
      </button>
    </nav>
  );
}

/* ---------- 弹窗：桌面居中 Modal，手机底部 Sheet ---------- */

export function Modal({
  title,
  onClose,
  children,
  size = "md",
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  size?: "md" | "lg";
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  // 焦点管理：打开时聚焦面板，Esc 关闭，Tab 循环锁在面板内
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
      previous?.focus();
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`modal-panel modal-${size}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="关闭">
            <IconClose size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

/* ---------- 区块标题 ---------- */

export function SectionHead({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="section-head">
      <h2>{title}</h2>
      {action}
    </div>
  );
}
