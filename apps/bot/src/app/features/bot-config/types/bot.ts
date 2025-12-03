export interface Bot {
  serviceId: string;
  serviceName: string;
  serviceDesc?: string;
  serviceVer?: string;
  modelId?: string;
  modelName?: string;
  conversationCount: number;
  confidence: [number, number];
  tags?: string[];
  workTime: string;
}

export type BotListItem = Omit<Bot, 'confidence'>;
export type BotCreateRequest = Omit<Bot, 'serviceId' | 'conversationCount' | 'workTime'>;
export type BotBasicInfoRequest = Omit<Bot, 'conversationCount' | 'workTime'>;
export type BotBasicInfoResponse = Omit<Bot, 'conversationCount'>;
