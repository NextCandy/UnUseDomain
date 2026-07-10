# WanMi

WanMi 是一个面向自有域名资产的中文展示与管理系统。前台用于公开展示经管理员上架的域名，后台用于管理域名、市场数据、注册商账户、DNS、站点设置、到期提醒和安全会话。前后台与 API 同源，并共享同一个 Cloudflare D1 数据库。

## 功能

- 从唯一源文件 `data/source/domains-1783619533.csv` 全字段导入 662 个真实域名。
- 前台服务端搜索、后缀/位数/分类/精品筛选、分页、复制和动态联系方式。
- 后台真实登录、会话管理、改密、域名 CRUD、批量管理、CSV 导入/导出和操作日志。
- 注册商凭据 AES-GCM 加密，支持 Cloudflare、GoDaddy、NameSilo、Porkbun、DNSPod 和阿里云适配器。
- DNS 远端成功后才更新 D1 缓存；支持 A、AAAA、CNAME、MX、TXT、NS、CAA、SRV，并明确报告服务商能力限制。
- R2 图片上传、Cloudflare Cron 到期提醒、Email/Telegram/Bark 真实测试。
- 公共 API 字段白名单，不公开管理员、内部备注、凭据、原始 CSV 或市场内部字段。

## 技术栈

React 19、TypeScript、Vite 8、Cloudflare Vite Plugin、Cloudflare Workers Static Assets、Hono、Cloudflare D1、R2、Cron Triggers、Zod、Vitest、Playwright。

## 本地开发

要求 Node.js 22+ 与 pnpm 10+。

```bash
pnpm install
cp .dev.vars.example .dev.vars
pnpm db:migrate:local
pnpm domains:validate
pnpm domains:import:local -- --dry-run
pnpm domains:import:local
pnpm domains:verify
pnpm dev
```

`.dev.vars` 必须填写 `ADMIN_EMAIL`、`BOOTSTRAP_ADMIN_PASSWORD`、`SESSION_SECRET` 和 `CREDENTIALS_ENCRYPTION_KEY`，且已经被 Git 忽略。首次登录时 Worker 才会创建管理员；管理员已存在时，重新部署不会重置密码。

## 常用命令

```bash
pnpm dev
pnpm build
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
pnpm check
pnpm deploy

pnpm db:migrate:local
pnpm db:migrate:remote
pnpm db:backup

pnpm domains:parse
pnpm domains:validate
pnpm domains:report
pnpm domains:import:local
pnpm domains:import:remote
pnpm domains:verify
pnpm verify:no-demo-data
```

## 目录

```text
src/client/            React 前台和后台
src/worker/            Hono Worker、认证、服务商适配器
src/shared/            CSV、域名、Schema 和共享类型
scripts/               数据导入、验证和安全扫描
migrations/            D1 migration
data/source/           唯一原始 CSV
data/generated/        脚本生成的标准化数据与报告
tests/                 单元、集成与 E2E
docs/design-reference/ 原 Claude Design 原型，仅供视觉参考
```

更详细说明见 [Cloudflare 部署](docs/CLOUDFLARE_DEPLOY.md)、[域名导入](docs/DOMAIN_IMPORT.md)、[注册商适配器](docs/REGISTRAR_PROVIDERS.md) 与 [安全设计](docs/SECURITY.md)。
