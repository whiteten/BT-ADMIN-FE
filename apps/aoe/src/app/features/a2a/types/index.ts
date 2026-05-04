export interface A2ASkill {
  skillId?: string;
  skillName: string;
  description?: string;
  tags?: string[];
  examples?: string[];
  seq?: number;
}

export interface A2AItem {
  a2aId: string;
  agentId?: string;
  deploymentId?: string;
  agentName: string;
  agentDescription?: string;
  skills?: A2ASkill[];
  workTime?: string;
}

export interface A2ACreateDatas {
  agentId?: string;
  agentName: string;
  agentDescription?: string;
  aoeApiKey?: string;
  skills?: A2ASkill[];
}

export interface A2AUpdateDatas {
  a2aId: string;
  agentName: string;
  agentDescription?: string;
  skills?: A2ASkill[];
}
