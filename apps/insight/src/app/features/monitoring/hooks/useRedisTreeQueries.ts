import { type UseQueryOptions, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import { type RedisKeySchema, type RedisKeyTemplate, redisTreeApi } from '../api/redisTreeApi';

export const monitoringRedisTreeKeys = createQueryKeys('monitoring-redis-tree', {
  // tick: 새로고침 카운터 — 증가할 때만 새 키가 되어 재스캔. 0(최초 로드)은 항상 동일 키라 캐시 재사용(탭 이동 시 재조회 안 함).
  keyTemplates: (tick?: number) => [{ tick: tick ?? 0 }],
  keySchema: (path: string) => [path],
});

/**
 * Redis 플랫 키 템플릿 — 탐색기 좌측 패널용. BE 미연동 시 빈 배열.
 * <p>화면 로드 시 1회만 조회하고 이후 탭 이동/포커스에는 캐시를 재사용한다. 수동 새로고침은 tick 증가로 강제 재조회.
 */
export const useGetRedisKeyTemplates = ({
  params,
  queryOptions,
}: { params?: { tick?: number }; queryOptions?: Omit<UseQueryOptions<RedisKeyTemplate[]>, 'queryKey' | 'queryFn'> } = {}) =>
  useQuery({
    ...monitoringRedisTreeKeys.keyTemplates(params?.tick),
    queryFn: () => redisTreeApi.getKeyTemplates((params?.tick ?? 0) > 0),
    retry: false, // 외부 적재 Redis — 미연동 시 재시도 폭주 방지
    staleTime: Infinity, // 화면 로드 시 1회 — 탭 이동/포커스에 재조회 금지
    refetchOnMount: false, // 소스 타입 카드 전환 등으로 재마운트되어도 재조회 금지(에러 상태 포함)
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    ...queryOptions,
  });

/** 선택한 키 템플릿의 필드 스키마 — path 가 있을 때만 호출(enabled 가드). */
export const useGetRedisKeySchema = ({
  params: { path },
  queryOptions,
}: {
  params: { path: string };
  queryOptions?: Omit<UseQueryOptions<RedisKeySchema>, 'queryKey' | 'queryFn'>;
}) =>
  useQuery({
    ...monitoringRedisTreeKeys.keySchema(path),
    queryFn: () => redisTreeApi.getKeySchema(path),
    enabled: !!path,
    retry: false,
    staleTime: Infinity, // 선택한 키 스키마도 1회만 — 탭 이동/포커스에 재조회 금지
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    ...queryOptions,
  });
