# Cloudflare 部署

WanMi 使用单一 Cloudflare Worker：Vite 构建 React Static Assets，`/api/*` 由 Hono Worker 优先处理，D1 保存业务数据，R2 保存站点图片，Cron 每天 01:00 UTC（Asia/Shanghai 09:00）检查到期提醒。

配置依据 2026 年 Cloudflare Workers、Vite Plugin、D1、R2、Static Assets、Secrets 与 Cron 官方文档。Vite Plugin 会自动填写客户端构建目录，因此输入 `wrangler.jsonc` 只配置 `binding`、SPA fallback 和 `run_worker_first`，不硬编码输出目录。

## 1. 权限检查

```bash
pnpm wrangler whoami
```

若未登录，交互式环境运行：

```bash
pnpm wrangler login
```

CI 使用最小权限的 `CLOUDFLARE_API_TOKEN` 与正确的 `CLOUDFLARE_ACCOUNT_ID`。

## 2. 创建资源

```bash
pnpm wrangler d1 create wanmi-db
pnpm wrangler r2 bucket create wanmi-assets
```

将 D1 命令返回的真实 `database_id` 写入 `wrangler.jsonc` 对应 `DB` 绑定。R2 绑定名称为 `UPLOADS`，Bucket 名为 `wanmi-assets`。不得把 API Token 写入配置。

## 3. 设置 Secret

以下命令必须交互输入，不要把值放在命令行参数里：

```bash
pnpm wrangler secret put ADMIN_EMAIL
pnpm wrangler secret put BOOTSTRAP_ADMIN_PASSWORD
pnpm wrangler secret put SESSION_SECRET
pnpm wrangler secret put CREDENTIALS_ENCRYPTION_KEY
```

按需增加：

```bash
pnpm wrangler secret put TELEGRAM_BOT_TOKEN
pnpm wrangler secret put RESEND_API_KEY
pnpm wrangler secret put EMAIL_FROM
```

## 4. Migration、构建和部署

```bash
pnpm db:migrate:remote
pnpm build
pnpm wrangler deploy
```

`pnpm build` 会删除 Vite 预览输出中可能复制的 `.dev.vars`，并扫描构建文件，发现任何本地 Secret 即失败。

## 5. 远程导入

远程导入脚本通过 D1 HTTP batch API 原子写入，需要在当前终端提供 Cloudflare API 凭据和数据库 ID：

```bash
pnpm domains:validate
pnpm domains:report
pnpm domains:import:remote -- --dry-run
pnpm domains:import:remote
pnpm domains:verify -- --remote
```

远程环境变量：`CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`、`D1_DATABASE_ID`。这些值不得写入仓库。

## 6. 生产验收

```bash
curl -fsS https://<worker-host>/api/health
curl -fsS 'https://<worker-host>/api/public/domains?q=wanmi.org'
curl -fsS 'https://<worker-host>/api/public/domains?q=02cloud.com'
```

随后运行生产浏览器冒烟测试，确认 `/admin` 直接刷新不会 404、错误密码不能登录、隐藏/恢复会立即影响前台。

首次管理员创建且登录确认后，可以删除一次性引导密码：

```bash
pnpm wrangler secret delete BOOTSTRAP_ADMIN_PASSWORD
```

删除前必须确认管理员已写入 D1，且当前密码可登录。代码不会因 Secret 消失而重置已有管理员。

## 当前生产状态

当前生产部署已完成：

- URL：<https://wanmi.1n.workers.dev>
- Worker：`wanmi`
- D1：`wanmi-db`，绑定 `DB`
- R2：`wanmi-assets`，绑定 `UPLOADS`
- Static Assets：绑定 `ASSETS`
- Cron：`0 1 * * *`

远程 migration、两次幂等导入和 `662/662/662` 验证均已通过。生产冒烟已验证公共查询、`/admin` SPA 刷新、错误密码、真实登录、隐藏/恢复和退出。以后每次部署仍必须先执行检查、备份或确认 migration 风险，并通过 Secret/CI 环境提供 Token。
