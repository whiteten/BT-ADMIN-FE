/**
 * 마스킹 정책 타입.
 */

export type MaskRuleType = 'HEAD' | 'MIDDLE' | 'TAIL' | 'HIDE' | 'KEEP';
export type MaskPatternType = 'WILDCARD' | 'REGEX';

export interface MaskPolicy {
  policyId: number;
  tenantId: number | null;
  category: string;
  pattern: string;
  patternType: MaskPatternType;
  ruleType: MaskRuleType;
  ruleParam: number | null;
  maskChar: string | null;
  priority: number;
  enabled: number;
  description: string | null;
  workUser: number | null;
  workTime: string | null;
}

export interface MaskPolicyCreateRequest {
  tenantId?: number | null;
  category: string;
  pattern: string;
  patternType: MaskPatternType;
  ruleType: MaskRuleType;
  ruleParam?: number | null;
  maskChar?: string;
  priority: number;
  enabled: number;
  description?: string;
}

export interface MaskPolicyUpdateRequest {
  pattern?: string;
  patternType?: MaskPatternType;
  ruleType?: MaskRuleType;
  ruleParam?: number | null;
  maskChar?: string;
  priority?: number;
  enabled?: number;
  description?: string;
}

export interface MaskCategoryConfig {
  configId: number;
  tenantId: number | null;
  category: string;
  label: string;
  defaultHours: number;
  maxHours: number;
  approverAuthKey: string;
  requireReason: number;
  minReasonLength: number;
  enabled: number;
  workUser: number | null;
  workTime: string | null;
}

export interface MaskCategoryConfigCreateRequest {
  tenantId?: number | null;
  category: string;
  label: string;
  defaultHours: number;
  maxHours: number;
  approverAuthKey: string;
  requireReason: number;
  minReasonLength: number;
  enabled: number;
}

export interface MaskCategoryConfigUpdateRequest {
  label?: string;
  defaultHours?: number;
  maxHours?: number;
  approverAuthKey?: string;
  requireReason?: number;
  minReasonLength?: number;
  enabled?: number;
}

export interface MaskTestRequest {
  value: string;
  category: string;
  tenantId?: number | null;
}

export interface MaskTestResponse {
  original: string;
  masked: string;
  matchedPolicyId: number | null;
  matchedPattern: string | null;
  ruleType: string;
}

export const RULE_TYPE_OPTIONS: { value: MaskRuleType; label: string; help: string }[] = [
  { value: 'HEAD', label: '앞 N자리', help: '예: ****-1234' },
  { value: 'MIDDLE', label: '가운데 N자리', help: '예: 010-****-5678' },
  { value: 'TAIL', label: '끝 N자리', help: '예: 02-1234-****' },
  { value: 'HIDE', label: '전체', help: '*******' },
  { value: 'KEEP', label: '마스킹 없음', help: '화이트리스트' },
];

export const PATTERN_TYPE_OPTIONS = [
  { value: 'REGEX', label: '정규식' },
  { value: 'WILDCARD', label: '와일드카드' },
];
