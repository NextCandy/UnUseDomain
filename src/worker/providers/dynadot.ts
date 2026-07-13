import { requiredCredential } from "./http";
import { hmac } from "./signatures";
import { assertRecordType, ProviderError, type DnsRecord, type DnsRecordInput, type RegistrarDomain, type RegistrarProvider } from "./types";

interface DynadotRecord { sub_host?: string; record_type: string; record_value1: string; record_value2?: string; }
interface DynadotEnvelope<T> { code?: number; message?: string; data?: T; }

function base64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function dynadotId(record: DynadotRecord): string { return encodeURIComponent(JSON.stringify(record)); }

export class DynadotProvider implements RegistrarProvider {
  readonly provider = "dynadot";
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly base: string;
  private readonly supported = new Set(["A", "AAAA", "CNAME", "MX", "TXT", "CAA", "SRV"]);

  constructor(credentials: Record<string, string>) {
    this.apiKey = requiredCredential(credentials, "apiKey", "Dynadot");
    this.apiSecret = requiredCredential(credentials, "apiSecret", "Dynadot");
    this.base = credentials.environment === "sandbox" ? "https://api-sandbox.dynadot.com" : "https://api.dynadot.com";
  }

  private async request<T>(path: string, method: "GET" | "POST" | "DELETE" = "GET", body?: Record<string, unknown>): Promise<T> {
    const text = body ? JSON.stringify(body) : "";
    const requestId = crypto.randomUUID();
    const signature = base64(await hmac(this.apiSecret, `${this.apiKey}\n${path}\n${requestId}\n${text}`));
    const response = await fetch(`${this.base}${path}`, { method, headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}`, "X-Request-ID": requestId, "X-Signature": signature }, ...(text ? { body: text } : {}), signal: AbortSignal.timeout(15_000) });
    const envelope = await response.json().catch(() => null) as DynadotEnvelope<T> | null;
    if (!response.ok || !envelope || (envelope.code !== undefined && envelope.code >= 400)) throw new ProviderError(`Dynadot API 失败${envelope?.message ? `：${envelope.message}` : `（HTTP ${response.status}）`}`);
    return envelope.data as T;
  }

  async testConnection() {
    await this.request("/restful/v2/domains?page_size=1&page=1&status=active");
    return { ok: true as const, message: "Dynadot API 凭据有效" };
  }

  async listDomains(): Promise<RegistrarDomain[]> {
    const all: RegistrarDomain[] = [];
    for (let page = 1;; page += 1) {
      const data = await this.request<{ domain_info_list?: Array<{ domain_name: string; status?: string; expiration_date?: number }> }>(`/restful/v2/domains?page_size=100&page=${page}&status=all`);
      const items = data?.domain_info_list ?? [];
      all.push(...items.map((item) => ({ domain: item.domain_name, status: item.status ?? null, expiresAt: item.expiration_date ? new Date(item.expiration_date).toISOString() : null })));
      if (items.length < 100) break;
    }
    return all;
  }

  private map(record: DynadotRecord, ttl: number | null): DnsRecord {
    return { id: dynadotId(record), type: assertRecordType(record.record_type), name: record.sub_host || "@", content: record.record_value1, ttl, priority: record.record_value2 ? Number(record.record_value2) : null, proxied: null };
  }

  async listDnsRecords(domain: string): Promise<DnsRecord[]> {
    const data = await this.request<{ glue_info?: { dns_main_list?: DynadotRecord[]; dns_sub_list?: DynadotRecord[]; ttl?: string | number } }>(`/restful/v2/domains/${encodeURIComponent(domain)}/records`);
    const glue = data?.glue_info;
    const ttl = glue?.ttl == null ? null : Number(glue.ttl);
    return [...(glue?.dns_main_list ?? []), ...(glue?.dns_sub_list ?? [])].filter((item) => ["A", "AAAA", "CNAME", "MX", "TXT", "NS", "CAA", "SRV"].includes(item.record_type.toUpperCase())).map((item) => this.map(item, ttl));
  }

  private item(input: DnsRecordInput): DynadotRecord {
    if (!this.supported.has(input.type)) throw new ProviderError(`Dynadot 不支持 ${input.type} 记录`, "DNS_TYPE_UNSUPPORTED", 422);
    return { ...(input.name && input.name !== "@" ? { sub_host: input.name } : {}), record_type: input.type.toLowerCase(), record_value1: input.content, ...(input.priority == null ? {} : { record_value2: String(input.priority) }) };
  }

  async createDnsRecord(domain: string, input: DnsRecordInput): Promise<DnsRecord> {
    const item = this.item(input);
    const key = item.sub_host ? "dns_sub_list" : "dns_main_list";
    await this.request(`/restful/v2/domains/${encodeURIComponent(domain)}/records`, "POST", { [key]: [item], ttl: input.ttl ?? 600, add_dns_to_current_setting: true });
    return this.map(item, input.ttl ?? 600);
  }

  async updateDnsRecord(domain: string, recordId: string, input: DnsRecordInput): Promise<DnsRecord> {
    await this.deleteDnsRecord(domain, recordId);
    return this.createDnsRecord(domain, input);
  }

  async deleteDnsRecord(domain: string, recordId: string): Promise<void> {
    let item: DynadotRecord;
    try { item = JSON.parse(decodeURIComponent(recordId)) as DynadotRecord; }
    catch { throw new ProviderError("Dynadot DNS 记录 ID 无效", "DNS_RECORD_ID_INVALID", 422); }
    const key = item.sub_host ? "dns_sub_list" : "dns_main_list";
    await this.request(`/restful/v2/domains/${encodeURIComponent(domain)}/records`, "DELETE", { [key]: [item] });
  }
}
