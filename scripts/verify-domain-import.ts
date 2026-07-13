import { execFileSync } from "node:child_process";

import { readAndParseSource } from "./domain-csv-common";

const remote = process.argv.includes("--remote");
const command = `SELECT
  (SELECT COUNT(*) FROM domains) AS domains,
  (SELECT COUNT(*) FROM domain_marketplace_listings) AS listings,
  (SELECT COUNT(*) FROM domains WHERE is_listed = 1) AS public_domains,
  (SELECT COUNT(*) FROM domains WHERE normalized_domain = 'wanmi.org') AS has_wanmi_org,
  (SELECT COUNT(*) FROM domains WHERE normalized_domain = '02cloud.com') AS has_02cloud;`;
const pnpmEntrypoint = process.env.npm_execpath;
if (!pnpmEntrypoint) throw new Error("无法定位当前 pnpm 入口，请通过 pnpm domains:verify 运行此脚本");
const stdout = execFileSync(
  process.execPath,
  [pnpmEntrypoint, "exec", "wrangler", "d1", "execute", "wanmi-db", remote ? "--remote" : "--local", "--json", "--command", command.replace(/\s+/g, " ").trim()],
  { encoding: "utf8" },
);
const payload = JSON.parse(stdout) as Array<{ results?: Array<Record<string, number>> }>;
const row = payload[0]?.results?.[0];
if (!row) throw new Error(`无法读取 D1 验证结果：${stdout}`);
const expected = (await readAndParseSource()).report.uniqueCount;
const mismatches: string[] = [];
if (row.domains < expected) mismatches.push("domains");
if (row.public_domains !== expected) mismatches.push("public_domains");
if (row.listings !== 0) mismatches.push("listings");
if (row.has_wanmi_org !== 1 || row.has_02cloud !== 1) mismatches.push("domains");
if (mismatches.length > 0) throw new Error(`D1 域名验收失败：${JSON.stringify(row)}`);
console.log(`D1 验证通过：域名 ${row.domains}，售卖平台记录 ${row.listings}，公开展示 ${row.public_domains}。`);
