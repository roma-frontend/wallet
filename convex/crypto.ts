/**
 * Symmetric encryption for secrets at rest (e.g. the Telegram bot token).
 *
 * Uses AES-GCM with a 256-bit key supplied via the `TELEGRAM_ENCRYPTION_KEY`
 * Convex env var (base64-encoded 32 bytes). Stored format:
 *   enc:v1:<base64(iv)>:<base64(ciphertext)>
 *
 * Values without the `enc:v1:` prefix are treated as legacy plaintext and
 * returned as-is on decrypt, so existing tokens keep working until re-saved.
 */

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function getKey(): Promise<CryptoKey | null> {
  const b64 = process.env.TELEGRAM_ENCRYPTION_KEY;
  if (!b64) return null;
  const raw = base64ToBytes(b64);
  return crypto.subtle.importKey("raw", raw as BufferSource, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

const PREFIX = "enc:v1:";

/** Encrypt a secret for storage. Returns "" for empty input. */
export async function encryptSecret(plain: string): Promise<string> {
  if (!plain) return "";
  const key = await getKey();
  if (!key) return plain; // no key configured → store as-is (degraded)
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    new TextEncoder().encode(plain) as BufferSource,
  );
  return `${PREFIX}${bytesToBase64(iv)}:${bytesToBase64(new Uint8Array(ct))}`;
}

/** Decrypt a stored secret. Handles legacy plaintext transparently. */
export async function decryptSecret(stored: string | undefined | null): Promise<string> {
  if (!stored) return "";
  if (!stored.startsWith(PREFIX)) return stored; // legacy plaintext
  const key = await getKey();
  if (!key) return "";
  const [, , ivB64, ctB64] = stored.split(":");
  if (!ivB64 || !ctB64) return "";
  try {
    const pt = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64ToBytes(ivB64) as BufferSource },
      key,
      base64ToBytes(ctB64) as BufferSource,
    );
    return new TextDecoder().decode(pt);
  } catch {
    return "";
  }
}
