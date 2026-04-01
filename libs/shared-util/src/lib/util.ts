export function createUUID(): string {
  return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) => (+c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (+c / 4)))).toString(16));
}

/** UUID의 첫 번째 세그먼트(8자리 hex)를 반환하는 단축 ID 생성 함수 */
export function createShortId(): string {
  return createUUID().split('-')[0];
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

/**
 * Content-Disposition 헤더에서 파일명 추출
 */
export function extractFileName(contentDisposition?: string, defaultName = 'download'): string {
  const fileName = contentDisposition?.match(/filename\*?=(?:UTF-8'')?["']?([^"';\n]+)["']?/i)?.[1] ?? defaultName;
  return decodeURIComponent(fileName);
}

/**
 * Blob 데이터를 파일로 다운로드
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  window.URL.revokeObjectURL(url);
}

/**
 * 텍스트를 클립보드에 복사 (HTTP 환경 폴백 포함)
 */
export async function copyToClipboard(text: string): Promise<void> {
  const execCommandFallback = () => {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.focus();
    el.select();
    document.execCommand('copy');
    el.remove();
  };

  if (navigator.clipboard) {
    await navigator.clipboard.writeText(text).catch(execCommandFallback);
  } else {
    execCommandFallback();
  }
}
