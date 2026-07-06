export interface TaskboardBg {
  tenantId: string;
  pageId: number;
  pageName: string;
  fileName: string;
  authorName?: string;
  authRole?: string;
  genType: string;
  useYn: string;
  regDt: string;
}

/** 레이아웃 (배경 1개 → 다수 전광판) */
export interface TaskboardLayout {
  layoutId: number;
  pageId: number;
  tenantId?: string;
  pageName?: string; // bg 테이블에서 조인
  fileName?: string; // bg 이미지 URL
  layoutName: string;
  layoutJson?: string;
  authorName?: string; // 등록자 이름
  authRole?: string; // 등록자 권한 역할코드
  useYn: string;
  regDt: string;
}

/** 테이블 컬럼의 계산식 피연산자 — 캔버스 위젯이 아니라 "같은 행"의 다른 JSON 필드명을 참조한다 */
export interface TableColumnCalcOperand {
  /** 수식에서 사용하는 변수명 (A, B, C ...) */
  var: string;
  /** 참조할 같은 행의 JSON 필드명 (예: SUM_CONN_CNT) — 좌측 탐색기에서 Redis 필드를 드래그하면 채워짐 */
  field?: string;
}

/** 테이블 컬럼의 계산식 설정 — 계산식 위젯(CalcConfig)과 동일한 평가기를 재사용하되, 피연산자가 캔버스
 * 위젯이 아니라 같은 행의 JSON 필드인 점만 다르다. */
export interface TableColumnCalc {
  formula: string;
  operands: TableColumnCalcOperand[];
  decimals?: number;
}

/** 테이블형 위젯 컬럼 정의 */
export interface TableColumn {
  key: string;
  label: string;
  /** 이 컬럼이 차지할 표 전체 폭 대비 비율(예: '32.5%') — TaskCreate 캔버스에서 헤더 경계를 마우스로 드래그하면 설정됨.
   * 미지정 시 표(table-layout:fixed)가 남은 폭을 너비 미지정 컬럼들끼리 균등분할한다 — 한 컬럼을 넓히면
   * 나머지 컬럼들은 자동으로 더 좁아지며 서로 다닥다닥 붙는다. */
  width?: string;
  /** 셀 가로 정렬(기본 'center') — 단일값 위젯의 valueAlign과 동일 개념을 컬럼 단위로 적용 */
  align?: 'left' | 'center' | 'right';
  /** 셀 세로 정렬(기본 'middle') — 행 간격(rowGap)이 커져서 행이 높아질 때 내용을 위/중간/아래 중 어디에 둘지 */
  verticalAlign?: 'top' | 'middle' | 'bottom';
  /** 천단위 콤마 표시 */
  useThousandSep?: boolean;
  /** 임계치 색상 사용 여부 — 단일값 위젯의 thresholdEnabled/thresholds를 컬럼 단위로 재사용 */
  thresholdEnabled?: boolean;
  thresholds?: WidgetThresholdRule[];
  /** 설정되면 이 컬럼은 원본 JSON 필드값 대신 같은 행의 다른 필드들로 계산한 값을 보여준다(Redis 테이블 전용) */
  calc?: TableColumnCalc;
  /** false면 표/실행화면에서 이 컬럼 자체를 사용하지 않음(데이터·헤더 모두 제외, 설정값 자체는 유지) — 기본 true(사용) */
  hidden?: boolean;
  /**
   * 설정되면 이 컬럼의 원본 값(코드)을 그대로 보여주지 않고, 이 dbQueryId로 등록된 데이터소스의 VALUE→NAME
   * 매핑으로 치환해서 보여준다(예: 이석사유 코드 → 사유명). 매핑에 없는 값은 원본 그대로 표시.
   */
  nameLookupDbQueryId?: number;
}

/** 차트형 위젯 설정 */
export interface ChartConfig {
  chartType: 'bar' | 'line' | 'pie' | 'donut';
  sampleData?: Array<{ name: string; value: number }>;
  /** 색상 모드 — rainbow(기본 팔레트 자동 적용) | custom(직접 선택) */
  colorMode?: 'rainbow' | 'custom';
  /** colorMode='custom'일 때 사용할 색상 목록 — bar/line은 1개, pie/donut은 데이터 항목별로 순환 */
  colors?: string[];
}

