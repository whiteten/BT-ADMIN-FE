import type { CtiWsDataByHashKey, CtiWsSubscription } from '../hooks/useCtiqWebSocket';
import type { CalcOperand, CallDataItem, DbQueryDef, DroppedWidget, TaskboardDisplaySelection } from '../types/taskboard.types';

/** getRedisDisplayValue가 필요로 하는 최소 형태 — DroppedWidget 또는 계산식 operand의 source를 함께 받기 위함 */
type RedisValueHost = Pick<DroppedWidget, 'item' | 'aggregation'>;

/**
 * Redis 해시 entries(field → JSON, REST의 raw 문자열 또는 WS의 이미 파싱된 객체 둘 다 받음)를
 * byKey 필드값으로 묶어 aggKey 필드를 합산한다. Redis 테이블의 "그룹별 합계"와 단일값 위젯의
 * "그룹별 합계" 양쪽에서 공용.
 */
export function groupSumRedisHashEntries(entries: Record<string, string | Record<string, unknown>>, byKey: string, aggKey: string): Map<string, number> {
  const sums = new Map<string, number>();
  Object.values(entries).forEach((raw) => {
    let parsed: Record<string, unknown>;
    if (typeof raw === 'string') {
      try {
        parsed = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        return;
      }
    } else {
      parsed = raw;
    }
    const key = String(parsed[byKey] ?? '');
    const num = Number(parsed[aggKey]) || 0;
    sums.set(key, (sums.get(key) ?? 0) + num);
  });
  return sums;
}

/**
 * IC:GROUP:REASON:{groupId}:{mediaType}처럼 "엔티티(그룹/스킬 등) 1개당 키가 따로 있는" 해시 패밀리의 접두사.
 * 위젯의 redisHashKey에 들어있는 {groupId} 세그먼트는 디자인 시점 placeholder일 뿐이고, 실제로
 * 보여줄 그룹은 항상 디스플레이의 선택값(groupIds)으로 결정한다 — 뷰그룹에서 빠진 그룹은 보이지 않아야 한다.
 * IC:SKILL:REASON도 같은 규칙(엔티티 id로 뷰그룹의 같은 선택값으로 스코핑)을 쓰는 같은 패밀리지만, 실제
 * 키 형식은 IC:GROUP:REASON과 달리 끝에 mediaType 세그먼트가 없다(IC:SKILL:REASON:{entityId} 1세그먼트뿐) —
 * hasMediaType으로 패밀리별 형식 차이를 구분한다. 새 REASON 패밀리가 또 생기면 REASON_FAMILIES에 추가하면 됨.
 */
export const GROUP_REASON_HASH_PREFIX = 'IC:GROUP:REASON:';
export const SKILL_REASON_HASH_PREFIX = 'IC:SKILL:REASON:';
// basePrefix: 이 REASON 패밀리가 스코핑할 "엔티티 목록"의 기본 해시 접두사(예: IC:GROUP:REASON: → IC:GROUP:) —
// findEntitySelectionDbQueryIdsByPrefix로 등록된 데이터소스를 찾을 때 이 값으로 조회한다. 그룹이 아닌 다른
// 엔티티(스킬 등) REASON 패밀리를 추가할 때도 이 basePrefix만 맞춰주면 나머지는 자동으로 동작한다.
const REASON_FAMILIES: { prefix: string; hasMediaType: boolean; basePrefix: string }[] = [
  { prefix: GROUP_REASON_HASH_PREFIX, hasMediaType: true, basePrefix: 'IC:GROUP:' },
  { prefix: SKILL_REASON_HASH_PREFIX, hasMediaType: false, basePrefix: 'IC:SKILL:' },
];

/** hashKey가 REASON 패밀리(그룹/스킬)인지 판별하고, 맞으면 어느 접두사인지 + 끝 세그먼트(mediaType, 없는
 * 패밀리면 빈 문자열) + 대응하는 엔티티 목록의 기본 해시 접두사(basePrefix)를 추출한다.
 * - hasMediaType 패밀리(예: IC:GROUP:REASON): 세그먼트 1개={prefix}{mediaType}(와일드카드, 엔티티 전체 대상),
 *   세그먼트 2개={prefix}{entityId}:{mediaType}(구체 엔티티)
 * - !hasMediaType 패밀리(예: IC:SKILL:REASON): 세그먼트 1개={prefix}{entityId}만 유효(항상 구체 엔티티, mediaType 없음)
 * (중간 entityId 세그먼트는 무시 — 실제 엔티티는 buildGroupReasonHashKeys가 별도로 채운다). */
export function parseGroupReasonHashKey(hashKey: string): { prefix: string; mediaType: string; basePrefix: string } | null {
  const family = REASON_FAMILIES.find((f) => hashKey.startsWith(f.prefix));
  if (!family) return null;
  const rest = hashKey.slice(family.prefix.length).split(':');
  if (!family.hasMediaType) return rest.length === 1 ? { prefix: family.prefix, mediaType: '', basePrefix: family.basePrefix } : null;
  if (rest.length === 1) return { prefix: family.prefix, mediaType: rest[0], basePrefix: family.basePrefix };
  if (rest.length === 2) return { prefix: family.prefix, mediaType: rest[1], basePrefix: family.basePrefix };
  return null;
}

/** allKeys 중 {prefix}{entityId}:{mediaType} 형태(mediaType 없는 패밀리는 {prefix}{entityId})이고 실제
 * 엔티티 키를 모두 반환한다. resolveCategoryKeys에서 와일드카드 입력에 대해 실제 키를 찾을 때 사용. */
export function findGroupReasonKeys(prefix: string, mediaType: string, allKeys: string[]): string[] {
  const hasMediaType = REASON_FAMILIES.find((f) => f.prefix === prefix)?.hasMediaType ?? true;
  return allKeys.filter((k) => {
    if (!k.startsWith(prefix)) return false;
    const rest = k.slice(prefix.length).split(':');
    return hasMediaType ? rest.length === 2 && rest[1] === mediaType : rest.length === 1;
  });
}

/** {prefix}{entityId}:{mediaType}(또는 mediaType 없는 패밀리는 {prefix}{entityId}) 키에서 entityId
 * 세그먼트만 추출한다(접두사는 REASON_FAMILIES에서 자동 판별). PIVOT 렌더링에서 행 식별자(그룹ID/스킬ID)를
 * 해시 키로부터 가져올 때 사용. */
export function extractGroupIdFromGroupReasonKey(key: string): string {
  const family = REASON_FAMILIES.find((f) => key.startsWith(f.prefix));
  if (!family) return key;
  const rest = key.slice(family.prefix.length).split(':');
  if (!family.hasMediaType) return rest.length === 1 ? rest[0] : key;
  return rest.length === 2 ? rest[0] : key;
}

