import { memo, type CSSProperties } from "react";
import { Copy, Eye, Star } from "lucide-react";

import type { PublicDomain } from "../../shared/types/api";

interface DomainCardProps {
  domain: PublicDomain;
  onCopy: (domain: string) => void;
  onQuickView: (domain: PublicDomain) => void;
}

type HandNoteKind = "tld" | "description" | "registrar" | "remaining";

interface HandNoteProps {
  kind: HandNoteKind;
  label: string;
  value: string;
  /** 浮现次序，CSS 按它算 transition-delay；取值为空的标注不占号，后面的自动补位 */
  order: number;
}

/**
 * 四条批注分居域名四角。笔画一律从域名那一侧起笔、朝批注收尾，箭头尖落在批注上——
 * 是域名向外引出注解，不是从注解回指域名。方向按 kind 固定，与浮现次序无关。
 */
const HAND_NOTE_PATHS: Record<HandNoteKind, { curve: string; head: string }> = {
  // 域名左下 → 指向右上角的批注
  remaining: {
    curve: "M8 27 C27 24 42 17 58 8",
    head: "M51 9 L58 8 L54 15",
  },
  // 域名左上 → 指向右下角的批注
  description: {
    curve: "M8 9 C27 12 42 19 58 28",
    head: "M51 27 L58 28 L54 21",
  },
  // 域名右下 → 指向左上角的批注
  tld: {
    curve: "M56 27 C37 24 22 17 6 8",
    head: "M13 9 L6 8 L10 15",
  },
  // 域名右上 → 指向左下角的批注
  registrar: {
    curve: "M56 9 C37 12 22 19 6 28",
    head: "M13 27 L6 28 L10 21",
  },
};

function HandNote({ kind, label, value, order }: HandNoteProps) {
  const path = HAND_NOTE_PATHS[kind];
  return (
    <span className={`hand-note hand-note-${kind}`} style={{ "--note-order": order } as CSSProperties}>
      <span className="hand-note-label">{label}</span>
      <span className="hand-note-value">{value}</span>
      <svg viewBox="0 0 64 36" aria-hidden="true" focusable="false">
        <path pathLength="1" d={path.curve} />
        <path pathLength="1" d={path.head} />
      </svg>
    </span>
  );
}

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const calendarDate = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!calendarDate) return null;
  return `${calendarDate[1]}.${calendarDate[2]}.${calendarDate[3]}`;
}

/** 到期剩余天数；无到期数据返回 null，已到期返回负数 */
function daysUntil(value: string | null): number | null {
  if (!value) return null;
  const calendarDate = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!calendarDate) return null;
  const expires = Date.UTC(Number(calendarDate[1]), Number(calendarDate[2]) - 1, Number(calendarDate[3]));
  const today = new Date();
  const current = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((expires - current) / 86_400_000);
}

const WARNING_DAYS = 30;
const URGENT_DAYS = 7;

function DomainCardComponent({ domain, onCopy, onQuickView }: DomainCardProps) {
  const tld = domain.domain.split(".").at(-1) || domain.tld;
  const registeredOn = formatDate(domain.registered_at);
  const expiresOn = formatDate(domain.expires_at);
  const remaining = daysUntil(domain.expires_at);
  const expired = remaining !== null && remaining < 0;
  const urgent = remaining !== null && remaining >= 0 && remaining <= URGENT_DAYS;
  const warning = remaining !== null && remaining > URGENT_DAYS && remaining <= WARNING_DAYS;
  const category = domain.categories[0] ?? domain.category;
  const registrar = domain.registrar_name?.trim() || null;
  const remainingText = remaining === null ? null : expired ? `已过期 ${Math.abs(remaining)} 天` : `${remaining} 天`;
  // 悬停时按这个次序依次浮现；取值为空的标注整条不渲染，后面的顺次补位，
  // 不会因为跳过而留出空档。
  const handNotes: Array<Omit<HandNoteProps, "order">> = [
    ...(remainingText ? [{ kind: "remaining" as const, label: "剩余时间", value: remainingText }] : []),
    ...(domain.description ? [{ kind: "description" as const, label: "简介", value: domain.description }] : []),
    { kind: "tld", label: "后缀", value: `.${tld}` },
    ...(registrar ? [{ kind: "registrar" as const, label: "注册商", value: registrar }] : []),
  ];

  return (
    <article id={`domain-card-${domain.id}`} className={`domain-card${domain.is_featured ? " featured" : ""}`} aria-labelledby={`domain-${domain.id}`}>
      <div className="domain-annotation-layer" aria-hidden="true">
        {handNotes.map((note, index) => <HandNote key={note.kind} {...note} order={index} />)}
      </div>
      <div className="card-badge-row">
        <span className="tld-badge">.{tld}</span>
        {category ? <span className="category-badge">{domain.is_featured ? <Star aria-hidden="true" /> : null}{category}</span> : null}
        <div className="domain-actions">
          <button type="button" aria-label={`复制 ${domain.domain}`} title={`复制 ${domain.domain}`} onClick={() => onCopy(domain.domain)}><Copy aria-hidden="true" /></button>
          <button type="button" aria-label={`查看 ${domain.domain}`} title={`查看 ${domain.domain}`} onClick={() => onQuickView(domain)}><Eye aria-hidden="true" /></button>
        </div>
      </div>
      <div className="domain-name"><a id={`domain-${domain.id}`} href={`https://${domain.domain}`} target="_blank" rel="noopener noreferrer nofollow"><strong>{domain.name}</strong><span className="domain-tld">.{domain.tld}</span></a></div>
      {domain.description ? <p className="domain-description">{domain.description}</p> : <p className="domain-description placeholder" aria-hidden="true" />}
      <div className="card-expiry-row">
        <span className={`registration-range${registeredOn && expiresOn ? "" : " date-unknown"}`}>
          {registeredOn && expiresOn ? `${registeredOn}-${expiresOn}` : "日期待补充"}
        </span>
        <span className={`remaining-days${expired ? " is-expired" : urgent ? " is-urgent" : warning ? " is-warning" : remaining === null ? " expiry-unknown" : ""}`}>
          {remaining === null ? "有效期未知" : expired ? `已过期${Math.abs(remaining)}天` : `余${remaining}天`}
        </span>
      </div>
    </article>
  );
}

export const DomainCard = memo(DomainCardComponent);