/** 드래그 가능한 콜데이터 위젯 아이템 */
export interface CallDataItem {
  id: string;
  category: 'IVR' | 'CTI' | 'Agent' | 'Group' | 'Skill' | 'Tenant' | 'etc' | 'List' | 'Redis' | 'notice' | 'Calc' | 'ExternalApi' | 'DbQuery';
  label: string;
  unit?: string;
  sampleValue: string | number;
  color: string; // 카테고리 대표 색상
  displayType?: 'value' | 'table' | 'chart';
  isRealtime?: boolean;
  /**
   * Redis Hash 키 (예: "IC:CTIQ:2025008424") — category=Redis 위젯 전용.
   * 이 값이 데이터소스관리 탭에 등록된 DbQueryDef.redisKeys의 key와 문자열이 정확히 일치하고,
   * 현재 뷰그룹에서 그 데이터소스가 값이 선택된 상태면, 위젯은 원래 드래그한 필드 대신
   * 뷰그룹이 선택한 값 목록으로 자동 필터링된다(buildDataSourceKeySelectionIds). 태그 같은 별도
   * 식별자 없이 "실제 같은 Redis 키냐"만으로 매칭 — 매칭 안 되면 원래 드래그한 필드 그대로 동작.
   */
  redisHashKey?: string;
  /** Redis Hash 내 필드명 (예: "CTIQ_NAME") — category=Redis 위젯 전용 */
  redisField?: string;
  /** Hash 필드값이 JSON일 때 추출할 JSON 키 (예: "인입호") — category=Redis 위젯 전용 */
  redisJsonField?: string;
  /** 해시 그룹의 모든 형제 Hash 키 목록 — 집계(합계/최대/최소) 계산용 */
  hashSiblingKeys?: string[];
  /**
   * category=Redis 위젯(특히 table-redis) 전용 — 시스템ID가 해시의 "필드"인지('fields', 예: IC:CTIQ:0 안에
   * 큐ID들이 필드로 존재) "키 세그먼트"인지('keyed', 예: IC:GROUP:REASON:{groupId}:{mediaType}처럼 시스템ID별로
   * 키가 따로 존재) 표시. TaskCreate에서 `features/board/utils/redisKeyPattern.ts`의 자동탐지 결과를 한 번
   * 저장해두고, 실행 화면에서는 이 값만 읽어서 분기 — 매번 다시 탐지(SCAN)하지 않는다. 미지정 시 'fields'로 취급.
   */
  redisKeyPattern?: 'fields' | 'keyed';
  /**
   * 단일값 Redis 위젯 전용 — redisField/redisJsonField로 행 1개를 직접 가리키는 대신, 해시의 모든 행을
   * byKey 필드값으로 묶어 matchValue와 일치하는 그룹의 aggKey를 합산해 보여준다(Redis 테이블의
   * 그룹별 합계와 동일 로직, 결과를 1개 숫자로 표시). 예: IC:GROUP:REASON:{groupId}:{mediaType}에서
   * byKey='REASON_CODE', aggKey='AGENT_CNT', matchValue='5' → 사유코드 5의 상담사 수 합계.
   */
  groupBy?: { byKey: string; aggKey: string; matchValue: string };
  /**
   * table-queue/table-group/table-agent/chart-bar-queue/chart-line-trend 위젯이 사용할 미디어타입
   * (IC:CTIQ:{mediaType} 등 — 위젯 등록 시점에 고정). 미지정 시 '0'(VOIP)으로 취급.
   */
  mediaType?: string;
  tableConfig?: {
    columns: TableColumn[];
    sampleRows: Record<string, string | number>[];
    /**
     * Redis 테이블(table-redis) 전용 — 해시의 모든 field(행)를 그대로 보여주는 대신, byKey 필드값으로
     * 묶어서 aggKey 필드를 합산한 1행씩으로 보여준다. 예: IC:GROUP:REASON:{groupId}:{mediaType}에서
     * byKey='REASON_CODE', aggKey='AGENT_CNT' → 사유코드별 상담사 수 합계.
     */
    groupBy?: { byKey: string; aggKey: string };
    /**
     * PIVOT 렌더링 설정 — IC:GROUP:REASON 해시처럼 행/컬럼이 모두 동적인 교차표.
     * rowKey 필드값을 행으로, colKey 필드값을 컬럼으로, valueKey 필드값을 셀 값으로 표시.
     * colKey의 유니크 값은 실시간 WS 데이터에서 자동 추출(사전 정의 불필요).
     * 기본값: rowKey='NODE_ID', colKey='REASON_CDE', valueKey='AGENT_CNT'.
     */
    pivot?: {
      rowKey?: string;
      colKey?: string;
      valueKey?: string;
      /** PIVOT 컬럼(colKey 값)별 표시명/넓이/숨김 정의. 미정의 컬럼은 colKey 값 그대로 표시. */
      colDefs?: { key: string; label: string; width?: string; hidden?: boolean }[];
    };
    /** 행 사이 간격(px) — table 요소 border-spacing의 세로값으로 적용 */
    rowGap?: number;
    /** true면 헤더의 컬럼명 텍스트를 표 전체에서 한 번에 숨김(위젯의 showTitle과 동일 개념을 표 단위로) — 데이터(셀 값)는 계속 보여줌 */
    hideColumnLabels?: boolean;
    /** 정렬 기준 컬럼 키(숫자로 표시되는 컬럼) — 미지정 시 정렬 없음(원본 순서) */
    sortKey?: string;
    /** 정렬 방향 — 기본 desc(내림차순) */
    sortOrder?: 'asc' | 'desc';
    /** 최종적으로 보여줄 최대 행 수(TOP N) — 미지정 시 기본 20 */
    limit?: number;
    /** 데이터 행 사이 구분선 표시 여부 — 기본 true(표시). 헤더와 첫 데이터 행 사이 줄은 이 옵션과 무관하게 항상 숨김 */
    showBorder?: boolean;
    /** 행 구분선 두께(px) — 기본 1 */
    borderWidth?: number;
    /** true면 설정된 컬럼의 값이 모두 빈 문자열 또는 0인 행을 숨김 — Redis에 ID만 등록되고 실데이터가 없는 행 제거용 */
    hideEmptyRows?: boolean;
    /**
     * JOIN 테이블(table-join) 전용 — 두 Redis 해시의 행을 연결하는 공통 필드명.
     * hashKeyA(`redisHashKey`)와 hashKeyB(`joinHashKeyB`) 양쪽 행에 이 이름의 필드가 있어야 한다.
     * 일치하는 행끼리 컬럼을 합쳐 1행으로 보여주며, 어느 쪽에도 없는 키는 행에서 제외한다(INNER JOIN).
     */
    joinKey?: string;
  };
  chartConfig?: ChartConfig;
  /** 개별 공지사항 ID — category=notice 위젯 전용 */
  noticeId?: number;
  /** 외부 REST API URL — category=ExternalApi 위젯 전용 */
  externalApiUrl?: string;
  /**
   * JSON 경로 — 응답 JSON에서 추출할 값의 점 표기법 경로 (예: "data.score", "result.count").
   * 미지정 시 응답 전체를 문자열로 표시한다.
   */
  externalApiJsonPath?: string;
  /** 테스트 실패 시 수동 입력한 샘플 JSON 원문 — 실행화면에서 API 호출 실패 시 이 값을 폴백으로 사용 */
  externalApiSampleJson?: string;
  /** 외부 API 자동 갱신 주기(초) — 실행화면에서 이 간격으로 API를 재호출해 값을 갱신한다. 기본 30초. */
  externalApiIntervalSec?: number;
  /** 외부 API 요청 헤더 — 한 줄에 헤더 하나, `Key: Value` 형식. 빈 줄·`#` 주석 줄은 무시. */
  externalApiHeaders?: string;
  /** DB Query 키 — category=DbQuery 위젯 전용 (예: "custom1") */
  dbQueryKey?: string;
  /** DB Query 결과 행에서 표시할 컬럼명 (예: "GROUP_ID") — 미지정 시 첫 번째 컬럼 값 표시 */
  dbQueryColumn?: string;
  /** DB Query 자동 갱신 주기(초) — 기본 30 */
  dbQueryIntervalSec?: number;
  /**
   * JOIN 테이블 위젯(table-join) 전용 — 두 번째 Redis Hash 키.
   * 첫 번째 키는 `redisHashKey`이고, 두 Redis 해시의 행을 `tableConfig.joinKey`로 조인한다.
   */
  joinHashKeyB?: string;
}