/** targetGroupIds(디스플레이가 선택한 그룹들 — 없으면 호출 측이 전체 그룹으로 넘김) 각각에 대한
 * 실제 {prefix}{entityId}:{mediaType}(mediaType 없는 패밀리는 {prefix}{entityId}) 키 목록을 만든다. */
export function buildGroupReasonHashKeys(prefix: string, mediaType: string, targetGroupIds: string[]): string[] {
  const hasMediaType = REASON_FAMILIES.find((f) => f.prefix === prefix)?.hasMediaType ?? true;
  return targetGroupIds.map((groupId) => (hasMediaType ? `${prefix}${groupId}:${mediaType}` : `${prefix}${groupId}`));
}

/**
 * hashKey 목록(주로 좌측 트리에서 드래그해 캔버스에 놓은 "값" 위젯의 `hashSiblingKeys` — 디자인 시점에
 * 존재하던 모든 엔티티의 REASON 키가 통째로 캐싱돼 있음) 중 REASON 패밀리(그룹/스킬 등)인 것만, 그 키의
 * basePrefix에 대응하는 엔티티 목록으로 필터링한다. 이걸 안 거치면 뷰그룹에서 엔티티를 몇 개만 선택해도
 * 위젯이 디자인 시점에 캐싱된 엔티티 전체를 그대로 구독/집계해버린다(예: 그룹 2개만 선택했는데 전체
 * 30개+ 그룹의 REASON 해시가 다 구독됨). targetIdsByPrefix에 그 basePrefix가 없거나 비어있으면(선택
 * 없음=전체) 그대로 다 통과시키고, REASON 패밀리가 아닌 키(hashSiblingKeys가 그 외 일반 해시인 경우)는
 * 이 필터 대상이 아니라서 그대로 통과시킨다. targetIdsByPrefix는 buildReasonFamilyTargetIdsByPrefix로 만든다 —
 * 그룹/스킬을 구분 없이 단일 목록으로 넘기면 스킬 REASON 위젯이 그룹의 선택값으로 잘못 필터링된다.
 */
export function filterGroupReasonKeysByTarget(hashKeys: string[], targetIdsByPrefix: Record<string, string[]>): string[] {
  return hashKeys.filter((k) => {
    const groupReason = parseGroupReasonHashKey(k);
    if (!groupReason) return true;
    const targetIds = targetIdsByPrefix[groupReason.basePrefix] ?? [];
    if (targetIds.length === 0) return true;
    return targetIds.includes(extractGroupIdFromGroupReasonKey(k));
  });
}

/** 여러 hashKey(예: 디스플레이가 선택한 여러 그룹의 IC:GROUP:REASON 해시)의 entries를 모두 byKey로 묶어
 * aggKey를 합산한다 — groupSumRedisHashEntries를 hashKey별로 적용한 뒤 합친 버전. */
export function groupSumAcrossHashKeys(
  entriesByHashKey: Record<string, Record<string, string | Record<string, unknown>>>,
  hashKeys: string[],
  byKey: string,
  aggKey: string,
): Map<string, number> {
  const total = new Map<string, number>();
  hashKeys.forEach((hk) => {
    groupSumRedisHashEntries(entriesByHashKey[hk] ?? {}, byKey, aggKey).forEach((v, k) => total.set(k, (total.get(k) ?? 0) + v));
  });
  return total;
}

/**
 * IC:GROUP:{mediaType}처럼 SYSTEM_ID(10자리)+NODE_ID(6자리)를 이어붙인 16자리 숫자 필드를 Hash field로
 * 쓰는 해시(DS_GROUP/DS_SKILL/DS_BSR_GROUP 등)인지 판별. 이런 해시를 table-redis로 통째로 펼치면 같은
 * SYSTEM_ID가 노드 수만큼 행이 중복돼 보인다 — 노드별로 따로 표기할 필요가 없으므로 SYSTEM_ID로 묶어
 * 1행으로 합쳐야 한다(숫자 컬럼은 노드 합계, 그 외는 첫 값).
 */
export function isSystemNodeCompositeFieldKey(fieldKey: string): boolean {
  return /^\d{16}$/.test(fieldKey);
}

/** SYSTEM_ID(앞 10자리)만 추출 — composite 필드 키를 그룹화할 때 사용. */
export function extractSystemIdFromCompositeFieldKey(fieldKey: string): string {
  return fieldKey.slice(0, 10);
}

/**
 * 같은 SYSTEM_ID로 묶인 여러 노드의 entry(JSON Record)들을 1개로 합친다 — 숫자 필드는 노드 합계,
 * 그 외(문자열 등, 어차피 노드 간 동일한 GROUP_NAME 같은 값)는 첫 번째 값을 그대로 사용한다.
 */
export function mergeCompositeNodeEntries(entriesForSystemId: Record<string, unknown>[]): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...entriesForSystemId[0] };
  const allKeys = new Set(entriesForSystemId.flatMap((e) => Object.keys(e)));
  allKeys.forEach((key) => {
    const numericValues = entriesForSystemId.map((e) => Number(e[key]));
    if (numericValues.every((n) => !Number.isNaN(n))) {
      merged[key] = numericValues.reduce((sum, n) => sum + n, 0);
    }
  });
  return merged;
}

/** WS로 받은 hashKey/id(field)의 값(객체 또는 원본 문자열)에서 redisJsonField 컬럼값을 꺼낸다 */
function readJsonField(value: unknown, redisJsonField: string | undefined): unknown {
  if (value == null) return undefined;
  if (typeof value === 'string') {
    if (!redisJsonField) return value;
    try {
      return (JSON.parse(value) as Record<string, unknown>)[redisJsonField];
    } catch {
      return undefined;
    }
  }
  if (typeof value === 'object') {
    return redisJsonField ? (value as Record<string, unknown>)[redisJsonField] : value;
  }
  return value;
}

function toNumericField(hashData: Record<string, unknown> | undefined, redisField: string | undefined, redisJsonField: string | undefined): number {
  if (!hashData || !redisField) return 0;
  const val = readJsonField(hashData[redisField], redisJsonField);
  return typeof val === 'number' ? val : Number(val) || 0;
}

/**
 * 마스터 리스트(큐/그룹/상담사)를 갖는 "미디어타입 해시" 접두사들 — 이 접두사로 시작하는 hashKey는
 * 디자인 시점에 고정된 id(field) 1개가 아니라, 디스플레이 선택값으로 결정된 id 목록을 합산해서 보여준다.
 * 마스터 리스트가 없는 그 외 hashKey(다른 솔루션이 적재하는 임의의 키 등)는 여기 해당하지 않아
 * 기존처럼 드래그 시점에 고정된 단일 id를 그대로 쓴다.
 */
const GROUP_HASH_PREFIX = 'IC:GROUP:';
const QUEUE_HASH_PREFIX = 'IC:CTIQ:';
const AGENT_HASH_PREFIX = 'IC:AGENT:';

