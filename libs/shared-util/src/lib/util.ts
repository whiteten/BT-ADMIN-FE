export function createUUID(): string {
  return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) => (+c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (+c / 4)))).toString(16));
}

export function getCookie(name: string): string | null {
  return (
    document.cookie
      .split(';')
      .map((s) => s.trim())
      .find((s) => s.startsWith(name + '='))
      ?.substring(name.length + 1) ?? null
  );
}

/**
 * 객체 내 어딘가에 특정 key-value 쌍이 존재하는지 재귀적으로 확인
 */
export function hasKeyValue(obj: unknown, key: string, value: unknown): boolean {
  if (obj === null || typeof obj !== 'object') return false;

  if (Array.isArray(obj)) {
    return obj.some((item) => hasKeyValue(item, key, value));
  }

  for (const [k, v] of Object.entries(obj)) {
    if (k === key && v === value) return true;
    if (hasKeyValue(v, key, value)) return true;
  }

  return false;
}
