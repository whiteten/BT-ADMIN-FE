import type { AgentRow } from './types';

/**
 * 데모 데이터 — URL 에 `?agentDemo=1` 이 포함되면 위젯이 실 데이터 대신 본 배열을 사용한다.
 *
 * 용도:
 *  - WebSocket 미연결 환경에서 카드 시각화 확인
 *  - 시안/HTML 모형과 픽셀 비교
 *  - 디자인 변경 시 모든 상태(alert/warn/normal × 통화/대기/벨/보류/후처리/이석) 한 번에 검증
 *
 * 운영에는 영향 없음 — 쿼리 파라미터가 없으면 무시된다.
 */

const NOW = Date.now();
const SEC = 1000;
const MIN = 60 * SEC;

/** 수기로 작성한 14명 — 모든 상태/임계/MoS 시나리오 커버 (시각 검증용). */
const HANDCRAFTED_AGENTS: AgentRow[] = [
  // ── VIP 상담 (GROUP_ID=3001) ───────────────────────────────────
  // ① 통화 IB · 12:48 임계 초과 (5분 alarm) — MoS 매우나쁨
  {
    AGENT_ID: 1001,
    AGENT_NAME: '홍길동',
    AGENT_LOGIN_ID: 'kor1234',
    LOGIN_DN_NO: 3001,
    GROUP_ID: 3001,
    GROUP_NAME: 'VIP 상담',
    CATEGORY_TYPE: 10,
    AGENT_STATUS: 50,
    REASON_CODE: 10,
    STATUS_TIME: Math.floor((NOW - 12 * MIN - 48 * SEC) / 1000),
    FINAL_TALK_ANI: '01025478821',
    LAST_ICQ_NAME: 'VIP 상담',
    LAST_SKILL_NAME: 'KOR',
    SUM_ANSW_CNT: 23,
    SUM_CONN_CNT: 26,
    SUM_IB_TALKTIME: 4200,
    SUM_TRNS_OUT: 4,
    KPI_ANSWER_RATE2: 87,
    KPI_SVCLEVEL2: 72,
    AVG_ANSTALK_TIME: 204,
    LOGIN_TIME: Math.floor((NOW - 7 * 3600 * 1000) / 1000),
    CURR_MEDIA_CALL_CNT: 1,
    MOS: 2.4,
    AUX_CNT: 5,
    AUX_TIME: 720,
  },
  // ② 통화 IB · 5:23 정상
  // ② 통화 IB 5:23 — MoS 좋음
  {
    AGENT_ID: 1002,
    AGENT_NAME: '김민서',
    AGENT_LOGIN_ID: 'kim_ms',
    LOGIN_DN_NO: 3002,
    GROUP_ID: 3001,
    GROUP_NAME: 'VIP 상담',
    CATEGORY_TYPE: 20,
    AGENT_STATUS: 50,
    REASON_CODE: 10,
    STATUS_TIME: Math.floor((NOW - 5 * MIN - 23 * SEC) / 1000),
    FINAL_TALK_ANI: '01034125510',
    LAST_ICQ_NAME: 'VIP 상담',
    LAST_SKILL_NAME: 'KOR',
    SUM_ANSW_CNT: 31,
    SUM_CONN_CNT: 32,
    SUM_IB_TALKTIME: 5580,
    SUM_TRNS_OUT: 2,
    KPI_ANSWER_RATE2: 96,
    KPI_SVCLEVEL2: 88,
    AVG_ANSTALK_TIME: 168,
    LOGIN_TIME: Math.floor((NOW - 4.5 * 3600 * 1000) / 1000),
    CURR_MEDIA_CALL_CNT: 1,
    MOS: 4.3,
    AUX_CNT: 2,
    AUX_TIME: 240,
  },
  // ③ 통화 OB · 1:12 + 멀티콜 ×2 + 전환 — MoS 좋음
  {
    AGENT_ID: 1003,
    AGENT_NAME: '이수진',
    AGENT_LOGIN_ID: 'lee_sj',
    LOGIN_DN_NO: 3003,
    GROUP_ID: 3001,
    GROUP_NAME: 'VIP 상담',
    CATEGORY_TYPE: 30,
    AGENT_STATUS: 50,
    REASON_CODE: 20,
    STATUS_TIME: Math.floor((NOW - 1 * MIN - 12 * SEC) / 1000),
    AGENT_BUSY_STATUS: '00001000',
    FINAL_TALK_ANI: '0227208124',
    LAST_ICQ_NAME: 'VIP OB',
    LAST_SKILL_NAME: 'KOR',
    SUM_ANSW_CNT: 28,
    SUM_OB_SUCC: 12,
    SUM_CONN_CNT: 30,
    SUM_OB_TALKTIME: 1584,
    KPI_ANSWER_RATE2: 95,
    KPI_SVCLEVEL2: 91,
    AVG_ANSTALK_TIME: 132,
    LOGIN_TIME: Math.floor((NOW - 6 * 3600 * 1000) / 1000),
    CURR_MEDIA_CALL_CNT: 2,
    MOS: 4.1,
  },
  // ④ 대기 IB · 0:08 — MoS 좋음
  {
    AGENT_ID: 1004,
    AGENT_NAME: '박지훈',
    AGENT_LOGIN_ID: 'park_jh',
    LOGIN_DN_NO: 3004,
    GROUP_ID: 3001,
    GROUP_NAME: 'VIP 상담',
    CATEGORY_TYPE: 0,
    AGENT_STATUS: 41,
    STATUS_TIME: Math.floor((NOW - 8 * SEC) / 1000),
    SUM_ANSW_CNT: 35,
    SUM_CONN_CNT: 36,
    SUM_IB_TALKTIME: 5880,
    KPI_ANSWER_RATE2: 98,
    KPI_SVCLEVEL2: 93,
    AVG_ANSTALK_TIME: 168,
    LOGIN_TIME: Math.floor((NOW - 5 * 3600 * 1000) / 1000),
    CURR_MEDIA_CALL_CNT: 0,
    MOS: 4.5,
  },
  // ⑤ 벨울림 0:08 (warn - 6초 notice 초과) — MoS 허용불가
  {
    AGENT_ID: 1005,
    AGENT_NAME: '최은우',
    AGENT_LOGIN_ID: 'choi_ew',
    LOGIN_DN_NO: 3005,
    GROUP_ID: 3001,
    GROUP_NAME: 'VIP 상담',
    CATEGORY_TYPE: 10,
    AGENT_STATUS: 51,
    STATUS_TIME: Math.floor((NOW - 8 * SEC) / 1000),
    FINAL_TALK_ANI: '07055129210',
    SUM_ANSW_CNT: 26,
    SUM_CONN_CNT: 28,
    KPI_ANSWER_RATE2: 91,
    KPI_SVCLEVEL2: 78,
    AVG_ANSTALK_TIME: 178,
    LOGIN_TIME: Math.floor((NOW - 3 * 3600 * 1000) / 1000),
    CURR_MEDIA_CALL_CNT: 1,
    MOS: 1.7,
  },
  // ⑥ 통화 IB · 8:34 (warn 5분 초과) — MoS 나쁨
  {
    AGENT_ID: 1006,
    AGENT_NAME: '정유진',
    AGENT_LOGIN_ID: 'jung_yj',
    LOGIN_DN_NO: 3006,
    GROUP_ID: 3001,
    GROUP_NAME: 'VIP 상담',
    CATEGORY_TYPE: 20,
    AGENT_STATUS: 50,
    REASON_CODE: 10,
    STATUS_TIME: Math.floor((NOW - 8 * MIN - 34 * SEC) / 1000),
    FINAL_TALK_ANI: '01099823361',
    LAST_ICQ_NAME: 'VIP 상담',
    LAST_SKILL_NAME: 'KOR',
    SUM_ANSW_CNT: 19,
    SUM_CONN_CNT: 22,
    SUM_IB_TALKTIME: 5472,
    KPI_ANSWER_RATE2: 89,
    KPI_SVCLEVEL2: 82,
    AVG_ANSTALK_TIME: 288,
    LOGIN_TIME: Math.floor((NOW - 5 * 3600 * 1000) / 1000),
    CURR_MEDIA_CALL_CNT: 1,
    MOS: 3.4,
  },
  // ⑦ 후처리 2:14 — MoS 보통
  {
    AGENT_ID: 1007,
    AGENT_NAME: '강민호',
    AGENT_LOGIN_ID: 'kang_mh',
    LOGIN_DN_NO: 3007,
    GROUP_ID: 3001,
    GROUP_NAME: 'VIP 상담',
    CATEGORY_TYPE: 30,
    AGENT_STATUS: 60,
    STATUS_TIME: Math.floor((NOW - 2 * MIN - 14 * SEC) / 1000),
    SUM_ANSW_CNT: 22,
    SUM_CONN_CNT: 24,
    SUM_IB_TALKTIME: 4136,
    SUM_TRNS_OUT: 1,
    KPI_ANSWER_RATE2: 94,
    KPI_SVCLEVEL2: 85,
    SUM_ACW_CNT: 22,
    SUM_ACW_TIME: 660,
    AVG_ANSTALK_TIME: 188,
    LOGIN_TIME: Math.floor((NOW - 6 * 3600 * 1000) / 1000),
    CURR_MEDIA_CALL_CNT: 0,
    MOS: 3.7,
    AUX_CNT: 3,
    AUX_TIME: 480,
  },
  // ⑧ 대기 OB 0:46 — MoS 보통
  {
    AGENT_ID: 1008,
    AGENT_NAME: '윤서연',
    AGENT_LOGIN_ID: 'yoon_sy',
    LOGIN_DN_NO: 3008,
    GROUP_ID: 3001,
    GROUP_NAME: 'VIP 상담',
    CATEGORY_TYPE: 40,
    AGENT_STATUS: 42,
    STATUS_TIME: Math.floor((NOW - 46 * SEC) / 1000),
    SUM_ANSW_CNT: 38,
    SUM_CONN_CNT: 40,
    SUM_OB_SUCC: 14,
    SUM_OB_TALKTIME: 3528,
    KPI_ANSWER_RATE2: 95,
    KPI_SVCLEVEL2: 89,
    AVG_ANSTALK_TIME: 151,
    LOGIN_TIME: Math.floor((NOW - 7 * 3600 * 1000) / 1000),
    CURR_MEDIA_CALL_CNT: 0,
    MOS: 3.9,
  },

  // ── 일반 상담 (GROUP_ID=3002) ──────────────────────────────────
  // ⑨ 보류 · 3:21 임계 초과 (2분 alarm) — MoS 허용불가
  {
    AGENT_ID: 2001,
    AGENT_NAME: '조하나',
    AGENT_LOGIN_ID: 'cho_h',
    LOGIN_DN_NO: 3010,
    GROUP_ID: 3002,
    GROUP_NAME: '일반 상담',
    CATEGORY_TYPE: 0,
    AGENT_STATUS: 53,
    STATUS_TIME: Math.floor((NOW - 3 * MIN - 21 * SEC) / 1000),
    FINAL_TALK_ANI: '01051282901',
    LAST_ICQ_NAME: '일반 상담',
    SUM_ANSW_CNT: 18,
    SUM_CONN_CNT: 20,
    SUM_IB_TALKTIME: 3024,
    SUM_TRNS_OUT: 5,
    KPI_ANSWER_RATE2: 90,
    KPI_SVCLEVEL2: 75,
    LOGIN_TIME: Math.floor((NOW - 4 * 3600 * 1000) / 1000),
    CURR_MEDIA_CALL_CNT: 1,
    MOS: 1.2,
    AUX_CNT: 8,
    AUX_TIME: 1200,
  },
  // ⑩ 이석 18:42 — MoS 미측정(-1) → 인디케이터 숨김
  {
    AGENT_ID: 2002,
    AGENT_NAME: '한지원',
    AGENT_LOGIN_ID: 'han_jw',
    LOGIN_DN_NO: 3011,
    GROUP_ID: 3002,
    GROUP_NAME: '일반 상담',
    CATEGORY_TYPE: 0,
    AGENT_STATUS: 30,
    REASON_CODE: 1,
    STATUS_TIME: Math.floor((NOW - 18 * MIN - 42 * SEC) / 1000),
    SUM_ANSW_CNT: 15,
    SUM_CONN_CNT: 17,
    KPI_ANSWER_RATE2: 88,
    KPI_SVCLEVEL2: 70,
    LOGIN_TIME: Math.floor((NOW - 5 * 3600 * 1000) / 1000),
    MOS: -1,
  },
  // ⑪ 다이얼링 0:12 — MoS 매우나쁨
  {
    AGENT_ID: 2003,
    AGENT_NAME: '송하준',
    AGENT_LOGIN_ID: 'song_hj',
    LOGIN_DN_NO: 3012,
    GROUP_ID: 3002,
    GROUP_NAME: '일반 상담',
    CATEGORY_TYPE: 50,
    AGENT_STATUS: 52,
    STATUS_TIME: Math.floor((NOW - 12 * SEC) / 1000),
    FINAL_TALK_ANI: '01078123344',
    SUM_ANSW_CNT: 12,
    SUM_OB_SUCC: 8,
    KPI_ANSWER_RATE2: 92,
    KPI_SVCLEVEL2: 81,
    LOGIN_TIME: Math.floor((NOW - 3 * 3600 * 1000) / 1000),
    MOS: 2.9,
  },
  // ⑫ 통화 OB 3:22 — MoS 미포함(필드 없음) → 인디케이터 숨김
  {
    AGENT_ID: 2004,
    AGENT_NAME: '남궁수',
    AGENT_LOGIN_ID: 'nam_g',
    LOGIN_DN_NO: 3013,
    GROUP_ID: 3002,
    GROUP_NAME: '일반 상담',
    CATEGORY_TYPE: 0,
    AGENT_STATUS: 50,
    REASON_CODE: 20,
    STATUS_TIME: Math.floor((NOW - 3 * MIN - 22 * SEC) / 1000),
    FINAL_TALK_ANI: '01045672209',
    LAST_ICQ_NAME: '일반 OB',
    SUM_ANSW_CNT: 29,
    SUM_OB_SUCC: 18,
    SUM_OB_TALKTIME: 2484,
    KPI_ANSWER_RATE2: 92,
    KPI_SVCLEVEL2: 86,
    AVG_ANSTALK_TIME: 138,
    LOGIN_TIME: Math.floor((NOW - 5 * 3600 * 1000) / 1000),
    CURR_MEDIA_CALL_CNT: 1,
  },
  // ⑬ 대기 IB 1:24 — MoS 좋음 (경계값 4.0)
  {
    AGENT_ID: 2005,
    AGENT_NAME: '서지은',
    AGENT_LOGIN_ID: 'seo_je',
    LOGIN_DN_NO: 3014,
    GROUP_ID: 3002,
    GROUP_NAME: '일반 상담',
    CATEGORY_TYPE: 0,
    AGENT_STATUS: 41,
    STATUS_TIME: Math.floor((NOW - 1 * MIN - 24 * SEC) / 1000),
    SUM_ANSW_CNT: 42,
    SUM_CONN_CNT: 43,
    SUM_IB_TALKTIME: 6804,
    KPI_ANSWER_RATE2: 97,
    KPI_SVCLEVEL2: 92,
    AVG_ANSTALK_TIME: 162,
    LOGIN_TIME: Math.floor((NOW - 6 * 3600 * 1000) / 1000),
    MOS: 4.0,
  },
  // ⑭ 로그아웃 (오프라인)
  {
    AGENT_ID: 2006,
    AGENT_NAME: '백승호',
    AGENT_LOGIN_ID: 'baek_sh',
    LOGIN_DN_NO: 3020,
    GROUP_ID: 3002,
    GROUP_NAME: '일반 상담',
    CATEGORY_TYPE: 0,
    AGENT_STATUS: 10,
    STATUS_TIME: 0,
  },
];