/** buildSelectionIdsByHashKey가 마스터 리스트/선택값을 조회하기 위해 필요로 하는 컨텍스트. */
export interface SelectionListContext {
  queueRows: Array<{ ctiqId: string }>;
  selectedQueueIds: string[];
  groupRows: Array<{ groupId: string; compositeKeys?: string[] }>;
  selectedGroupIds: string[];
  agentRows: Array<{ agentId: string; groupId: string }>;
  selectedAgentIds: string[];
}

/**
 * GROUP/CTIQ/AGENT(미디어타입 해시) 위젯이 보여줄 id(field) 목록을 디스플레이 선택값으로 계산한다.
 * 뷰그룹에 그 카테고리 선택값이 없으면(큐/상담그룹 선택 UI가 더는 없어 사실상 항상 없거나, 관리자가 그
 * 카테고리를 아예 안 씀) 이 hashKey는 빈 배열로 채워진다 — getRedisDisplayValue가 "선택값 있음, 개수 0"을
 * 보고 0을 보여준다(뷰그룹에 매핑 안 된 카테고리는 위젯이 자기 마음대로 예전 값을 보여주지 않게).
 * 선택값이 있으면 그 id들의 값을 합산해서 보여준다.
 */
export function buildSelectionIdsByHashKey(widgets: DroppedWidget[], ctx: SelectionListContext): Record<string, string[]> {
  const hashKeysInUse = new Set<string>();
  const collect = (item: CallDataItem) => {
    if (item.category === 'Redis' && item.redisHashKey) hashKeysInUse.add(item.redisHashKey);
  };
  widgets.forEach((w) => {
    collect(w.item);
    w.calc?.operands?.forEach((op) => {
      if (op.source) collect(op.source);
    });
  });

  const result: Record<string, string[]> = {};
  hashKeysInUse.forEach((hashKey) => {
    // 단순 "IC:GROUP:" / "IC:CTIQ:" 접두사 일치만 보면 IC:GROUP:REASON:*, IC:CTIQ:TSPEC:/WAIT:/IN_TOT
    // 같은 "그 안에 더 들어간(nested)" 다른 데이터셋까지 일반 그룹/큐 테이블로 오인해서 전체 마스터
    // id 목록을 잘못 끼워 넣게 된다(접두사 뒤에 ':'가 더 있으면 같은 패밀리의 다른 데이터셋).
    // 그래서 접두사 뒤에 남는 부분이 "딱 미디어타입 1개"인 경우에만 매칭한다.
    const groupRest = hashKey.startsWith(GROUP_HASH_PREFIX) ? hashKey.slice(GROUP_HASH_PREFIX.length) : null;
    const queueRest = hashKey.startsWith(QUEUE_HASH_PREFIX) ? hashKey.slice(QUEUE_HASH_PREFIX.length) : null;
    if (groupRest !== null && !groupRest.includes(':')) {
      result[hashKey] = [...new Set(ctx.groupRows.filter((g) => ctx.selectedGroupIds.includes(g.groupId)).flatMap((g) => g.compositeKeys ?? []))];
    } else if (queueRest !== null && !queueRest.includes(':')) {
      result[hashKey] = ctx.selectedQueueIds;
    } else if (hashKey.startsWith(AGENT_HASH_PREFIX)) {
      // IC:AGENT:{groupId}:{mediaType} — 접두사 뒤에 정확히 "groupId:mediaType" 2조각일 때만 매칭.
      const agentRest = hashKey.slice(AGENT_HASH_PREFIX.length).split(':');
      if (agentRest.length !== 2) return;
      const agentsInGroup = ctx.agentRows.filter((a) => a.groupId === agentRest[0]);
      result[hashKey] = ctx.selectedAgentIds.length > 0 ? agentsInGroup.filter((a) => ctx.selectedAgentIds.includes(a.agentId)).map((a) => a.agentId) : [];
    }
  });
  return result;
}

/**
 * Redis 위젯의 표시값을 계산한다.
 * - hashKey가 GROUP/CTIQ/AGENT 미디어타입 해시이고 selectionIdsByHashKey에 항목이 있으면, 디자인 시점에 고정된 id
 *   대신 디스플레이 선택값으로 결정된 id들의 값을 합산해서 보여준다(1개면 그 값, 여러 개면 합산).
 * - 그 외에는 aggregation이 none/미설정이면 단일 hashKey의 필드값을 그대로, aggregation이 설정되면
 *   hashSiblingKeys(없으면 자기 자신의 hashKey 1개)의 값을 모아 집계한다. hashSiblingKeys가 REASON 패밀리
 *   (그룹/스킬처럼 엔티티마다 키가 따로 있는 경우)면 targetIdsByPrefix로 뷰그룹이 선택한 엔티티만 필터링한다
 *   (그 REASON 키의 basePrefix에 대응하는 항목으로) — 안 그러면 디자인 시점에 캐싱된 전체 엔티티를 그대로 집계해버린다.
 */
export function getRedisDisplayValue(
  widget: RedisValueHost,
  redisData?: CtiWsDataByHashKey,
  selectionIdsByHashKey?: Record<string, string[]>,
  targetIdsByPrefix: Record<string, string[]> = {},
): string {
  const { redisHashKey, redisField, redisJsonField, hashSiblingKeys } = widget.item;
  if (!redisHashKey || !redisData) return String(widget.item.sampleValue);

  const selectedIds = selectionIdsByHashKey?.[redisHashKey];
  if (selectedIds) {
    if (selectedIds.length === 0) return '0';
    const nums = selectedIds.map((id) => toNumericField(redisData[redisHashKey], id, redisJsonField));
    return String(nums.reduce((a, b) => a + b, 0));
  }

  if (!redisField) return String(widget.item.sampleValue);
  const { aggregation } = widget;
  if (aggregation && aggregation !== 'none') {
    // 해시 그룹(큐별로 분리된 여러 hashKey)의 동일 필드를 모아 집계. 그룹이 없으면 자기 자신만으로 집계한다.
    const keys = filterGroupReasonKeysByTarget(hashSiblingKeys && hashSiblingKeys.length > 0 ? hashSiblingKeys : [redisHashKey], targetIdsByPrefix);
    const nums = keys.map((siblingKey) => toNumericField(redisData[siblingKey], redisField, redisJsonField));
    if (nums.length === 0) return '0';
    if (aggregation === 'sum') return String(nums.reduce((a, b) => a + b, 0));
    if (aggregation === 'max') return String(Math.max(...nums));
    if (aggregation === 'min') return String(Math.min(...nums));
    const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
    return String(Math.round(avg * 100) / 100);
  }

  const val = readJsonField(redisData[redisHashKey]?.[redisField], redisJsonField);
  return val != null ? String(val) : String(widget.item.sampleValue);
}

