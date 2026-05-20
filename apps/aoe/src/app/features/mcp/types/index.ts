export type McpStatus = 'active' | 'inactive';

export interface McpItem {
  mcpId: string;
  serverName: string;
  url: string;
  status?: McpStatus;
  description?: string;
  workTime?: string;
}

export interface McpCreateDatas {
  serverName: string;
  url: string;
  description?: string;
  status?: McpStatus;
}

export interface McpUpdateDatas {
  mcpId: string;
  serverName: string;
  url: string;
  description?: string;
  status?: McpStatus;
}

export interface McpApiItem {
  serverName: string;
  source?: string;
  status?: string;
  toolName: string;
  description?: string;
}
