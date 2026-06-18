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

/** 테이블형 위젯 컬럼 정의 */
export interface TableColumn {
  key: string;
  label: string;
  width?: string;
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
   * table-queue/table-group/table-agent/chart-bar-queue/chart-line-trend 위젯이 사용할 미디어타입
   * (IC:CTIQ:{mediaType} 등 — 위젯 등록 시점에 고정). 미지정 시 '0'(VOIP)으로 취급.
   */
  mediaType?: string;
  tableConfig?: {
    columns: TableColumn[];
    sampleRows: Record<string, string | number>[];
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
  // 분리형 레이아웃 (타이틀 헤더 + 값 본문)
  widgetLayout?: 'unified' | 'split';
  titleBgColor?: string;
  valueBgColor?: string;
  valueColor?: string;
  titleIcon?: string;
  valueFontScale?: number;
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
  /**
   * Redis 위젯의 값 집계 방식. category=Redis 위젯이면 항상 선택 가능.
   * hashSiblingKeys가 있으면 그룹 내 모든 키의 값을 모아 집계하고, 없으면 자기 자신의 값만으로 집계(avg=원값, sum/max/min=원값)한다.
   */
  aggregation?: 'none' | 'sum' | 'max' | 'min' | 'avg';
  /** 계산식 위젯(category=Calc) 설정 */
  calc?: CalcConfig;
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
  /** 포함 디스플레이 ID 배열 JSON 문자열 "[1,2,3]" — 각 디스플레이가 레이아웃+선택값을 함께 가짐 */
  displayIds: string;
  intervalSec: number;
  transitionType?: string;
  useYn: string;
  regDt: string;
}

/**
 * 디스플레이 선택값 — 큐/그룹/상담사. 향후 신규 Redis 타입은 키만 추가.
 * 미디어타입은 여기 없음 — 위젯(CallDataItem.mediaType)에 위젯 등록 시점에 고정.
 */
export interface TaskboardDisplaySelection {
  queueIds?: string[];
  groupIds?: string[];
  agentIds?: string[];
}

/** 디스플레이 — 레이아웃과 무관한 순수 선택값 그룹핑 (DB: TB_TK_TASKBOARD_DISPLAY) */
export interface TaskboardDisplay {
  displayId: number;
  tenantId?: string;
  displayName: string;
  selectionJson?: string;
  useYn: string;
  regDt: string;
}

/** 화면 인스턴스 — 디스플레이(그룹핑) × 레이아웃 N:M 연결 (DB: TB_TK_TASKBOARD_DISPLAY_LAYOUT) */
export interface TaskboardDisplayLayout {
  displayLayoutId: number;
  displayId: number;
  displayName?: string; // display 테이블에서 조인 (목록 표시용)
  selectionJson?: string; // display 테이블에서 조인 (RollingDisplay 실데이터용)
  layoutId: number;
  layoutName?: string; // layout 테이블에서 조인 (목록 표시용)
  regDt: string;
}

/** TaskView 등 실행 화면에서 한 번에 받는 화면 인스턴스 상세(레이아웃+선택값) */
export interface TaskboardDisplayLayoutDetail {
  displayLayoutId: number;
  displayId: number;
  displayName: string;
  selectionJson?: string;
  layout: TaskboardLayout;
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
