# 注册商与 DNS 适配器

所有账户凭据在 Worker 内用 `CREDENTIALS_ENCRYPTION_KEY` 派生的 AES-256-GCM 密钥加密，D1 只保存密文和随机 IV。API 不回显完整密钥。

| 服务商 | 凭据字段 | 域名同步 | DNS 读写 | 备注 |
| --- | --- | --- | --- | --- |
| Cloudflare | `apiToken`、可选 `accountId` | Zone 列表 | 完整记录 ID CRUD、支持 proxied | 到期日期不可从 Zone API获得 |
| GoDaddy | `apiKey`、`apiSecret` | Domains v1 | 按 type/name 读取和替换记录组 | API 账户资格由 GoDaddy 决定 |
| NameSilo | `apiKey` | listDomains | A/AAAA/CNAME/MX/TXT | 其他类型明确返回不支持 |
| Porkbun | `apiKey`、`secretApiKey` | v3 listAll | 按记录 ID CRUD | 使用官方 v3.7 Header 认证 |
| DNSPod | `secretId`、`secretKey` | DescribeDomainList | 2021-03-23 记录 CRUD | TC3-HMAC-SHA256 签名 |
| 阿里云 | `accessKeyId`、`accessKeySecret` | DescribeDomains | Alidns 记录 CRUD | ACS3-HMAC-SHA256 V3 签名 |

## 行为保证

1. 测试连接会调用真实官方 API；无凭据或权限不足即失败。
2. 同步使用标准化域名 UPSERT，不删除注册商本次返回中暂时缺失的域名。
3. 同步不覆盖分类、精品、展示状态和备注。
4. 到期日期只来自注册商 API；CSV Date Added 不会写入 `expires_at`。
5. DNS 远端成功后才写入 `dns_records_cache`；远端失败时缓存不伪造成功。
6. 批量 DNS 返回逐域成功/失败，不把部分成功描述为全部成功。
7. 每次同步写入 `sync_runs` 和脱敏操作日志。

## 上线前实测

适配器已通过 TypeScript、单元/集成和无演示数据检查，但当前环境没有用户的六家注册商真实 API 凭据，因此不能声称完成线上连接实测。上线时应为实际使用的每家服务商执行：添加账户 → 测试连接 → 只读同步 → 选择非关键记录进行 CRUD 冒烟 → 核对远端控制台 → 删除测试记录。
