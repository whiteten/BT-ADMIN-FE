export interface TenantListItem {
  tenantId: string;
  tenantName: string;
}

export interface GroupItem {
  groupId: string;
  groupName: string;
  parentId: string | null;
  agentCount: number;
}

export interface AgentItem {
  userId: string;
  userName: string;
  groupId: string | null;
  groupName: string | null;
}

export interface PopupParams {
  tenantId: string;
  userId?: string;
  controlAuth?: string;
  grantId?: string;
  keyword?: string;
  retireIncluded?: boolean;
}