/**
 * 계산식 위젯의 피연산자로 사용할 위젯의 현재 숫자값을 반환한다.
 * Redis 위젯은 집계 결과를, 그 외 위젯은 sampleValue를 숫자로 변환한다.
 * 숫자로 변환할 수 없으면 NaN을 반환한다.
 */
export function getWidgetNumericValue(
  widget: DroppedWidget,
  redisData?: CtiWsDataByHashKey,
  selectionIdsByHashKey?: Record<string, string[]>,
  targetIdsByPrefix: Record<string, string[]> = {},
): number {
  const isRedis = widget.item.category === 'Redis' && !!widget.item.redisHashKey;
  const raw = isRedis ? getRedisDisplayValue(widget, redisData, selectionIdsByHashKey, targetIdsByPrefix) : widget.item.sampleValue;
  return Number(raw);
}

/**
 * 계산식 위젯의 피연산자(operand) 하나의 현재 숫자값을 반환한다.
 * - source(Redis 해시 필드 직접 참조)가 있으면 캔버스 배치 여부와 무관하게 그 값을 사용
 * - widgetId(캔버스 위젯 참조)만 있으면 해당 위젯의 값을 사용
 * 바인딩이 없거나 참조 대상을 찾지 못하면 NaN을 반환한다.
 */
export function getOperandNumericValue(
  operand: CalcOperand,
  widgets: DroppedWidget[],
  redisData?: CtiWsDataByHashKey,
  selectionIdsByHashKey?: Record<string, string[]>,
  targetIdsByPrefix: Record<string, string[]> = {},
): number {
  if (operand.source) {
    const isRedis = operand.source.category === 'Redis' && !!operand.source.redisHashKey;
    const raw = isRedis
      ? getRedisDisplayValue({ item: operand.source, aggregation: operand.aggregation }, redisData, selectionIdsByHashKey, targetIdsByPrefix)
      : operand.source.sampleValue;
    return Number(raw);
  }
  const target = widgets.find((w) => w.id === operand.widgetId);
  if (!target) return NaN;
  return getWidgetNumericValue(target, redisData, selectionIdsByHashKey, targetIdsByPrefix);
}

/**
 * 전광판에서 WS로 구독해야 할 단일값 Redis 위젯들의 hashKey/id(field)/column 목록을 모은다.
 * 캔버스에 배치된 Redis 위젯뿐 아니라, 계산식 위젯의 operand가 직접 참조하는(캔버스에 배치되지 않은) Redis 해시 필드도 포함한다.
 * 해시 그룹(hashSiblingKeys)이 있으면 대표 키 대신 그룹 내 모든 hashKey에 동일 id를 매핑한다 — 단, REASON
 * 패밀리(그룹/스킬처럼 엔티티마다 키가 따로 있는 경우)면 targetIdsByPrefix로 뷰그룹이 선택한 엔티티만 필터링한다
 * (안 그러면 디자인 시점에 캐싱된 엔티티 전체를 그대로 구독해버린다 — 그룹 2개만 선택해도 전체 30개+ 그룹이
 * 구독되는 버그였음). GROUP/CTIQ/AGENT 미디어타입 해시이고 selectionIdsByHashKey에 항목이 있으면 디자인 시점
 * redisField 대신 그 id들을 구독한다. hashKey당 실제 필요한 id(field)만 구독해 "해시그룹 전체"를 받아오지 않도록 한다.
 */
export function collectRedisWsSubscriptions(
  widgets: DroppedWidget[],
  selectionIdsByHashKey?: Record<string, string[]>,
  targetIdsByPrefix: Record<string, string[]> = {},
): CtiWsSubscription[] {
  const byHashKey = new Map<string, { ids: Set<string>; columns: Set<string> }>();
  const addItem = (item: CallDataItem) => {
    if (item.category !== 'Redis' || !item.redisHashKey || !item.redisField) return;
    const hashKeys = filterGroupReasonKeysByTarget(item.hashSiblingKeys?.length ? item.hashSiblingKeys : [item.redisHashKey], targetIdsByPrefix);
    hashKeys.forEach((hashKey) => {
      if (!byHashKey.has(hashKey)) byHashKey.set(hashKey, { ids: new Set(), columns: new Set() });
      const entry = byHashKey.get(hashKey)!;
      const selectedIds = selectionIdsByHashKey?.[hashKey];
      if (selectedIds) {
        selectedIds.forEach((id) => entry.ids.add(id));
      } else {
        entry.ids.add(item.redisField!);
      }
      if (item.redisJsonField) entry.columns.add(item.redisJsonField);
    });
  };
  for (const widget of widgets) {
    addItem(widget.item);
    for (const operand of widget.calc?.operands ?? []) {
      if (operand.source) addItem(operand.source);
    }
  }
  return [...byHashKey.entries()]
    .filter(([, { ids }]) => ids.size > 0)
    .map(([hashKey, { ids, columns }]) => ({
      hashKey,
      ids: [...ids],
      columns: columns.size > 0 ? [...columns] : undefined,
    }));
}

/**
 * DbQuery 위젯(category='DbQuery')들이 구독해야 하는 WS 구독 목록을 수집한다.
 * 가상 hashKey "DB:QUERY" 하나로 모든 dbQueryKey를 묶어 BE로 보낸다.
 */
export function collectDbQueryWsSubscriptions(widgets: DroppedWidget[]): CtiWsSubscription[] {
  const keys = [...new Set(widgets.filter((w) => w.item.category === 'DbQuery' && !!w.item.dbQueryKey).map((w) => w.item.dbQueryKey!))];
  if (keys.length === 0) return [];
  return [{ hashKey: 'DB:QUERY', ids: keys }];
}

/**
 * 같은 hashKey를 가리키는 여러 WS 구독 요청을 하나로 합친다(ids/columns 합집합).
 * 하나라도 columns 미지정(전체 컬럼 필요)이면 합쳐진 구독도 컬럼 필터 없이 전체를 요청한다.
 * CtiqWebSocketHandler는 같은 hashKey의 두 번째 구독으로 응답을 덮어쓰므로, 보내기 전에 반드시 합쳐야 한다.
 */
export function mergeWsSubscriptions(subscriptions: CtiWsSubscription[]): CtiWsSubscription[] {
  const byHashKey = new Map<string, { ids: Set<string>; columns: Set<string> | null }>();
  subscriptions.forEach((sub) => {
    if (!byHashKey.has(sub.hashKey)) byHashKey.set(sub.hashKey, { ids: new Set(), columns: new Set() });
    const entry = byHashKey.get(sub.hashKey)!;
    sub.ids.forEach((id) => entry.ids.add(id));
    if (!sub.columns) {
      entry.columns = null;
    } else if (entry.columns) {
      sub.columns.forEach((col) => entry.columns!.add(col));
    }
  });
  return [...byHashKey.entries()].map(([hashKey, { ids, columns }]) => ({
    hashKey,
    ids: [...ids],
    columns: columns ? [...columns] : undefined,
  }));
}

