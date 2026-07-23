import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

/**
 * index.html 里定主题的同步脚本靠 CSP 哈希放行。脚本内容一改哈希就失效，
 * 浏览器会静默拒绝执行，页面退回浅色——线上不报错、测试也不会自然发现。
 * 这里从两个真实文件里各自取值比对，把「改了脚本忘了改哈希」变成红测试。
 */
describe("CSP 主题脚本哈希", () => {
  const html = readFileSync("index.html", "utf8");
  const security = readFileSync("src/worker/middleware/security.ts", "utf8");

  it("index.html 只有一段内联脚本，且被 security.ts 的哈希覆盖", () => {
    const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1]);
    expect(inline).toHaveLength(1);

    // 按 LF 归一后再算：CI 与线上服务的都是 LF，Windows 工作副本是 CRLF，
    // 不归一会得到一个线上永远对不上的哈希。
    const served = inline[0].replaceAll("\r\n", "\n");
    const actual = `sha256-${createHash("sha256").update(served, "utf8").digest("base64")}`;
    expect(security).toContain(`'${actual}'`);
  });

  it("script-src 的内联策略是开发/生产二选一，不能同时给出哈希和 unsafe-inline", () => {
    // CSP 规定：出现 hash 或 nonce 时 'unsafe-inline' 会被忽略。两者并存等于
    // 在开发环境把 Vite 的 React refresh preamble 一起拦掉，HMR 直接失效。
    expect(security).toMatch(/script-src 'self' \$\{inlineScriptPolicy\}/);
    expect(security).toMatch(/const inlineScriptPolicy = isDevelopmentHost \? "'unsafe-inline'" : THEME_INIT_HASH;/);

    // script-src 的字面量里不得直接写 'unsafe-inline'（只能经由上面的三元）
    const scriptSrcLiteral = security.match(/script-src [^;]*/g) ?? [];
    expect(scriptSrcLiteral.some((piece) => piece.includes("'unsafe-inline'"))).toBe(false);
  });
});
