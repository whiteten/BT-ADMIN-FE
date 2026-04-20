// 테넌트
export interface TenantItem {
  tenantId: number;
  tenantName: string;
}

// STT 검색 (SttSearchRequest)
export interface SttSearchParams {
  tenantId?: number;
  fromDateTime?: string; // yyyyMMddHHmmss
  toDateTime?: string; // yyyyMMddHHmmss
  analKind?: string;
  analKindArr?: string[];
  inoutKind?: string;
  ucidGkey?: string;
  talkTime?: number;
  agentName?: string;
  dnNo?: string;
  keyword?: string;
}

// STT 검색 결과 (SttSearchResponse)
export interface SttSearchItem {
  ucidGkey: string;
  analKind: string;
  callDatetime: string;
  talkTime: string;
  inoutKind: string;
  dnNo: string;
  agentId: string;
  agentName: string;
  startSentence: string;
}

// 음성봇 검색 (SttSearchCallbotRequest)
export interface SttSearchCallbotParams {
  tenantId?: number;
  fromDateTime?: string; // yyyyMMddHHmmss
  toDateTime?: string; // yyyyMMddHHmmss
  analKind?: string;
  ucidGkey?: string;
}

// 음성봇 검색 결과 (SttSearchCallbotResponse)
export interface SttSearchCallbotItem {
  detailCnt: number;
  orgUcid: string;
  callDatetime: string;
  talkTime: string;
  dnNo: string;
  agentId: string;
  agentName: string;
}

// 음성봇 상세 요청 (SttSearchCallbotDetailRequest)
export interface SttSearchCallbotDetailParams {
  tenantId?: number;
  analKind?: string;
  orgUcid?: string;
}

// 음성봇 상세 결과 (SttSearchCallbotDetailResponse)
export interface SttSearchCallbotDetailItem {
  ucidGkey: string;
  orgNum: string;
  callDatetime: string;
  talkTime: string;
  startSentence: string;
}