// ─── 1000명 합성 데이터 — 가상화·성능 테스트용 ─────────────────────

const FAMILY = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '류', '홍'];
const GIVEN = [
  '민서',
  '준호',
  '지훈',
  '수진',
  '은우',
  '유진',
  '민호',
  '서연',
  '지원',
  '하준',
  '수민',
  '지은',
  '승호',
  '하나',
  '은지',
  '도윤',
  '지수',
  '채원',
  '시우',
  '예린',
  '다은',
  '서준',
  '하윤',
  '준서',
  '예준',
];

const DEMO_GROUPS = [
  { id: 3001, name: 'VIP 상담' },
  { id: 3002, name: '일반 상담' },
  { id: 3003, name: '콜백' },
  { id: 3004, name: '마케팅' },
  { id: 3005, name: '긴급대응' },
  { id: 3006, name: '기술지원' },
];

/**
 * 가중치 분포로 상태 패턴 생성.
 * - 통화/대기 비중 ↑ (실제 콜센터 가까운 분포)
 * - 로그아웃 일부 포함
 */
const STATUS_DECK: Array<{ status: number; reasonCode?: number }> = [
  ...Array(25).fill({ status: 41 }), // 대기 IB
  ...Array(15).fill({ status: 42 }), // 대기 OB
  ...Array(20).fill({ status: 50, reasonCode: 10 }), // 통화 IB
  ...Array(12).fill({ status: 50, reasonCode: 20 }), // 통화 OB
  ...Array(4).fill({ status: 51 }), // 벨울림
  ...Array(2).fill({ status: 52 }), // 다이얼링
  ...Array(3).fill({ status: 53 }), // 보류
  ...Array(8).fill({ status: 60 }), // 후처리
  ...Array(6).fill({ status: 30, reasonCode: 1 }), // 이석
  ...Array(5).fill({ status: 10 }), // 로그아웃
]; // 총 100 — index % 100 으로 순환

