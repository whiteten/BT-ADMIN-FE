export interface Aoe {
  agentId: string;
  agentName: string;
  aoeApiKey: string;
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
  data: {
    list: {
      data: {
        sentences: string[];
      };
    };
  };
}
