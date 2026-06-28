/**
 * Mock 위젯 데이터 — BE 미구현 상태에서 미리보기·검증용
 * BE 구현 완료 후 본 파일 전체 삭제
 */

import type { DatasetDetail } from '../types';

const DEPT_SAMPLES = [
  { DEPT_CODE: 'D001', DEPT_NAME: '영업1팀', DEPT_MANAGER: '김부장', DEPT_SIZE: 12 },
  { DEPT_CODE: 'D002', DEPT_NAME: '영업2팀', DEPT_MANAGER: '이부장', DEPT_SIZE: 9 },
  { DEPT_CODE: 'D003', DEPT_NAME: 'VIP라인', DEPT_MANAGER: '박팀장', DEPT_SIZE: 6 },
  { DEPT_CODE: 'D004', DEPT_NAME: '고객지원', DEPT_MANAGER: '최팀장', DEPT_SIZE: 14 },
];

const TIME_SAMPLES = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

/** 데이터셋 + jitter (0~1)로 mock rows 생성 */
export function generateMockRows(detail: DatasetDetail | undefined, jitter = 0): Record<string, unknown>[] {
  if (!detail) return [];

  // 부서별 통화 현황 (datasetId 1)
  if (detail.datasetCode === 'dept_call_status') {
    return DEPT_SAMPLES.map((d, idx) => {
      const TOTAL_CALL = Math.round(400 - idx * 50 + (jitter - 0.5) * 40);
      const ANSWER_CNT = Math.round(TOTAL_CALL * (0.9 + (jitter - 0.5) * 0.1) - idx * 2);
      const MISS_CNT = TOTAL_CALL - ANSWER_CNT;
      const AHT = Math.round(180 + (jitter - 0.5) * 60 + idx * 10);
      const ANSWER_RATE = Math.round((ANSWER_CNT / TOTAL_CALL) * 1000) / 10;
      return {
        ...d,
        TOTAL_CALL,
        ANSWER_CNT,
        MISS_CNT,
        AHT,
        UPDATED_AT: new Date().toISOString(),
        ANSWER_RATE,
        STATUS: ANSWER_RATE >= 90 ? '정상' : '경고',
      };
    });
  }

  // 시간대별 통화량 (datasetId 2)
  if (detail.datasetCode === 'time_call_volume') {
    return TIME_SAMPLES.map((time, idx) => {
      const base = idx >= 2 && idx <= 6 ? 280 : 120;
      const CALL_COUNT = Math.round(base + (jitter - 0.5) * 60 + Math.sin(idx + jitter) * 30);
      return {
        TIME_BUCKET: time,
        CALL_COUNT,
        PEAK_FLAG: CALL_COUNT > 250 ? 'PEAK' : 'NORMAL',
      };
    });
  }

  // 기본 패턴 — 데이터셋의 실제 필드로 mock 생성
  //   DIM(DATE/DATETIME/TIME)=시간축, DIM(그 외)=카테고리, MSR/계산필드(MSR)=숫자
  //   → 임의 데이터셋에서도 그리드·막대·선·카드·파이 미리보기가 실제 컬럼명으로 동작
  const visibleBase = detail.fields.filter((f) => f.isVisible !== false);
  const dims = visibleBase.filter((f) => f.classification === 'DIM');
  const msrs = visibleBase.filter((f) => f.classification === 'MSR');
  const calcMsrs = detail.calcFields.filter((c) => c.classification === 'MSR');
  const CATEGORIES = ['항목 A', '항목 B', '항목 C', '항목 D', '항목 E', '항목 F'];
  const TIMES = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00'];
  const ROW_COUNT = 6;

  return Array.from({ length: ROW_COUNT }, (_, i) => {
    const row: Record<string, unknown> = {};
    dims.forEach((d, di) => {
      if (d.dataType === 'DATE' || d.dataType === 'DATETIME' || d.dataType === 'TIME') {
        row[d.fieldName] = TIMES[i % TIMES.length];
      } else {
        row[d.fieldName] = di === 0 ? CATEGORIES[i % CATEGORIES.length] : `${d.fieldName}-${i + 1}`;
      }
    });
    msrs.forEach((m, mi) => {
      const base = 120 - i * 15 + mi * 20;
      row[m.fieldName] = Math.max(0, Math.round(base + (jitter - 0.5) * 30 + (i % 3) * 6));
    });
    calcMsrs.forEach((c) => {
      row[c.fieldName] = Math.max(0, Math.round(60 + (jitter - 0.5) * 20 + i * 4));
    });
    return row;
  });
}
