// Base64url text (RFC 4648 §5: "-" and "_", no padding) back to its bytes,
// e.g. the VAPID public key that pushManager.subscribe takes (which wants
// bytes on a plain ArrayBuffer).
export function base64UrlToBytes(text: string): Uint8Array<ArrayBuffer> {
  const base64 = text.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}
