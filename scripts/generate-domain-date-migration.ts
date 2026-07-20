import fs from "node:fs/promises";
import { parse } from "csv-parse/sync";

const source = await fs.readFile("data/source/UnUseDomain.csv", "utf8");
const rows: Array<Record<string, string>> = parse(source, { columns: true, bom: true, skip_empty_lines: true });
const quote = (value: string) => `'${value.replaceAll("'", "''")}'`;
const isoDate = (value: string) => {
  const match = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(value.trim());
  if (!match) return null;
  return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}T00:00:00.000Z`;
};
const updates = rows.flatMap((row) => {
  const domain = row["域名"]?.trim().toLowerCase();
  const registered = isoDate(row["注册日期"] ?? "");
  const expires = isoDate(row["到期日期"] ?? "");
  if (!domain || (!registered && !expires)) return [];
  return [`UPDATE domains SET registered_at = ${registered ? quote(registered) : "registered_at"}, expires_at = ${expires ? quote(expires) : "expires_at"} WHERE normalized_domain = ${quote(domain)};`];
});
await fs.writeFile("migrations/0012_domain_imported_dates.sql", [
  "ALTER TABLE domains ADD COLUMN registered_at TEXT;",
  ...updates,
  "CREATE INDEX IF NOT EXISTS idx_domains_expiry ON domains(expires_at);",
  "",
].join("\n"));
console.log(`已生成 ${updates.length} 条域名日期回填语句。`);
