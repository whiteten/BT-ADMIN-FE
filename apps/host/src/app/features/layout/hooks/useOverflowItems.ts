import { useEffect, useLayoutEffect, useRef, useState } from 'react';

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

interface UseOverflowItemsResult<T> {
  containerRef: React.RefObject<HTMLDivElement | null>;
  measureRef: React.RefObject<HTMLDivElement | null>;
  visibleItems: T[];
  overflowItems: T[];
}

/**
 * 컨테이너 가용 폭에 맞춰 items를 보이는 N개와 오버플로우 항목으로 분할한다.
 *
 * 동작:
 * 1) measureRef 안에서 모든 항목을 한 번 렌더(visibility:hidden)해 폭을 측정.
 * 2) 컨테이너 폭에서 reservedTrailingWidth(더보기 버튼 폭 등)를 빼고 누적.
 * 3) ResizeObserver로 컨테이너/항목 변화 감지.
 *
 * 사용처는 측정용 자식과 실제 가시 영역을 분리해 렌더할 책임이 있다.
 */
export function useOverflowItems<T>(items: T[], reservedTrailingWidth = 40): UseOverflowItemsResult<T> {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLDivElement | null>(null);
  const [visibleCount, setVisibleCount] = useState(items.length);

  useIsoLayoutEffect(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure) return;

    const recompute = () => {
      const containerWidth = container.clientWidth;
      const children = Array.from(measure.children) as HTMLElement[];
      if (!children.length) {
        setVisibleCount(0);
        return;
      }

      let used = 0;
      let count = 0;
      const limit = containerWidth;
      const limitWithReserve = Math.max(0, containerWidth - reservedTrailingWidth);

      for (let i = 0; i < children.length; i++) {
        const w = children[i].offsetWidth;
        const remaining = children.length - 1 - i;
        const cap = remaining > 0 ? limitWithReserve : limit;
        if (used + w <= cap) {
          used += w;
          count++;
        } else {
          break;
        }
      }
      setVisibleCount(count);
    };

    recompute();

    const ro = new ResizeObserver(recompute);
    ro.observe(container);
    Array.from(measure.children).forEach((child) => ro.observe(child as Element));
    return () => ro.disconnect();
  }, [items, reservedTrailingWidth]);

  return {
    containerRef,
    measureRef,
    visibleItems: items.slice(0, visibleCount),
    overflowItems: items.slice(visibleCount),
  };
}
