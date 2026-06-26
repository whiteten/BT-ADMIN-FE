import { type UseQueryOptions, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import { type RedisKeySchema, type RedisKeyTemplate, redisTreeApi } from '../api/redisTreeApi';

export const monitoringRedisTreeKeys = createQueryKeys('monitoring-redis-tree', {
  keyTemplates: (refresh?: boolean) => [{ refresh: refresh ?? false }],
  keySchema: (path: string) => [path],
});

/** Redis 플랫 키 템플릿 — 탐색기 좌측 패널용. BE 미연동 시 빈 배열. */
export const useGetRedisKeyTemplates = ({
  params,
  queryOptions,
}: { params?: { refresh?: boolean }; queryOptions?: Omit<UseQueryOptions<RedisKeyTemplate[]>, 'queryKey' | 'queryFn'> } = {}) =>
  useQuery({
    ...monitoringRedisTreeKeys.keyTemplates(params?.refresh),
    queryFn: () => redisTreeApi.getKeyTemplates(params?.refresh),
    retry: false, // 외부 적재 Redis — 미연동 시 재시도 폭주 방지
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
    ...queryOptions,
  });