/** 계산식 위젯 팔레트 항목 — 캔버스에 드롭되면 category='Calc'로 표시 */
export const CALC_WIDGET_ITEM: CallDataItem = {
  id: 'calc-formula',
  category: 'Calc',
  label: '계산식',
  sampleValue: 0,
  color: '#8b5cf6',
  displayType: 'value',
  isRealtime: true,
};

/**
 * 수식 문자열을 평가한다 (eval 미사용). 실패하면 에러를 던진다(메시지 포함).
 * 지원 문법: 숫자(소수 포함), 변수명(A-Z 등), + - * / ( ) 단항 마이너스.
 */
function evaluateFormulaOrThrow(formula: string, vars: Record<string, number>): number {
  const tokens = formula.match(/\d+(\.\d+)?|[A-Za-z_][A-Za-z0-9_]*|[()+\-*/]/g);
  if (!tokens || tokens.length === 0) throw new Error('수식이 비어있습니다.');

  let pos = 0;
  const peek = () => tokens[pos];
  const consume = () => tokens[pos++];

  const parseFactor = (): number => {
    const tok = peek();
    if (tok === undefined) throw new Error('수식이 불완전합니다.');
    if (tok === '+') {
      consume();
      return parseFactor();
    }
    if (tok === '-') {
      consume();
      return -parseFactor();
    }
    if (tok === '(') {
      consume();
      const value = parseExpr();
      if (peek() !== ')') throw new Error('괄호가 닫히지 않았습니다.');
      consume();
      return value;
    }
    consume();
    if (/^[A-Za-z_]/.test(tok)) {
      if (!(tok in vars)) throw new Error(`정의되지 않은 변수: ${tok}`);
      return vars[tok];
    }
    const num = Number(tok);
    if (Number.isNaN(num)) throw new Error(`잘못된 토큰: ${tok}`);
    return num;
  };

  const parseTerm = (): number => {
    let value = parseFactor();
    while (peek() === '*' || peek() === '/') {
      const op = consume();
      const rhs = parseFactor();
      value = op === '*' ? value * rhs : value / rhs;
    }
    return value;
  };

  const parseExpr = (): number => {
    let value = parseTerm();
    while (peek() === '+' || peek() === '-') {
      const op = consume();
      const rhs = parseTerm();
      value = op === '+' ? value + rhs : value - rhs;
    }
    return value;
  };

  const result = parseExpr();
  if (pos !== tokens.length) throw new Error(`수식 끝에 불필요한 내용이 있습니다: ${tokens.slice(pos).join(' ')}`);
  if (!Number.isFinite(result)) throw new Error('계산 결과가 유효한 숫자가 아닙니다(0으로 나누기 등).');
  return result;
}

/**
 * 수식 문자열을 안전하게 계산한다 (eval 미사용).
 * 문법 오류·미정의 변수·trailing token이 있으면 null을 반환한다.
 */
export function evaluateFormula(formula: string, vars: Record<string, number>): number | null {
  try {
    return evaluateFormulaOrThrow(formula, vars);
  } catch {
    return null;
  }
}

/**
 * 계산식 위젯 설정 패널의 "검증" 버튼용 — 선언된 변수들에 샘플값 1을 대입해 수식 문법을 확인한다.
 * 변수 바인딩(실제 위젯 연결) 여부와 무관하게 수식 자체의 문법 오류만 검사한다.
 */
export function validateFormula(formula: string, declaredVars: string[]): { ok: true; sampleResult: number } | { ok: false; message: string } {
  if (!formula.trim()) return { ok: false, message: '수식을 입력하세요.' };
  const sampleVars = Object.fromEntries(declaredVars.map((v) => [v, 1]));
  try {
    return { ok: true, sampleResult: evaluateFormulaOrThrow(formula, sampleVars) };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : '수식 검증 중 오류가 발생했습니다.' };
  }
}

/** DataSourceQueryTab/DisplayForm 등에서 쿼리 실행 결과(VALUE/NAME 두 컬럼)를 옵션 목록으로 변환.
 * Oracle은 별칭을 대문자로 돌려주는 경우가 많아 컬럼명을 대소문자 무시로 찾는다. */
export function extractNameValueItems(rows: Record<string, unknown>[]): { id: string; name: string }[] {
  if (!rows || rows.length === 0) return [];
  const keys = Object.keys(rows[0]);
  const valueKey = keys.find((k) => k.toUpperCase() === 'VALUE');
  const nameKey = keys.find((k) => k.toUpperCase() === 'NAME');
  if (!valueKey || !nameKey) return [];
  return rows.map((r) => ({ id: String(r[valueKey] ?? ''), name: String(r[nameKey] ?? '') }));
}

/** "{이름}" 또는 "{이름:자릿수}"(자릿수 지정 시 값을 0으로 왼쪽 채움) 토큰 패턴 — 해시키/필드키 조합식 공용 */
const PLACEHOLDER_TOKEN_PATTERN = /\{(\w+)(?::(\d+))?\}/g;

interface PlaceholderToken {
  /** 원본 토큰 문자열 그대로(예: "{groupId}", "{nodeId:6}") — 치환 시 이 문자열을 찾아 바꾼다 */
  raw: string;
  name: string;
  /** 지정 시 값을 이 자릿수만큼 앞을 0으로 채운다(LPAD) */
  width?: number;
}

/** key 안의 "{이름}"/"{이름:자릿수}" 토큰들을 뽑는다 (같은 토큰 문자열 중복 제거) */
function extractPlaceholderTokens(key: string): PlaceholderToken[] {
  const seen = new Set<string>();
  const tokens: PlaceholderToken[] = [];
  for (const m of key.matchAll(PLACEHOLDER_TOKEN_PATTERN)) {
    if (seen.has(m[0])) continue;
    seen.add(m[0]);
    tokens.push({ raw: m[0], name: m[1], width: m[2] ? Number(m[2]) : undefined });
  }
  return tokens;
}

/** width가 있으면 0으로 왼쪽 채움(LPAD), 없으면 그대로 */
function padPlaceholderValue(value: string, width: number | undefined): string {
  return width ? value.padStart(width, '0') : value;
}

/**
 * 플레이스홀더 이름 키를 대소문자 구분 없이 매칭하기 위한 정규화. 사용자가 데이터소스 관리 탭에
 * 자유 텍스트로 등록하는 이름(예: "groupid")과, 코드가 직접 주입하는 이름(예: "groupId")의 대소문자가
 * 어긋나면 값을 못 찾은 것처럼 조용히 빈 값/전체 폴백으로 새어나가므로(그룹 300개+ 초과 구독 버그의
 * 실제 원인이었음), placeholderValuesByName의 모든 key/조회를 이 함수로 소문자 통일해서 비교한다.
 */
