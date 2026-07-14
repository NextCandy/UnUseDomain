import { useEffect, useState } from "react";

import { api } from "../../../lib/api";
import { Panel } from "../Panel";
import type { Notify } from "../types";

interface NotificationForm {
  reminder_days_json: string;
  timezone: string;
  email_enabled: number;
  telegram_enabled: number;
  bark_enabled: number;
  serverchan_enabled: number;
  wecom_enabled: number;
  feishu_enabled: number;
  discord_enabled: number;
  email_recipient: string | null;
  telegram_chat_id: string | null;
  bark_configured: number;
  serverchan_configured: number;
  wecom_configured: number;
  feishu_configured: number;
  discord_configured: number;
}

type SecretChannel = "bark" | "serverchan" | "wecom" | "feishu" | "discord";

const SECRET_CHANNELS: Array<{ key: SecretChannel; label: string; placeholder: string; patchKey: string }> = [
  { key: "bark", label: "Bark", placeholder: "设备密钥", patchKey: "bark_device_key" },
  { key: "serverchan", label: "Server 酱", placeholder: "SendKey（sctapi.ftqq.com）", patchKey: "serverchan_key" },
  { key: "wecom", label: "企业微信机器人", placeholder: "Webhook URL（qyapi.weixin.qq.com）", patchKey: "wecom_webhook" },
  { key: "feishu", label: "飞书机器人", placeholder: "Webhook URL（open.feishu.cn）", patchKey: "feishu_webhook" },
  { key: "discord", label: "Discord", placeholder: "Webhook URL（discord.com）", patchKey: "discord_webhook" },
];

export function NotificationsView({ notify }: { notify: Notify }) {
  const [form, setForm] = useState<NotificationForm | null>(null);
  const [secrets, setSecrets] = useState<Record<SecretChannel, string>>({
    bark: "",
    serverchan: "",
    wecom: "",
    feishu: "",
    discord: "",
  });

  useEffect(() => {
    api<NotificationForm>("/api/admin/notifications")
      .then(setForm)
      .catch((reason: unknown) => notify(reason instanceof Error ? reason.message : "通知设置加载失败", "error"));
  }, [notify]);

  if (!form) return <div className="skeleton-card" style={{ minHeight: 200 }} />;

  const enabledOf = (key: SecretChannel) => Boolean(form[`${key}_enabled` as keyof NotificationForm]);
  const configuredOf = (key: SecretChannel) => Boolean(form[`${key}_configured` as keyof NotificationForm]);

  function setEnabled(key: SecretChannel, value: boolean) {
    setForm((current) => (current ? { ...current, [`${key}_enabled`]: value ? 1 : 0 } : current));
  }

  async function save() {
    if (!form) return;
    try {
      const reminderDays: unknown = JSON.parse(form.reminder_days_json);
      if (!Array.isArray(reminderDays) || !reminderDays.every((value) => Number.isInteger(value))) {
        throw new Error("提醒天数必须是整数 JSON 数组");
      }
      const body: Record<string, unknown> = {
        reminder_days: reminderDays,
        email_enabled: Boolean(form.email_enabled),
        telegram_enabled: Boolean(form.telegram_enabled),
        bark_enabled: Boolean(form.bark_enabled),
        serverchan_enabled: Boolean(form.serverchan_enabled),
        wecom_enabled: Boolean(form.wecom_enabled),
        feishu_enabled: Boolean(form.feishu_enabled),
        discord_enabled: Boolean(form.discord_enabled),
        email_recipient: form.email_recipient,
        telegram_chat_id: form.telegram_chat_id,
        timezone: "Asia/Shanghai",
      };
      for (const { key, patchKey } of SECRET_CHANNELS) {
        if (secrets[key]) body[patchKey] = secrets[key];
      }
      await api("/api/admin/notifications", { method: "PATCH", body: JSON.stringify(body) });
      notify("通知设置已保存");
      setSecrets({ bark: "", serverchan: "", wecom: "", feishu: "", discord: "" });
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : "保存失败", "error");
    }
  }

  async function test(channel: string) {
    try {
      await api("/api/admin/notifications/test", { method: "POST", body: JSON.stringify({ channel }) });
      notify(`${channel} 测试通知已真实发送`);
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : "通知发送失败", "error");
    }
  }

  return (
    <Panel
      title="到期提醒与通知渠道"
      description="Cloudflare Cron 每天检查到期；渠道同时用于前台求购线索推送；密钥一律 AES-GCM 加密存储"
    >
      <div className="form-stack">
        <label className="field">
          <span>提醒天数（JSON 数组）</span>
          <input
            value={form.reminder_days_json}
            onChange={(event) => setForm({ ...form, reminder_days_json: event.target.value })}
          />
        </label>

        <div className="channel-card">
          <label>
            <input
              type="checkbox"
              className="check"
              checked={Boolean(form.email_enabled)}
              onChange={(event) => setForm({ ...form, email_enabled: event.target.checked ? 1 : 0 })}
            />
            Email
          </label>
          <input
            className="input"
            type="email"
            value={form.email_recipient ?? ""}
            onChange={(event) => setForm({ ...form, email_recipient: event.target.value || null })}
            placeholder="收件邮箱"
          />
          <button className="btn btn-secondary btn-sm" onClick={() => void test("email")}>
            真实测试
          </button>
        </div>

        <div className="channel-card">
          <label>
            <input
              type="checkbox"
              className="check"
              checked={Boolean(form.telegram_enabled)}
              onChange={(event) => setForm({ ...form, telegram_enabled: event.target.checked ? 1 : 0 })}
            />
            Telegram
          </label>
          <input
            className="input"
            value={form.telegram_chat_id ?? ""}
            onChange={(event) => setForm({ ...form, telegram_chat_id: event.target.value || null })}
            placeholder="Chat ID"
          />
          <button className="btn btn-secondary btn-sm" onClick={() => void test("telegram")}>
            真实测试
          </button>
        </div>

        {SECRET_CHANNELS.map(({ key, label, placeholder }) => (
          <div className="channel-card" key={key}>
            <label>
              <input
                type="checkbox"
                className="check"
                checked={enabledOf(key)}
                onChange={(event) => setEnabled(key, event.target.checked)}
              />
              {label}
            </label>
            <input
              className="input"
              type="password"
              value={secrets[key]}
              onChange={(event) => setSecrets((current) => ({ ...current, [key]: event.target.value }))}
              placeholder={configuredOf(key) ? "已加密配置；留空不修改" : placeholder}
              autoComplete="off"
            />
            <button className="btn btn-secondary btn-sm" onClick={() => void test(key)}>
              真实测试
            </button>
          </div>
        ))}

        <button className="btn btn-primary" style={{ justifySelf: "start" }} onClick={() => void save()}>
          保存提醒设置
        </button>
      </div>
    </Panel>
  );
}
