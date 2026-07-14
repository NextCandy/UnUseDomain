import { FormEvent, useCallback, useEffect, useState } from "react";

import { api } from "../../../lib/api";
import { Panel } from "../Panel";
import type { AdminUser, Notify } from "../types";

interface SessionRow {
  id: string;
  expires_at: string;
  created_at: string;
  last_seen_at: string;
  user_agent: string;
  ip_country: string | null;
  is_current: number;
}

export function SecurityView({ user, notify }: { user: AdminUser; notify: Notify }) {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const load = useCallback(() => {
    api<SessionRow[]>("/api/auth/sessions")
      .then(setSessions)
      .catch((reason: unknown) => notify(reason instanceof Error ? reason.message : "会话加载失败", "error"));
  }, [notify]);

  useEffect(load, [load]);

  async function changePassword(event: FormEvent) {
    event.preventDefault();
    try {
      await api("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword("");
      setNewPassword("");
      notify("密码已修改，其他旧会话已失效");
      load();
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : "修改失败", "error");
    }
  }

  async function revoke(id: string) {
    try {
      await api(`/api/auth/sessions/${id}`, { method: "DELETE" });
      notify("会话已撤销");
      load();
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : "撤销失败", "error");
    }
  }

  async function logoutOthers() {
    try {
      const result = await api<{ revoked: number }>("/api/auth/logout-others", { method: "POST" });
      notify(`已退出其他 ${result.revoked} 个会话`);
      load();
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : "操作失败", "error");
    }
  }

  return (
    <div className="admin-stack">
      <Panel title="账户安全" description={`当前管理员：${user.email}`}>
        <form className="form-grid" onSubmit={(event) => void changePassword(event)}>
          <label className="field">
            <span>当前密码</span>
            <input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
          </label>
          <label className="field">
            <span>新密码</span>
            <input
              type="password"
              autoComplete="new-password"
              minLength={12}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="至少 12 位"
            />
          </label>
          <div className="wide">
            <button className="btn btn-primary">修改密码</button>
          </div>
        </form>
      </Panel>

      <Panel
        title="当前会话"
        actions={
          <button className="btn btn-secondary btn-sm" onClick={() => void logoutOthers()}>
            退出其他会话
          </button>
        }
      >
        <div className="session-list">
          {sessions.map((session) => (
            <div key={session.id}>
              <div>
                <strong>
                  {session.is_current ? "当前设备" : "其他设备"}
                  {session.ip_country ? ` · ${session.ip_country}` : ""}
                </strong>
                <span>{session.user_agent}</span>
                <small>
                  最近活动 {new Date(session.last_seen_at).toLocaleString("zh-CN")} · 到期{" "}
                  {new Date(session.expires_at).toLocaleString("zh-CN")}
                </small>
              </div>
              {!session.is_current && (
                <button className="btn btn-danger btn-sm" onClick={() => void revoke(session.id)}>
                  撤销
                </button>
              )}
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
