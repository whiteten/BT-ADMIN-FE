import type { ErrType } from '../types';

/** 그리드·피커 공통 뱃지 크기 고정값 (add-grid 스킬 표준) */
export const BADGE_CLASS = 'text-[13px] leading-[13px] font-medium !h-6';

/** 매핑에 없는 값 폴백 (add-grid 스킬 표준) */
export const DEFAULT_BADGE_CLASS = 'text-gray-500 bg-gray-100';

/** 발신코드 타입 색상 — ALARM(에러)=red, INFO(정보)=blue */
export const ERR_TYPE_BADGE_CLASS: Record<ErrType, string> = {
  ALARM: 'text-red-600 bg-red-50',
  INFO: 'text-blue-600 bg-blue-50',
};

/** 미등록 연락 채널 표시 — amber(경고성) */
export const CONTACT_EMPTY_BADGE_CLASS = 'text-amber-600 bg-amber-50';
