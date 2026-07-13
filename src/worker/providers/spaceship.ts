import { requiredCredential } from "./http";
import { assertRecordType, ProviderError, type DnsRecord, type DnsRecordInput, type RegistrarDomain, type RegistrarProvider } from "./types";

interface SpaceshipDomain { name: string; lifecycleStatus?: string; expirationDate?: string; }
interface SpaceshipRecord { type: string; name: string; address?: string; ttl?: number; priority?: number; }

function recordId(record: SpaceshipRecord): string {
  return encodeURIComponent(JSON.stringify({ type: record.type, name: record.name, address: record.address ?? "", priority: record.priority ?? null }));
}

export class SpaceshipProvider implements RegistrarProvider {
  readonly provider = "spaceship";
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly base = "https://spaceship.dev/api/v1";

  constructor(credentials: Record<string, string>) {
    this.apiKey = requiredCredential(credentials, "apiKey", "Spaceship");
    this.apiSecret = requiredCredential(credentials, "apiSecret", "Spaceship");
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.base}${path}`, { ...init, headers: { "Content-Type": "application/json", "X-API-Key": this.apiKey, "X-API-Secret": this.apiSecret, ...init.headers }, signal: AbortSignal.timeout(15_000) });
    if (!response.ok) {
      const body = await response.json().catch(() => null) as { detail?: string } | null;
      throw new ProviderError(`Spaceship API 失败（HTTP ${response.status}）${body?.detail ? `：${body.detail}` : ""}`);
    }
    if (response.status === 204) return undefined as T;
    const body = await response.json().catch(() => null);
    if (body === null) throw new ProviderError("Spaceship API 返回了无效 JSON");
    return body as T;
  }

  async testConnection() {
    await this.request("/domains?take=1&skip=0");
    return { ok: true as const, message: "Spaceship API 凭据有效" };
  }

  async listDomains(): Promise<RegistrarDomain[]> {
    const all: SpaceshipDomain[] = [];
    for (let skip = 0;; skip += 100) {
      const response = await this.request<{ items?: SpaceshipDomain[]; total?: number }>(`/domains?take=100&skip=${skip}`);
      const page = response.items ?? [];
      all.push(...page);
      if (all.length >= (response.total ?? all.length) || page.length < 100) break;
    }
    return all.map((item) => ({ domain: item.name, status: item.lifecycleStatus ?? null, expiresAt: item.expirationDate ?? null }));
  }

  private mapRecord(record: SpaceshipRecord): DnsRecord {
    if (!record.address) throw new ProviderError("Spaceship DNS 记录缺少 address");
    return { id: recordId(record), type: assertRecordType(record.type), name: record.name || "@", content: record.address, ttl: record.ttl ?? null, priority: record.priority ?? null, proxied: null };
  }

  async listDnsRecords(domain: string): Promise<DnsRecord[]> {
    const response = await this.request<{ items?: SpaceshipRecord[] }>(`/dns/records/${encodeURIComponent(domain)}?take=500&skip=0`);
    return (response.items ?? []).filter((item) => ["A", "AAAA", "CNAME", "MX", "TXT", "NS", "CAA", "SRV"].includes(item.type.toUpperCase())).map((item) => this.mapRecord(item));
  }

  private payload(input: DnsRecordInput): SpaceshipRecord {
    return { type: input.type, name: input.name || "@", address: input.content, ttl: input.ttl ?? 600, ...(input.priority == null ? {} : { priority: input.priority }) };
  }

  async createDnsRecord(domain: string, input: DnsRecordInput): Promise<DnsRecord> {
    const item = this.payload(input);
    await this.request(`/dns/records/${encodeURIComponent(domain)}`, { method: "PUT", body: JSON.stringify({ force: false, items: [item] }) });
    return this.mapRecord(item);
  }

  async updateDnsRecord(domain: string, recordIdValue: string, input: DnsRecordInput): Promise<DnsRecord> {
    await this.deleteDnsRecord(domain, recordIdValue);
    return this.createDnsRecord(domain, input);
  }

  async deleteDnsRecord(domain: string, recordIdValue: string): Promise<void> {
    let item: SpaceshipRecord;
    try { item = JSON.parse(decodeURIComponent(recordIdValue)) as SpaceshipRecord; }
    catch { throw new ProviderError("Spaceship DNS 记录 ID 无效", "DNS_RECORD_ID_INVALID", 422); }
    await this.request(`/dns/records/${encodeURIComponent(domain)}`, { method: "DELETE", body: JSON.stringify([{ type: item.type, name: item.name, address: item.address }]) });
  }
}
