import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { useTaskboardTenantParam } from './useTaskboardTenantScope';
import { type RedisKeyDefinitionsResponse, ctiRedisApi } from '../api/ctiRedisApi';
import { taskboardApi } from '../api/taskboardApi';
import type { DbQueryDef, DbQueryParam, DbQueryRedisKeyEntry, RollingGroup, TaskboardBg, TaskboardDisplay, TaskboardLayout, TaskboardNotice } from '../types/taskboard.types';

export const taskboardQueryKeys = createQueryKeys('taskboard-bg', {
  getBgList: (params?: Record<string, unknown>) => [params],
  getLayoutList: (tenantIds?: string) => [{ tenantIds }],
  getDisplayList: (tenantIds?: string) => [{ tenantIds }],
  getRollingGroupList: (tenantIds?: string) => [{ tenantIds }],
  getNoticeList: () => [{}],
  getNoticeListByKey: (noticeKey: string) => [{ noticeKey }],
  getDbQueryDefList: () => [{}],
  getDbQueryDefOptions: (id: number) => [{ id }],
});

/**
 * [BG LIST] 클라이언트 목록 조회 훅
 */
export const useGetTaskboardBg = ({ params, queryOptions }: QueryHookWithParamsOptions<TaskboardBg[]> = {}) => {
  const tenantIds = useTaskboardTenantParam();
  return useQuery({
    queryKey: taskboardQueryKeys.getBgList({ ...params, tenantIds }).queryKey,
    queryFn: () => taskboardApi.getTaskBoardBgs(params, tenantIds),
    ...queryOptions,
  });
};

/**
 * [BG INSERT] 전광판 배경 등록 훅 (FormData 지원)
 */
export const useCreateTaskboardBg = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: taskboardApi.createTaskBoardBg,
    ...mutationOptions,
  });
};

/**
 * [BG DELETE] 전광판 배경 삭제 훅
 */
export const useDeleteTaskboardBg = ({ mutationOptions }: MutationHookOptions<any, number> = {}) => {
  return useMutation({
    mutationFn: taskboardApi.deleteTaskBoardBg,
    ...mutationOptions,
  });
};

// ── 레이아웃 훅 ───────────────────────────────────────────────────────────

export const useGetTaskboardLayoutList = ({ queryOptions }: QueryHookWithParamsOptions<TaskboardLayout[]> = {}) => {
  const tenantIds = useTaskboardTenantParam();
  return useQuery({
    queryKey: taskboardQueryKeys.getLayoutList(tenantIds).queryKey,
    queryFn: () => taskboardApi.getLayoutList(tenantIds),
    ...queryOptions,
  });
};

export const useCreateTaskboardLayout = ({ mutationOptions }: MutationHookOptions<any, { pageId: number; tenantId: string; layoutName: string; layoutJson: string }> = {}) => {
  return useMutation({
    mutationFn: taskboardApi.createLayout,
    ...mutationOptions,
  });
};

export const useUpdateLayout = ({ mutationOptions }: MutationHookOptions<any, { layoutId: number; layoutName: string; layoutJson: string }> = {}) => {
  return useMutation({
    mutationFn: taskboardApi.updateLayout,
    ...mutationOptions,
  });
};

export const useDeleteTaskboardLayout = ({ mutationOptions }: MutationHookOptions<any, number> = {}) => {
  return useMutation({
    mutationFn: taskboardApi.deleteLayout,
    ...mutationOptions,
  });
};

// ── 뷰 그룹 훅 (레이아웃과 매핑되지 않는 독립된 선택값 묶음) ─────────────────────────

export const useGetTaskboardDisplayList = ({ queryOptions }: QueryHookWithParamsOptions<TaskboardDisplay[]> = {}) => {
  const tenantIds = useTaskboardTenantParam();
  return useQuery({
    queryKey: taskboardQueryKeys.getDisplayList(tenantIds).queryKey,
    queryFn: () => taskboardApi.getDisplayList(tenantIds),
    ...queryOptions,
  });
};

export const useCreateTaskboardDisplay = ({ mutationOptions }: MutationHookOptions<any, { tenantId?: string; displayName: string; selectionJson: string }> = {}) => {
  return useMutation({
    mutationFn: taskboardApi.createDisplay,
    ...mutationOptions,
  });
};

export const useUpdateTaskboardDisplay = ({ mutationOptions }: MutationHookOptions<any, { displayId: number; displayName?: string; selectionJson?: string }> = {}) => {
  return useMutation({
    mutationFn: taskboardApi.updateDisplay,
    ...mutationOptions,
  });
};

export const useDeleteTaskboardDisplay = ({ mutationOptions }: MutationHookOptions<any, number> = {}) => {
  return useMutation({
    mutationFn: taskboardApi.deleteDisplay,
    ...mutationOptions,
  });
};

// ── 저장된 DB 쿼리 정의 훅 (뷰그룹 체크박스 옵션 소스) ──────────────────────────

