import { FormEvent, useState } from "react";

import { IconRoute, IconTrash } from "../../../components/icons";
import { Badge, EmptyState, Modal } from "../../../components/ui";
import { api } from "../../../lib/api";
import { Panel } from "../Panel";
import type { AdminDomain, AdminDomainPage, Notify } from "../types";

interface DnsRecordView {
  id: string;
  type: string;
  name: string;
  content: string;
  ttl: number | null;
  priority: number | null;
  proxied: boolean | null;
}

interface TemplateRecord {
  type: string;
  name: string;
  content: string;
  ttl: number;
  priority?: number | null;
  proxied?: boolean | null;
}

interface DnsTemplate {
  key: string;
  label: string;
  variable?: { prompt: string; example: string };
  build: (domain: string, variable: string) => TemplateRecord[];
}

const DNS_TYPES = ["A", "AAAA", "CNAME", "MX", "TXT", "NS", "CAA", "SRV"];

const DNS_TEMPLATES: DnsTemplate[] = [
  {
    key: "cloudflare-proxy",
    label: "Cloudflare Proxy（A + www）",
    variable: { prompt: "源站服务器 IP", example: "203.0.113.10" },
    build: (domain, ip) => [
      { type: "A", name: "@", content: ip, ttl: 300, proxied: true },
      { type: "CNAME", name: "www", content: domain, ttl: 300, proxied: true },
    ],
  },
  {
    key: "vercel",
    label: "Vercel",
    build: () => [
      { type: "A", name: "@", content: "76.76.21.21", ttl: 300 },
      { type: "CNAME", name: "www", content: "cname.vercel-dns.com", ttl: 300 },
    ],
  },
  {
    key: "github-pages",
    label: "GitHub Pages",
    variable: { prompt: "GitHub 用户名", example: "octocat" },
    build: (_domain, username) => [
      { type: "A", name: "@", content: "185.199.108.153", ttl: 3600 },
      { type: "A", name: "@", content: "185.199.109.153", ttl: 3600 },
      { type: "A", name: "@", content: "185.199.110.153", ttl: 3600 },
      { type: "A", name: "@", content: "185.199.111.153", ttl: 3600 },
      { type: "CNAME", name: "www", content: `${username}.github.io`, ttl: 3600 },
    ],
  },
  {
    key: "tencent-mx",
    label: "腾讯企业邮箱 MX",
    build: () => [
      { type: "MX", name: "@", content: "mxbiz1.qq.com", ttl: 3600, priority: 5 },
      { type: "MX", name: "@", content: "mxbiz2.qq.com", ttl: 3600, priority: 10 },
    ],
  },
];

interface DiffPlanItem extends TemplateRecord {
  conflict: DnsRecordView | null;
}

