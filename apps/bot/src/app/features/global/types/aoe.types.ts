/**
 * AOE 확장 기본 정보
 */
export interface AoeBasicDetail {
  aoeId: number;
  aoeName: string | null;
  url: string | null;
  apiKey: string | null;
}

export type AoeBasicDetailItem = AoeBasicDetail;
export type AoeBasicCreateDatas = Pick<AoeBasicDetail, 'url'>;

/**
 * AOE 확장 기본 정보 Form 데이터
 */
export interface AoeBasicFormDatas {
  aoeUrl: string | null;
}

/**
 * FAQ Agent 목록 아이템
 */
export interface FaqAgent {
  agentId: string;
  agentName: string;
  faqCount: number;
}

export type FaqAgentListItem = FaqAgent;

/**
 * FAQ 목록 아이템
 */
export interface FaqItem {
  faqId: string;
  faqName: string;
  faqAnswer: string;
  faqEnable: 0 | 1;
  aoeAgentId: string;
  firstSentence: string;
  sentenceCount: number;
  workTime: string;
}

export type FaqListItem = FaqItem;

/**
 * FAQ 문장 아이템
 */
export interface FaqSentence {
  sentenceId: string;
  sentence: string;
}

/**
 * FAQ 상세 아이템
 */
export interface FaqDetail {
  faqId: string;
  faqName: string;
  faqAnswer: string;
  faqEnable: 0 | 1;
  aoeAgentId: string;
  sentences: FaqSentence[];
}

export type FaqDetailItem = FaqDetail;

/**
 * FAQ 폼 데이터
 */
export interface FaqFormData {
  sentences: string[];
  answer: string;
}

/**
 * FAQ 생성 데이터
 */
export type FaqCreateDatas = {
  faqAnswer: string;
  sentences: string[];
};

/**
 * FAQ 수정 데이터
 */
export type FaqUpdateDatas = {
  faqAnswer: string;
  sentences: string[];
};
