# 域名 CSV 导入

## 唯一数据源

原始附件名：`domains-1783619533.csv`

仓库保留路径：`data/source/domains-1783619533.csv`

生产初始域名不得来自原型数组、测试 Fixture、LocalStorage、README 或人工 Seed。

## 实际验收统计

- 原始记录：662
- 非空域名：662
- 成功解析：662
- 唯一域名：662
- 重复：0
- 无效：0
- Hidden=N：662
- Listed：656
- Ownership Review：3
- Failed Compliance：3

主要后缀：`.com` 160、`.org` 141、`.net` 64、`.xyz` 58、`.cn` 44、`.pm` 30、`.de` 26、`.im` 23、`.cc` 21、`.com.cn` 10。

## 24 列映射

解析器按表头名称读取全部字段，包括 Domain、三个价格字段、Lease to Own、展示选项、Hidden、TLD、Date Added、Listing Status、Fast Transfer、Views、Leads、六个搜索统计和 GoDaddy NS。所有原始列同时保存在 `raw_metadata_json`。

- 金额保存为安全十进制字符串，不推断币种。
- `Members-only feature` 与 `-` 转为 `NULL`，原始值仍在 JSON 中。
- Date Added 只作为市场添加时间，不作为到期日期。
- `Hidden=N` 转为 `is_listed=true`；Listing Status 不决定 WanMi 展示状态。
- 标准化会转小写、移除协议/路径/查询/末尾点、检查标签和总长度、支持数字域名、多级 TLD 与 IDN/Punycode。

## 命令

```bash
pnpm domains:parse
pnpm domains:validate
pnpm domains:report
pnpm domains:import:local -- --dry-run
pnpm domains:import:local
pnpm domains:verify
```

生成文件：

- `data/generated/domains.normalized.json`
- `data/generated/domains.report.json`
- `data/generated/domains.import.sql`

## 幂等和管理员字段

导入以 `normalized_domain` 唯一索引 UPSERT。市场数据按 `(domain_id, source_name)` 唯一。重复导入仍为 662 条，并保留管理员人工修改的分类、精品、展示状态和备注。

初次 662 行通过 D1 暂存表和集合式 UPSERT 组成一个不超过 1,000 statement 的 batch。远程使用 D1 HTTP batch；本地使用同一 migration 下的 Wrangler Miniflare SQLite 状态文件和显式事务。

当前 Cloudflare D1 Query API 的批量请求体为 `{ "batch": [{ "sql": "...", "params": [...] }] }`，不能直接发送顶层数组。生产环境已连续导入两次，最终仍为域名 662、市场记录 662、公开展示 662。

## 后台更新 CSV

后台上传先执行 dry-run，显示成功、重复、错误数量。正式导入合法记录；异常行写入 `domain_import_errors`，并提供 UTF-8 BOM 错误 CSV 下载。单次上限 900 条、文件上限 5 MB。

## 错误恢复

如果预期 662 与实际不一致，验证命令会输出行号、域名和原因并退出非零。不得修改预期数量掩盖问题。修复源解析规则后重新执行 validate、dry-run、import、verify。
