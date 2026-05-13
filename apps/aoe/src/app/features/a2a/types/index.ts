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
  /** 배포된 BFF Flow ID (예: port_10001) — 상세 화면에서 readonly 노출 */
  deploymentId?: string;
  /** 드롭다운에서 선택한 배포 Agent 의 이름 — 상세 화면에서 readonly 노출 */
  sourceAgentName?: string;
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
