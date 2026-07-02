import { useEffect } from 'react';
import type { useKeepAliveRef } from 'keepalive-for-react';

type AliveRef = ReturnType<typeof useKeepAliveRef>;

/**
 * keep-alive 캐시에서 더 이상 유지할 이유가 없는 노드를 폐기하는 공용 훅.
 * "현재 활성 키는 보존 + keepKeys 집합 밖 노드는 destroy" 패턴의 단일 소유자 —
 * host Layout(remote 모듈 캐시)과 KeepAliveBoundary(remote 내 탭별 캐시)가 공용한다.
 * destroy는 멱등이라 keepKeys가 매 렌더 새 Set이어도 여분 실행은 무해하다.
 */
export function usePruneCacheNodes(aliveRef: AliveRef, currentKey: string, keepKeys: ReadonlySet<string>) {
  useEffect(() => {
    const api = aliveRef.current;
    if (!api?.getCacheNodes) return;
    for (const node of api.getCacheNodes()) {
      if (node.cacheKey !== currentKey && !keepKeys.has(node.cacheKey)) {
        void api.destroy(node.cacheKey);
      }
    }
  }, [aliveRef, currentKey, keepKeys]);
}