/**
 * 데이터소스 정의·옵션은 운영자가 데이터소스관리에서 저장할 때만 바뀌는 마스터 데이터다.
 * host QueryClient가 `gcTime: 0` + 기본 `staleTime: 0`이라 이 값들을 그대로 두면
 * 롤링(슬라이드 전환마다 LayoutScreen 재마운트)에서 매 전환마다 정의·옵션을 전부 다시 조회한다.
 * 변경은 데이터소스관리 화면의 `refetch()`가 즉시 반영하므로 캐시를 길게 잡아도 최신성이 깨지지 않는다.
 */
const DB_QUERY_DEF_CACHE = { staleTime: 5 * 60 * 1000, gcTime: 10 * 60 * 1000 } as const;

export const useGetDbQueryDefList = ({ queryOptions }: QueryHookWithParamsOptions<DbQueryDef[]> = {}) => {
  return useQuery({
    queryKey: taskboardQueryKeys.getDbQueryDefList().queryKey,
    queryFn: () => taskboardApi.listDbQueryDefs(),
    ...DB_QUERY_DEF_CACHE,
    ...queryOptions,
  });
};

export const useCreateDbQueryDef = ({
  mutationOptions,
}: MutationHookOptions<
  any,
  { tenantId: string; queryName: string; description?: string; sqlText: string; params?: DbQueryParam[]; redisKeys?: DbQueryRedisKeyEntry[]; placeholderName?: string }
> = {}) => {
  return useMutation({
    mutationFn: taskboardApi.createDbQueryDef,
    ...mutationOptions,
  });
};

export const useUpdateDbQueryDef = ({
  mutationOptions,
}: MutationHookOptions<
  any,
  {
    dbQueryId: number;
    tenantId: string;
    queryName: string;
    description?: string;
    sqlText: string;
    params?: DbQueryParam[];
    redisKeys?: DbQueryRedisKeyEntry[];
    placeholderName?: string;
  }
> = {}) => {
  return useMutation({
    mutationFn: taskboardApi.updateDbQueryDef,
    ...mutationOptions,
  });
};

export const useDeleteDbQueryDef = ({ mutationOptions }: MutationHookOptions<any, number> = {}) => {
  return useMutation({
    mutationFn: taskboardApi.deleteDbQueryDef,
    ...mutationOptions,
  });
};

export const useGetDbQueryDefOptions = (id: number, { queryOptions }: QueryHookWithParamsOptions<Record<string, unknown>[]> = {}) => {
  return useQuery({
    queryKey: taskboardQueryKeys.getDbQueryDefOptions(id).queryKey,
    queryFn: () => taskboardApi.getDbQueryDefOptions(id),
    enabled: !!id,
    ...DB_QUERY_DEF_CACHE,
    ...queryOptions,
  });
};

/** 저장된 DbQueryDef 여러 건의 옵션(VALUE/NAME)을 한번에 조회 — 뷰그룹 등록 화면에서 저장된 쿼리 개수만큼 동적으로 필요 */
export const useGetDbQueryDefOptionsMulti = (ids: number[]) => {
  return useQueries({
    queries: ids.map((id) => ({
      queryKey: taskboardQueryKeys.getDbQueryDefOptions(id).queryKey,
      queryFn: () => taskboardApi.getDbQueryDefOptions(id),
      enabled: !!id,
      ...DB_QUERY_DEF_CACHE,
    })),
  });
};

// ── 롤링 그룹 훅 ─────────────────────────────────────────────────────────

export const useGetRollingGroupList = ({ queryOptions }: QueryHookWithParamsOptions<RollingGroup[]> = {}) => {
  const tenantIds = useTaskboardTenantParam();
  return useQuery({
    queryKey: taskboardQueryKeys.getRollingGroupList(tenantIds).queryKey,
    queryFn: () => taskboardApi.getRollingGroupList(tenantIds),
    ...queryOptions,
  });
};

export const useCreateRollingGroup = ({
  mutationOptions,
}: MutationHookOptions<any, { groupName: string; displayIds: string; intervalSec: number; transitionType?: string; tenantId?: string }> = {}) => {
  return useMutation({
    mutationFn: taskboardApi.createRollingGroup,
    ...mutationOptions,
  });
};

export const useUpdateRollingGroup = ({
  mutationOptions,
}: MutationHookOptions<any, { groupId: number; groupName: string; displayIds: string; intervalSec: number; transitionType?: string }> = {}) => {
  return useMutation({
    mutationFn: taskboardApi.updateRollingGroup,
    ...mutationOptions,
  });
};

export const useDeleteRollingGroup = ({ mutationOptions }: MutationHookOptions<any, number> = {}) => {
  return useMutation({
    mutationFn: taskboardApi.deleteRollingGroup,
    ...mutationOptions,
  });
};

// ── 공지사항 훅 ───────────────────────────────────────────────────────────

export const useGetNoticeList = ({ queryOptions }: QueryHookWithParamsOptions<TaskboardNotice[]> = {}) => {
  return useQuery({
    queryKey: taskboardQueryKeys.getNoticeList().queryKey,
    queryFn: () => taskboardApi.getNoticeList(),
    ...queryOptions,
  });
};

