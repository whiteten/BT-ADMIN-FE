/**
 * AOE 권한 키 상수 (BE 강제: `aoe:{메뉴키}:{action}`).
 * IAM 권한 키는 AOE 메뉴키(aoe-mgmt-*) 기반으로 발급된다(FCA와 동일 메커니즘).
 * 도메인별 read/write 2종. write 키로 생성/수정/삭제 등 쓰기 액션 버튼을 게이팅한다.
 * 사용 패턴: `useNavigationStore().permissions.includes(AOE_PERM.XXX_WRITE)`
 *
 * 주의: eval(평가셋)은 knowledge 하위 기능이라 knowledge(aoe-mgmt-know) 권한에 종속한다.
 */
export const AOE_PERM = {
  AGENT_READ: 'aoe:aoe-mgmt-agent:read',
  AGENT_WRITE: 'aoe:aoe-mgmt-agent:write',
  MODEL_READ: 'aoe:aoe-mgmt-model:read',
  MODEL_WRITE: 'aoe:aoe-mgmt-model:write',
  KNOWLEDGE_READ: 'aoe:aoe-mgmt-know:read',
  KNOWLEDGE_WRITE: 'aoe:aoe-mgmt-know:write',
  EVAL_READ: 'aoe:aoe-mgmt-know:read',
  EVAL_WRITE: 'aoe:aoe-mgmt-know:write',
  TOOL_READ: 'aoe:aoe-mgmt-tool:read',
  TOOL_WRITE: 'aoe:aoe-mgmt-tool:write',
  A2A_READ: 'aoe:aoe-mgmt-a2a:read',
  A2A_WRITE: 'aoe:aoe-mgmt-a2a:write',
  MCP_READ: 'aoe:aoe-mgmt-mcp:read',
  MCP_WRITE: 'aoe:aoe-mgmt-mcp:write',
} as const;

export type AoePermission = (typeof AOE_PERM)[keyof typeof AOE_PERM];
