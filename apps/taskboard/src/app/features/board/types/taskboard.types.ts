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
  width?: string;
  /** 셀 정렬(기본 'center') — 단일값 위젯의 valueAlign과 동일 개념을 컬럼 단위로 적용 */
  align?: 'left' | 'center' | 'right';
  /** 천단위 콤마 표시 */
  useThousandSep?: boolean;
  /** 임계치 색상 사용 여부 — 단일값 위젯의 thresholdEnabled/thresholds를 컬럼 단위로 재사용 */
  thresholdEnabled?: boolean;
  thresholds?: WidgetThresholdRule[];
  /** 설정되면 이 컬럼은 원본 JSON 필드값 대신 같은 행의 다른 필드들로 계산한 값을 보여준다(Redis 테이블 전용) */
  calc?: TableColumnCalc;
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
  category: 'IVR' | 'CTI' | 'Agent' | 'Group' | 'Skill' | 'Tenant' | 'etc' | 'List' | 'Redis' | 'notice' | 'Calc';
  label: string;
  unit?: string;
  sampleValue: string | number;
  color: string; // 카테고리 대표 색상
  displayType?: 'value' | 'table' | 'chart';
  isRealtime?: boolean;
  /** Redis Hash 키 (예: "IC:CTIQ:2025008424") — category=Redis 위젯 전용 */
  redisHashKey?: string;
  /** Redis Hash 내 필드명 (예: "CTIQ_NAME") — category=Redis 위젯 전용 */
  redisField?: string;
  /** Hash 필드값이 JSON일 때 추출할 JSON 키 (예: "인입호") — category=Redis 위젯 전용 */
  redisJsonField?: string;
  /** 해시 그룹의 모든 형제 Hash 키 목록 — 집계(합계/최대/최소) 계산용 */
  hashSiblingKeys?: string[];
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
  };
  chartConfig?: ChartConfig;
  /** 개별 공지사항 ID — category=notice 위젯 전용 */
  noticeId?: number;
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
  groupIds?: string[];
  agentIds?: string[];
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
