/** Flow 목록/상세 응답 아이템 */
export interface BffFlow {
  flowId: string;
  description: string;
  spec: FlowSpec;
}

/** Flow 스펙 (저장 요청 Body) */
export interface FlowSpec {
  description?: string;
  steps: FlowStep[];
  stopOnError: boolean;
  compensation?: FlowStep[];
  compose?: ComposeSpec;
}

/** Step 정의 */
export interface FlowStep {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  serviceKey?: string;
  uri: string;
  forwardUserToken?: boolean;
  continueOnError?: boolean;
  requiredPerms?: string[];
  headers?: Record<string, string>;
  params?: Record<string, string>;
  body?: BodySpec;
}

/** Body 매핑 스펙 */
export interface BodySpec {
  from?: string;
  map?: Record<string, string>;
}

/** Compose 스펙 */
export interface ComposeSpec {
  target: string;
  sources: string[];
  removeSources?: boolean;
}
