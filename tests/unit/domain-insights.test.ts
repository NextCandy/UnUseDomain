import { describe, expect, it } from "vitest";

import { getDomainCharacterProfile, getPinyinMeaning, getTldHeat, getTldRegistryUrl } from "../../src/client/lib/domain-insights";

describe("域名价值维度", () => {
  it("识别字符构成、字符数与相邻叠字", () => {
    expect(getDomainCharacterProfile("yuyu")).toEqual({ count: 4, composition: "纯字母", hasRepeatedCharacter: false });
    expect(getDomainCharacterProfile("yu88")).toEqual({ count: 4, composition: "字母数字", hasRepeatedCharacter: true });
    expect(getDomainCharacterProfile("2026")).toEqual({ count: 4, composition: "纯数字", hasRepeatedCharacter: false });
  });

  it("按约定区分热门、特色与新兴后缀", () => {
    expect(getTldHeat(".com")).toBe("热门");
    expect(getTldHeat("ooo")).toBe("特色");
    expect(getTldHeat("wiki")).toBe("新兴");
  });

  it("拆解常见拼音并为未知字符返回空值", () => {
    expect(getPinyinMeaning("yu")).toBe("yu（语/域/御）");
    expect(getPinyinMeaning("wanmi")).toBe("wan（万/玩/湾） · mi（米/觅/密）");
    expect(getPinyinMeaning("02cloud")).toBeNull();
  });

  it("使用注册局映射，并让未维护后缀回退到 IANA", () => {
    expect(getTldRegistryUrl("is")).toBe("https://www.isnic.is/");
    expect(getTldRegistryUrl("example")).toBe("https://www.iana.org/domains/root/db/example.html");
  });
});
