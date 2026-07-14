import { useCallback, useEffect, useState } from "react";

import { IconDoc, IconDownload } from "../../../components/icons";
import { EmptyState } from "../../../components/ui";
import { api, download } from "../../../lib/api";
import { Panel } from "../Panel";

interface LogPage {
  items: Array<{
    id: number;
    level: string;
    action: string;
    resource_type: string;
    message: string;
    success: number;
    created_at: string;
  }>;
  total: number;
}

export function LogsView() {
  const [data, setData] = useState<LogPage | null>(null);
  const [level, setLevel] = useState("");
  const [keyword, setKeyword] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const params = useCallback(() => {
    const search = new URLSearchParams({ pageSize: "100" });
    if (level) search.set("level", level);
    if (keyword.trim()) search.set("q", keyword.trim());
    if (from) search.set("from", from);
    if (to) search.set("to", to);
    return search;
  }, [from, keyword, level, to]);

  useEffect(() => {
    void api<LogPage>(`/api/admin/logs?${params()}`)
      .then(setData)
      .catch(() => setData({ items: [], total: 0 }));
  }, [params]);

  return (
    <Panel
      title="操作日志"
      description="日志来自 D1，不记录密码或完整凭据；90 天前的日志由 Cron 自动清理"
      actions={
        <button className="btn btn-secondary btn-sm" onClick={() => void download(`/api/admin/logs/export?${params()}`)}>
          <IconDownload size={16} /> 导出 CSV
        </button>
      }
    >
      <div className="admin-toolbar">
        <select value={level} onChange={(event) => setLevel(event.target.value)} aria-label="日志级别">
          <option value="">全部级别</option>
          <option value="info">info</option>
          <option value="warning">warning</option>
          <option value="error">error</option>
        </select>
        <input
          className="input"
          style={{ flex: "1 1 200px" }}
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="关键字（消息或动作）"
          aria-label="日志关键字"
        />
        <input
          className="input"
          style={{ width: "auto" }}
          type="date"
          value={from}
          onChange={(event) => setFrom(event.target.value)}
          aria-label="开始日期"
        />
        <input
          className="input"
          style={{ width: "auto" }}
          type="date"
          value={to}
          onChange={(event) => setTo(event.target.value)}
          aria-label="结束日期"
        />
      </div>

      {!data && <div className="skeleton-card" style={{ minHeight: 120 }} />}
      {data && data.items.length === 0 && (
        <EmptyState icon={<IconDoc size={22} />} title="没有匹配的日志" hint="调整筛选条件试试。" />
      )}
      {data && data.items.length > 0 && (
        <div className="log-list">
          {data.items.map((log) => (
            <div key={log.id}>
              <span className={`dot${log.success ? "" : " error"}`} />
              <time>{new Date(log.created_at).toLocaleString("zh-CN")}</time>
              <strong>{log.action}</strong>
              <span>{log.message}</span>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
