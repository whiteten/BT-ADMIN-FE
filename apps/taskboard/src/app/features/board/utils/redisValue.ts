import type { CtiWsDataByHashKey, CtiWsSubscription } from '../hooks/useCtiqWebSocket';
import type { CalcOperand, CallDataItem, DroppedWidget } from '../types/taskboard.types';

/** getRedisDisplayValue가 필요로 하는 최소 형태 — DroppedWidget 또는 계산식 operand의 source를 함께 받기 위함 */
type RedisValueHost = Pick<DroppedWidget, 'item' | 'aggregation'>;

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

/** IC:GROUP:{mediaType} 형태의 "해시그룹" 키 — compositeKey(필드)가 디스플레이 선택값(그룹)에 따라 바뀐다. */
const GROUP_HASH_PREFIX = 'IC:GROUP:';

export function isGroupHashKey(hashKey: string): boolean {
  return hashKey.startsWith(GROUP_HASH_PREFIX);
}

/**
 * IC:GROUP:* 위젯이 보여줄 compositeKey(그룹) 목록을 디스플레이 선택값(selection.groupIds)으로 계산한다.
 * 선택값이 비어있으면(table-group 위젯과 동일 규칙) 전체 그룹을 대상으로 한다.
 * 디자인 시점에 고정된 redisField(compositeKey 1개)는 더 이상 쓰지 않고, 여기서 계산된 그룹들의 값을 합산해서 보여준다.
 */
export function buildGroupIdsByHashKey(
  widgets: DroppedWidget[],
  groupRows: Array<{ groupId: string; compositeKeys?: string[] }>,
  selectedGroupIds: string[],
): Record<string, string[]> {
  const mediaTypes = new Set<string>();
  const collectMediaType = (item: CallDataItem) => {
    if (item.category === 'Redis' && item.redisHashKey && isGroupHashKey(item.redisHashKey)) {
      mediaTypes.add(item.redisHashKey.slice(GROUP_HASH_PREFIX.length));
    }
  };
  widgets.forEach((w) => {
    collectMediaType(w.item);
    w.calc?.operands?.forEach((op) => {
      if (op.source) collectMediaType(op.source);
    });
  });
  if (mediaTypes.size === 0) return {};

  const compositeKeys = [...new Set(groupRows.filter((g) => selectedGroupIds.length === 0 || selectedGroupIds.includes(g.groupId)).flatMap((g) => g.compositeKeys ?? []))];
  const result: Record<string, string[]> = {};
  mediaTypes.forEach((mt) => {
    result[`${GROUP_HASH_PREFIX}${mt}`] = compositeKeys;
  });
  return result;
}

/**
 * Redis 위젯의 표시값을 계산한다.
 * - hashKey가 "해시그룹"(IC:GROUP:*)이고 groupIdsByHashKey에 항목이 있으면, 디자인 시점에 고정된 compositeKey
 *   대신 디스플레이 선택값으로 결정된 그룹들의 값을 합산해서 보여준다(그룹 1개면 그 값, 여러 개면 합산).
 * - 그 외에는 aggregation이 none/미설정이면 단일 hashKey의 필드값을 그대로, aggregation이 설정되면
 *   hashSiblingKeys(없으면 자기 자신의 hashKey 1개)의 값을 모아 집계한다.
 */
