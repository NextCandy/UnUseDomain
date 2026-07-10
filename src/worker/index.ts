import { Hono } from "hono";

import { fail, ok } from "./http";
import { requireSameOrigin, securityHeaders } from "./middleware/security";
import { adminRoutes } from "./routes/admin";
import { authRoutes } from "./routes/auth";
import { publicRoutes } from "./routes/public";
import { runExpirationReminders } from "./services/expiration-reminders";
import type { AppBindings, Env } from "./types";

export const app = new Hono<AppBindings>();
app.use("*", securityHeaders);
app.use("/api/*", requireSameOrigin);

app.get("/api/health", (c) => ok(c, { status: "ok", service: "WanMi" }));
app.route("/api/public", publicRoutes);
app.route("/api/auth", authRoutes);
app.route("/api/admin", adminRoutes);

app.get("/uploads/*", async (c) => {
  const key = decodeURIComponent(c.req.path.slice("/uploads/".length));
  if (!key.startsWith("site/") || key.includes("..")) return fail(c, 404, "UPLOAD_NOT_FOUND", "文件不存在");
  const object = await c.env.UPLOADS.get(key);
  if (!object) return fail(c, 404, "UPLOAD_NOT_FOUND", "文件不存在");
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("ETag", object.httpEtag);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(object.body, { headers });
});

app.all("/cdn-cgi/handler/scheduled", (c) => fail(c, 404, "NOT_FOUND", "未找到资源"));

app.notFound((c) => {
  if (c.req.path.startsWith("/api/")) return fail(c, 404, "NOT_FOUND", "未找到 API");
  return c.env.ASSETS.fetch(c.req.raw);
});

app.onError((error, c) => {
  console.error("WanMi request failed", error);
  return fail(c, 500, "INTERNAL_ERROR", "服务器内部错误");
});

export default {
  fetch: app.fetch,
  scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): void {
    ctx.waitUntil(runExpirationReminders(env));
  },
};