function normalizePlaceholderName(name: string): string {
  return name.toLowerCase();
}

/**
 * key에 "{groupId}" 같은 플레이스홀더가 있으면, placeholderValuesByName에서 그 이름의 실제 값 목록을 찾아
 * 조합(플레이스홀더가 여러 개면 카티션 곱)해서 나올 수 있는 모든 구체 해시키를 만든다.
 * 플레이스홀더가 없으면(일반 키) 원래 key 그대로 1개짜리 배열을 반환한다.
 * 값 목록을 못 찾은 플레이스홀더(해당 이름으로 등록된 데이터소스가 없음)가 있으면 확장 불가 — 빈 배열 반환.
 */
function expandTemplateKey(key: string, placeholderValuesByName: Record<string, string[]>): string[] {
  const tokens = extractPlaceholderTokens(key);
  if (tokens.length === 0) return [key];
  let candidates = [key];
  for (const { raw, name, width } of tokens) {
    const values = placeholderValuesByName[normalizePlaceholderName(name)];
    if (!values || values.length === 0) return [];
    candidates = candidates.flatMap((c) => values.map((v) => c.split(raw).join(padPlaceholderValue(v, width))));
  }
  return candidates;
}

/**
 * 해시 필드(키) 조합식을 실제 필드키 목록으로 펼친다 — 예: "{nodeId:6}||{value}".
 * "||"는 SQL concat처럼 보이라고 쓰는 구분 표기일 뿐 실제 필드키엔 안 들어가므로 먼저 제거한다.
 * "{value}"는 이 데이터소스 자신의 VALUE(ownValueIds의 각 항목)를 가리키는 예약 토큰이고,
 * 그 외 "{이름}" 토큰은 다른 데이터소스의 placeholderName을 참조해 카티션 곱으로 펼친다.
 * ownValueIds가 비어있으면(뷰그룹에 이 데이터소스 선택값 없음) 빈 배열 반환 — 0 표시 정책 유지.
 *
 * 조합식에 "{value}"가 없으면(예: "{groupid}||{nodeid}") ownValueIds의 각 항목은 결과에 전혀 반영되지
 * 않아 매번 똑같은 카티션 곱을 만드는데, 예전엔 그런데도 ownValueIds 개수만큼 루프를 돌려 그 "똑같은
 * 결과"를 그대로 여러 번 이어붙였다 — 뷰그룹에서 그룹을 2개 선택하면 같은 compositeKey가 2개씩 중복
 * 반환되어 합계(sum) aggregation이 정확히 2배로 뻥튀기되는 버그가 있었다(선택 그룹 1개일 땐 1배라 안 드러남).
 * 그래서 "{value}"를 실제로 쓰는 조합식만 ownValueIds별로 따로 계산하고, 안 쓰면 한 번만 계산한다.
 */
function expandKeyFieldTemplate(template: string, ownValueIds: string[], placeholderValuesByName: Record<string, string[]>): string[] {
  const cleaned = template.split('||').join('');
  const tokens = extractPlaceholderTokens(cleaned);
  const usesOwnValue = tokens.some((t) => t.name === 'value');

  const expandOnce = (ownValue: string | null): string[] => {
    let candidates = [cleaned];
    for (const { raw, name, width } of tokens) {
      const values = name === 'value' ? (ownValue !== null ? [ownValue] : []) : placeholderValuesByName[normalizePlaceholderName(name)];
      if (!values || values.length === 0) return [];
      candidates = candidates.flatMap((c) => values.map((v) => c.split(raw).join(padPlaceholderValue(v, width))));
    }
    return candidates;
  };

  if (!usesOwnValue) return ownValueIds.length > 0 ? expandOnce(null) : [];
  return ownValueIds.flatMap((ownValue) => expandOnce(ownValue));
}

/**
 * 데이터소스관리 탭에 등록된 데이터소스 키 매칭 — 태그 같은 별도 식별자 없이, 위젯의 redisHashKey가
 * 어느 데이터소스의 등록 키(DbQueryDef.redisKeys[].key)와 문자열이 정확히 일치하면, 그 위젯은 원래
 * 드래그한 필드 대신 뷰그룹이 선택한 값 목록으로 자동 필터링된다. 이 키를 등록한 데이터소스가 있는데도
 * 현재 뷰그룹에서 값이 선택돼 있지 않으면(카테고리 자체를 안 씀) 빈 배열을 채운다 — getRedisDisplayValue가
 * "선택값 있음, 개수 0"으로 보고 0을 보여준다(뷰그룹에 매핑 안 된 카테고리가 엉뚱한 값을 보여주지 않게).
 * 매칭 안 되는 위젯(어느 데이터소스에도 등록 안 된 키를 쓰는 일반 Redis 위젯)은 이 맵에 안 걸리고
 * 원래 동작(드래그한 필드 그대로) 그대로 유지된다.
 *
 * key에 "{nodeId}"/"{groupId}" 같은 플레이스홀더가 있으면(예: IC:GROUP:{groupId}:0), placeholderName이
 * 그 이름으로 등록된 다른 데이터소스의 VALUE 목록으로 치환해 여러 개의 구체 해시키로 펼친다 — 그 플레이스홀더
 * 데이터소스가 현재 뷰그룹에서 선택된 값이 있으면 그것만, 없으면(예: 노드ID처럼 뷰그룹마다 고를 필요가 없는
 * 경우) 쿼리 실행 결과 전체를 사용한다(placeholderOptionValues로 전달).
 *
 * rk.keyTemplate이 있으면(예: "{nodeId:6}||{value}") 해시 필드(id)도 그대로 쓰지 않고 조합해서 펼친다 —
 * 노드ID+사유코드처럼 해시 필드 자체가 복합값인 경우(IC:GROUP:REASON 등) SQL로 미리 조립할 필요 없이
 * 이미 등록된 다른 플레이스홀더(nodeId)와 이 쿼리 자신의 VALUE({value})를 조합해 자동으로 만든다.
 */
/**
 * 섹션 모드/로테이션처럼 여러 뷰그룹 selection을 한 WS 소켓으로 합쳐 구독해야 할 때, dbQuerySelections를
 * 합집합으로 합친다. `Object.assign({}, ...selections)`으로는 같은 dbQueryId를 서로 다른 값으로 선택한
 * 두 섹션/슬라이드가 있으면 나중 것이 앞의 것을 통째로 덮어써 버려(예: A 섹션 이석사유=[2,6], B 섹션
 * 이석사유=[14] → 병합 결과가 [14]만 남음) 먼저 나온 섹션의 위젯이 구독을 못 받아 0으로 보인다 —
 * 반드시 값 배열끼리 합쳐야 한다.
 */
