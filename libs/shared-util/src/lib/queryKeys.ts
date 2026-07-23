import { createQueryKeys } from '@lukemorales/query-key-factory';

/**
 * 앱 스코프 접두어가 강제된 createQueryKeys 팩토리.
 *
 * queryDef 앞에 `<appScope>:`를 붙여 서로 다른 앱이 같은 feature명을 써도
 * TanStack Query 캐시 키가 충돌하지 않게 한다(host 셸이 QueryClient를 공유하므로
 * 스코프 없는 키는 앱 간 캐시 오염을 일으킨다 — 예: 'monitoring', 'tracking').
 *
 * 사용 규칙:
 * - 앱 코드는 이 함수를 직접 쓰지 않고, 각 앱의 `src/app/shared/queryKeys.ts`가
 *   `createScopedQueryKeys(__APP_NAME__)`로 만든 `createAppQueryKeys`를 사용한다
 *   (`__APP_NAME__`은 rsbuild define — 앱 폴더명 — 으로 빌드 시 주입).
 * - 이 라이브러리(@/shared-util)는 MF 공유 싱글턴이라 여기서 define을 직접 읽으면
 *   공급자 앱(보통 host)의 이름이 전 앱에 박혀 스코프가 무력화된다. 반드시
 *   각 앱 소스에서 인스턴스화해야 앱 자신의 번들에서 define이 치환된다.
 *
 * 반환 타입은 createQueryKeys 원형 그대로라 타입 레벨 queryKey 리터럴에는 접두어가
 * 보이지 않고 런타임 키에만 반영된다 — 무효화·조회는 팩토리 참조(`keys.list.queryKey`
 * 등)로 하므로 실사용 영향 없음.
 */
export const createScopedQueryKeys = (appScope: string): typeof createQueryKeys => {
  const scoped = (queryDef: string, schema?: never) => (schema === undefined ? createQueryKeys(`${appScope}:${queryDef}`) : createQueryKeys(`${appScope}:${queryDef}`, schema));
  return scoped as typeof createQueryKeys;
};
