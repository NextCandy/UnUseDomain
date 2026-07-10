import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const forbiddenDomains = [
  "yunmao.com", "mocang.com", "feilu.com", "quzhi.com", "lanmu.com", "sutang.com",
  "5167.com", "8093.com", "6367.com", "9210.com", "kvx.com", "qzr.com", "xwf.com",
  "veloce.com", "quill.cc", "arbor.io", "nimbus.ai", "orchid.cc", "tanhai.cn", "weisu.net",
  "cloudora.com", "hostley.net", "domicore.com", "netquill.cc", "siteforge.io", "webgrove.com",
  "pixelbay.cc", "hypernest.ai", "softlark.com", "smartcloudhosting.com", "greenenergyfarm.cn",
];
const forbiddenBrand = ["DS Hunter", "DSHunter", "dshunter"];
const roots = ["src", "scripts", "migrations", "public", "dist", ".github"];
const rootFiles = ["index.html", "package.json", "wrangler.jsonc", "README.md", "HANDOFF.md"];
const extensions = new Set([".ts", ".tsx", ".js", ".jsx", ".json", ".jsonc", ".sql", ".html", ".md", ".yml", ".yaml", ".css"]);

function filesIn(directory: string): string[] {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? filesIn(fullPath) : [fullPath];
  });
}

const files = [
  ...roots.flatMap(filesIn),
  ...rootFiles.filter((file) => fs.existsSync(file)),
].filter((file) => extensions.has(path.extname(file)) && file !== "scripts/verify-no-demo-data.ts");
const findings: string[] = [];
for (const file of files) {
  const content = fs.readFileSync(file, "utf8").toLowerCase();
  for (const value of [...forbiddenDomains, ...forbiddenBrand]) {
    if (content.includes(value.toLowerCase())) findings.push(`${file}: ${value}`);
  }
}

if (findings.length > 0) throw new Error(`发现演示数据或旧品牌：\n${findings.join("\n")}`);

if (process.env.VERIFY_D1 === "1") {
  const remote = process.env.VERIFY_REMOTE_D1 === "1";
  const list = forbiddenDomains.map((domain) => `'${domain}'`).join(",");
  const output = execFileSync(
    "pnpm",
    ["exec", "wrangler", "d1", "execute", "wanmi-db", remote ? "--remote" : "--local", "--json", "--command", `SELECT COUNT(*) AS count FROM domains WHERE normalized_domain IN (${list})`],
    { encoding: "utf8" },
  );
  const payload = JSON.parse(output) as Array<{ results?: Array<{ count: number }> }>;
  if (payload[0]?.results?.[0]?.count !== 0) throw new Error("D1 中发现演示域名");
}

console.log(`无演示数据检查通过：扫描 ${files.length} 个生产文件。`);
