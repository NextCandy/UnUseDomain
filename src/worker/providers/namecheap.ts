import { parse as parseTld } from "tldts";

import { requiredCredential } from "./http";
import { assertRecordType, ProviderError, type DnsRecord, type DnsRecordInput, type RegistrarDomain, type RegistrarProvider } from "./types";

interface NamecheapRecord { id: string; type: string; name: string; content: string; ttl: number; priority: number | null; }

function decodeXml(value: string): string {
  return value.replaceAll("&quot;", '"').replaceAll("&apos;", "'").replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&");
}

function attributes(tag: string): Record<string, string> {
  return Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map((match) => [match[1], decodeXml(match[2])]));
}

export class NamecheapProvider implements RegistrarProvider {
  readonly provider = "namecheap";
  private readonly username: string;
  private readonly apiUser: string;
  private readonly apiKey: string;
  private readonly clientIp: string;
  private readonly base: string;
  private readonly supported = new Set(["A", "AAAA", "CNAME", "MX", "TXT", "NS", "CAA"]);

  constructor(credentials: Record<string, string>) {
    this.username = requiredCredential(credentials, "username", "Namecheap");
    this.apiUser = credentials.apiUser?.trim() || this.username;
    this.apiKey = requiredCredential(credentials, "apiKey", "Namecheap");
    this.clientIp = requiredCredential(credentials, "clientIp", "Namecheap");
    this.base = credentials.environment === "sandbox" ? "https://api.sandbox.namecheap.com/xml.response" : "https://api.namecheap.com/xml.response";
  }

  private async request(command: string, params: Record<string, string> = {}, method: "GET" | "POST" = "GET"): Promise<string> {
    const search = new URLSearchParams({ ApiUser: this.apiUser, ApiKey: this.apiKey, UserName: this.username, ClientIp: this.clientIp, Command: command, ...params });
    const response = await fetch(method === "GET" ? `${this.base}?${search}` : this.base, { method, headers: { "Content-Type": "application/x-www-form-urlencoded" }, ...(method === "POST" ? { body: search.toString() } : {}) , signal: AbortSignal.timeout(15_000) });
    const xml = await response.text();
    const error = xml.match(/<Error[^>]*>([\s\S]*?)<\/Error>/i)?.[1];
    if (!response.ok || /Status="ERROR"/i.test(xml) || error) throw new ProviderError(`Namecheap API 失败${error ? `：${decodeXml(error)}` : `（HTTP ${response.status}）`}`);
    return xml;
  }

  async testConnection() {
    await this.request("namecheap.domains.getList", { PageSize: "1", Page: "1" });
    return { ok: true as const, message: "Namecheap API 凭据有效且客户端 IP 已授权" };
  }

  async listDomains(): Promise<RegistrarDomain[]> {
    const all: RegistrarDomain[] = [];
    for (let page = 1;; page += 1) {
      const xml = await this.request("namecheap.domains.getList", { PageSize: "100", Page: String(page) });
      const tags = [...xml.matchAll(/<Domain\b[^>]*\/>/gi)].map((match) => attributes(match[0]));
      all.push(...tags.map((item) => ({ domain: item.Name, status: item.IsExpired === "true" ? "expired" : "active", expiresAt: item.Expires ? new Date(`${item.Expires} UTC`).toISOString() : null })));
      const total = Number(attributes(xml.match(/<Paging\b[^>]*>/i)?.[0] ?? "").TotalItems || tags.length);
      if (all.length >= total || tags.length < 100) break;
    }
    return all;
  }

  private domainParts(domain: string): { SLD: string; TLD: string } {
    const parsed = parseTld(domain);
    if (!parsed.domainWithoutSuffix || !parsed.publicSuffix) throw new ProviderError(`Namecheap 无法解析域名 ${domain}`, "DOMAIN_INVALID", 422);
    return { SLD: parsed.domainWithoutSuffix, TLD: parsed.publicSuffix };
  }

  private async records(domain: string): Promise<NamecheapRecord[]> {
    const xml = await this.request("namecheap.domains.dns.getHosts", this.domainParts(domain));
    return [...xml.matchAll(/<Host\b[^>]*\/>/gi)].map((match) => attributes(match[0])).filter((item) => ["A", "AAAA", "CNAME", "MX", "TXT", "NS", "CAA", "SRV"].includes(item.Type)).map((item, index) => ({ id: item.HostId || String(index + 1), type: item.Type, name: item.Name || "@", content: item.Address, ttl: Number(item.TTL || 1800), priority: item.MXPref ? Number(item.MXPref) : null }));
  }

  async listDnsRecords(domain: string): Promise<DnsRecord[]> {
    return (await this.records(domain)).map((item) => ({ ...item, type: assertRecordType(item.type), proxied: null }));
  }

  private async replaceRecords(domain: string, records: NamecheapRecord[]): Promise<void> {
    if (records.length === 0) throw new ProviderError("Namecheap API 不支持用 setHosts 删除最后一条 DNS 记录，请先保留或添加另一条记录", "DNS_LAST_RECORD_DELETE_UNSUPPORTED", 422);
    const params: Record<string, string> = { ...this.domainParts(domain) };
    records.forEach((record, index) => {
      const n = index + 1;
      params[`HostName${n}`] = record.name || "@";
      params[`RecordType${n}`] = record.type;
      params[`Address${n}`] = record.content;
      params[`TTL${n}`] = String(record.ttl || 1800);
      if (record.type === "MX") params[`MXPref${n}`] = String(record.priority ?? 10);
    });
    await this.request("namecheap.domains.dns.setHosts", params, "POST");
  }

  private assertSupported(type: string): void {
    if (!this.supported.has(type)) throw new ProviderError(`Namecheap 不支持 ${type} 记录`, "DNS_TYPE_UNSUPPORTED", 422);
  }

  async createDnsRecord(domain: string, input: DnsRecordInput): Promise<DnsRecord> {
    this.assertSupported(input.type);
    const current = await this.records(domain);
    const item: NamecheapRecord = { id: `new-${Date.now()}`, type: input.type, name: input.name || "@", content: input.content, ttl: input.ttl ?? 1800, priority: input.priority ?? null };
    await this.replaceRecords(domain, [...current, item]);
    return { ...item, type: input.type, proxied: null };
  }

  async updateDnsRecord(domain: string, recordId: string, input: DnsRecordInput): Promise<DnsRecord> {
    this.assertSupported(input.type);
    const current = await this.records(domain);
    const index = current.findIndex((item) => item.id === recordId);
    if (index < 0) throw new ProviderError("Namecheap DNS 记录不存在", "DNS_RECORD_NOT_FOUND", 404);
    current[index] = { id: recordId, type: input.type, name: input.name || "@", content: input.content, ttl: input.ttl ?? 1800, priority: input.priority ?? null };
    await this.replaceRecords(domain, current);
    return { ...current[index], type: input.type, proxied: null };
  }

  async deleteDnsRecord(domain: string, recordId: string): Promise<void> {
    const current = await this.records(domain);
    const next = current.filter((item) => item.id !== recordId);
    if (next.length === current.length) throw new ProviderError("Namecheap DNS 记录不存在", "DNS_RECORD_NOT_FOUND", 404);
    await this.replaceRecords(domain, next);
  }
}
