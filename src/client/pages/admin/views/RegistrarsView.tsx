import { FormEvent, useCallback, useEffect, useState } from "react";

import { IconBuilding } from "../../../components/icons";
import { Badge, EmptyState } from "../../../components/ui";
import { api } from "../../../lib/api";
import { Panel } from "../Panel";
import type { Notify } from "../types";

interface RegistrarAccount {
  id: number;
  provider: string;
  display_name: string;
  status: string;
  last_tested_at: string | null;
  last_synced_at: string | null;
  last_error: string | null;
}

const PROVIDER_FIELDS: Record<string, Array<[string, string]>> = {
  cloudflare: [
    ["apiToken", "API Token"],
    ["accountId", "Account ID（可选）"],
  ],
  godaddy: [
    ["apiKey", "API Key"],
    ["apiSecret", "API Secret"],
  ],
  namesilo: [["apiKey", "API Key"]],
  porkbun: [
    ["apiKey", "API Key"],
    ["secretApiKey", "Secret API Key"],
  ],
  spaceship: [
    ["apiKey", "API Key"],
    ["apiSecret", "API Secret"],
  ],
  namecheap: [
    ["username", "用户名"],
    ["apiKey", "API Key"],
    ["clientIp", "API 白名单公网 IP"],
  ],
  dynadot: [
    ["apiKey", "API Key"],
    ["apiSecret", "API Secret"],
  ],
  dnspod: [
    ["secretId", "Secret ID"],
    ["secretKey", "Secret Key"],
  ],
  aliyun: [
    ["accessKeyId", "AccessKey ID"],
    ["accessKeySecret", "AccessKey Secret"],
  ],
};

// 顺序与 worker/providers/factory.ts 支持的九家保持一致
const PROVIDERS: Array<[string, string]> = [
  ["cloudflare", "Cloudflare"],
  ["godaddy", "GoDaddy"],
  ["namesilo", "NameSilo"],
  ["porkbun", "Porkbun"],
  ["spaceship", "Spaceship"],
  ["namecheap", "Namecheap"],
  ["dynadot", "Dynadot"],
  ["dnspod", "DNSPod"],
  ["aliyun", "阿里云"],
];

function statusTone(status: string): "success" | "danger" | "neutral" {
  if (status === "connected") return "success";
  if (status === "error") return "danger";
  return "neutral";
}

export function RegistrarsView({ notify }: { notify: Notify }) {
  const [accounts, setAccounts] = useState<RegistrarAccount[]>([]);
  const [provider, setProvider] = useState("cloudflare");
  const [displayName, setDisplayName] = useState("");
  const [credentials, setCredentials] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    api<RegistrarAccount[]>("/api/admin/registrars")
      .then(setAccounts)
      .catch((reason: unknown) => notify(reason instanceof Error ? reason.message : "账户加载失败", "error"));
  }, [notify]);

  useEffect(load, [load]);

  async function add(event: FormEvent) {
    event.preventDefault();
    try {
      await api("/api/admin/registrars", {
        method: "POST",
        body: JSON.stringify({ provider, displayName, credentials }),
      });
      setDisplayName("");
      setCredentials({});
      notify("注册商账户已加密保存，请执行连接测试");
      load();
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : "添加失败", "error");
    }
  }

  async function action(id: number, type: "test" | "sync") {
    try {
      const result = await api<Record<string, unknown>>(`/api/admin/registrars/${id}/${type}`, { method: "POST" });
      notify(type === "test" ? "真实连接测试通过" : `真实同步完成：${JSON.stringify(result)}`);
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : `${type} 失败`, "error");
    } finally {
      load();
    }
  }

  async function remove(id: number) {
    if (!window.confirm("确认删除该注册商账户？")) return;
    try {
      await api(`/api/admin/registrars/${id}`, { method: "DELETE" });
      notify("账户已删除");
      load();
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : "删除失败", "error");
    }
  }

  return (
    <div className="admin-stack">
      <Panel title="注册商账户" description="凭据使用 AES-GCM 加密；测试和同步会调用真实官方 API">
        {accounts.length === 0 ? (
          <EmptyState
            icon={<IconBuilding size={22} />}
            title="尚未添加注册商账户"
            hint="添加后即可读取真实 DNS 记录、同步域名到期时间。"
          />
        ) : (
          <div className="registrar-grid">
            {accounts.map((account) => (
              <div className="registrar-card" key={account.id}>
                <div className="registrar-head">
                  <span className="provider-logo">{account.provider.slice(0, 2).toUpperCase()}</span>
                  <div>
                    <strong>{account.display_name}</strong>
                    <small>{account.provider}</small>
                  </div>
                  <Badge tone={statusTone(account.status)}>{account.status}</Badge>
                </div>
                <p>
                  {account.last_error ||
                    (account.last_synced_at
                      ? `上次同步 ${new Date(account.last_synced_at).toLocaleString("zh-CN")}`
                      : "尚未同步")}
                </p>
                <div className="registrar-actions">
                  <button className="btn btn-secondary btn-sm" onClick={() => void action(account.id, "test")}>
                    测试连接
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => void action(account.id, "sync")}>
                    立即同步
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => void remove(account.id)}>
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="添加账户" description="请使用最小权限 API 凭据；Namecheap 还需填写后台白名单中的公网 IP；保存后不会回显完整密钥">
        <form className="form-grid" onSubmit={(event) => void add(event)}>
          <label className="field">
            <span>服务商</span>
            <select
              value={provider}
              onChange={(event) => {
                setProvider(event.target.value);
                setCredentials({});
              }}
            >
              {PROVIDERS.map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>显示名称</span>
            <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} required />
          </label>
          {PROVIDER_FIELDS[provider].map(([key, label]) => (
            <label className="field" key={key}>
              <span>{label}</span>
              <input
                type={
                  key.toLowerCase().includes("secret") || key.toLowerCase().includes("token") || key === "apiKey"
                    ? "password"
                    : "text"
                }
                value={credentials[key] ?? ""}
                onChange={(event) => setCredentials((current) => ({ ...current, [key]: event.target.value }))}
                required={!label.includes("可选")}
                autoComplete="off"
              />
            </label>
          ))}
          <div className="wide">
            <button className="btn btn-primary">加密保存</button>
          </div>
        </form>
      </Panel>
    </div>
  );
}
