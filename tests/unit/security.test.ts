import { describe, expect, it } from "vitest";

import { decryptCredentials, encryptCredentials, hashPassword, hmacSha256, randomToken, verifyPassword } from "../../src/worker/security/crypto";

describe("密码和会话安全", () => {
  it("PBKDF2 哈希可验证正确密码并拒绝错误密码", async () => {
    const digest = await hashPassword("Correct-Horse-Battery-99");
    expect(digest.algorithm).toBe("PBKDF2-SHA-256");
    expect(digest.iterations).toBeGreaterThanOrEqual(100_000);
    await expect(verifyPassword("Correct-Horse-Battery-99", digest)).resolves.toBe(true);
    await expect(verifyPassword("wrong-password", digest)).resolves.toBe(false);
  });

  it("随机 Token 不重复且只存 HMAC 哈希", async () => {
    const left = randomToken(); const right = randomToken();
    expect(left).not.toBe(right);
    expect(await hmacSha256(left, "session-test-secret")).not.toContain(left);
  });

  it("AES-GCM 加密和解密注册商凭据", async () => {
    const key = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64");
    const encrypted = await encryptCredentials({ apiKey: "test-only-key" }, key);
    expect(encrypted.encrypted).not.toContain("test-only-key");
    await expect(decryptCredentials(encrypted.encrypted, encrypted.iv, key)).resolves.toEqual({ apiKey: "test-only-key" });
  });
});
