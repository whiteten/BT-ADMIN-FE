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
export type ServiceBotItem = ServiceBot;
export type ServiceBotCreateDatas = Omit<ServiceBot, 'serviceId' | 'conversationCount' | 'workTime'>;
export type ServiceBotBasicInfoItem = Omit<ServiceBot, 'conversationCount'>;
export type ServiceBotBasicInfoUpdateDatas = Omit<ServiceBot, 'conversationCount' | 'workTime'>;

export interface ServiceBotVersion {
  serviceId: string;
  serviceVer: string;
  versionName: string;
  versionDesc: string;
  workUser: string;
  workTime: string;
}

export type ServiceBotVersionListItem = Omit<ServiceBotVersion, 'versionName'>;
export type ServiceBotVersionCreateDatas = Omit<ServiceBotVersion, 'serviceId' | 'versionName' | 'workUser' | 'workTime'>;
