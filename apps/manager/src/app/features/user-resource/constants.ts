/**
 * 리소스 접근 Mock 데이터
 * TODO: API 연동 시 실제 데이터 조회로 교체
 */
import type { AvailableResource } from './types/userResource.types';

export const MOCK_AVAILABLE_BOTS: AvailableResource[] = [
  { id: '1001', name: '상담봇_인바운드' },
  { id: '1002', name: 'FAQ봇' },
  { id: '1003', name: '주문접수봇' },
  { id: '1004', name: 'AS접수봇' },
  { id: '1005', name: '해외상담봇' },
];

export const MOCK_AVAILABLE_MODELS: AvailableResource[] = [
  { id: 'MDL_001', name: '의도분류_v2' },
  { id: 'MDL_002', name: '개체인식_v1' },
  { id: 'MDL_003', name: '감성분석_v1' },
  { id: 'MDL_004', name: '키워드추출_v3' },
];
