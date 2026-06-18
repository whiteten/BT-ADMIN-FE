/**
 * 트렁크 회선현황(흐름) 위젯 데이터 모델.
 * BE `TrunkFlowWidget.computeFromRawData` 반환 객체와 1:1 매칭.
 * 모든 필드는 Redis 부분 데이터/초기 빈 상태 대응을 위해 선택적으로 정규화한다.
 */

/** 라인/그룹 severity — BE 가 평가해 내린다. */
export type TrunkSeverity = 'normal' | 'warning' | 'saturated' | 'critical';

/** 개별 라인(TRK_ID) / 국선 멤버 등록 상태. unused = 미사용(REGI_STATUS=2, 알람 아님). */
export type TrunkLineStatus = 'normal' | 'unregistered' | 'block' | 'error' | 'unused';

/** 국선 엔드포인트(부모 GW) 상태 — AS-IS trunkStatus.jsp 동일(BLOCK > STATUS 우선). */
export type TrunkEndpointState = 'normal' | 'error' | 'block';

/** 개별 라인(state-line 한 칸 / 국선 멤버 한 행). */
export interface TrunkLine {
  trkId: number | null;
  name: string;
  status: TrunkLineStatus;
  severity: TrunkSeverity;
  line: number;
  inBusy: number;
  outBusy: number;
  rate: number;
  /** 국선 멤버(IE:ENDPT_MEMBER)일 때 멤버 IP. SIP 라인은 없음. */
  ip?: string;
  /** 국선 멤버 전용 — 음질(0=측정값 없음), 수신/발신 당일 최대점유. SIP 라인은 0. */
  mos: number;
  inPick: number;
  outPick: number;
}

export interface TrunkLineStat {
  normal: number;
  unregistered: number;
  block: number;
  error: number;
  unused: number;
}

/** 회선 그룹(통신사 물리회선 = SIP_TRUNK_IPV4). */
export interface TrunkGroup {
  kind: string; // 'SIP'
  groupKey: string;
  name: string;
  nodeId: number | null;
  nodeName: string;
  rate: number; // 전체 분모(죽은 라인 포함) 기준 — AS-IS 동일
  aliveRate: number; // 살아있는 라인 분모 기준 — 실효 용량
  busyLine: number;
  regLine: number;
  totalLine: number;
  inBusy: number;
  outBusy: number;
  /** 국선 전용 — 수신/발신 당일 최대점유, 그 합(당일 최대 동시점유), 라이선스 초과 거부콜(누적). SIP 그룹은 0. */
  inPick: number;
  outPick: number;
  peakBusy: number;
  licOver: number;
  severity: TrunkSeverity;
  lineIssue: boolean;
  /** 부모 GW 상태(국선 전용). SIP 그룹은 'normal'. */
  state: TrunkEndpointState;
  lineStat: TrunkLineStat;
  lines: TrunkLine[];
}

/** 노드 시스템 레그(국선/트렁크/내선) 점유·용량 — IE:SYSTEM. */
export interface TrunkNodeLeg {
  busy: number; // 점유 회선 수
  reg: number; // 등록(REGISTER) 회선 수 = 분모
  block: number; // 블록 회선 수
  lic: number; // 라이선스(최대) 회선 수
  inBusy: number; // 수신 점유(국선만)
  outBusy: number; // 발신 점유(국선만)
  att: number; // 할당 내선 수(내선만)
}

/** 교환기 노드(PBX). riskCnt 등은 회선그룹 집계, co/trk/ext/cps 는 노드 단위 IE:SYSTEM. */
export interface TrunkNode {
  nodeId: number | null;
  nodeName: string;
  rate: number;
  busyLine: number;
  regLine: number;
  totalLine: number;
  riskCnt: number;
  warnCnt: number;
  normalCnt: number;
  /** IE:SYSTEM 존재 여부. false 면 cps/co/trk/ext 는 0. */
  hasSystem: boolean;
  cps: number; // 초당 콜 유입(최근 5초 평균)
  co: TrunkNodeLeg; // 국선
  trk: TrunkNodeLeg; // SIP 트렁크
  ext: TrunkNodeLeg; // 내선
  licOver: number; // 라이선스 초과 거부콜(국선 수신+발신, 누적)
  cumCnt: number; // 국선 누적 콜수(수신+발신)
  coPeak: number; // 국선 당일 최대점유(수신+발신 피크 합)
  useMd: boolean; // 미디어딜리버리 사용
  useDrSync: boolean; // DR 동기화 사용
}

export interface TrunkFlowData {
  nodes: TrunkNode[];
  groups: TrunkGroup[];
}
