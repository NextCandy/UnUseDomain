import { afterEach, describe, expect, it, vi } from "vitest";

import { DynadotProvider } from "../../src/worker/providers/dynadot";
import { createProvider, PROVIDER_NAMES } from "../../src/worker/providers/factory";
import { NamecheapProvider } from "../../src/worker/providers/namecheap";
import { SpaceshipProvider } from "../../src/worker/providers/spaceship";

afterEach(() => vi.unstubAllGlobals());

describe("注册商适配器", () => {
  it("工厂注册 Spaceship、Namecheap 与 Dynadot", () => {
    expect(PROVIDER_NAMES).toEqual(expect.arrayContaining(["spaceship", "namecheap", "dynadot"]));
    expect(createProvider("spaceship", { apiKey: "key", apiSecret: "secret" })).toBeInstanceOf(SpaceshipProvider);
    expect(createProvider("namecheap", { username: "user", apiKey: "key", clientIp: "203.0.113.1" })).toBeInstanceOf(NamecheapProvider);
    expect(createProvider("dynadot", { apiKey: "key", apiSecret: "secret" })).toBeInstanceOf(DynadotProvider);
  });

  it("Spaceship 使用官方认证头并映射域名列表", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ items: [{ name: "wanmi.org", lifecycleStatus: "registered", expirationDate: "2027-01-01T00:00:00.000Z" }], total: 1 }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    const domains = await new SpaceshipProvider({ apiKey: "key", apiSecret: "secret" }).listDomains();
    expect(domains[0]).toMatchObject({ domain: "wanmi.org", status: "registered" });
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.headers).toMatchObject({ "X-API-Key": "key", "X-API-Secret": "secret" });
  });

  it("Spaceship 接受 DNS 写入成功的 204 空响应", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await new SpaceshipProvider({ apiKey: "key", apiSecret: "secret" }).createDnsRecord("wanmi.org", { type: "A", name: "@", content: "192.0.2.1", ttl: 600 });
    expect(result).toMatchObject({ type: "A", content: "192.0.2.1" });
  });

  it("Namecheap 带白名单 IP 请求并解析 XML", async () => {
    const xml = '<?xml version="1.0"?><ApiResponse Status="OK"><CommandResponse><DomainGetListResult><Domain Name="wanmi.org" Expires="07/13/2027" IsExpired="false" /></DomainGetListResult><Paging TotalItems="1" /></CommandResponse></ApiResponse>';
    const fetchMock = vi.fn().mockResolvedValue(new Response(xml, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const domains = await new NamecheapProvider({ username: "user", apiKey: "key", clientIp: "203.0.113.1" }).listDomains();
    expect(domains[0]).toMatchObject({ domain: "wanmi.org", status: "active" });
    expect(String(fetchMock.mock.calls[0][0])).toContain("ClientIp=203.0.113.1");
  });

  it("Dynadot 发送 Bearer、请求 ID 与 HMAC 签名", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 200, message: "Success", data: { domain_info_list: [] } }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    await new DynadotProvider({ apiKey: "key", apiSecret: "secret" }).testConnection();
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer key");
    expect(headers["X-Request-ID"]).toMatch(/^[0-9a-f-]{36}$/);
    expect(headers["X-Signature"]).toBeTruthy();
  });

  it("对服务商不支持的 DNS 类型给出明确错误", async () => {
    const namecheap = new NamecheapProvider({ username: "user", apiKey: "key", clientIp: "203.0.113.1" });
    await expect(namecheap.createDnsRecord("wanmi.org", { type: "SRV", name: "_sip", content: "sip.example.com" })).rejects.toMatchObject({ code: "DNS_TYPE_UNSUPPORTED", status: 422 });
    const dynadot = new DynadotProvider({ apiKey: "key", apiSecret: "secret" });
    await expect(dynadot.createDnsRecord("wanmi.org", { type: "NS", name: "@", content: "ns1.example.com" })).rejects.toMatchObject({ code: "DNS_TYPE_UNSUPPORTED", status: 422 });
  });
});
