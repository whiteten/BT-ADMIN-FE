import type { CtiqRow } from './types';

/**
 * 데모 데이터 — URL 에 `?ctiqDemo=1` 이 포함되면 위젯이 실 데이터 대신 본 배열을 사용한다.
 *
 * 용도:
 *  - WebSocket 미연결 환경에서 카드 시각화 확인
 *  - 시안/HTML 모형과 픽셀 비교
 *  - 디자인 변경 시 모든 심각도(idle/ok/warn/alert/danger) 한 번에 검증
 *
 * 운영에는 영향 없음 — 쿼리 파라미터가 없으면 무시된다.
 * KPI 필드(KPI_*)는 레거시와 동일하게 0~1 decimal (표시 시 ×100%).
 */

/**
 * 수기로 작성한 8개 큐 — 모든 심각도 시나리오 커버 (시각 검증용).
 * 기본 임계값(대기 10 / 최장 120s / SLA 90% / 포기율 10%) 기준으로 심각도가 결정됨.
 */
const HANDCRAFTED_CTIQS: CtiqRow[] = [
  // ① danger — 포기율 12.5% (임계 10% 초과) + 대기 18 + 최장 4:05
  {
    CTIQ_ID: 5001,
    CTIQ_NAME: 'VIP 음성',
    GDN_NO: 7001,
    RTS_WAIT_CNT: 18,
    RTS_MAXWAIT_TIME: 245,
    KPI_EWT_TIME: 180,
    RTS_EXP_LOGIN_AGT: 12,
    SUM_CONN_CNT: 320,
    SUM_ANSWER_CNT: 280,
    SUM_ANSWER_CNT_TOT: 280,
    SUM_SLANSW_CNT: 230,
    SUM_ABDN_CNT: 40,
    KPI_ANSWER_RATE: 0.875,
    KPI_SVCLEVEL: 0.72,
    KPI_ABANDON_RATIO: 0.125,
    KPI_WORKREADY_RATIO: 1.5,
    AVG_ANSTALK_TIME: 204,
    AVG_ANSWAIT_TIME: 65,
  },
  // ② alert — 최장 대기 2:36 (임계 120s 초과)
  {
    CTIQ_ID: 5002,
    CTIQ_NAME: '일반 상담',
    GDN_NO: 7002,
    RTS_WAIT_CNT: 8,
    RTS_MAXWAIT_TIME: 156,
    KPI_EWT_TIME: 120,
    RTS_EXP_LOGIN_AGT: 20,
    SUM_CONN_CNT: 540,
    SUM_ANSWER_CNT: 510,
    SUM_ANSWER_CNT_TOT: 510,
    SUM_SLANSW_CNT: 491,
    SUM_ABDN_CNT: 30,
    KPI_ANSWER_RATE: 0.944,
    KPI_SVCLEVEL: 0.91,
    KPI_ABANDON_RATIO: 0.055,
    KPI_WORKREADY_RATIO: 0.4,
    AVG_ANSTALK_TIME: 168,
    AVG_ANSWAIT_TIME: 42,
  },
  // ③ alert — SLA 78% (목표 90% 미달)
  {
    CTIQ_ID: 5003,
    CTIQ_NAME: '기술지원',
    GDN_NO: 7003,
    RTS_WAIT_CNT: 5,
    RTS_MAXWAIT_TIME: 88,
    KPI_EWT_TIME: 95,
    RTS_EXP_LOGIN_AGT: 8,
    SUM_CONN_CNT: 210,
    SUM_ANSWER_CNT: 180,
    SUM_ANSWER_CNT_TOT: 180,
    SUM_SLANSW_CNT: 164,
    SUM_ABDN_CNT: 25,
    KPI_ANSWER_RATE: 0.857,
    KPI_SVCLEVEL: 0.78,
    KPI_ABANDON_RATIO: 0.08,
    KPI_WORKREADY_RATIO: 0.6,
    AVG_ANSTALK_TIME: 320,
    AVG_ANSWAIT_TIME: 70,
  },
  // ④ warn — 대기 15 (임계 10 초과), 최장/SLA/포기율은 정상
  {
    CTIQ_ID: 5004,
    CTIQ_NAME: '콜백',
    GDN_NO: 7004,
    RTS_WAIT_CNT: 15,
    RTS_MAXWAIT_TIME: 64,
    KPI_EWT_TIME: 50,
    RTS_EXP_LOGIN_AGT: 10,
    SUM_CONN_CNT: 130,
    SUM_ANSWER_CNT: 122,
    SUM_ANSWER_CNT_TOT: 122,
    SUM_SLANSW_CNT: 121,
    SUM_ABDN_CNT: 8,
    KPI_ANSWER_RATE: 0.938,
    KPI_SVCLEVEL: 0.93,
    KPI_ABANDON_RATIO: 0.06,
    KPI_WORKREADY_RATIO: 1.5,
    AVG_ANSTALK_TIME: 140,
    AVG_ANSWAIT_TIME: 35,
  },
  // ⑤ ok — 전 지표 양호
  {
    CTIQ_ID: 5005,
    CTIQ_NAME: '마케팅 OB',
    GDN_NO: 7005,
    RTS_WAIT_CNT: 3,
    RTS_MAXWAIT_TIME: 22,
    KPI_EWT_TIME: 18,
    RTS_EXP_LOGIN_AGT: 15,
    SUM_CONN_CNT: 410,
    SUM_ANSWER_CNT: 400,
    SUM_ANSWER_CNT_TOT: 400,
    SUM_SLANSW_CNT: 390,
    SUM_ABDN_CNT: 6,
    KPI_ANSWER_RATE: 0.976,
    KPI_SVCLEVEL: 0.95,
    KPI_ABANDON_RATIO: 0.015,
    KPI_WORKREADY_RATIO: 0.2,
    AVG_ANSTALK_TIME: 151,
    AVG_ANSWAIT_TIME: 12,
  },
  // ⑥ ok — 챗봇, 회전 빠름
  {
    CTIQ_ID: 5006,
    CTIQ_NAME: '챗봇 상담',
    GDN_NO: 7006,
    SERVICE_MEDIA_TYPE: 10,
    RTS_WAIT_CNT: 1,
    RTS_MAXWAIT_TIME: 12,
    KPI_EWT_TIME: 8,
    RTS_EXP_LOGIN_AGT: 6,
    SUM_CONN_CNT: 250,
    SUM_ANSWER_CNT: 248,
    SUM_ANSWER_CNT_TOT: 248,
    SUM_SLANSW_CNT: 245,
    SUM_ABDN_CNT: 2,
    KPI_ANSWER_RATE: 0.992,
    KPI_SVCLEVEL: 0.98,
    KPI_ABANDON_RATIO: 0.008,
    KPI_WORKREADY_RATIO: 0.17,
    AVG_ANSTALK_TIME: 95,
    AVG_ANSWAIT_TIME: 6,
  },
  // ⑦ danger — 포기율 26.7% 폭증 + 대기 24 + 최장 5:12
  {
    CTIQ_ID: 5007,
    CTIQ_NAME: '긴급대응',
    GDN_NO: 7007,
    RTS_WAIT_CNT: 24,
    RTS_MAXWAIT_TIME: 312,
    KPI_EWT_TIME: 240,
    RTS_EXP_LOGIN_AGT: 9,
    SUM_CONN_CNT: 180,
    SUM_ANSWER_CNT: 132,
    SUM_ANSWER_CNT_TOT: 132,
    SUM_SLANSW_CNT: 104,
    SUM_ABDN_CNT: 48,
    KPI_ANSWER_RATE: 0.733,
    KPI_SVCLEVEL: 0.58,
    KPI_ABANDON_RATIO: 0.267,
    KPI_WORKREADY_RATIO: 2.67,
    AVG_ANSTALK_TIME: 288,
    AVG_ANSWAIT_TIME: 110,
  },
  // ⑧ idle — 인입·대기·로그인 모두 0 (휴면)
  {
    CTIQ_ID: 5008,
    CTIQ_NAME: '야간 큐',
    GDN_NO: 7008,
    RTS_WAIT_CNT: 0,
    RTS_MAXWAIT_TIME: 0,
    KPI_EWT_TIME: 0,
    RTS_EXP_LOGIN_AGT: 0,
    SUM_CONN_CNT: 0,
    SUM_ANSWER_CNT_TOT: 0,
    SUM_ABDN_CNT: 0,
  },
];

