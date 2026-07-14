import fs from "node:fs/promises";
import { parse } from "csv-parse/sync";

const source = await fs.readFile("data/source/WanMi.csv", "utf8");
const rows: Array<Record<string, string>> = parse(source, { columns: true, bom: true, skip_empty_lines: true });
const quote = (value: string) => `'${value.replaceAll("'", "''")}'`;
const updates = rows.flatMap((row) => {
  const domain = row["域名"]?.trim().toLowerCase();
  const registrar = row["注册商"]?.trim();
  const description = row["简介"]?.trim();
  if (!domain || (!registrar && !description)) return [];
  return [`UPDATE domains SET registrar_name = ${registrar ? quote(registrar) : "registrar_name"}, description = ${description ? quote(description.slice(0, 500)) : "description"} WHERE normalized_domain = ${quote(domain)};`];
});

await fs.writeFile("migrations/0013_domain_import_details.sql", [
  "ALTER TABLE domains ADD COLUMN registrar_name TEXT;",
  "ALTER TABLE domain_import_staging ADD COLUMN registered_at TEXT;",
  "ALTER TABLE domain_import_staging ADD COLUMN expires_at TEXT;",
  "ALTER TABLE domain_import_staging ADD COLUMN registrar_name TEXT;",
  ...updates,
  "",
].join("\n"));
console.log(`已生成 ${updates.length} 条注册商/简介回填语句。`);