/** 계산식 위젯의 피연산자 — 캔버스에 배치된 위젯 또는 Redis 해시 필드를 변수로 참조 */
export interface CalcOperand {
  /** 수식에서 사용하는 변수명 (A, B, C ...) */
  var: string;
  /** 참조하는 캔버스 위젯의 id — 캔버스에 배치된 위젯을 🔗로 드래그하여 연결한 경우 */
  widgetId?: string;
  /** 캔버스 배치 없이 직접 참조하는 Redis 해시 필드 — 좌측 팔레트에서 드래그하여 연결한 경우 */
  source?: CallDataItem;
  /** source 바인딩 시 집계 방식 (hashSiblingKeys가 있을 때만 의미 있음). DroppedWidget.aggregation과 동일 의미 */
  aggregation?: 'none' | 'sum' | 'max' | 'min' | 'avg';
}

/** 계산식 위젯 설정 */
export interface CalcConfig {
  /** 수식 문자열 (예: "A + B * 1.5") — 변수는 operands의 var와 매칭 */
  formula: string;
  operands: CalcOperand[];
  /** 결과 표시 소수점 자릿수 (기본 1) */
  decimals?: number;
  /** 결과값 뒤에 '%' 단위 표시 여부 */
  showPercent?: boolean;
  /** '%' 글자 크기 — 값 폰트 크기 대비 배율(em). 기본 0.65, 폰트는 값과 동일하게 상속받음 */
  percentFontScale?: number;
}

