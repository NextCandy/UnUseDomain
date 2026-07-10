import fs from "node:fs/promises";
import path from "node:path";

import { parseDomainCsv } from "../src/shared/csv";
import { buildImportStatements, statementsToSql } from "../src/shared/import-plan";
import type { DomainCsvParseResult } from "../src/shared/types/domain";

export const EXPECTED_DOMAIN_COUNT = 662;
export const SOURCE_PATH = path.resolve("data/source/domains-1783619533.csv");
export const NORMALIZED_PATH = path.resolve("data/generated/domains.normalized.json");
export const REPORT_PATH = path.resolve("data/generated/domains.report.json");
export const IMPORT_SQL_PATH = path.resolve("data/generated/domains.import.sql");

export async function readAndParseSource(): Promise<DomainCsvParseResult> {
  const csvText = await fs.readFile(SOURCE_PATH, "utf8");
  return parseDomainCsv(csvText, path.basename(SOURCE_PATH));
}

export function assertExpectedReport(result: DomainCsvParseResult): void {
  const { report } = result;
  const failures: string[] = [];
  if (report.rawRecordCount !== EXPECTED_DOMAIN_COUNT) failures.push(`原始记录 ${report.rawRecordCount}`);
  if (report.parsedCount !== EXPECTED_DOMAIN_COUNT) failures.push(`成功解析 ${report.parsedCount}`);
  if (report.uniqueCount !== EXPECTED_DOMAIN_COUNT) failures.push(`唯一域名 ${report.uniqueCount}`);
  if (report.duplicateCount !== 0) failures.push(`重复域名 ${report.duplicateCount}`);
  if (report.invalidCount !== 0) failures.push(`无效记录 ${report.invalidCount}`);
  if (failures.length > 0) {
    const details = report.issues
      .map((issue) => `第 ${issue.rowNumber} 行 ${issue.domain || "(空)"}：${issue.reason}`)
      .join("\n");
    throw new Error(`CSV 验收失败：${failures.join("，")}\n${details}`);
  }
}

export async function writeGenerated(result: DomainCsvParseResult): Promise<void> {
  await fs.mkdir(path.dirname(NORMALIZED_PATH), { recursive: true });
  const normalized = `${JSON.stringify(result.records, null, 2)}\n`;
  let generatedAt = result.report.generatedAt;
  try {
    const [existingNormalized, existingReportText] = await Promise.all([
      fs.readFile(NORMALIZED_PATH, "utf8"),
      fs.readFile(REPORT_PATH, "utf8"),
    ]);
    const existingReport = JSON.parse(existingReportText) as { generatedAt?: string };
    if (existingNormalized === normalized && existingReport.generatedAt) generatedAt = existingReport.generatedAt;
  } catch {
    // 首次生成时不存在旧产物，使用本次解析时间。
  }
  const report = { ...result.report, generatedAt };
  const importSql = statementsToSql(buildImportStatements(result.records, { importId: "wanmi-generated-import" }));
  await Promise.all([
    fs.writeFile(NORMALIZED_PATH, normalized, "utf8"),
    fs.writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8"),
    fs.writeFile(IMPORT_SQL_PATH, importSql, "utf8"),
  ]);
}
