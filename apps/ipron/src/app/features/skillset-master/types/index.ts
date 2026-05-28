/**
 * skillset-master 타입 정의 (Phase 1 stub).
 */
export interface SkillsetGroupResponse {
  groupId: number;
  groupName: string;
  tenantId: number;
  tenantName: string;
  skillsetCount: number;
  children?: SkillsetGroupResponse[];
}

export interface SkillsetResponse {
  skillsetId: number;
  skillsetName: string;
  groupId: number | null;
  groupName: string | null;
  treeId: number | null;
  tenantId: number;
  tenantName: string;
  activateYn: number | null; // 1=활성, 0=비활성
  agentCount?: number;
}
