import { memo } from "react";

import type { PublicDomain } from "../../shared/types/api";

const CATEGORY_LABELS: Record<string, string> = {
  字母: "纯字母",
  数字: "纯数字",
  英文: "英文词语",
};

function CopyIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>;
}

function EyeIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/></svg>;
}

function ArrowIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
}

function StarIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 2l2.6 6.2L21 9l-5 4.5L17.4 20 12 16.8 6.6 20 8 13.5 3 9l6.4-.8L12 2z" /></svg>;
}

function TldIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>;
}

function LengthIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h10" /></svg>;
}

function TagIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M3 12V4h8l10 10-8 8L3 12z" /><circle cx="7.5" cy="7.5" r="1.2" /></svg>;
}

interface DomainCardProps {
  domain: PublicDomain;
  onCopy: (domain: string) => void;
  onQuickView: (domain: PublicDomain) => void;
}

function DomainCardComponent({ domain, onCopy, onQuickView }: DomainCardProps) {
  const domainParts = domain.domain.split(".");
  const tld = domainParts.at(-1) || domain.tld;
  const characterCount = domainParts[0]?.length ?? domain.name.length;
  const category = domain.category
    ? (CATEGORY_LABELS[domain.category] ?? domain.category)
    : (domain.categories[0] || "其他");

  return (
    <article id={`domain-card-${domain.id}`} className={`domain-card${domain.is_featured ? " featured" : ""}`} aria-labelledby={`domain-${domain.id}`}>
      {domain.is_featured ? <span className="domain-featured-badge" aria-label="精品域名"><StarIcon /> 精选</span> : null}
      <div className="domain-primary">
        <div className="domain-name"><a id={`domain-${domain.id}`} href={`https://${domain.domain}`} target="_blank" rel="noopener noreferrer nofollow"><strong>{domain.name}</strong><span className="domain-tld">.{domain.tld}</span></a></div>
      </div>
      <div className="domain-actions">
        <button type="button" aria-label={`复制 ${domain.domain}`} title={`复制 ${domain.domain}`} onClick={() => onCopy(domain.domain)}><CopyIcon /></button>
        <button type="button" aria-label={`速览 ${domain.domain}`} title={`速览 ${domain.domain}`} onClick={() => onQuickView(domain)}><EyeIcon /></button>
      </div>
      {domain.description ? <p className="domain-description">{domain.description}</p> : <p className="domain-description placeholder">暂无简介，可点击速览生成或手动补充</p>}
      <div className="domain-card-meta" aria-label={`${domain.domain} 元数据`}>
        <span className="meta-chip"><TldIcon />.{tld}</span>
        <span className="meta-chip"><LengthIcon />{characterCount} 字符</span>
        <span className="meta-chip"><TagIcon />{category}</span>
      </div>
      <a className="domain-visit" href={`https://${domain.domain}`} target="_blank" rel="noopener noreferrer nofollow" aria-label={`访问 ${domain.domain}`} title={`访问 ${domain.domain}`}><span>访问域名</span><ArrowIcon /></a>
    </article>
  );
}

export const DomainCard = memo(DomainCardComponent);
