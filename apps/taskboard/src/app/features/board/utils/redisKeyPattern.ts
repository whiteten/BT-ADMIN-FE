import { fuzzyScore } from '@/shared-util';
import { collapseIcVariableSegment } from './redisKeyDefinitions';
import type { RedisKeyDefinitionsResponse } from '../api/ctiRedisApi';

/**
 * CTI 경로를 거치는 Redis 데이터에만 붙는 고정 미디어타입 값. 0/10/20/40 외 값이 추가될 일은 없다고
 * 확인됨(사용자 합의) — 위치(키의 몇 번째 세그먼트인지)는 데이터마다 다르지만, "있으면 항상 키의
 * 마지막 세그먼트"라는 규칙은 모든 케이스에서 동일하므로 값 기반으로 탐지한다.
 */
export const MEDIA_TYPE_LABELS: Record<string, string> = {
  '0': 'VOIP',
  '10': 'CHAT',
  '20': 'VIDEO',
  '40': 'EMAIL',
};

export interface ParsedRedisKey {
  /** 미디어타입을 뺀 나머지 키. 미디어타입이 없으면 원본 키와 동일 */
  baseKey: string;
  /** 키의 마지막 세그먼트가 알려진 미디어타입 값일 때만 채워짐 — CTI를 거치지 않는 일반 데이터는 없음(undefined) */
  mediaType?: string;
  mediaTypeLabel?: string;
}

/** 미디어타입은 "있으면 항상 키의 마지막 세그먼트"라는 값 기반 규칙으로 위치와 무관하게 탐지한다. */
export function parseTrailingMediaType(key: string): ParsedRedisKey {
  const segments = key.split(':');
  const last = segments[segments.length - 1];
  if (segments.length > 1 && last in MEDIA_TYPE_LABELS) {
    return { baseKey: segments.slice(0, -1).join(':'), mediaType: last, mediaTypeLabel: MEDIA_TYPE_LABELS[last] };
  }
  return { baseKey: key };
}

export type RedisKeyPattern = 'fields' | 'keyed';

/**
 * 같은 카테고리에서 시스템ID 세그먼트만 다른 "형제 키"를 찾는다(예: IC:GROUP:REASON:1번그룹:0 ↔
 * IC:GROUP:REASON:2번그룹:0). hashKey 자신은 결과에서 제외.
 *
 * 판정 기준: 미디어타입을 뗀 나머지 세그먼트 개수가 같고, 정확히 1개 세그먼트만 다른 키.
 */
export function findSiblingKeys(hashKey: string, allKeys: string[]): string[] {
  const { baseKey, mediaType } = parseTrailingMediaType(hashKey);
  const baseSegs = baseKey.split(':');
  return allKeys.filter((k) => {
    if (k === hashKey) return false;
    const parsed = parseTrailingMediaType(k);
    if ((parsed.mediaType ?? '') !== (mediaType ?? '')) return false;
    const kBaseSegs = parsed.baseKey.split(':');
    if (kBaseSegs.length !== baseSegs.length) return false;
    const diffCount = kBaseSegs.filter((seg, i) => seg !== baseSegs[i]).length;
    return diffCount === 1;
  });
}

/**
 * 시스템ID가 해시 "필드"인지(A, fields) 해시 "키 세그먼트"인지(B, keyed) 자동탐지 — 새 SCAN 호출 없이
 * 이미 BE가 캐싱해서 내려준 전체 해시키 목록(allKeys, `useGetRedisHashKeys`)만으로 판단한다.
 *
 * - 형제 키(시스템ID만 다른 같은 패턴의 다른 키)가 있으면 → keyed(B): 시스템ID별로 키가 따로 있는 것
 * - 형제는 없는데 입력한 hashKey 자체가 allKeys에 존재하면 → fields(A): 그 키 하나의 필드들이 시스템ID
 * - 둘 다 아니면(아직 데이터가 없거나 새 키) → unknown
 */
export function detectRedisKeyPattern(hashKey: string, allKeys: string[]): RedisKeyPattern | 'unknown' {
  if (findSiblingKeys(hashKey, allKeys).length > 0) return 'keyed';
  if (allKeys.includes(hashKey)) return 'fields';
  return 'unknown';
}

/** keyed 패턴에서, 형제 키 하나에서 baseKey 대비 다른 세그먼트(=시스템ID 값)만 뽑아낸다. */
export function extractSystemIdSegment(siblingKey: string, hashKey: string): string {
  const { baseKey: targetBase } = parseTrailingMediaType(hashKey);
  const { baseKey: siblingBase } = parseTrailingMediaType(siblingKey);
  const targetSegs = targetBase.split(':');
  const siblingSegs = siblingBase.split(':');
  for (let i = 0; i < siblingSegs.length; i++) {
    if (siblingSegs[i] !== targetSegs[i]) return siblingSegs[i];
  }
  return siblingKey;
}

// ─── Redis 키 트리 — TaskCreate의 "Redis 탐색기"와 DataSourceQueryTab의 키 피커가 공용으로 쓴다 ──

export interface RedisKeyNode {
  label: string;
  fullKey?: string; // 실제 Redis Hash 키 (리프 노드)
  children: RedisKeyNode[];
  leafCount: number;
}

