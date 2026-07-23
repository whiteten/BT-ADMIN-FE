import { useQuery } from '@tanstack/react-query';
import type { QueryHookWithParamsOptions } from '@/shared-util';
import { createAppQueryKeys } from '../../../shared/queryKeys';
import { loginAuditLogApi } from '../api/loginAuditLogApi';
import type { LoginAuditLog, LoginAuditLogSearchParams } from '../types';

/**
 * 페이징 응답 타입
 */
interface PagedResponse<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
}

/**
 * 로그인 감사 로그 쿼리 키 정의
 */
export const loginAuditLogQueryKeys = createAppQueryKeys('loginAuditLog', {
  search: (params?: LoginAuditLogSearchParams) => [params],
});

/**
 * 로그인 이력 검색 훅
 * 모든 파라미터는 선택적이며, 기간 미지정 시 최근 7일 데이터 조회
 */
export const useSearchLoginLogs = ({ params, queryOptions }: QueryHookWithParamsOptions<PagedResponse<LoginAuditLog>> = {}) => {
  return useQuery({
    queryKey: loginAuditLogQueryKeys.search(params as LoginAuditLogSearchParams).queryKey,
    queryFn: () => loginAuditLogApi.search(params as LoginAuditLogSearchParams),
    ...queryOptions,
  });
};
