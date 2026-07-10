import { createMiddleware } from "hono/factory";

import { fail } from "../http";
import type { AppBindings } from "../types";

export const securityHeaders = createMiddleware<AppBindings>(async (c, next) => {
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  c.header("Content-Security-Policy", "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'");
  if (c.req.path.startsWith("/api/admin/") || c.req.path.startsWith("/api/auth/")) {
    c.header("Cache-Control", "no-store");
  }
});

export const requireSameOrigin = createMiddleware<AppBindings>(async (c, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(c.req.method)) return next();
  const origin = c.req.header("origin");
  if (!origin || origin !== new URL(c.req.url).origin) {
    return fail(c, 403, "ORIGIN_REJECTED", "请求来源验证失败");
  }
  return next();
});
