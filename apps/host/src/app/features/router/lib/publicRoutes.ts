import { LOG } from '@/log';
import type { RemoteRouteEntry } from '@/shared-store';
import { matchEntryPath } from '../../layout/utils/openTabs';
import { ROUTE_LOADERS, flattenRoutes } from '../hooks/useRemoteRoutesLoader';

const Log = new LOG('publicRoutes');

export type PublicVerdict = 'public' | 'private';

const IMPORT_TIMEOUT_MS = 10000;

// 문서 로드당 1회 판정 — 캐시는 모듈 레벨 단일 값이면 충분.
// SPA 내부 이동은 재판정하지 않는다(RouteShell 참조 — 재판정하면 판정 대기 중
// PrivateRouteGate가 언마운트되어 Layout keep-alive가 깨진다).
let resolved: PublicVerdict | null = null;
let inflight: Promise<PublicVerdict> | null = null;

const withTimeout = <T>(p: Promise<T>, ms: number): Promise<T> => Promise.race([p, new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`timeout ${ms}ms`)), ms))]);

/** pathname을 세그먼트로 분해. 이상 경로(연속 슬래시·빈 세그먼트)는 null — fail-closed */
const splitPath = (pathname: string): string[] | null => {
  if (!pathname.startsWith('/') || pathname.includes('//')) return null;
  const segments = pathname.replace(/\/+$/, '').split('/').slice(1);
  return segments.length > 0 && segments.every(Boolean) ? segments : null;
};

/** 실제 판정 — 첫 세그먼트가 remote id일 때만 해당 remote Routes를 import해 public leaf와 매칭 */
const judge = async (pathname: string): Promise<PublicVerdict> => {
  const segments = splitPath(pathname);
  if (!segments) return 'private';

  const [remoteId, ...rest] = segments;
  const loader = ROUTE_LOADERS[remoteId];
  if (!loader) return 'private'; // host 자체 화면('/', '/login' 등) 포함

  const routesModule = await withTimeout(loader(), IMPORT_TIMEOUT_MS);
  const routes = Array.isArray(routesModule?.routes) ? routesModule.routes : [];
  if (routes.length === 0) return 'private'; // 미기동 remote의 빈 컨테이너 resolve 대응(useRemoteRoutesLoader 주석 참조)

  const entries: RemoteRouteEntry[] = flattenRoutes(routes);
  const restPath = rest.join('/');
  const isPublic = entries.some((entry) => entry.public === true && matchEntryPath(entry.path, restPath));
  return isPublic ? 'public' : 'private';
};

/**
 * 진입 pathname 기준 공개 라우트 판정 (문서 로드당 1회, 이후 고정).
 * 절대 reject하지 않는다 — import 실패·타임아웃·매칭 실패 등 모든 실패는 'private'(fail-closed).
 */
export function resolveInitialVerdict(pathname: string): Promise<PublicVerdict> {
  if (resolved) return Promise.resolve(resolved);
  inflight ??= judge(pathname)
    .catch((err) => {
      Log.warn('Public route verdict failed. Fallback to private (fail-closed):', err);
      return 'private' as const;
    })
    .then((v) => {
      resolved = v;
      Log.debug(`Public route verdict: ${pathname} → ${v}`);
      return v;
    });
  return inflight;
}

/** 판정 완료 후 동기 조회 (미판정이면 null — 401 핸들러 등 판정 결과가 필요한 곳에서 사용) */
export function getResolvedVerdict(): PublicVerdict | null {
  return resolved;
}