/** 의사난수 — 시드 기반이라 새로고침해도 같은 분포. */
function rnd(seed: number, mod = 100): number {
  // 간단한 LCG
  return ((seed * 9301 + 49297) % 233280) % mod;
}

function generateAgents(count: number, startId = 10000): AgentRow[] {
  const rows: AgentRow[] = [];
  for (let i = 0; i < count; i++) {
    const id = startId + i;
    const familyName = FAMILY[i % FAMILY.length];
    const givenName = GIVEN[(i * 7) % GIVEN.length];
    const name = `${familyName}${givenName}`;
    const loginId = `agent${id}`;
    const dn = String(5000 + i);
    const group = DEMO_GROUPS[i % DEMO_GROUPS.length];
    const stEntry = STATUS_DECK[i % STATUS_DECK.length];

    const isOffline = stEntry.status === 10;
    const isInCall = stEntry.status === 50 || stEntry.status === 51 || stEntry.status === 52 || stEntry.status === 53;

    // 상태 시작 시각 — 0~20분 사이 분산
    const durationSec = rnd(i + 1, 1200);
    const statusTimeSec = Math.floor((NOW - durationSec * SEC) / 1000);

    // 누적 KPI — 응답 0~50, 인입 응답*1.05~1.3 사이
    const ansCnt = 5 + rnd(i + 7, 45);
    const connCnt = Math.round(ansCnt * (1.05 + rnd(i + 11, 25) / 100));
    const obSucc = rnd(i + 13, 15);
    const trnsOut = rnd(i + 17, Math.max(1, Math.floor(ansCnt * 0.15)));
    const ibTalk = 60 + rnd(i + 19, 4000);
    const obTalk = rnd(i + 23, 1500);
    const avgAnstalk = 90 + rnd(i + 29, 200); // 1.5~5분
    const auxCnt = rnd(i + 31, 10);
    const auxTime = rnd(i + 37, 900); // 0~15분
    const kpiAnswer = 70 + rnd(i + 41, 30); // 70~100%
    const kpiSvc = 60 + rnd(i + 43, 40); // 60~100%
    const mos = isOffline ? -1 : (10 + rnd(i + 47, 40)) / 10; // 1.0~5.0

    const row: AgentRow = {
      AGENT_ID: id,
      AGENT_NAME: name,
      AGENT_LOGIN_ID: loginId,
      LOGIN_DN_NO: dn,
      TENANT_ID: 2000000001,
      GROUP_ID: group.id,
      GROUP_NAME: group.name,
      MEDIA_TYPE: 0,
      AGENT_STATUS: stEntry.status,
      REASON_CODE: stEntry.reasonCode,
      STATUS_TIME: isOffline ? 0 : statusTimeSec,
      LOGIN_TIME: Math.floor((NOW - (3 + rnd(i + 3, 6)) * 3600 * 1000) / 1000),
      SUM_ANSW_CNT: ansCnt,
      SUM_CONN_CNT: connCnt,
      SUM_OB_SUCC: obSucc,
      SUM_TRNS_OUT: trnsOut,
      SUM_IB_TALKTIME: ibTalk,
      SUM_OB_TALKTIME: obTalk,
      AVG_ANSTALK_TIME: avgAnstalk,
      KPI_ANSWER_RATE2: kpiAnswer,
      KPI_SVCLEVEL2: kpiSvc,
      AUX_CNT: auxCnt,
      AUX_TIME: auxTime,
      SELF_HANDLE_RATE: ansCnt > 0 ? Math.max(0, 1 - trnsOut / ansCnt) * 100 : 100,
    };
    if (!isOffline) row.MOS = mos;
    if (isInCall) {
      row.FINAL_TALK_ANI = `010${String(10000000 + rnd(i + 53, 90000000))}`;
      row.LAST_ICQ_NAME = group.name;
    }
    rows.push(row);
  }
  return rows;
}

/** 최종 데모 데이터: 수기 14명 + 합성 1000명. */
export const DEMO_AGENTS: AgentRow[] = [...HANDCRAFTED_AGENTS, ...generateAgents(1000)];

/** 데모 모드 활성화 여부. URL 쿼리에 `agentDemo=1` 이 있으면 true. */
export function isDemoMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return new URLSearchParams(window.location.search).get('agentDemo') === '1';
  } catch {
    return false;
  }
}