export function DnsView({ notify }: { notify: Notify }) {
  const [query, setQuery] = useState("");
  const [domain, setDomain] = useState<AdminDomain | null>(null);
  const [records, setRecords] = useState<DnsRecordView[]>([]);
  const [loading, setLoading] = useState(false);
  const [record, setRecord] = useState({ type: "A", name: "@", content: "", ttl: 600, priority: "" });
  const [templateKey, setTemplateKey] = useState(DNS_TEMPLATES[0].key);
  const [templateVar, setTemplateVar] = useState<DnsTemplate | null>(null);
  const [plan, setPlan] = useState<{ template: string; items: DiffPlanItem[] } | null>(null);
  const [applying, setApplying] = useState(false);

  async function find(event: FormEvent) {
    event.preventDefault();
    try {
      const page = await api<AdminDomainPage>(`/api/admin/domains?q=${encodeURIComponent(query)}&pageSize=50`);
      const exact =
        page.items.find((item) => item.full_domain.toLowerCase() === query.trim().toLowerCase()) ?? page.items[0];
      if (!exact) throw new Error("未找到域名");
      setDomain(exact);
      setLoading(true);
      const remote = await api<DnsRecordView[]>(`/api/admin/domains/${exact.id}/dns`);
      setRecords(remote);
      notify(`已从真实注册商读取 ${remote.length} 条 DNS 记录`);
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : "DNS 读取失败", "error");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }

  function buildPlan(variable: string) {
    if (!domain) return;
    const template = DNS_TEMPLATES.find((item) => item.key === templateKey);
    if (!template) return;
    const root = domain.full_domain.toLowerCase();
    const normalizeName = (value: string) => {
      const trimmed = value.toLowerCase().replace(/\.$/, "");
      if (trimmed === root || trimmed === "@" || trimmed === "") return "@";
      return trimmed.endsWith(`.${root}`) ? trimmed.slice(0, -(root.length + 1)) : trimmed;
    };
    const items = template.build(domain.full_domain, variable).map(
      (item): DiffPlanItem => ({
        ...item,
        conflict:
          records.find(
            (existing) => existing.type === item.type && normalizeName(existing.name) === normalizeName(item.name),
          ) ?? null,
      }),
    );
    setPlan({ template: template.label, items });
  }

  function previewTemplate() {
    if (!domain) return;
    const template = DNS_TEMPLATES.find((item) => item.key === templateKey);
    if (!template) return;
    if (template.variable) {
      setTemplateVar(template);
      return;
    }
    buildPlan("");
  }

  async function applyPlan() {
    if (!domain || !plan) return;
    setApplying(true);
    let successes = 0;
    let failures = 0;
    for (const item of plan.items) {
      try {
        const created = await api<DnsRecordView>(`/api/admin/domains/${domain.id}/dns`, {
          method: "POST",
          body: JSON.stringify({
            type: item.type,
            name: item.name,
            content: item.content,
            ttl: item.ttl,
            priority: item.priority ?? null,
            proxied: item.proxied ?? null,
          }),
        });
        setRecords((current) => [...current, created]);
        successes += 1;
      } catch {
        failures += 1;
      }
    }
    setApplying(false);
    setPlan(null);
    notify(`模板写入完成：成功 ${successes}，失败 ${failures}`, failures ? "error" : "success");
  }

  async function add(event: FormEvent) {
    event.preventDefault();
    if (!domain) return;
    try {
      const created = await api<DnsRecordView>(`/api/admin/domains/${domain.id}/dns`, {
        method: "POST",
        body: JSON.stringify({
          type: record.type,
          name: record.name,
          content: record.content,
          ttl: record.ttl,
          priority: record.priority ? Number(record.priority) : null,
        }),
      });
      setRecords((current) => [...current, created]);
      setRecord((current) => ({ ...current, content: "" }));
      notify("远端 DNS 创建成功，本地缓存已更新");
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : "DNS 创建失败", "error");
    }
  }

  async function remove(id: string) {
    if (!domain || !window.confirm("确认从远端注册商删除这条 DNS 记录？")) return;
    try {
      await api(`/api/admin/domains/${domain.id}/dns/${encodeURIComponent(id)}`, { method: "DELETE" });
      setRecords((current) => current.filter((item) => item.id !== id));
      notify("远端 DNS 已删除");
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : "删除失败", "error");
    }
  }

  return (
    <div className="admin-stack">
      <Panel title="DNS 解析" description="所有读写都直接调用关联注册商；远端成功后才更新 D1 缓存">
        <form className="admin-toolbar" onSubmit={(event) => void find(event)}>
          <input
            className="input"
            style={{ flex: "1 1 240px" }}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="输入完整域名"
            required
          />
          <button className="btn btn-primary btn-sm">读取远端记录</button>
        </form>

        {domain && (
          <>
            <div className="kv-list" style={{ marginBottom: 14 }}>
              <div>
                <span>{domain.full_domain}</span>
                <b>{loading ? "正在连接注册商…" : `${records.length} 条远端记录`}</b>
              </div>
            </div>

            <div className="admin-toolbar">
              <select value={templateKey} onChange={(event) => setTemplateKey(event.target.value)} aria-label="DNS 模板">
                {DNS_TEMPLATES.map((template) => (
                  <option key={template.key} value={template.key}>
                    {template.label}
                  </option>
                ))}
              </select>
              <button className="btn btn-secondary btn-sm" onClick={previewTemplate}>
                预览写入
              </button>
            </div>
          </>
        )}

        {!domain && !loading && (
          <EmptyState icon={<IconRoute size={22} />} title="先选择一个域名" hint="搜索完整域名以读取其远端 DNS 记录。" />
        )}

        {domain && records.length > 0 && (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>类型</th>
                  <th>主机</th>
                  <th>记录值</th>
                  <th>TTL</th>
                  <th>优先级</th>
                  <th>代理</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {records.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Badge>{item.type}</Badge>
                    </td>
                    <td className="cell-mono">{item.name}</td>
                    <td className="cell-mono">{item.content}</td>
                    <td>{item.ttl ?? "—"}</td>
                    <td>{item.priority ?? "—"}</td>
                    <td>{item.proxied === null ? "—" : item.proxied ? "是" : "否"}</td>
                    <td>
                      <button
                        className="icon-btn"
                        style={{ width: 36, height: 36 }}
                        onClick={() => void remove(item.id)}
                        aria-label="删除记录"
                      >
                        <IconTrash size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {domain && (
        <Panel title="添加 DNS 记录">
          <form className="form-grid" onSubmit={(event) => void add(event)}>
            <label className="field">
              <span>类型</span>
              <select value={record.type} onChange={(event) => setRecord({ ...record, type: event.target.value })}>
                {DNS_TYPES.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>主机</span>
              <input value={record.name} onChange={(event) => setRecord({ ...record, name: event.target.value })} />
            </label>
            <label className="field wide">
              <span>记录值</span>
              <input
                value={record.content}
                onChange={(event) => setRecord({ ...record, content: event.target.value })}
                required
              />
            </label>
            <label className="field">
              <span>TTL</span>
              <input
                type="number"
                value={record.ttl}
                onChange={(event) => setRecord({ ...record, ttl: Number(event.target.value) })}
              />
            </label>
            <label className="field">
              <span>优先级</span>
              <input
                type="number"
                value={record.priority}
                onChange={(event) => setRecord({ ...record, priority: event.target.value })}
              />
            </label>
            <div className="wide">
              <button className="btn btn-primary">提交到远端</button>
            </div>
          </form>
        </Panel>
      )}

      {templateVar && (
        <Modal title={templateVar.label} onClose={() => setTemplateVar(null)}>
          <form
            className="form-stack"
            onSubmit={(event) => {
              event.preventDefault();
              const value = new FormData(event.currentTarget).get("variable");
              setTemplateVar(null);
              buildPlan(typeof value === "string" ? value.trim() : "");
            }}
          >
            <label className="field">
              <span>{templateVar.variable!.prompt}</span>
              <input name="variable" placeholder={templateVar.variable!.example} required autoFocus />
            </label>
            <div className="modal-foot">
              <button type="button" className="btn btn-secondary" onClick={() => setTemplateVar(null)}>
                取消
              </button>
              <button type="submit" className="btn btn-primary">
                生成预览
              </button>
            </div>
          </form>
        </Modal>
      )}

      {plan && domain && (
        <Modal title={plan.template} size="lg" onClose={() => !applying && setPlan(null)}>
          <p style={{ color: "var(--text-tertiary)", fontSize: 13, marginBottom: 16 }}>
            将写入 <b style={{ color: "var(--text-primary)" }}>{domain.full_domain}</b> 的远端注册商，共 {plan.items.length} 条记录。
          </p>
          <div className="diff-list">
            {plan.items.map((item, index) => (
              <div key={index} className={item.conflict ? "conflict" : ""}>
                <Badge tone={item.conflict ? "warning" : "success"}>{item.conflict ? "冲突" : "新增"}</Badge>
                <b>{item.type}</b>
                <em>{item.name}</em>
                <code>
                  {item.content}
                  {item.priority ? ` (优先级 ${item.priority})` : ""}
                  {item.proxied ? " · Proxy" : ""}
                </code>
                {item.conflict && (
                  <small>
                    已有同名 {item.conflict.type} 记录：{item.conflict.content}
                  </small>
                )}
              </div>
            ))}
          </div>
          {plan.items.some((item) => item.conflict) && (
            <p style={{ color: "var(--warning)", fontSize: 13, marginTop: 14 }}>
              存在冲突记录：确认写入会新增记录而非覆盖，可能产生重复解析，建议先删除旧记录。
            </p>
          )}
          <div className="modal-foot">
            <button className="btn btn-secondary" onClick={() => setPlan(null)} disabled={applying}>
              取消
            </button>
            <button className="btn btn-primary" onClick={() => void applyPlan()} disabled={applying}>
              {applying ? "正在写入…" : "确认写入远端"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
