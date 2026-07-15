import type { RedisKeyDefinition, RedisKeyDefinitionsResponse } from '../api/ctiRedisApi';

/**
 * application-redis-key-map.yml(BE `RedisKeyMapper`가 로드) 기반 Redis 키 구조 판별 유틸.
 * `redisKeyPattern.ts`/`redisValue.ts`에 흩어져 있던 IC 키 형태 하드코딩(collapseIcGroupSegment의
 * groupId/AGENT 2종 고정, isSystemNodeCompositeFieldKey의 16자리 정규식 등)을 이 YAML 메타데이터
 * 기반으로 대체하기 위한 공용 레이어 — 새 IC 키가 YAML에 등록되면 코드 수정 없이 자동 인식된다.
 *
 * 모든 함수는 defs가 비어있거나(로딩 중/에러) 매칭 실패 시 null/원본값을 반환한다 — YAML을 못 받아와도
 * 하드코딩 시절과 동등한 폴백 동작을 하도록 하기 위함(조용히 틀리게 자르는 것보다 "모름"으로 처리).
 */

export interface MatchedKeyDefinition {
  /** key-definitions의 키 이름 (예: "IC_GROUP") */
  name: string;
  definition: RedisKeyDefinition;
  /** actual 템플릿의 {var} → 실제 값 */
  vars: Record<string, string>;
  /** 매칭에 실제로 쓰인 키 문자열 — 원본 그대로거나 prefixMap 치환 후. collapse 재구성 시 세그먼트 대조 기준. */
  matchedKey: string;
}

/** BE RedisKeyMapper.toActual의 prefix-map 치환 단계만 클라이언트에서 재현(멱등 — 매칭 안 되면 원본 그대로) */
function applyPrefixMap(key: string, prefixMap: Record<string, string>): string {
  for (const [base, actual] of Object.entries(prefixMap)) {
    if (key.startsWith(base)) return actual + key.slice(base.length);
  }
  return key;
}

/** template과 realKey를 콜론 세그먼트 위치별로 매칭한다. `{var}` 세그먼트는 어떤 값이든 허용, 그 외는 완전일치. */
function matchSegments(realKey: string, template: string): Record<string, string> | null {
  const realSegs = realKey.split(':');
  const tmplSegs = template.split(':');
  if (realSegs.length !== tmplSegs.length) return null;
  const vars: Record<string, string> = {};
  for (let i = 0; i < tmplSegs.length; i++) {
    const m = /^\{(\w+)\}$/.exec(tmplSegs[i]);
    if (m) vars[m[1]] = realSegs[i];
    else if (tmplSegs[i] !== realSegs[i]) return null;
  }
  return vars;
}

function matchAgainstAll(key: string, keyDefinitions: Record<string, RedisKeyDefinition>): Omit<MatchedKeyDefinition, 'matchedKey'> | null {
  for (const [name, definition] of Object.entries(keyDefinitions)) {
    const vars = matchSegments(key, definition.actual);
    if (vars) return { name, definition, vars };
  }
  return null;
}

/**
 * realKey가 어느 key-definitions 항목과 매치되는지 찾는다. 원본 키로 먼저 시도하고(대다수 케이스 — 실제
 * Redis 스캔 키가 이미 actual 형태 그대로인 경우), 실패하면 prefixMap으로 치환한 키로 재시도한다(등록
 * 화면 등에서 BASE 표기(예: "IC:AGENT:")를 쓰는 경우, 실제 actual 접두사(예: "IC:AGENT2:")가 다르더라도
 * 흡수). 어느 쪽으로도 매칭 안 되면 null.
 */
export function matchKeyDefinition(realKey: string, defs: RedisKeyDefinitionsResponse): MatchedKeyDefinition | null {
  const direct = matchAgainstAll(realKey, defs.keyDefinitions);
  if (direct) return { ...direct, matchedKey: realKey };
  const translated = applyPrefixMap(realKey, defs.prefixMap);
  if (translated !== realKey) {
    const viaTranslation = matchAgainstAll(translated, defs.keyDefinitions);
    if (viaTranslation) return { ...viaTranslation, matchedKey: translated };
  }
  return null;
}