/** "IC:GROUP:0"처럼 REASON 패밀리가 아닌 그룹 기본 해시(IC:GROUP:{mediaType})만 매칭 — GROUP_REASON_HASH_PREFIX도
 * "IC:GROUP:"로 시작해서 겹치므로 반드시 뒤가 숫자(mediaType)로 바로 끝나는지까지 확인한다. */
const GROUP_BASE_HASH_KEY_PATTERN = /^IC:GROUP:\d+$/;

/**
 * 상담그룹 전용 직접선택 필드 없이, "데이터소스 관리"에 등록된 데이터소스 중 IC:GROUP:{mediaType}
 * 기본 해시(예: "IC:GROUP:0")를 redisKeys로 등록해둔 것을 "이 뷰그룹의 상담그룹 선택 소스"로 삼는다 —
 * 여러 개 등록돼 있으면 첫 번째를 사용. 없으면 undefined(그룹 선택 기능 자체가 없는 뷰그룹).
 */
export function findGroupSelectionDbQueryId(dbQueryDefs: DbQueryDef[]): number | undefined {
  return dbQueryDefs.find((d) => (d.redisKeys ?? []).some((rk) => GROUP_BASE_HASH_KEY_PATTERN.test(rk.key)))?.dbQueryId;
}

/** "IC:{엔티티}:{mediaType}" 형태(REASON 등 하위 패밀리가 아닌 기본 해시)의 등록 키를 아무 접두사에 대해서나
 * 매칭 — GROUP_BASE_HASH_KEY_PATTERN을 그룹 이외의 엔티티(스킬 등)로 일반화한 버전. */
const BASE_ENTITY_HASH_KEY_PATTERN = /^(IC:[A-Za-z0-9_]+:)\d+$/;

/**
 * dbQueryDefs 중 "IC:{엔티티}:{mediaType}" 기본 해시(예: IC:GROUP:0, IC:SKILL:0)를 redisKeys로 등록해둔
 * 데이터소스를 전부 찾아 {엔티티 접두사(예: "IC:GROUP:") → 그 데이터소스의 dbQueryId} 맵으로 반환한다.
 * findGroupSelectionDbQueryId를 그룹 하나만이 아니라 등록된 모든 엔티티로 일반화한 버전 — buildDataSourceKeySelectionIds가
 * 이 맵으로 "그룹은 GROUP리스트의 선택값, 스킬은 스킬리스트의 선택값"처럼 엔티티별로 알맞은 선택값을 찾는다.
 */
function findEntitySelectionDbQueryIdsByPrefix(dbQueryDefs: DbQueryDef[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const d of dbQueryDefs) {
    for (const rk of d.redisKeys ?? []) {
      const m = BASE_ENTITY_HASH_KEY_PATTERN.exec(rk.key);
      if (m && !map.has(m[1])) map.set(m[1], d.dbQueryId);
    }
  }
  return map;
}

/** "IC:GROUP:" → "groupid", "IC:SKILL:" → "skillid"처럼 엔티티 접두사에서 관례적인 플레이스홀더 이름을
 * 도출한다 — 사용자가 실제로 "GROUPID"/"SKILLID" 같은 이름의 플레이스홀더 데이터소스를 등록해 다른 쿼리의
 * 필드 조합식(예: "{groupid}||{nodeid}")에서 참조하는 경우, 그 이름을 안 몰라도 현재 선택값으로 자동
 * override할 수 있게 해준다(등록 키의 대소문자/철자가 다르면 매칭이 깨지던 문제의 근본 해결). */
function deriveEntityIdPlaceholderName(basePrefix: string): string {
  const middle = basePrefix.replace(/^IC:/, '').replace(/:$/, '');
  return `${middle.toLowerCase()}id`;
}

/**
 * REASON 패밀리(그룹/스킬 등)별로 실제 스코핑에 쓸 엔티티 ID 목록을 미리 계산해둔 맵 — key는 그 패밀리의
 * basePrefix(예: "IC:GROUP:", "IC:SKILL:"), value는 그 엔티티 목록 데이터소스의 현재 선택값.
 *
 * 화면(TaskView/RollingDisplay)이 위젯을 렌더링하기 전에 한 번만 계산해서 RedisTableWidget/
 * getRedisDisplayValue/groupBySum 등 REASON 패밀리를 다루는 모든 곳에 그대로 넘긴다 — "REASON 패밀리는
 * 전부 그룹 스코프"라고 가정하고 단일 targetGroupIds 배열을 넘기면, 그룹 아닌 다른 엔티티(스킬 등)의
 * REASON 위젯에 그룹의 선택값이 잘못 흘러들어가는 문제가 위젯 렌더 경로(table-skill-reason 등)에서도
 * 그대로 재현된다(buildDataSourceKeySelectionIds만 고쳐서는 해결 안 됨 — 프리셋 위젯은 이 함수가 만드는
 * 맵을 RedisTableWidget/ViewValueWidget에 prop으로 받아써야 한다).
 */
export function buildReasonFamilyTargetIdsByPrefix(dbQueryDefs: DbQueryDef[], dbQuerySelections: Record<number, string[]> | undefined): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const [prefix, dbQueryId] of findEntitySelectionDbQueryIdsByPrefix(dbQueryDefs)) {
    map[prefix] = dbQuerySelections?.[dbQueryId] ?? [];
  }
  return map;
}

/**
 * 뷰그룹(디스플레이 selection)이 고른 상담그룹 ID 목록을 가져온다. SoT는 `selection.groupIds`가 아니라
 * "IC:GROUP:{mediaType}" 기본 해시를 등록해둔 데이터소스의 `selection.dbQuerySelections[그 dbQueryId]` —
 * 상담그룹 전용 직접선택 필드를 없애고 "데이터소스 관리 등록 데이터" 체크박스 하나로 통일했기 때문이다.
 * 그 데이터소스 자체가 없거나 선택값이 비어있으면 "선택 없음=전체" 규칙에 따라 호출부(table-group-reason의
 * targetGroupIds, GROUP/CTIQ/AGENT 위젯의 selectedGroupIds)에서 전체 그룹으로 폴백한다.
 */
export function resolveGroupIdsFromSelection(selection: TaskboardDisplaySelection, dbQueryDefs: DbQueryDef[]): string[] {
  const groupDbQueryId = findGroupSelectionDbQueryId(dbQueryDefs);
  if (groupDbQueryId === undefined) return [];
  return selection.dbQuerySelections?.[groupDbQueryId] ?? [];
}

export function mergeDbQuerySelections(selections: (Record<number, string[]> | undefined)[]): Record<number, string[]> {
  const merged: Record<number, string[]> = {};
  selections.forEach((sel) => {
    Object.entries(sel ?? {}).forEach(([id, values]) => {
      const key = Number(id);
      merged[key] = [...new Set([...(merged[key] ?? []), ...values])];
    });
  });
  return merged;
}

