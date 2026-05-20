import type { UpstreamVariable } from '../utils/variableTokens';

/**
 * 시스템 글로벌 변수 (sys.*).
 *
 * 현재는 비어있다 — BE 런타임이 어떤 sys 변수를 자동 주입하는지 확정되지 않았고,
 * 환경변수 관리 인프라도 아직 없어서 dropdown 에서 일단 숨긴다.
 *
 * BE 가 sys.* 주입 스펙을 확정하면 (예: user_id, workflow_id 등) 여기에 채워 넣으면
 * 별도 코드 변경 없이 모든 텍스트 필드의 `/` dropdown 에 자동 노출된다.
 */
export const SYS_VARIABLES: UpstreamVariable[] = [];
