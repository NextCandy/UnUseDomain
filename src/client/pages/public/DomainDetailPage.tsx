import { FormEvent, useEffect, useState } from "react";

import { AppShell } from "../../components/AppShell";
import { ContactModal } from "../../components/ContactModal";
import { IconArrowLeft, IconCopy } from "../../components/icons";
import { Toast, type ToastMessage } from "../../components/Toast";
import { Badge, EmptyState, SectionHead } from "../../components/ui";
import { api } from "../../lib/api";
import { copyText } from "../../lib/clipboard";
import { domainCategories, formatDate, useSiteSettings } from "../../lib/site";
import type { PublicDomain } from "../../../shared/types/api";

interface RdapSummary {
  domain: string;
  registrar: string | null;
  createdAt: string | null;
  expiresAt: string | null;
  updatedAt: string | null;
  status: string[];
  nameservers: string[];
}

interface DetailResponse {
  domain: PublicDomain;
  related: PublicDomain[];
}

export function DomainDetailPage({ name }: { name: string }) {
  const { settings, hasContact } = useSiteSettings();
  const [data, setData] = useState<DetailResponse | null>(null);
  const [error, setError] = useState("");
  const [rdap, setRdap] = useState<RdapSummary | null>(null);
  const [rdapState, setRdapState] = useState<"idle" | "loading" | "error">("idle");
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const [offer, setOffer] = useState({ contact: "", message: "" });
  const [offerState, setOfferState] = useState<"idle" | "submitting" | "done">("idle");

  const notify = (text: string, tone: "success" | "error" = "success") => setToast({ id: Date.now(), text, tone });

  useEffect(() => {
    api<DetailResponse>(`/api/public/domains/${encodeURIComponent(name)}`)
      .then((response) => {
        setData(response);
        document.title = `${response.domain.domain} · 域名详情`;
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "域名加载失败"));
  }, [name]);

  useEffect(() => {
    setRdapState("loading");
    api<RdapSummary>(`/api/public/rdap/${encodeURIComponent(name)}`)
      .then((summary) => {
        setRdap(summary);
        setRdapState("idle");
      })
      .catch(() => setRdapState("error"));
  }, [name]);

  async function copyDomain() {
    if (!data) return;
    if (await copyText(data.domain.domain)) notify(`已复制 ${data.domain.domain}`);
    else notify("复制失败，请手动复制", "error");
  }

  async function submitOffer(event: FormEvent) {
    event.preventDefault();
    if (!offer.contact.trim()) return;
    setOfferState("submitting");
    try {
      await api("/api/public/offers", {
        method: "POST",
        body: JSON.stringify({
          domain: name,
          contact: offer.contact.trim(),
          message: offer.message.trim() || null,
        }),
      });
      setOfferState("done");
      notify("求购信息已发送，我们会尽快联系你");
    } catch (reason) {
      setOfferState("idle");
      notify(reason instanceof Error ? reason.message : "提交失败", "error");
    }
  }

  const domain = data?.domain;

  return (
    <AppShell
      active="domains"
      siteName={settings?.site_name}
      logoUrl={settings?.logo_url}
      hasContact={hasContact}
      onContact={() => setContactOpen(true)}
    >
      <div className="detail-page">
        <a className="back-link" href="/domains">
          <IconArrowLeft size={18} /> 返回域名列表
        </a>

        {error && <EmptyState title={error} hint="这个域名可能已下架或不存在。" />}

        {!error && !domain && <div className="skeleton-card" style={{ minHeight: 200, marginTop: 16 }} />}

        {domain && (
          <>
            <div className="detail-hero">
              <h1>
                {domain.name}
                <em>.{domain.tld}</em>
              </h1>
              <button className="btn btn-secondary" onClick={() => void copyDomain()}>
                <IconCopy size={16} /> 复制域名
              </button>
            </div>

            <div className="detail-badges">
              {domain.is_featured && <Badge tone="gold">精品</Badge>}
              <Badge>.{domain.tld.toUpperCase()}</Badge>
              <Badge>{domain.name.length} 字符</Badge>
              {/* 分类是多标签：人工分类优先，否则展示全部自动标签 */}
              {domainCategories(domain).map((category) => (
                <Badge key={category}>{category}</Badge>
              ))}
            </div>

            {domain.description && <p className="detail-desc">{domain.description}</p>}

            <div className="detail-grid">
              <div className="detail-col">
                <section className="panel">
                  <h2>Whois 摘要</h2>
                  {rdapState === "loading" && <p style={{ color: "var(--text-tertiary)", fontSize: 13 }}>正在查询 RDAP…</p>}
                  {rdapState === "error" && (
                    <p style={{ color: "var(--text-tertiary)", fontSize: 13 }}>RDAP 查询暂不可用，稍后再试。</p>
                  )}
                  {rdap && (
                    <div className="kv-list">
                      <div>
                        <span>注册商</span>
                        <b>{rdap.registrar ?? "—"}</b>
                      </div>
                      <div>
                        <span>注册时间</span>
                        <b>{formatDate(rdap.createdAt)}</b>
                      </div>
                      <div>
                        <span>到期时间</span>
                        <b>{formatDate(rdap.expiresAt)}</b>
                      </div>
                      <div>
                        <span>域名状态</span>
                        <b>{rdap.status.length ? rdap.status.slice(0, 3).join(", ") : "—"}</b>
                      </div>
                      <div>
                        <span>Nameserver</span>
                        <b>{rdap.nameservers.length ? rdap.nameservers.slice(0, 2).join(", ") : "—"}</b>
                      </div>
                    </div>
                  )}
                </section>

                {data.related.length > 0 && (
                  <section className="panel">
                    <SectionHead title="相关域名" />
                    <div className="related-grid">
                      {data.related.map((item) => (
                        <a key={item.id} href={`/d/${encodeURIComponent(item.domain)}`}>
                          {item.name}
                          <em>.{item.tld}</em>
                        </a>
                      ))}
                    </div>
                  </section>
                )}
              </div>

              <aside className="panel">
                <h2>提交求购意向</h2>
                {offerState === "done" ? (
                  <EmptyState title="已收到你的求购" hint="我们会通过你留下的联系方式回复。" />
                ) : (
                  <form className="form-stack" onSubmit={(event) => void submitOffer(event)}>
                    <label className="field">
                      <span>联系方式（邮箱 / 微信 / Telegram）</span>
                      <input
                        value={offer.contact}
                        onChange={(event) => setOffer({ ...offer, contact: event.target.value })}
                        required
                        maxLength={200}
                        placeholder="how@to.reach.you"
                      />
                    </label>
                    <label className="field">
                      <span>留言（可选）</span>
                      <textarea
                        value={offer.message}
                        onChange={(event) => setOffer({ ...offer, message: event.target.value })}
                        maxLength={1000}
                        placeholder="想用它做什么？"
                      />
                    </label>
                    <button className="btn btn-primary" disabled={offerState === "submitting"}>
                      {offerState === "submitting" ? "正在提交…" : "提交求购意向"}
                    </button>
                  </form>
                )}
              </aside>
            </div>
          </>
        )}
      </div>

      {contactOpen && settings && (
        <ContactModal settings={settings} onClose={() => setContactOpen(false)} onNotify={notify} />
      )}
      <Toast message={toast} onClose={() => setToast(null)} />
    </AppShell>
  );
}
