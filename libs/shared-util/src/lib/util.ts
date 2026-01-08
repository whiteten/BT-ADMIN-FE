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
 * @param obj - 검색할 객체
 * @param key - 찾을 키
 * @param value - 찾을 값
 * @param depth - 탐색할 최대 깊이 (0: 현재 레벨만, 1: 한 단계 아래까지, 생략시 무제한)
 */
export function hasKeyValue(obj: unknown, key: string, value: unknown, depth = Infinity): boolean {
  if (obj === null || typeof obj !== 'object') return false;
  if (depth < 0) return false;

  if (Array.isArray(obj)) {
    return obj.some((item) => hasKeyValue(item, key, value, depth - 1));
  }

  for (const [k, v] of Object.entries(obj)) {
    if (k === key && v === value) return true;
    if (depth > 0 && hasKeyValue(v, key, value, depth - 1)) return true;
  }
  return false;
}
