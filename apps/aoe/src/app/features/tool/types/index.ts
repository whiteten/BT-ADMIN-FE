export interface ToolGroup {
  groupId: string;
  groupName: string;
  description?: string | null;
  toolCount?: number;
  workTime?: string;
}

export interface ToolItem {
  toolId: string;
  toolName: string;
  toolUrl: string;
  headers?: string;
  method: string;
  description?: string | null;
  icon?: string;
  workTime?: string;
  groupId?: string;
  parameters?: ToolParameter[];
  pathParams?: ToolPathParameter[];
}

export interface ToolParameter {
  paramId?: string;
  paramName: string;
  paramType: string;
  paramIn: string;
  seq: number;
}

export interface ToolPathParameter {
  paramId?: string;
  paramName: string;
  paramType: string;
  seq: number;
}

export interface ToolGroupCreateDatas {
  groupName: string;
  description?: string;
}

export interface ToolCreateDatas {
  toolName: string;
  toolUrl: string;
  headers?: string;
  method: string;
  description?: string;
  parameters?: ToolParameter[];
  pathParams?: ToolPathParameter[];
  icon?: string;
  groupId: string;
}
