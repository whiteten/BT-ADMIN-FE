import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * 로컬스토리지에 자동 영속화되는 React 상태 훅.
 *
 * 위젯 UI 취향 (필터 칩 활성/비활성, 정렬, 밀도, 접힘 등) 저장 용도.
 * 정규화되지 않는 schemaless 데이터에 적합 — 위젯마다 자기 모양의 JSON 을 자유롭게 적재.
 *
 * - 마운트 시: localStorage 에 값이 있으면 그것을, 없거나 파싱 실패 시 `initial` 사용.
 * - 부분 저장된 값과 신규 필드가 병합되도록 `initial` 과 얕은 spread 머지.
 * - 변경 시: setState 즉시 → useEffect 로 localStorage 동기화. Quota 초과 등 예외는 조용히 무시.
 * - SSR 가드: `typeof window === 'undefined'` 일 때 초기값 그대로.
 *
 * @example
 * const [ui, setUi] = usePersistentState(
 *   `bt-admin.insight.monitoring.widget.${widgetId}.ui`,
 *   { density: 'card' as const, activeStates: ['41', '5010'] },
 * );
 */
export function usePersistentState<T>(key: string, initial: T): readonly [T, (next: T | ((prev: T) => T)) => void] {
  const initialRef = useRef(initial);
  // initial 객체 참조가 매 렌더마다 새로 만들어져도 mount 시점 값만 기억
  // 키 변경 시 의도적으로 새 키의 저장값을 로드하도록 별도 effect 가 처리

  const [value, setValue] = useState<T>(() => readFromStorage(key, initialRef.current));

  // 키가 바뀌면 새 저장소에서 다시 읽어옴 (위젯 id 가 바뀌는 케이스)
  useEffect(() => {
    setValue(readFromStorage(key, initialRef.current));
  }, [key]);

  // 변경 시 저장
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // QuotaExceededError / SecurityError — 조용히 무시
    }
  }, [key, value]);

  const setter = useCallback((next: T | ((prev: T) => T)) => {
    setValue((prev) => (typeof next === 'function' ? (next as (p: T) => T)(prev) : next));
  }, []);

  return [value, setter] as const;
}

function readFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    // 객체면 부분저장된 키 + 새 필드 머지, 그 외는 그대로
    if (parsed != null && typeof parsed === 'object' && !Array.isArray(parsed) && typeof fallback === 'object' && fallback != null && !Array.isArray(fallback)) {
      return { ...fallback, ...parsed } as T;
    }
    return parsed as T;
  } catch {
    return fallback;
  }
}
