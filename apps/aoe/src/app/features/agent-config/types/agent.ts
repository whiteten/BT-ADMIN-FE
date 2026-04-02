export type AoeDeployFlag = 0 | 1;

export interface AgentType {
  agentType: string;
  agentTypeName: string;
}

export interface Agent {
  agentId: string;
  agentName: string;
  agentType: string;
  agentTypeName: string;
  agentDesc?: string;
  aoeDeployFlag: AoeDeployFlag;
  aoeApiKey?: string;
  deployTime?: string;
  ragUseYn?: string;
}

export type AgentListItem = Pick<Agent, 'agentId' | 'agentName' | 'agentTypeName' | 'aoeDeployFlag' | 'aoeApiKey' | 'deployTime'>;
export type AgentDeleteDatas = { agentId: string; aoeDeployFlag: AoeDeployFlag; aoeApiKey?: string };
export type AgentItem = Agent;
export type AgentCreateDatas = Omit<Agent, 'agentId' | 'agentTypeName'> & { agentType: string };
export type AgentUpdateDatas = Pick<Agent, 'agentName' | 'agentType'>;
