import { createMiddleware } from "hono/factory";

import { fail } from "../http";
import { authenticate, csrfIsValid } from "../security/session";
import type { AppBindings } from "../types";

export const requireAuth = createMiddleware<AppBindings>(async (c, next) => {
  const user = await authenticate(c);
  if (!user) return fail(c, 401, "AUTH_REQUIRED", "请先登录管理后台");
  c.set("authUser", user);
  await next();
});

export const requireCsrf = createMiddleware<AppBindings>(async (c, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(c.req.method)) return next();
  const user = c.get("authUser");
  if (!(await csrfIsValid(c, user))) return fail(c, 403, "CSRF_REJECTED", "CSRF 校验失败，请刷新后重试");
  await next();
});
