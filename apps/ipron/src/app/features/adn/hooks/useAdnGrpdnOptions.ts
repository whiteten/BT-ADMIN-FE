/**
 * ADN 그룹발신번호(origGrpdnId) 콤보 옵션 훅.
 *
 * DN 표준 훅 `useGetDnOptions`는 nodeId 필수(enabled 가드)이나,
 * ADN 은 노드 비종속이므로 `ipron-dn-options` flow 에 tenantId 만 넘기는 얇은 훅을 별도 운용.
 *
 * BFF flow: ipron-dn-options → GET /api/ipron/dns/options?tenantId={tenantId}
 * BE: nodeId=null 허용 (required=false), origGrpdns = GDN_TYPE=16 목록 (id=GDN_ID, name=GDN_NO).
 */
import { useQuery } from '@tanstack/react-query';
import ApiClient, { type ApiResponse } from '@/shared-util';
import { createAppQueryKeys } from '../../../shared/queryKeys';
import type { DnOptionsResponse } from '../../dn/types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

const adnGrpdnOptionKeys = createAppQueryKeys('adn-grpdn-options', {
  list: (tenantId?: number | null) => [{ tenantId: tenantId ?? null }],
});

/**
 * tenantId 범위의 GDN(그룹발신번호, GDN_TYPE=16) 옵션 조회.
 * value = GDN_ID (number), label = GDN_NO (번호 문자열).
 */
export const useAdnGrpdnOptions = (tenantId: number | null | undefined) => {
  const { data, isLoading } = useQuery({
    queryKey: adnGrpdnOptionKeys.list(tenantId).queryKey,
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<DnOptionsResponse>>('/ipron-dn-options', {
        params: { tenantId },
      });
      return res.data?.data?.origGrpdns ?? [];
    },
    enabled: !!tenantId,
    staleTime: 30_000,
  });

  const options = (data ?? []).map((item) => ({
    value: item.id,
    label: item.name,
  }));

  return { options, isLoading };
};
