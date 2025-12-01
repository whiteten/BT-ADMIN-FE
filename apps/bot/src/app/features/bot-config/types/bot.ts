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

export type BotCreateField = Omit<Bot, 'serviceId' | 'conversationCount' | 'workTime'>;
