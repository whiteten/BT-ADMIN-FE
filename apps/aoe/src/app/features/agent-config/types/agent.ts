export interface Agent {
  agentId: string;
  agentName: string;
  agentDesc?: string;
}

export type AgentListItem = Pick<Agent, 'agentId' | 'agentName'>;
export type AgentItem = Agent;
export type AgentCreateDatas = Omit<Agent, 'agentId'>;
export type AgentUpdateDatas = Omit<Agent, 'agentId'>;