export function getRedisDisplayValue(widget: RedisValueHost, redisData?: CtiWsDataByHashKey, groupIdsByHashKey?: Record<string, string[]>): string {
  const { redisHashKey, redisField, redisJsonField, hashSiblingKeys } = widget.item;
  if (!redisHashKey || !redisData) return String(widget.item.sampleValue);

  const groupIds = groupIdsByHashKey?.[redisHashKey];
  if (groupIds) {
    if (groupIds.length === 0) return '0';
    const nums = groupIds.map((id) => toNumericField(redisData[redisHashKey], id, redisJsonField));
    return String(nums.reduce((a, b) => a + b, 0));
  }

  if (!redisField) return String(widget.item.sampleValue);
  const { aggregation } = widget;
  if (aggregation && aggregation !== 'none') {
    // 해시 그룹(큐별로 분리된 여러 hashKey)의 동일 필드를 모아 집계. 그룹이 없으면 자기 자신만으로 집계한다.
    const keys = hashSiblingKeys && hashSiblingKeys.length > 0 ? hashSiblingKeys : [redisHashKey];
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
export function getWidgetNumericValue(widget: DroppedWidget, redisData?: CtiWsDataByHashKey, groupIdsByHashKey?: Record<string, string[]>): number {
  const isRedis = widget.item.category === 'Redis' && !!widget.item.redisHashKey;
  const raw = isRedis ? getRedisDisplayValue(widget, redisData, groupIdsByHashKey) : widget.item.sampleValue;
  return Number(raw);
}

/**
 * 계산식 위젯의 피연산자(operand) 하나의 현재 숫자값을 반환한다.
 * - source(Redis 해시 필드 직접 참조)가 있으면 캔버스 배치 여부와 무관하게 그 값을 사용
 * - widgetId(캔버스 위젯 참조)만 있으면 해당 위젯의 값을 사용
 * 바인딩이 없거나 참조 대상을 찾지 못하면 NaN을 반환한다.
 */
export function getOperandNumericValue(operand: CalcOperand, widgets: DroppedWidget[], redisData?: CtiWsDataByHashKey, groupIdsByHashKey?: Record<string, string[]>): number {
  if (operand.source) {
    const isRedis = operand.source.category === 'Redis' && !!operand.source.redisHashKey;
    const raw = isRedis ? getRedisDisplayValue({ item: operand.source, aggregation: operand.aggregation }, redisData, groupIdsByHashKey) : operand.source.sampleValue;
    return Number(raw);
  }
  const target = widgets.find((w) => w.id === operand.widgetId);
  if (!target) return NaN;
  return getWidgetNumericValue(target, redisData, groupIdsByHashKey);
}

/**
 * 전광판에서 WS로 구독해야 할 단일값 Redis 위젯들의 hashKey/id(field)/column 목록을 모은다.
 * 캔버스에 배치된 Redis 위젯뿐 아니라, 계산식 위젯의 operand가 직접 참조하는(캔버스에 배치되지 않은) Redis 해시 필드도 포함한다.
 * 해시 그룹(hashSiblingKeys)이 있으면 대표 키 대신 그룹 내 모든 hashKey에 동일 id를 매핑한다.
 * "해시그룹"(IC:GROUP:*)이고 groupIdsByHashKey에 항목이 있으면 디자인 시점 redisField 대신 그 그룹들을 구독한다.
 * hashKey당 실제 필요한 id(field)만 구독해 "해시그룹 전체"를 받아오지 않도록 한다.
 */
export function collectRedisWsSubscriptions(widgets: DroppedWidget[], groupIdsByHashKey?: Record<string, string[]>): CtiWsSubscription[] {
  const byHashKey = new Map<string, { ids: Set<string>; columns: Set<string> }>();
  const addItem = (item: CallDataItem) => {
    if (item.category !== 'Redis' || !item.redisHashKey || !item.redisField) return;
    const hashKeys = item.hashSiblingKeys?.length ? item.hashSiblingKeys : [item.redisHashKey];
    hashKeys.forEach((hashKey) => {
      if (!byHashKey.has(hashKey)) byHashKey.set(hashKey, { ids: new Set(), columns: new Set() });
      const entry = byHashKey.get(hashKey)!;
      const groupIds = groupIdsByHashKey?.[hashKey];
      if (groupIds) {
        groupIds.forEach((id) => entry.ids.add(id));
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
  return [...byHashKey.entries()].map(([hashKey, { ids, columns }]) => ({
    hashKey,
    ids: [...ids],
    columns: columns.size > 0 ? [...columns] : undefined,
  }));
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
 * 수식 문자열을 안전하게 계산한다 (eval 미사용).
 * 지원 문법: 숫자(소수 포함), 변수명(A-Z 등), + - * / ( ) 단항 마이너스.
 * 문법 오류·미정의 변수·trailing token이 있으면 null을 반환한다.
 */
export function evaluateFormula(formula: string, vars: Record<string, number>): number | null {
  const tokens = formula.match(/\d+(\.\d+)?|[A-Za-z_][A-Za-z0-9_]*|[()+\-*/]/g);
  if (!tokens || tokens.length === 0) return null;

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

  try {
    const result = parseExpr();
    if (pos !== tokens.length) return null;
    return Number.isFinite(result) ? result : null;
  } catch {
    return null;
  }
}

/**
 * 계산식 위젯의 결과값을 계산하여 표시 문자열로 변환한다.
 * 피연산자로 바인딩된 위젯을 찾지 못하거나 수식 평가에 실패하면 '—'를 반환한다.
 */
export function getCalcDisplayValue(widget: DroppedWidget, widgets: DroppedWidget[], redisData?: CtiWsDataByHashKey, groupIdsByHashKey?: Record<string, string[]>): string {
  const calc = widget.calc;
  if (!calc?.formula.trim() || calc.operands.length === 0) return '—';

  const vars: Record<string, number> = {};
  for (const operand of calc.operands) {
    if (!operand.widgetId && !operand.source) return '—';
    const value = getOperandNumericValue(operand, widgets, redisData, groupIdsByHashKey);
    if (Number.isNaN(value)) return '—';
    vars[operand.var] = value;
  }

  const result = evaluateFormula(calc.formula, vars);
  if (result === null) return '—';

  const decimals = calc.decimals ?? 1;
  const rounded = Math.round(result * 10 ** decimals) / 10 ** decimals;
  return String(rounded);
}