/** 위젯 스타일 */
export interface WidgetStyle {
  fontSize: number;
  fontFamily: string;
  color: string;
  bgColor: string;
  titleAlign?: 'left' | 'center' | 'right';
  valueAlign?: 'left' | 'center' | 'right';
  useThousandSep?: boolean;
  // 추가 스타일 옵션
  fontWeight?: 'normal' | 'bold' | '300' | '500' | '600' | '700';
  borderWidth?: number;
  borderColor?: string;
  borderStyle?: 'solid' | 'dashed' | 'dotted';
  borderRadius?: number;
  opacity?: number; // 10~100 (백분율)
  shadow?: 'none' | 'soft' | 'hard' | 'glow';
  paddingX?: number; // px
  paddingY?: number; // px
  // 값 텍스트 위치 세밀조정 — valueAlign(좌/중/우)로 큰 정렬을 잡은 뒤, 픽셀 단위로 상하좌우 미세 이동
  valueOffsetX?: number; // px, 음수=좌, 양수=우
  valueOffsetY?: number; // px, 음수=상, 양수=하
  // 값 변경 시 모션 효과
  valueChangeAnimation?: 'none' | 'pulse' | 'flash' | 'shake' | 'bounce' | 'highlight';
  // 하이라이트 모션 전용 색상 — 미지정 시 기본 노란색
  highlightColor?: string;
  // 임계치 색상 — 값이 rule.min 이상이면 해당 색상 적용(오름차순 평가, 마지막에 매칭되는 규칙이 적용됨)
  thresholdEnabled?: boolean;
  thresholds?: WidgetThresholdRule[];
}

/** 임계치 색상 규칙 — 예: min=5,color=노랑 → 값이 5 이상이면 노랑 (그 위 구간의 규칙이 있으면 그쪽이 우선) */
export interface WidgetThresholdRule {
  min: number;
  color: string;
}

