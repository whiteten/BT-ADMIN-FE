export interface Aoe {
  agentId: string;
  agentName: string;
  aoeApiKey: string;
  agentType: AgentType;
}

export enum AgentType {
  BASIC = 'BASIC', // 기본
  FAQ = 'FAQ', // FAQ
  TRAIN_SET = 'TRAIN_SET', //학습셋
  EVAL_SET = 'EVAL_SET', // 평가셋
}

export type AoeListItem = Pick<Aoe, 'agentId' | 'agentName'>;

// Genenate API body
export interface GenerateSentenceDatas {
  generationCount: number;
  exampleSentence: string[];
  intentName: string;
  tenantId: number | null;
}

// Genenate API Form validation
export type GenerateSentenceFormDatas = Omit<GenerateSentenceDatas, 'tenantId'> & {
  agentId: string;
};

// Generate API Response
export interface GenerateSentenceResponse {
  sentences: string[];
}
