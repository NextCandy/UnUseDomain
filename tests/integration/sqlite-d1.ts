import { execFileSync } from "node:child_process";

type Value = string | number | null | ArrayBuffer;

function literal(value: Value): string {
  if (value === null) return "NULL";
  if (typeof value === "number") return String(value);
  if (value instanceof ArrayBuffer) return `X'${Buffer.from(value).toString("hex")}'`;
  return `'${value.replaceAll("'", "''")}'`;
}

function render(sql: string, params: Value[]): string {
  let index = 0;
  const rendered = sql.replaceAll("?", () => literal(params[index++] ?? null));
  if (index !== params.length) throw new Error(`SQL 参数数量不匹配：${index}/${params.length}`);
  return rendered;
}

function query<T>(databasePath: string, sql: string): T[] {
  const output = execFileSync("sqlite3", ["-json", databasePath, sql], { encoding: "utf8", maxBuffer: 50 * 1024 * 1024 }).trim();
  return output ? JSON.parse(output) as T[] : [];
}

export class SqliteD1Statement {
  constructor(
    private readonly databasePath: string,
    readonly sql: string,
    readonly params: Value[] = [],
  ) {}

  bind(...params: Value[]): SqliteD1Statement { return new SqliteD1Statement(this.databasePath, this.sql, params); }
  async all<T = Record<string, unknown>>() { const results = query<T>(this.databasePath, render(this.sql, this.params)); return { success: true, results, meta: { changes: 0, last_row_id: 0 } }; }
  async first<T = Record<string, unknown>>(column?: string): Promise<T | null> { const row = (await this.all<T>()).results[0] ?? null; return column && row ? (row as Record<string, unknown>)[column] as T : row; }
  async run<T = Record<string, unknown>>() { const result = query<{ changes: number; last_row_id: number }>(this.databasePath, `${render(this.sql, this.params)}; SELECT changes() AS changes, last_insert_rowid() AS last_row_id;`).at(-1) ?? { changes: 0, last_row_id: 0 }; return { success: true, results: [] as T[], meta: { changes: result.changes, last_row_id: result.last_row_id } }; }
}

export class SqliteD1Database {
  constructor(readonly databasePath: string) {}
  prepare(sql: string): SqliteD1Statement { return new SqliteD1Statement(this.databasePath, sql); }
  async batch(statements: SqliteD1Statement[]) {
    const results = [];
    for (const statement of statements) {
      results.push(/^\s*(SELECT|WITH|PRAGMA)/i.test(statement.sql) ? await statement.all() : await statement.run());
    }
    return results;
  }
}
