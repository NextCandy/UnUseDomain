import { Hono } from "hono";

import {
  friendLinkCreateSchema,
  friendLinkPatchSchema,
  notificationChannelPatchSchema,
  notificationPatchSchema,
  settingsPatchSchema,
} from "../../../shared/schemas/api";
import type { FriendLink } from "../../../shared/types/api";
import { fail, ok, writeOperationLog } from "../../http";
import { encryptCredentials } from "../../security/crypto";
import {
  NOTIFICATION_CHANNELS,
  parseNotificationConfig,
  sendChannelNotification,
  type NotificationChannel,
  type NotifyChannelRow,
} from "../../services/notifications";
import type { AppBindings } from "../../types";

const IMAGE_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/x-icon": "ico",
};
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export const settingsRoutes = new Hono<AppBindings>();

function parseLastTest(value: string | null): { ok: boolean; at: string; error: string | null } | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed && typeof parsed === "object" && "ok" in parsed && "at" in parsed) return parsed as { ok: boolean; at: string; error: string | null };
  } catch { /* invalid historical state is treated as untested */ }
  return null;
}

settingsRoutes.get("/settings", async (c) => {
  const settings = await c.env.DB.prepare("SELECT * FROM site_settings WHERE id = 1").first();
  return ok(c, settings);
});

settingsRoutes.patch("/settings", async (c) => {
  const parsed = settingsPatchSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return fail(c, 422, "INVALID_SETTINGS", "站点设置无效", parsed.error.issues);
  const fields: string[] = [];
  const values: Array<string | number | null> = [];
  for (const [key, value] of Object.entries(parsed.data)) {
    fields.push(`${key} = ?`);
    values.push(typeof value === "boolean" ? (value ? 1 : 0) : value ?? null);
  }
  if (fields.length === 0) return fail(c, 422, "NO_CHANGES", "没有可保存的设置");
  await c.env.DB.prepare(`UPDATE site_settings SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = 1`)
    .bind(...values)
    .run();
  const user = c.get("authUser");
  await writeOperationLog(c.env.DB, {
    action: "settings.update",
    resourceType: "site_settings",
    resourceId: 1,
    message: "更新站点设置",
    actorUserId: user.id,
    success: true,
  });
  return ok(c, { saved: true });
});

const FRIEND_LINK_COLUMNS = "id, name, url, logo_url, display_mode, sort_order";

