/**
 * 종합 헬스보드 데모 데이터.
 *
 * URL 쿼리 `?healthBoardDemo=1` 로 켜면, 라이브 WS 데이터 대신 4개 응대 지표
 * (응대율·SL·포기율·현재 대기)를 3초마다 지터시켜 게이지 애니메이션의 시각적 느낌을 확인할 수 있다.
 * 임계 밴드(정상→주의→위험)를 모두 넘나들도록 범위를 넓게 잡는다.
 */

/** 데모 모드 활성화 여부. URL 쿼리에 `healthBoardDemo=1` 이 있으면 true. */
export function isHealthBoardDemoMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return new URLSearchParams(window.location.search).get('healthBoardDemo') === '1';
  } catch {
    return false;
  }
}

const rand = (min: number, max: number): number => Math.round((min + Math.random() * (max - min)) * 10) / 10;

/**
 * toHealthData 가 정규화하는 raw(summary) 형태로 4개 지표만 지터한다.
 * (나머지 영역 — 시스템/큐/상담사/품질 등 — 은 미지정이라 0/빈 값으로 표시된다.)
 */
export function genHealthBoardDemo(): unknown {
  return {
    summary: {
      answerRate: rand(70, 99), // 정상≥90 / 주의≥80 / 위험<80
      serviceLevel: rand(70, 99),
      abandonRate: rand(0, 8), // 정상≤3 / 주의≤5 / 위험>5
      waitingCnt: Math.round(rand(0, 40)), // 정상≤9 / 주의≤29 / 위험>29
      inboundCnt: Math.round(rand(800, 1500)),
      answeredCnt: Math.round(rand(700, 1400)),
    },
  };
}
