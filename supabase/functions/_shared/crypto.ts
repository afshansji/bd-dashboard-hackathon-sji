const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function fromBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

let cachedKey: CryptoKey | null = null;

async function getCryptoKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;
  const secret = Deno.env.get("INTEGRATION_SECRET_KEY");
  if (!secret) {
    throw new Error("Missing INTEGRATION_SECRET_KEY environment variable");
  }
  const normalized = secret.padEnd(32, "0").slice(0, 32);
  const material = encoder.encode(normalized);
  cachedKey = await crypto.subtle.importKey(
    "raw",
    material,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
  return cachedKey;
}

export async function encryptSecret(value: string): Promise<string> {
  const key = await getCryptoKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(value),
  );
  return JSON.stringify({
    v: 1,
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(cipherBuffer)),
  });
}

export async function decryptSecret(value: string | null | undefined): Promise<string | null> {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value);
    if (!parsed?.iv || !parsed?.ciphertext) {
      throw new Error("Invalid payload");
    }
    const key = await getCryptoKey();
    const iv = fromBase64(parsed.iv);
    const ciphertext = fromBase64(parsed.ciphertext);
    const plainBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
      key,
      ciphertext.buffer as ArrayBuffer,
    );
    return decoder.decode(plainBuffer);
  } catch (error) {
    if (error instanceof Error && error.message.includes("Missing")) {
      throw error;
    }
    // Fallback to plaintext for existing records
    return value;
  }
}