/** RedisKeyMapper.parseField(BE)의 1:1 JS 포트 — 고정 길이 기반 복합 field key 분해 */
export function splitCompositeField(definitionName: string, fieldKey: string, defs: RedisKeyDefinitionsResponse): Record<string, string> {
  const def = defs.keyDefinitions[definitionName];
  if (!def || def.fieldParts.length === 0) return { id: fieldKey };
  const { fieldParts: parts, fieldLengths: lengths } = def;
  if (parts.length === 1) return { [parts[0]]: fieldKey };

  const result: Record<string, string> = {};
  let pos = 0;
  for (let i = 0; i < parts.length; i++) {
    if (pos >= fieldKey.length) {
      result[parts[i]] = '';
      continue;
    }
    const hasFixedLen = i < lengths.length && lengths[i] > 0;
    if (hasFixedLen && i < parts.length - 1) {
      const end = Math.min(pos + lengths[i], fieldKey.length);
      result[parts[i]] = fieldKey.slice(pos, end);
      pos = end;
    } else {
      result[parts[i]] = fieldKey.slice(pos);
      break;
    }
  }
  return result;
}

/** definition의 {var} 토큰 이름 목록을 순서대로 전부 반환(mediaType 포함, 2개 이상도 가능).
 * yml `actual` 템플릿에 선언된 변수는 mediaType이든 엔티티 변수든 구분 없이 전부 토큰으로 남긴다
 * (2026-07-10, 사용자 확정 — IC:CTIQ:0/10처럼 변수가 mediatype 하나뿐인 패턴도 IC>CTIQ>{mediatype}
 * 하나로 합쳐지고, 드래그 시 실제 존재하는 미디어타입 전체를 합산하는 위젯이 된다). */
