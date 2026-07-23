import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

/**
 * 带前缀的属性必须「前缀在前、标准在后」。
 *
 * 反过来写的话，构建的 CSS 压缩器会把同族声明去重、只保留最后一条，于是标准属性
 * 被丢掉、产物里只剩 -webkit-。Chrome/Safari 照常，Firefox 只认标准属性，效果直接
 * 消失——本地开发（不压缩）完全看不出来，只有线上才暴露。本轮 backdrop-filter
 * 就这么丢过：14 处前缀只剩 4 处标准。
 */
const FILES = ["src/client/styles/app.css", "src/client/styles/admin.css"];
const PREFIXED = ["backdrop-filter"];

describe("CSS 厂商前缀顺序", () => {
  for (const file of FILES) {
    const css = readFileSync(file, "utf8");

    for (const property of PREFIXED) {
      it(`${file} 里 ${property} 的标准属性不早于 -webkit- 前缀`, () => {
        /* @supports 的特性查询里「标准在前、前缀在后」是正确写法（它测的是支持性，
           不是声明），把整段条件抹成等长空白再扫，避免误报又不打乱后面的下标。 */
        const scannable = css.replace(/@supports[^{]*/g, (piece) => " ".repeat(piece.length));

        // 逐条声明扫描，记录同一规则块内两者的先后
        const pattern = new RegExp(`(-webkit-)?${property}\\s*:`, "g");
        const order = [...scannable.matchAll(pattern)].map((match) => ({
          prefixed: Boolean(match[1]),
          index: match.index ?? 0,
        }));

        const offenders: number[] = [];
        for (let i = 0; i < order.length - 1; i += 1) {
          const current = order[i];
          const next = order[i + 1];
          // 相邻两条且同处一个规则块（中间没有 } ）时，标准不能排在前缀之前
          const between = scannable.slice(current.index, next.index);
          if (between.includes("}")) continue;
          if (!current.prefixed && next.prefixed) offenders.push(current.index);
        }

        expect(offenders, `这些位置把标准属性写在了 -webkit- 之前：${offenders.join(", ")}`).toHaveLength(0);
      });
    }
  }
});
