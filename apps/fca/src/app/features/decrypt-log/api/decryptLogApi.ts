import ApiClient from '@/shared-util';
import type { DecryptLogStat, PagedDecryptLog } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

/**
 * 암호화 버블 복호화 감사 이력 API.
 * - BFF Aggregation Flow:
 *   - bot-dialog-decrypt-log-list (GET)
 *   - bot-dialog-decrypt-log-stats (GET)
 * - 권한: fca:bot-dialog-decrypt-log:read
 * - 테넌트는 서버에서 세션 컨텍스트로 강제 필터됨 (X-View-All-Tenants 무시)
 */
export const decryptLogApi = {
  /** 페이지 목록 조회 */
  list: async (params?: Record<string, unknown>): Promise<PagedDecryptLog> => {
    const { _t, ...query } = params ?? {};
    const response = await apiClient.get<{ data: PagedDecryptLog }>('/bot-dialog-decrypt-log-list', { params: query });
    return response.data?.data ?? { items: [], page: 0, size: 0, total: 0 };
  },

  /** 통계 집계 */
  stats: async (params?: Record<string, unknown>): Promise<DecryptLogStat> => {
    const { _t, ...query } = params ?? {};
    const response = await apiClient.get<{ data: DecryptLogStat }>('/bot-dialog-decrypt-log-stats', { params: query });
    return (
      response.data?.data ?? {
        totalCount: 0,
        failureCount: 0,
        distinctUserCount: 0,
        countByReasonCode: {},
        countByResult: {},
      }
    );
  },
};
