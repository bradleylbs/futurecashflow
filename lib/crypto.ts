import crypto from "crypto"

// AES-256-GCM encryption helpers for sensitive data (e.g., banking fields)
// Requires BANKING_ENCRYPTION_KEY (32-byte key in base64) in env

function getKey(): Buffer {
  const b64 = process.env.BANKING_ENCRYPTION_KEY
  if (!b64) throw new Error("BANKING_ENCRYPTION_KEY is not set")
  const key = Buffer.from(b64, "base64")
  if (key.length !== 32) throw new Error("BANKING_ENCRYPTION_KEY must be 32 bytes (base64)")
  return key
}

export function encryptSensitive(plaintext: string): string {
  const key = getKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return `v1:gcm:${iv.toString("base64")}:${ciphertext.toString("base64")}:${tag.toString("base64")}`
}

export function decryptSensitive(encoded: string): string {
  const key = getKey()
  const [v, mode, ivB64, ctB64, tagB64] = encoded.split(":")
  if (v !== "v1" || mode !== "gcm") throw new Error("Unsupported encryption format")
  const iv = Buffer.from(ivB64, "base64")
  const ct = Buffer.from(ctB64, "base64")
  const tag = Buffer.from(tagB64, "base64")
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv)
  decipher.setAuthTag(tag)
  const plaintext = Buffer.concat([decipher.update(ct), decipher.final()])
  return plaintext.toString("utf8")
}

export function maskValue(original: string, visible: number = 4): string {
  const digits = original.replace(/\D/g, "")
  if (digits.length <= visible) return digits
  return `${"*".repeat(Math.max(0, digits.length - visible))}${digits.slice(-visible)}`
}