/** 리터럴 세그먼트(마스킹 안 된 실제 문자열)만 폴더로 계속 쪼갠다. 마스킹된 변수 토큰(`{groupid}`,
 * `{mediatype}` 등)이 선두에 나타나는 순간부터는 남은 구간 전체(변수 토큰이 여러 개 이어져 있어도)를
 * 콜론 포함 문자열 그대로 리프 하나로 합친다 — yml `actual` 템플릿이 "고정 접두사 + 변수 꼬리"
 * 형태(예: IC:GROUP:REASON:{groupid}:{mediatype})이므로, 고정 접두사(IC>GROUP>REASON)까지는
 * 폴더, 변수 꼬리는 템플릿 표기 그대로 한 라벨(`{groupid}:{mediatype}`)로 보여야 하기 때문
 * (사용자 확정, 2026-07-10). */
function isVarToken(segment: string): boolean {
  return /^\{\w+\}$/.test(segment);
}

/** 콜론(:)으로 구분된 Redis 키 목록을 세그먼트 기준 트리로 그룹화한다. */
export function groupRedisKeys(keys: string[], prefix: string, depth: number): RedisKeyNode[] {
  const segMap = new Map<string, { isLeaf: boolean; childKeys: string[] }>();
  for (const key of keys) {
    const idx = key.indexOf(':');
    const firstSeg = idx === -1 ? key : key.slice(0, idx);
    if (idx === -1 || isVarToken(firstSeg)) {
      // 콜론이 없거나(원래 리프), 변수 토큰이 시작되는 지점이면 — 남은 구간 전체를 리프 하나로 합친다
      const e = segMap.get(key) ?? { isLeaf: false, childKeys: [] };
      e.isLeaf = true;
      segMap.set(key, e);
    } else {
      const seg = firstSeg;
      const rest = key.slice(idx + 1);
      const e = segMap.get(seg) ?? { isLeaf: false, childKeys: [] };
      e.childKeys.push(rest);
      segMap.set(seg, e);
    }
  }

  return Array.from(segMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([seg, { isLeaf, childKeys }]) => {
      const fullKey = prefix ? `${prefix}:${seg}` : seg;
      const children = childKeys.length > 0 ? groupRedisKeys(childKeys, fullKey, depth + 1) : [];
      return {
        label: seg,
        fullKey: isLeaf || children.length === 0 ? fullKey : undefined,
        children,
        leafCount: (isLeaf ? 1 : 0) + children.reduce((s, c) => s + c.leafCount, 0),
      };
    });
}

/**
 * Redis 해시키 트리를 검색어로 필터링 — 키 경로(fullKey)뿐 아니라, fieldIndex(미리 색인해 둔 해시키별
 * 필드명 목록)가 있으면 필드명(예: SUM_CONN_CNT)으로도 매치한다. 리프가 매치하면 그 조상 노드들은
 * children을 매치된 것만으로 추려서 그대로 남긴다(검색 결과로 가는 경로를 보여주기 위해).
 */
export function filterRedisTree(nodes: RedisKeyNode[], query: string, fieldIndex: Record<string, string[]> | null): RedisKeyNode[] {
  const q = query.trim();
  if (!q) return nodes;

  const leafMatches = (node: RedisKeyNode): boolean => {
    if (!node.fullKey) return false;
    if (fuzzyScore(q, node.fullKey) >= 0) return true;
    const fields = fieldIndex?.[node.fullKey];
    return fields?.some((f) => fuzzyScore(q, f) >= 0) ?? false;
  };

  const walk = (node: RedisKeyNode): RedisKeyNode | null => {
    if (node.children.length === 0) {
      return leafMatches(node) ? node : null;
    }
    const filteredChildren = node.children.map(walk).filter((n): n is RedisKeyNode => n !== null);
    if (filteredChildren.length === 0) return null;
    return { ...node, children: filteredChildren, leafCount: filteredChildren.reduce((s, c) => s + c.leafCount, 0) };
  };

  return nodes.map(walk).filter((n): n is RedisKeyNode => n !== null);
}

/**
 * IC 계열 Redis 키의 가변 엔티티ID 세그먼트(groupId/skillId 등)를 트리에서 숨기고 미디어타입 레벨까지만
 * 표시한다. `application-redis-key-map.yml`(BE `RedisKeyMapper`) 기반 `collapseIcVariableSegment`에
 * 위임 — 예전엔 IC:AGENT/IC:GROUP:REASON 2개 패턴만 하드코딩돼 있었으나, 이제 YAML에 등록된 모든 IC_*
 * 정의(엔티티 변수가 정확히 1개인 것)에 대해 자동으로 동작한다(IC:SKILL:REASON도 처음으로 접힘).
 * IC 섹션에만 적용 — 다른 데이터(BT, FC 등)나 YAML에 없는 키는 null 반환으로 원본 키 그대로 사용.
 */
export function collapseIcGroupSegment(key: string, defs: RedisKeyDefinitionsResponse): string | null {
  return collapseIcVariableSegment(key, defs)?.collapsedKey ?? null;
}

/**
 * collapseIcGroupSegment가 접는 바로 그 엔티티ID 세그먼트를 반대로 추출한다(같은 판정 로직 재사용).
 * 데이터소스관리에 등록된 엔티티ID 리스트와 대조해 트리의 대표 미리보기/siblings 순서를 정확하게 맞출 때 사용.
 */
export function extractIcGroupIdSegment(key: string, defs: RedisKeyDefinitionsResponse): string | undefined {
  return collapseIcVariableSegment(key, defs)?.varValue;
}