settingsRoutes.get("/friend-links", async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT ${FRIEND_LINK_COLUMNS} FROM friend_links ORDER BY sort_order ASC, id ASC`,
  ).all<FriendLink>();
  return ok(c, { items: rows.results });
});

settingsRoutes.post("/friend-links", async (c) => {
  const parsed = friendLinkCreateSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return fail(c, 422, "INVALID_FRIEND_LINK", "友情链接无效", parsed.error.issues);
  const { name, url, logo_url, display_mode, sort_order } = parsed.data;
  // 未指定排序时排到末尾，避免新链接默认插到第一条
  const nextOrder = sort_order ?? (((await c.env.DB.prepare("SELECT MAX(sort_order) AS max_order FROM friend_links").first<{ max_order: number | null }>())?.max_order ?? -1) + 1);
  const created = await c.env.DB.prepare(
    `INSERT INTO friend_links (name, url, logo_url, display_mode, sort_order) VALUES (?, ?, ?, ?, ?) RETURNING ${FRIEND_LINK_COLUMNS}`,
  )
    .bind(name, url, logo_url || null, display_mode ?? "logo_text", nextOrder)
    .first<FriendLink>();
  const user = c.get("authUser");
  await writeOperationLog(c.env.DB, {
    action: "friend_link.create",
    resourceType: "friend_link",
    resourceId: created?.id,
    message: `新增友情链接 ${name}`,
    actorUserId: user.id,
    success: true,
  });
  return ok(c, created, 201);
});

settingsRoutes.patch("/friend-links/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id) || id <= 0) return fail(c, 422, "FRIEND_LINK_ID_INVALID", "友情链接 ID 无效");
  const parsed = friendLinkPatchSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return fail(c, 422, "INVALID_FRIEND_LINK", "友情链接无效", parsed.error.issues);
  const fields: string[] = [];
  const values: Array<string | number | null> = [];
  for (const [key, value] of Object.entries(parsed.data)) {
    fields.push(`${key} = ?`);
    // 空字符串的 LOGO 存成 NULL，前台据此判断是否渲染图片
    values.push(key === "logo_url" ? value || null : value);
  }
  if (fields.length === 0) return fail(c, 422, "NO_CHANGES", "没有可保存的友情链接改动");
  const updated = await c.env.DB.prepare(
    `UPDATE friend_links SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ? RETURNING ${FRIEND_LINK_COLUMNS}`,
  )
    .bind(...values, id)
    .first<FriendLink>();
  if (!updated) return fail(c, 404, "FRIEND_LINK_NOT_FOUND", "友情链接不存在");
  const user = c.get("authUser");
  await writeOperationLog(c.env.DB, {
    action: "friend_link.update",
    resourceType: "friend_link",
    resourceId: id,
    message: `更新友情链接 ${updated.name}`,
    actorUserId: user.id,
    success: true,
  });
  return ok(c, updated);
});

settingsRoutes.delete("/friend-links/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id) || id <= 0) return fail(c, 422, "FRIEND_LINK_ID_INVALID", "友情链接 ID 无效");
  const removed = await c.env.DB.prepare(`DELETE FROM friend_links WHERE id = ? RETURNING ${FRIEND_LINK_COLUMNS}`)
    .bind(id)
    .first<FriendLink>();
  if (!removed) return fail(c, 404, "FRIEND_LINK_NOT_FOUND", "友情链接不存在");
  const user = c.get("authUser");
  await writeOperationLog(c.env.DB, {
    action: "friend_link.delete",
    resourceType: "friend_link",
    resourceId: id,
    message: `删除友情链接 ${removed.name}`,
    actorUserId: user.id,
    success: true,
  });
  return ok(c, { deleted: true });
});

settingsRoutes.post("/uploads", async (c) => {
  const form = await c.req.parseBody();
  const file = form.file;
  const target = form.target;
  if (!(file instanceof File)) return fail(c, 422, "IMAGE_REQUIRED", "请选择图片文件");
  if (typeof target !== "string" || !["logo", "favicon", "wechatQr"].includes(target)) {
    return fail(c, 422, "UPLOAD_TARGET_INVALID", "上传目标无效");
  }
  const extension = IMAGE_TYPES[file.type];
  if (!extension) return fail(c, 422, "IMAGE_TYPE_INVALID", "仅支持 PNG、JPEG、WebP 或 ICO");
  if (file.size > MAX_IMAGE_BYTES) return fail(c, 413, "IMAGE_TOO_LARGE", "图片不能超过 2 MB");
  const key = `site/${target}-${crypto.randomUUID()}.${extension}`;
  await c.env.UPLOADS.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type, cacheControl: "public, max-age=31536000, immutable" },
  });
  const url = `/uploads/${key}`;
  const column = target === "logo" ? "logo_url" : target === "favicon" ? "favicon_url" : "wechat_qr_url";
  await c.env.DB.prepare(`UPDATE site_settings SET ${column} = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1`)
    .bind(url)
    .run();
  return ok(c, { key, url }, 201);
});

settingsRoutes.delete("/uploads/*", async (c) => {
  const key = decodeURIComponent(c.req.path.split("/uploads/")[1] ?? "");
  if (!key.startsWith("site/") || key.includes("..")) return fail(c, 422, "UPLOAD_KEY_INVALID", "文件键无效");
  await c.env.UPLOADS.delete(key);
  const url = `/uploads/${key}`;
  await c.env.DB.prepare(
    `UPDATE site_settings SET
      logo_url = CASE WHEN logo_url = ? THEN NULL ELSE logo_url END,
      favicon_url = CASE WHEN favicon_url = ? THEN NULL ELSE favicon_url END,
      wechat_qr_url = CASE WHEN wechat_qr_url = ? THEN NULL ELSE wechat_qr_url END,
      updated_at = CURRENT_TIMESTAMP WHERE id = 1`,
  )
    .bind(url, url, url)
    .run();
  return ok(c, { deleted: true });
});

settingsRoutes.get("/notifications", async (c) => {
  const [settings, channels] = await Promise.all([
    c.env.DB.prepare("SELECT reminder_days_json, timezone FROM notification_settings WHERE id = 1").first(),
    c.env.DB.prepare("SELECT channel, enabled, config, last_test FROM notify_channels ORDER BY channel").all<NotifyChannelRow>(),
  ]);
  return ok(c, { ...settings, channels: channels.results.map((row) => {
    const config = parseNotificationConfig(row.config);
    return { channel: row.channel, enabled: row.enabled, last_test: parseLastTest(row.last_test), config: { server_url: config.server_url, chat_id: config.chat_id, from: config.from, to: config.to }, configured: Boolean(config.secret_encrypted) || row.channel === "email" };
  }) });
});

// 加密入库的渠道密钥：patch 字段 → [加密列前缀, 凭据字段名]
const SECRET_FIELDS: Array<[string, string, string]> = [
  ["bark_device_key", "bark_device_key", "deviceKey"],
  ["serverchan_key", "serverchan_key", "sendKey"],
  ["wecom_webhook", "wecom_webhook", "webhookUrl"],
  ["feishu_webhook", "feishu_webhook", "webhookUrl"],
  ["discord_webhook", "discord_webhook", "webhookUrl"],
];

settingsRoutes.patch("/notifications", async (c) => {
  const parsed = notificationPatchSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return fail(c, 422, "INVALID_NOTIFICATION_SETTINGS", "通知设置无效", parsed.error.issues);
  const fields: string[] = [];
  const values: Array<string | number | null> = [];
  const secretKeys = new Set(SECRET_FIELDS.map(([key]) => key));
  for (const [key, value] of Object.entries(parsed.data)) {
    if (secretKeys.has(key)) continue;
    const column = key === "reminder_days" ? "reminder_days_json" : key;
    fields.push(`${column} = ?`);
    values.push(Array.isArray(value) ? JSON.stringify([...new Set(value)].sort((a, b) => b - a)) : typeof value === "boolean" ? (value ? 1 : 0) : value ?? null);
  }
  for (const [patchKey, columnPrefix, credentialField] of SECRET_FIELDS) {
    const secret = (parsed.data as Record<string, unknown>)[patchKey];
    if (typeof secret !== "string" || !secret) continue;
    const encrypted = await encryptCredentials({ [credentialField]: secret }, c.env.CREDENTIALS_ENCRYPTION_KEY);
    fields.push(`${columnPrefix}_encrypted = ?`, `${columnPrefix}_iv = ?`);
    values.push(encrypted.encrypted, encrypted.iv);
  }
  if (fields.length === 0) return fail(c, 422, "NO_CHANGES", "没有可保存的通知设置");
  await c.env.DB.prepare(`UPDATE notification_settings SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = 1`)
    .bind(...values)
    .run();
  const user = c.get("authUser");
  await writeOperationLog(c.env.DB, {
    action: "notifications.update",
    resourceType: "notification_settings",
    resourceId: 1,
    message: "更新到期提醒设置",
    actorUserId: user.id,
    success: true,
  });
  return ok(c, { saved: true });
});

const SECRET_NAME: Partial<Record<NotificationChannel, string>> = { telegram: "bot_token", bark: "device_key", serverchan: "send_key", wecom: "webhook_url", feishu: "webhook_url", discord: "webhook_url" };

settingsRoutes.patch("/notifications/channel", async (c) => {
  const parsed = notificationChannelPatchSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return fail(c, 422, "INVALID_CHANNEL_CONFIG", "通知渠道配置无效", parsed.error.issues);
  const existing = await c.env.DB.prepare("SELECT channel, enabled, config, last_test FROM notify_channels WHERE channel = ?").bind(parsed.data.channel).first<NotifyChannelRow>();
  if (!existing) return fail(c, 404, "CHANNEL_NOT_FOUND", "通知渠道不存在");
  const config = parseNotificationConfig(existing.config);
  const secretName = SECRET_NAME[parsed.data.channel];
  const incoming = parsed.data.config as Record<string, string | undefined>;
  const secret = secretName ? incoming[secretName] : undefined;
  if (secretName && secret) {
    const encrypted = await encryptCredentials({ [secretName]: secret }, c.env.CREDENTIALS_ENCRYPTION_KEY);
    config.secret_encrypted = encrypted.encrypted;
    config.secret_iv = encrypted.iv;
  }
  for (const field of ["server_url", "chat_id", "from", "to"] as const) if (incoming[field] !== undefined) config[field] = incoming[field];
  await c.env.DB.prepare("UPDATE notify_channels SET enabled = ?, config = ?, updated_at = CURRENT_TIMESTAMP WHERE channel = ?").bind(parsed.data.enabled ? 1 : 0, JSON.stringify(config), parsed.data.channel).run();
  return ok(c, { saved: true });
});

settingsRoutes.post("/notifications/test", async (c) => {
  const body = (await c.req.json().catch(() => null)) as { channel?: unknown } | null;
  if (!body || !NOTIFICATION_CHANNELS.includes(String(body.channel) as NotificationChannel)) {
    return fail(c, 422, "CHANNEL_INVALID", "通知渠道无效");
  }
  const channel = body.channel as NotificationChannel;
  const settings = await c.env.DB.prepare("SELECT channel, enabled, config, last_test FROM notify_channels WHERE channel = ?").bind(channel).first<NotifyChannelRow>();
  if (!settings) return fail(c, 503, "SETTINGS_UNAVAILABLE", "通知渠道尚未初始化");
  const user = c.get("authUser");
  try {
    const result = await sendChannelNotification(c.env, settings, { title: "UnUseDomain 通知测试", content: "这是一条由 UnUseDomain 后台真实发送的测试通知。" });
    const lastTest = { ok: true, at: new Date().toISOString(), error: null };
    await c.env.DB.prepare("UPDATE notify_channels SET last_test = ?, updated_at = CURRENT_TIMESTAMP WHERE channel = ?").bind(JSON.stringify(lastTest), channel).run();
    await writeOperationLog(c.env.DB, {
      action: "notifications.test",
      resourceType: "notification",
      message: `${channel} 测试通知发送成功`,
      details: { channel, providerMessageId: result.providerMessageId },
      actorUserId: user.id,
      success: true,
    });
    return ok(c, { sent: true, channel, last_test: lastTest });
  } catch (error) {
    const message = error instanceof Error ? error.message : "通知发送失败";
    const lastTest = { ok: false, at: new Date().toISOString(), error: message.slice(0, 500) };
    await c.env.DB.prepare("UPDATE notify_channels SET last_test = ?, updated_at = CURRENT_TIMESTAMP WHERE channel = ?").bind(JSON.stringify(lastTest), channel).run();
    await writeOperationLog(c.env.DB, {
      level: "error",
      action: "notifications.test",
      resourceType: "notification",
      message,
      details: { channel },
      actorUserId: user.id,
      success: false,
    });
    return fail(c, 502, "NOTIFICATION_FAILED", message, { last_test: lastTest });
  }
});