export function buildDataSourceKeySelectionIds(
  dbQueryDefs: DbQueryDef[],
  dbQuerySelections: Record<number, string[]> | undefined,
  placeholderOptionValues?: Record<number, string[]>,
  // "groupId"는 별도 플레이스홀더 데이터소스 등록으로 값을 받지 않고, resolveGroupIdsFromSelection이 해석한
  // 값(IC:GROUP:{mediaType} 등록 데이터소스의 자체 선택값)을 그대로 쓴다 — {groupId} 토큰이 들어간 등록 키
  // (예: IC:GROUP:REASON:{groupId}:0)가 있는 경우를 위해 이름으로 주입. 아래 findEntitySelectionDbQueryIdsByPrefix
  // 기반 자동 주입이 이제 이 역할을 일반화해서 대신하지만, 호출부 호환을 위해 계속 받는다(명시적 override 우선).
  directPlaceholderValuesByName?: Record<string, string[]>,
): Record<string, string[]> {
  // "IC:GROUP:0"/"IC:SKILL:0"처럼 엔티티 기본 해시를 redisKeys로 등록해둔 데이터소스를 전부 찾는다.
  // {엔티티 접두사 → 그 데이터소스의 dbQueryId} — 그룹은 GROUP리스트, 스킬은 스킬리스트처럼, 등록된 엔티티
  // 수만큼 자동으로 늘어난다(새 엔티티 추가 시 이 함수 수정 불필요).
  const entityListDbQueryIdByPrefix = findEntitySelectionDbQueryIdsByPrefix(dbQueryDefs);

  // key는 전부 normalizePlaceholderName으로 소문자 통일 — directPlaceholderValuesByName로 주입하는 이름과
  // 사용자가 데이터소스 관리 탭에 자유 텍스트로 등록한 placeholderName의 대소문자가 어긋나면(예: "groupId" vs
  // "groupid") 이 아래 매칭들이 서로 다른 키로 취급해 주입값이 조용히 무시되고 "전체 목록" 폴백으로 새버린다.
  const placeholderValuesByName: Record<string, string[]> = {};
  for (const [name, values] of Object.entries(directPlaceholderValuesByName ?? {})) {
    placeholderValuesByName[normalizePlaceholderName(name)] = values;
  }
  // 엔티티 접두사에서 관례적으로 도출한 이름(예: "IC:GROUP:" → "groupid", "IC:SKILL:" → "skillid")으로
  // 그 엔티티의 현재 선택값을 주입 — 사용자가 "GROUPID"/"SKILLID" 같은 이름으로 별도 플레이스홀더를 등록해
  // 다른 쿼리의 필드 조합식에서 참조하는 관행을 그대로 지원하되, 등록 키의 대소문자/철자가 조금 달라도
  // (directPlaceholderValuesByName의 명시적 override가 없는 한) 항상 그 엔티티의 실제 선택값으로 맞춰준다.
  for (const [prefix, listDbQueryId] of entityListDbQueryIdByPrefix) {
    const derivedName = normalizePlaceholderName(deriveEntityIdPlaceholderName(prefix));
    if (placeholderValuesByName[derivedName]) continue;
    placeholderValuesByName[derivedName] = dbQuerySelections?.[listDbQueryId] ?? [];
  }
  for (const def of dbQueryDefs) {
    if (!def.placeholderName) continue;
    const key = normalizePlaceholderName(def.placeholderName);
    if (placeholderValuesByName[key]) continue;
    const selected = dbQuerySelections?.[def.dbQueryId];
    placeholderValuesByName[key] = selected && selected.length > 0 ? selected : (placeholderOptionValues?.[def.dbQueryId] ?? []);
  }

  const result: Record<string, string[]> = {};
  for (const def of dbQueryDefs) {
    const valueIds = dbQuerySelections?.[def.dbQueryId] ?? [];
    for (const rk of def.redisKeys ?? []) {
      if (!rk.key) continue;
      // REASON 패밀리 등록 키(예: "IC:GROUP:REASON:{groupid}:0", "IC:SKILL:REASON:{아무이름}")는 토큰 이름이
      // 뭐든 상관없이, 그 패밀리의 basePrefix(IC:GROUP:/IC:SKILL: 등)에 대응하는 엔티티 목록 데이터소스의
      // 현재 선택값으로 직접 스코핑한다 — 이름 매칭(placeholderValuesByName)을 아예 안 거친다. 그룹 REASON에
      // 그룹 선택값을, 스킬 REASON에 스킬 선택값을 각각 정확히 매칭하기 위함(등록 키 토큰 이름이 서로 달라도
      // 안전, 엔티티마다 별도 override 코드를 추가할 필요도 없음).
      const groupReason = parseGroupReasonHashKey(rk.key);
      const reasonEntityIds = groupReason ? (dbQuerySelections?.[entityListDbQueryIdByPrefix.get(groupReason.basePrefix) ?? -1] ?? []) : [];
      const expandedHashKeys = groupReason
        ? buildGroupReasonHashKeys(groupReason.prefix, groupReason.mediaType, reasonEntityIds)
        : expandTemplateKey(rk.key, placeholderValuesByName);
      const keyTemplate = rk.keyTemplate?.trim();
      const useKeyTemplate = !!keyTemplate && keyTemplate.toUpperCase() !== 'DEFAULT';
      const fieldIds = useKeyTemplate ? expandKeyFieldTemplate(keyTemplate, valueIds, placeholderValuesByName) : valueIds;
      expandedHashKeys.forEach((k) => {
        result[k] = fieldIds;
      });
    }
  }
  return result;
}

/**
 * 계산식 위젯의 결과값을 계산하여 표시 문자열로 변환한다.
 * 피연산자로 바인딩된 위젯을 찾지 못하거나 수식 평가에 실패하면 '—'를 반환한다.
 */
export function getCalcDisplayValue(
  widget: DroppedWidget,
  widgets: DroppedWidget[],
  redisData?: CtiWsDataByHashKey,
  selectionIdsByHashKey?: Record<string, string[]>,
  targetIdsByPrefix: Record<string, string[]> = {},
): string {
  const calc = widget.calc;
  if (!calc?.formula.trim() || calc.operands.length === 0) return '—';

  const vars: Record<string, number> = {};
  for (const operand of calc.operands) {
    if (!operand.widgetId && !operand.source) return '—';
    const value = getOperandNumericValue(operand, widgets, redisData, selectionIdsByHashKey, targetIdsByPrefix);
    if (Number.isNaN(value)) return '—';
    vars[operand.var] = value;
  }

  const result = evaluateFormula(calc.formula, vars);
  if (result === null) return '—';

  const decimals = calc.decimals ?? 1;
  const rounded = Math.round(result * 10 ** decimals) / 10 ** decimals;
  return String(rounded);
}
