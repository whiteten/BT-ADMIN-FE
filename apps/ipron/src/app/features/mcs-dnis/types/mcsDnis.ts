/**
 * DNIS 관리 (MCS) 타입 정의
 * AS-IS: IPR20S1033 (TB_IC_MCSD_GDN + TB_IC_MCSD_DNIS)
 * TO-BE: BT-ADMIN-SERVICE-IPRON mcs-dnis feature
 */

// ─── NetworkOperator (CC_TELCO_KIND) ─────────────────────────────────────────

/**
 * 통신사 구분
 * 0: 공통, 1: KT, 2: SKT, 3: LGU+
 */
export type NetworkOperator = '0' | '1' | '2' | '3';

export const NETWORK_OPERATOR_LABELS: Record<NetworkOperator, string> = {
  '0': '공통',
  '1': 'KT',
  '2': 'SKT',
  '3': 'LGU+',
};

export const NETWORK_OPERATOR_OPTIONS = [
  { label: '공통', value: '0' },
  { label: 'KT', value: '1' },
  { label: 'SKT', value: '2' },
  { label: 'LGU+', value: '3' },
] as const;

// ─── MCS GDN (대표번호) ──────────────────────────────────────────────────────

export interface McsdGdn {
  mcsdGdnNo: string;
  networkOp: NetworkOperator;
  description: string | null;
  distrMethod: number;
  dnisCount: number;
}

export interface McsdGdnCreateRequest {
  mcsdGdnNo: string;
  networkOp: NetworkOperator;
  description?: string | null;
  distrMethod?: number;
}

export interface McsdGdnUpdateRequest {
  networkOp: NetworkOperator;
  description?: string | null;
  distrMethod?: number;
}

export const MCS_GDN_INITIAL_VALUES: Partial<McsdGdnCreateRequest> = {
  mcsdGdnNo: '',
  networkOp: '0',
  description: '',
  distrMethod: 0,
};

// ─── MCS DNIS (DNIS 상세) ────────────────────────────────────────────────────

export interface McsdDnis {
  mcsdGdnNo: string;
  seq: number;
  nodeId: number;
  nodeName?: string;
  startDnis: string;
  count: number;
}

export interface McsdDnisCreateRequest {
  mcsdGdnNo: string;
  nodeId: number;
  startDnis: string;
  count: number;
}

export interface McsdDnisUpdateRequest {
  startDnis: string;
  count: number;
}

export const MCS_DNIS_INITIAL_VALUES: Partial<McsdDnisCreateRequest> = {
  mcsdGdnNo: '',
  startDnis: '',
  count: 1,
};
