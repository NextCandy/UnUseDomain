import { useCallback, useEffect, useState } from "react";

import { IconInbox } from "../../../components/icons";
import { Badge, EmptyState, Pagination } from "../../../components/ui";
import { api } from "../../../lib/api";
import { Panel } from "../Panel";
import type { Notify } from "../types";

interface LeadRow {
  id: number;
  full_domain: string;
  contact: string;
  message: string | null;
  country: string | null;
  status: "new" | "read" | "archived";
  created_at: string;
}

const STATUS_LABEL: Record<LeadRow["status"], string> = { new: "未读", read: "已读", archived: "已归档" };
const STATUS_TONE: Record<LeadRow["status"], "gold" | "neutral"> = {
  new: "gold",
  read: "neutral",
  archived: "neutral",
};

export function LeadsView({ notify }: { notify: Notify }) {
  const [data, setData] = useState<{ items: LeadRow[]; total: number; totalPages: number } | null>(null);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const load = useCallback(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: "50" });
    if (status) params.set("status", status);
    api<{ items: LeadRow[]; total: number; totalPages: number }>(`/api/admin/leads?${params}`)
      .then(setData)
      .catch((reason: unknown) => notify(reason instanceof Error ? reason.message : "线索加载失败", "error"));
  }, [notify, page, status]);

  useEffect(load, [load]);

  async function setLeadStatus(lead: LeadRow, next: LeadRow["status"]) {
    try {
      await api(`/api/admin/leads/${lead.id}`, { method: "PATCH", body: JSON.stringify({ status: next }) });
      load();
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : "更新失败", "error");
    }
  }

  return (
    <Panel title="求购线索" description="来自前台求购表单，提交时已触发通知渠道">
      <div className="admin-toolbar">
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          aria-label="线索状态"
        >
          <option value="">全部状态</option>
          <option value="new">未读</option>
          <option value="read">已读</option>
          <option value="archived">已归档</option>
        </select>
        <span className="toolbar-count">共 {data?.total ?? 0} 条</span>
      </div>

      {data && data.items.length === 0 ? (
        <EmptyState icon={<IconInbox size={22} />} title="暂无求购线索" hint="前台访客提交求购后会出现在这里。" />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>时间</th>
                <th>域名</th>
                <th>联系方式</th>
                <th>留言</th>
                <th>地区</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((lead) => (
                <tr key={lead.id}>
                  <td>{new Date(lead.created_at).toLocaleString("zh-CN")}</td>
                  <td className="cell-mono">{lead.full_domain}</td>
                  <td>{lead.contact}</td>
                  <td style={{ maxWidth: 240, overflowWrap: "anywhere" }}>{lead.message || "—"}</td>
                  <td>{lead.country ?? "—"}</td>
                  <td>
                    <Badge tone={STATUS_TONE[lead.status]}>{STATUS_LABEL[lead.status]}</Badge>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      {lead.status === "new" && (
                        <button className="btn btn-secondary btn-sm" onClick={() => void setLeadStatus(lead, "read")}>
                          标为已读
                        </button>
                      )}
                      {lead.status !== "archived" && (
                        <button className="btn btn-ghost btn-sm" onClick={() => void setLeadStatus(lead, "archived")}>
                          归档
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && <Pagination page={page} totalPages={data.totalPages} onChange={setPage} />}
    </Panel>
  );
}