export const useGetNoticeListByKey = (noticeKey: string, { queryOptions }: QueryHookWithParamsOptions<TaskboardNotice[]> = {}) => {
  return useQuery({
    queryKey: taskboardQueryKeys.getNoticeListByKey(noticeKey).queryKey,
    queryFn: () => taskboardApi.getNoticeListByKey(noticeKey),
    enabled: !!noticeKey,
    ...queryOptions,
  });
};

export const useCreateNotice = ({ mutationOptions }: MutationHookOptions<any, Partial<TaskboardNotice>> = {}) => {
  return useMutation({
    mutationFn: taskboardApi.createNotice,
    ...mutationOptions,
  });
};

export const useUpdateNotice = ({ mutationOptions }: MutationHookOptions<any, Partial<TaskboardNotice> & { noticeId: number }> = {}) => {
  return useMutation({
    mutationFn: taskboardApi.updateNotice,
    ...mutationOptions,
  });
};

export const useDeleteNotice = ({ mutationOptions }: MutationHookOptions<any, number> = {}) => {
  return useMutation({
    mutationFn: taskboardApi.deleteNotice,
    ...mutationOptions,
  });
};

// ── CTI Redis 실시간 데이터 훅 ────────────────────────────────────────────────

export const ctiRedisQueryKeys = createQueryKeys('cti-redis', {
  hashKeys: () => [{}],
  hashColumns: () => [{}],
  hashEntries: (hashKey: string) => [{ hashKey }],
  keyDefinitions: () => [{}],
});

// [삭제 2026-07-10] useGetCtiQueueList/AgentList/GroupList/MediaTypeList — IC 전용 TB_IC_* 직결 목록 훅.
// 큐/상담사/상담그룹/미디어타입은 이제 데이터소스관리(useGetDbQueryDefList/useGetDbQueryDefOptions)로 조회한다.

/** Redis Hash 타입 키 목록 조회 (서버 기동 시 캐시된 목록) */
export const useGetRedisHashKeys = ({ queryOptions }: QueryHookWithParamsOptions<string[]> = {}) => {
  return useQuery({
    queryKey: ctiRedisQueryKeys.hashKeys().queryKey,
    queryFn: () => ctiRedisApi.getRedisHashKeys(),
    ...queryOptions,
  });
};

/**
 * Redis Hash 키 목록 새로고침 — 서버가 다시 SCAN하여 캐시를 갱신한 결과를 받아 쿼리 캐시에 반영.
 * 서버는 키 목록과 컬럼명 캐시를 같은 시점에 같이 갱신하므로, 여기서도 컬럼명 쿼리를 같이 무효화해
 * 최신 캐시를 다시 받아오게 한다(검색 색인이 새로고침 전 상태로 남아있지 않도록).
 */
export const useRefreshRedisHashKeys = ({ mutationOptions }: MutationHookOptions<string[], void> = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => ctiRedisApi.getRedisHashKeys(true),
    onSuccess: (data) => {
      queryClient.setQueryData(ctiRedisQueryKeys.hashKeys().queryKey, data);
      queryClient.invalidateQueries({ queryKey: ctiRedisQueryKeys.hashColumns().queryKey });
    },
    ...mutationOptions,
  });
};

/**
 * Redis Hash 키별 컬럼명(필드명) 캐시 조회 — 서버가 기동/새로고침 시점에 미리 계산해 둔 캐시를 그대로
 * 받아오므로 Redis를 직접 조회하지 않음. task-create 좌측 탐색기의 필드명 검색에 사용.
 */
export const useGetRedisHashColumns = ({ queryOptions }: QueryHookWithParamsOptions<Record<string, string[]>> = {}) => {
  return useQuery({
    queryKey: ctiRedisQueryKeys.hashColumns().queryKey,
    queryFn: () => ctiRedisApi.getRedisHashColumns(),
    ...queryOptions,
  });
};

/** Redis Hash 키의 모든 필드(compositeKey)를 원본 그대로(평탄화 없이) 조회 — "해시그룹" compositeKey 선택 UI용 */
export const useGetRedisHashEntries = (hashKey: string, { queryOptions }: QueryHookWithParamsOptions<Record<string, string>> = {}) => {
  return useQuery({
    queryKey: ctiRedisQueryKeys.hashEntries(hashKey).queryKey,
    queryFn: () => ctiRedisApi.getRedisHashEntries(hashKey),
    enabled: !!hashKey,
    ...queryOptions,
  });
};

/**
 * Redis BASE KEY → 실제 HASH KEY 매핑 메타데이터(application-redis-key-map.yml). BE 재시작 전엔 안 바뀌는
 * 정적 데이터라 staleTime을 길게 둔다.
 */
export const useGetRedisKeyDefinitions = ({ queryOptions }: QueryHookWithParamsOptions<RedisKeyDefinitionsResponse> = {}) => {
  return useQuery({
    queryKey: ctiRedisQueryKeys.keyDefinitions().queryKey,
    queryFn: () => ctiRedisApi.getRedisKeyDefinitions(),
    staleTime: 10 * 60 * 1000,
    ...queryOptions,
  });
};
