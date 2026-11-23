/**
 * Real SHA-256 hashing using Web Crypto API (matching Vivechak's Go crypto/sha256
 * used in ComputeDecisionOutcomeHash and ComputeADRHash), with deterministic fallback.
 */

export async function sha256Hex(input: string): Promise<string> {
  const normalized = input.replace(/\r\n/g, '\n');
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const data = new TextEncoder().encode(normalized);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const bytes = new Uint8Array(hashBuffer);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  return fallbackSha256Like(normalized);
}

function fallbackSha256Like(str: string): string {
  let h1 = 0xdeadbeef ^ str.length;
  let h2 = 0x41c6ce57 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  const part = (n: number) => (n >>> 0).toString(16).padStart(8, '0');
  return (part(h1) + part(h2) + part(h1 ^ 0x9e3779b9) + part(h2 ^ 0x85ebca6b)).repeat(2);
}
