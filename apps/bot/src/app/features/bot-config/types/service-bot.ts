export interface ServiceBot {
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

export type ServiceBotListItem = Omit<ServiceBot, 'serviceDesc' | 'confidence'>;
export type ServiceBotCreateRequest = Omit<ServiceBot, 'serviceId' | 'conversationCount' | 'workTime'>;
export type ServiceBotBasicInfoRequest = Omit<ServiceBot, 'conversationCount' | 'workTime'>;
export type ServiceBotBasicInfoResponse = Omit<ServiceBot, 'conversationCount'>;

export interface ServiceBotVersion {
  serviceId: string;
  serviceVer: string;
  versionName: string;
  versionDesc: string;
  workUser: string;
  workTime: string;
}

export type ServiceBotVersionListItem = Omit<ServiceBotVersion, 'versionName'>;
export type ServiceBotVersionCreateRequest = Omit<ServiceBotVersion, 'serviceId' | 'versionName' | 'workUser' | 'workTime'>;
