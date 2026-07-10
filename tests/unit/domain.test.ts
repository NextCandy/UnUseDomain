import { describe, expect, it } from "vitest";

import { compareDomains, domainNameLength, normalizeDomain } from "../../src/shared/domain";

describe("域名标准化", () => {
  it("移除协议、路径、查询参数、空格与末尾点", () => {
    expect(normalizeDomain(" HTTPS://WWW.Example.COM/path?q=1. ", "com")).toEqual({
      fullDomain: "www.example.com",
      normalizedDomain: "www.example.com",
      name: "www.example",
      tld: "com",
    });
  });

  it("支持多级 TLD", () => {
    expect(normalizeDomain("sample.com.cn", "com.cn")).toMatchObject({ name: "sample", tld: "com.cn" });
  });

  it("支持 IDN 并转换为 Punycode", () => {
    expect(normalizeDomain("例子.测试", "xn--0zwm56d").normalizedDomain).toBe("xn--fsqu00a.xn--0zwm56d");
  });

  it("拒绝 TLD 不匹配与超长标签", () => {
    expect(() => normalizeDomain("example.net", "com")).toThrow(/不一致/);
    expect(() => normalizeDomain(`${"a".repeat(64)}.com`, "com")).toThrow(/标签/);
  });
});

describe("域名排序和位数", () => {
  it("字符位数不包含点和后缀", () => expect(domainNameLength("a.b"), "a.b 主体").toBe(2));
  it("精品优先，其次主体长度，最后字母顺序", () => {
    const rows = [
      { normalizedDomain: "beta.com", name: "beta", isFeatured: false },
      { normalizedDomain: "aa.com", name: "aa", isFeatured: false },
      { normalizedDomain: "long.org", name: "long", isFeatured: true },
    ].sort(compareDomains);
    expect(rows.map((row) => row.normalizedDomain)).toEqual(["long.org", "aa.com", "beta.com"]);
  });
});
