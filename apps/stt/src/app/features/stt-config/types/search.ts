// STT 검색 (SttSearchRequest)
export interface SttSearchParams {
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
  recSystemIp: string;
  saFilepath: string;
  saFilename: string;
  startSentence: string;
}

// 음성봇 검색 (SttSearchCallbotRequest)
export interface SttSearchCallbotParams {
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
  analKind?: string;
  orgUcid?: string;
}

// 음성봇 상세 결과 (SttSearchCallbotDetailResponse)
export interface SttSearchCallbotDetailItem {
  ucidGkey: string;
  orgNum: string;
  callDatetime: string;
  talkTime: string;
  recSystemIp: string;
  saFilepath: string;
  saFilename: string;
  startSentence: string;
}

// STT 검색 대화 상세 조회 파라미터
export interface SttResultSentenceParams {
  ucidGkey: string;
  rxtxKind?: string;
}

// STT 검색 대화 상세 결과
export interface SttResultSentenceItem {
  ucidGkey: string;
  armsoffset: number;
  rxtxKind: string;
  sentence: string;
  orgSentence: string;
  groupCode: string;
}

// STT 청취 데이터 조회 파라미터
export interface SttSearchListenParams {
  recSystemIp: string;
  request: {
    saFilepath: string;
    saFilename: string;
    saFileformat: string;
    playerWidth: string;
    type: string;
  };
}

// STT 청취 데이터 파싱 결과
export interface SttSearchListenParsed {
  waveData: number[] | null;
  waveInterval: number; // 샘플 간격 (ms)
  audioBlob: Blob | null;
}