// ─── 합성 큐 — 다량 표시·성능 테스트용 ─────────────────────────────

const QUEUE_NAMES = [
  '음성 1팀',
  '음성 2팀',
  '음성 3팀',
  '채팅 상담',
  '영상 상담',
  '해지방어',
  '요금문의',
  '가입상담',
  '장애접수',
  'A/S 접수',
  '제휴문의',
  '환불처리',
  '예약콜',
  'VOC 처리',
  '본사 대표',
  '지사 대표',
];

/** 의사난수 — 시드 기반이라 새로고침해도 같은 분포. */
function rnd(seed: number, mod = 100): number {
  return ((seed * 9301 + 49297) % 233280) % mod;
}

function generateCtiqs(count: number, startId = 6000): CtiqRow[] {
  const rows: CtiqRow[] = [];
  for (let i = 0; i < count; i++) {
    const id = startId + i;
    const name = `${QUEUE_NAMES[i % QUEUE_NAMES.length]} ${Math.floor(i / QUEUE_NAMES.length) + 1}`;

    // 약 10% 는 휴면(0건) 큐
    const isIdle = rnd(i + 3, 10) === 0;
    if (isIdle) {
      rows.push({
        CTIQ_ID: id,
        CTIQ_NAME: name,
        GDN_NO: 8000 + i,
        RTS_WAIT_CNT: 0,
        RTS_MAXWAIT_TIME: 0,
        KPI_EWT_TIME: 0,
        RTS_EXP_LOGIN_AGT: 0,
        SUM_CONN_CNT: 0,
        SUM_ANSWER_CNT_TOT: 0,
        SUM_ABDN_CNT: 0,
      });
      continue;
    }

    const conn = 30 + rnd(i + 7, 600);
    const abdn = rnd(i + 11, Math.max(1, Math.floor(conn * 0.18)));
    const answered = Math.max(0, conn - abdn - rnd(i + 13, 10));
    const wait = rnd(i + 17, 25);
    const maxWait = rnd(i + 19, 300);
    const ewt = Math.floor(maxWait * 0.7);
    const login = 2 + rnd(i + 23, 25);
    const abandonRatio = conn > 0 ? abdn / conn : 0;
    const answerRate = conn > 0 ? answered / conn : 0;
    const svcLevel = (60 + rnd(i + 29, 40)) / 100; // 0.60~1.00
    const workReady = login > 0 ? wait / login : 0;

    rows.push({
      CTIQ_ID: id,
      CTIQ_NAME: name,
      GDN_NO: 8000 + i,
      TENANT_ID: 2000000001,
      MEDIA_TYPE: 0,
      RTS_WAIT_CNT: wait,
      RTS_MAXWAIT_TIME: maxWait,
      KPI_EWT_TIME: ewt,
      RTS_EXP_LOGIN_AGT: login,
      SUM_CONN_CNT: conn,
      SUM_ANSWER_CNT: answered,
      SUM_ANSWER_CNT_TOT: answered,
      SUM_SLANSW_CNT: Math.round(conn * svcLevel),
      SUM_ABDN_CNT: abdn,
      KPI_ANSWER_RATE: answerRate,
      KPI_SVCLEVEL: svcLevel,
      KPI_ABANDON_RATIO: abandonRatio,
      KPI_WORKREADY_RATIO: workReady,
      AVG_ANSTALK_TIME: 90 + rnd(i + 31, 240),
      AVG_ANSWAIT_TIME: rnd(i + 37, 120),
    });
  }
  return rows;
}

/** 최종 데모 데이터: 수기 8개 + 합성 32개. */
export const DEMO_CTIQS: CtiqRow[] = [...HANDCRAFTED_CTIQS, ...generateCtiqs(32)];

/** 데모 모드 활성화 여부. URL 쿼리에 `ctiqDemo=1` 이 있으면 true. */
export function isDemoMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return new URLSearchParams(window.location.search).get('ctiqDemo') === '1';
  } catch {
    return false;
  }
}