/** 전광판 캔버스에 드랍된 위젯 */
export interface DroppedWidget {
  id: string;
  item: CallDataItem;
  x: number; // % left position
  y: number; // % top position
  w: number; // % width
  h: number; // % height
  showTitle: boolean; // 라벨(타이틀) 표시 여부
  customTitle?: string; // 사용자 정의 타이틀 (item.label 대체)
  style: WidgetStyle;
  /** 이 위젯이 속하는 섹션 키. layoutJson의 sections 배열에 정의된 값과 매칭. 미지정 시 공통 위젯(모든 섹션에 표시, 기본 selection 사용). */
  sectionKey?: string;
  noticeKey?: string; // 공지사항 위젯 연동 키
  /** 공지사항 위젯(category=notice)의 슬라이드 속도(초) — 회전 전환 주기 + 마퀴 흐름 속도에 공통 사용. 기본 5 */
  slideIntervalSec?: number;
  /**
   * Redis 위젯의 값 집계 방식. category=Redis 위젯이면 항상 선택 가능.
   * hashSiblingKeys가 있으면 그룹 내 모든 키의 값을 모아 집계하고, 없으면 자기 자신의 값만으로 집계(avg=원값, sum/max/min=원값)한다.
   */
  aggregation?: 'none' | 'sum' | 'max' | 'min' | 'avg';
  /** 계산식 위젯(category=Calc) 설정 */
  calc?: CalcConfig;
  /** 사용자 지정 시계 위젯(item.id='etc-custom') 포맷 — yyyy/mm/dd/hh24/mi/ss 토큰. 미지정 시 DEFAULT_CUSTOM_CLOCK_FORMAT */
  clockFormat?: string;
}

/**
 * layoutJson을 파싱하여 섹션 키 배열 반환.
 * sections 필드가 없거나 빈 배열이면 빈 배열 반환 → 단일 뷰 그룹 모드.
 */