function templateVarNames(definition: RedisKeyDefinition): string[] {
  return [...definition.actual.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
}

export interface IcCollapseResult {
  collapsedKey: string;
  /** 엔티티 변수가 여러 개(예: groupId+skillId)여도 전부 담는다. 항상 1개 이상 — varNames.length===0이면 애초에 null 반환. */
  vars: { varName: string; varValue: string }[];
  /** vars[0]과 동일 — 단일 변수 시절 호출부(varName 하나만 쓰던 곳) 하위호환용 단축 필드. */
  varName: string;
  varValue: string;
  definitionName: string;
}

/**
 * IC 계열 Redis 키에서 "엔티티 하나당(또는 미디어타입당) 키가 따로 있는" 가변 세그먼트를 트리에서 숨긴다 —
 * YAML의 IC_* 정의에 선언된 모든 {var} 토큰(mediaType 포함)에 대해 일반적으로 동작한다(예전엔 IC:AGENT/
 * IC:GROUP:REASON 2개만 하드코딩돼 있었음 → YAML 등록 기반 자동 인식으로 확장 → 변수가 2개 이상이어도
 * 전부 각각 접는다). 변수가 0개(축약 대상 아님)면 null — 원본 키 그대로 노출(안전한 폴백).
 */
export function collapseIcVariableSegment(key: string, defs: RedisKeyDefinitionsResponse): IcCollapseResult | null {
  if (!key.startsWith('IC:')) return null;
  const matched = matchKeyDefinition(key, defs);
  if (!matched) return null;
  const varNames = templateVarNames(matched.definition);
  if (varNames.length === 0) return null;
  const varTokens = new Set(varNames.map((n) => `{${n}}`));
  const tmplSegs = matched.definition.actual.split(':');
  const keySegs = matched.matchedKey.split(':');
  const collapsedSegs = keySegs.filter((_, i) => !varTokens.has(tmplSegs[i]));
  const vars = varNames.map((varName) => ({ varName, varValue: matched.vars[varName] }));
  return { collapsedKey: collapsedSegs.join(':'), vars, varName: vars[0].varName, varValue: vars[0].varValue, definitionName: matched.name };
}

/**
 * IC 계열 실제 Redis 키(진짜 groupId/mediaType 등이 박힌 값)에서, 템플릿 변수 세그먼트를 실값 대신
 * `{varName}` 리터럴 토큰으로 치환한 "마스킹된" 키를 만든다. 변수가 여러 개면 각각 자신의 이름으로 개별
 * 마스킹한다(예: "IC:X:{groupId}:{mediatype}"). task-create에서 위젯을 드래그로 만들 때 진짜 그룹ID 등을
 * 화면/저장소에 그대로 노출하지 않기 위함. `collapseIcVariableSegment`가 세그먼트를 "지우는" 것과 달리
 * 이건 "토큰으로 남겨서" 나중에 등록된 플레이스홀더 데이터소스로 다시 치환하거나(엔티티 변수) 실제 존재하는
 * 값 전체를 합산(mediaType 변수, hashSiblingKeys 기반)할 수 있게 한다. 2026-07-10부터 mediaType도 다른
 * 엔티티 변수와 동일하게 마스킹 대상에 포함(사용자 확정) — IC:CTIQ:0/10처럼 mediaType만 변수인 패턴도
 * 하나의 마스킹된 노드로 합쳐지고, 드래그 시 실제 존재하는 미디어타입 전체를 집계하는 위젯이 된다.
 * 템플릿 변수가 있는 IC 정의에만 적용, 아니면 null(호출부가 원래의 실제 키를 그대로 쓰도록 폴백).
 */
export function maskEntitySegment(realKey: string, defs: RedisKeyDefinitionsResponse): string | null {
  if (!realKey.startsWith('IC:')) return null;
  const matched = matchKeyDefinition(realKey, defs);
  if (!matched) return null;
  const varNames = templateVarNames(matched.definition);
  if (varNames.length === 0) return null;
  const varTokens = new Set(varNames.map((n) => `{${n}}`));
  const tmplSegs = matched.definition.actual.split(':');
  const keySegs = matched.matchedKey.split(':');
  const maskedSegs = keySegs.map((seg, i) => (varTokens.has(tmplSegs[i]) ? tmplSegs[i] : seg));
  return maskedSegs.join(':');
}

/**
 * fieldKey가 복합 필드(2개 이상 파트로 나뉘는 필드)인지 판별한다. **오직 YAML 정의가 있고 파트가 2개
 * 이상일 때만** 복합으로 본다 — 선언된 고정길이 합보다 fieldKey가 더 길면 복합.
 *
 * [2026-07-13] 예전엔 정의가 없으면 레거시 `/^\d{16}$/`(16자리 숫자)로 폴백했으나, 그러면 IC가 아닌
 * 임의 Redis 해시라도 필드ID가 우연히 16자리 숫자면 SYSTEM_ID(10)+NODE_ID(6) 복합으로 오인해 행을
 * 잘못 합쳐버렸다(사용자 확정 — 오탐 제거). 이제 복합 처리는 YAML에 등록된 키에만 적용되고, 정의 없는
 * 임의 해시는 항상 "필드 1개 = 행 1개"로 generic하게 동작한다.
 */
export function isCompositeFieldKey(fieldKey: string, definitionName: string | undefined, defs: RedisKeyDefinitionsResponse): boolean {
  const def = definitionName ? defs.keyDefinitions[definitionName] : undefined;
  if (!def || def.fieldParts.length <= 1) return false;
  const fixedLenSum = def.fieldLengths.filter((l) => l > 0).reduce((a, b) => a + b, 0);
  return fieldKey.length > fixedLenSum;
}

/** 복합 필드의 첫 파트(예: SYSTEM_ID/groupId)만 추출 — YAML 정의 있으면 그 기준, 없으면 앞 10자리 레거시 규칙 */
export function extractCompositeLeadPart(fieldKey: string, definitionName: string | undefined, defs: RedisKeyDefinitionsResponse): string {
  if (definitionName) {
    const parts = splitCompositeField(definitionName, fieldKey, defs);
    const first = Object.values(parts)[0];
    if (first !== undefined) return first;
  }
  return fieldKey.slice(0, 10);
}

/**
 * field-parts/field-lengths로 데이터소스관리의 keyTemplate 초안을 만든다(강제 아님, 제안일 뿐). 마지막
 * 파트는 이 데이터소스 자신의 VALUE({value})라고 가정한다(예: IC_GRP_REASON=nodeId+reasonCde에서
 * reasonCde가 이 쿼리의 VALUE인 관행).
 */
export function suggestKeyTemplate(definition: RedisKeyDefinition): string {
  if (definition.fieldParts.length <= 1) return '';
  const leadTokens = definition.fieldParts.slice(0, -1).map((name, i) => (definition.fieldLengths[i] ? `{${name}:${definition.fieldLengths[i]}}` : `{${name}}`));
  return [...leadTokens, '{value}'].join('||');
}

export interface FieldLengthCheck {
  ok: boolean;
  sampleFieldKey: string;
  declaredFixedLenSum: number;
  actualLength: number;
}

/**
 * 실측 field key 하나가 선언된 field-lengths와 최소한의 산술적 정합성이 있는지 검사한다(선언된 고정길이
 * 합이 실제 길이보다 크면 무조건 잘못 선언된 것 — 파트 경계가 정확한지까지는 보장 못 하지만, 명백한
 * 오류는 잡아서 조용히 잘못 잘리는 대신 경고할 수 있게 한다).
 */
export function checkFieldLengthPlausibility(definitionName: string, sampleFieldKey: string, defs: RedisKeyDefinitionsResponse): FieldLengthCheck | null {
  const def = defs.keyDefinitions[definitionName];
  if (!def || def.fieldParts.length <= 1) return null;
  const declaredFixedLenSum = def.fieldLengths.filter((l) => l > 0).reduce((a, b) => a + b, 0);
  return { ok: declaredFixedLenSum <= sampleFieldKey.length, sampleFieldKey, declaredFixedLenSum, actualLength: sampleFieldKey.length };
}
