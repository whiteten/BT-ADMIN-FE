export type AoeDeployFlag = 0 | 1;

export interface Agent {
  agentId: string;
  agentName: string;
  agentTypeName: string;
  agentDesc?: string;
  aoeDeployFlag: AoeDeployFlag;
  deployTime?: string;
}

export type AgentListItem = Pick<Agent, 'agentId' | 'agentName' | 'agentTypeName' | 'aoeDeployFlag' | 'deployTime'>;
export type AgentItem = Agent;
export type AgentCreateDatas = Omit<Agent, 'agentId'>;
export type AgentUpdateDatas = Omit<Agent, 'agentId'>;