export function parseLayoutSections(layoutJson?: string | null): string[] {
  if (!layoutJson) return [];
  try {
    const raw = JSON.parse(layoutJson) as unknown;
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const typed = raw as { sections?: unknown };
      return Array.isArray(typed.sections) ? (typed.sections as string[]) : [];
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * layoutJson을 파싱하여 위젯 배열 반환.
 * 구 포맷(DroppedWidget[]) 과 신 포맷({ version:2, widgets:[] }) 모두 지원.
 */
export function parseLayoutWidgets(layoutJson?: string | null): DroppedWidget[] {
  if (!layoutJson) return [];
  try {
    const raw = JSON.parse(layoutJson) as unknown;
    if (Array.isArray(raw)) return raw as DroppedWidget[];
    if (raw && typeof raw === 'object' && 'version' in raw) {
      const typed = raw as { version: number; widgets?: DroppedWidget[] };
      return Array.isArray(typed.widgets) ? typed.widgets : [];
    }
    return [];
  } catch {
    return [];
  }
}

/** 공지사항 (DB: TB_TK_NOTICE) */
export interface TaskboardNotice {
  noticeId: number;
  tenantId?: string;
  noticeKey: string;
  title?: string;
  content: string;
  authorName?: string;
  authRole?: string;
  startDt?: string;
  endDt?: string;
  alwaysActiveYn: string;
  activeYn: string;
  displayType: 'fixed' | 'slide';
  sortOrder: number;
  useYn: string;
  regDt?: string;
}

/** 전광판 롤링 그룹 (DB: TB_TK_ROLLING_GROUP) */
export interface RollingGroup {
  groupId: number;
  tenantId?: string;
  groupName: string;
  /** 포함 전광판(레이아웃) ID 배열 JSON 문자열 "[1,2,3]" — 어떤 뷰 그룹으로 보여줄지는 실행 시점에 별도로 고름 */
  displayIds: string;
  intervalSec: number;
  transitionType?: string;
  useYn: string;
  regDt: string;
}

/**
 * 뷰 그룹 선택값 — 큐/그룹/상담사. 향후 신규 Redis 타입은 키만 추가.
 * 미디어타입은 여기 없음 — 위젯(CallDataItem.mediaType)에 위젯 등록 시점에 고정.
 */
export interface TaskboardDisplaySelection {
  queueIds?: string[];
  agentIds?: string[];
  /** 데이터 소스 관리 탭(DataSourceQueryTab)에서 등록한 DbQueryDef별 선택값 — dbQueryId → 선택된 VALUE 배열 */
  dbQuerySelections?: Record<number, string[]>;
}

/** 뷰 그룹 — 전광판(레이아웃)과 매핑되지 않는 독립된 순수 선택값 묶음. 어떤 레이아웃에든 자유롭게 입혀 쓴다 (DB: TB_TK_TASKBOARD_DISPLAY) */
export interface TaskboardDisplay {
  displayId: number;
  tenantId?: string;
  displayName: string;
  selectionJson?: string;
  useYn: string;
  regDt: string;
}

/** 레이아웃 존 */
export interface LayoutZone {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

/** 레이아웃 템플릿 */
export interface LayoutTemplate {
  id: string;
  name: string;
  description: string;
  zones: LayoutZone[];
}

/** DB 쿼리 테스트 화면 — SQL의 :name named parameter 하나에 대응하는 선언 */
export interface DbQueryParam {
  name: string;
  type: 'STRING' | 'NUMBER' | 'DATE';
  value: string;
}

/** 라벨이 붙은 Redis 해시키 항목 — 이 쿼리의 VALUE를 필드로 갖는 실시간 Redis 해시키(예: "IC:GROUP:0").
 *  하나의 데이터소스가 그룹요약(IC:GROUP)/이석사유(IC:GROUP:REASON)처럼 여러 해시에 걸쳐 있을 수 있어 리스트로 관리한다.
 *  key에 "{nodeId}"처럼 다른 데이터소스의 placeholderName을 참조하는 토큰을 쓸 수 있다 — 실행 시점에
 *  그 데이터소스의 VALUE 목록(뷰그룹 선택값이 있으면 그것만, 없으면 전체)으로 치환되어 해시키가 여러 개로 펼쳐진다. */
export interface DbQueryRedisKeyEntry {
  /** 위젯이 이 항목을 고를 때 쓰는 이름(예: "그룹요약", "이석사유") */
  label: string;
  key: string;
  /** 해시 필드(키) 조합식 — 미지정/"DEFAULT"면 이 쿼리의 VALUE를 필드 그대로 사용.
   *  "{placeholder}"/"{placeholder:자릿수}"(다른 플레이스홀더 참조, 자릿수 지정 시 0으로 왼쪽 채움)와
   *  "{value}"(이 쿼리 자신의 VALUE) 토큰을 "||"(구분자, 실제 키엔 안 들어감)로 이어붙여 필드를 조합한다.
   *  예: "{nodeId:6}||{value}" → NODE_ID 6자리(0패딩) + 이 쿼리의 REASON_CODE 값 */
  keyTemplate?: string;
}

/** 저장된 DB 쿼리 정의 — 뷰그룹 체크박스 옵션 소스(SELECT 결과가 VALUE/NAME 두 컬럼이어야 함).
 *  SQL에 :name 파라미터가 있으면 저장 시점에 입력한 값이 고정값으로 얼려져서(freeze) 함께 저장된다. */
export interface DbQueryDef {
  dbQueryId: number;
  queryName: string;
  description?: string;
  sqlText: string;
  params?: DbQueryParam[];
  /** 위젯 실시간 연동(키 문자열 일치 매칭)에 사용 — 미지정(빈 배열) 가능 */
  redisKeys?: DbQueryRedisKeyEntry[];
  /** 이 쿼리를 다른 데이터소스의 redisKeys.key에서 "{이 이름}" 플레이스홀더로 참조할 수 있게 등록하는 이름(예: "nodeId"). 미지정 가능 */
  placeholderName?: string;
  regDt: string;
}
