import type { Context } from "hono";

import type { ApiResponse } from "../shared/types/api";
import type { AppBindings } from "./types";

export function ok<T>(c: Context<AppBindings>, data: T, status: 200 | 201 = 200) {
  const body: ApiResponse<T> = { success: true, data, error: null };
  return c.json(body, status);
}

export function fail(
  c: Context<AppBindings>,
  status: 400 | 401 | 403 | 404 | 409 | 413 | 422 | 429 | 500 | 502 | 503,
  code: string,
  message: string,
  details?: unknown,
) {
  const body: ApiResponse<never> = {
    success: false,
    data: null,
    error: { code, message, ...(details === undefined ? {} : { details }) },
  };
  return c.json(body, status);
}

export async function writeOperationLog(
  db: D1Database,
  input: {
    level?: "info" | "warning" | "error";
    action: string;
    resourceType: string;
    resourceId?: string | number | null;
    message: string;
    details?: Record<string, unknown> | null;
    actorUserId?: number | null;
    success: boolean;
  },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO operation_logs (
        level, action, resource_type, resource_id, message, details_json, actor_user_id, success
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      input.level ?? "info",
      input.action,
      input.resourceType,
      input.resourceId === undefined || input.resourceId === null ? null : String(input.resourceId),
      input.message,
      input.details ? JSON.stringify(input.details) : null,
      input.actorUserId ?? null,
      input.success ? 1 : 0,
    )
    .run();
}
