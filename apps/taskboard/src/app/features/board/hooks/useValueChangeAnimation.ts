import { useEffect, useRef, useState } from 'react';

/**
 * value가 실제로 바뀔 때마다 1씩 증가하는 key를 반환한다.
 * 이 key를 값 렌더 요소의 React `key`로 사용하면, 값이 바뀔 때만 그 요소가 remount되어
 * CSS 모션(className으로 건 keyframes animation)이 매번 처음부터 다시 재생된다.
 */
export function useValueChangeKey(value: unknown): number {
  const prevRef = useRef(value);
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    if (prevRef.current !== value) {
      prevRef.current = value;
      setAnimKey((k) => k + 1);
    }
  }, [value]);

  return animKey;
}
