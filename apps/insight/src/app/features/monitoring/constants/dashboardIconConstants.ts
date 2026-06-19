import type { ReactNode } from 'react';
import { REPORT_ICON_LABELS, REPORT_ICON_SVG } from '../../report/constants/reportIconConstants';
import type { DashboardIconType } from '../types';

/**
 * 대시보드 카드 아이콘 — 통계 보고서와 동일 세트를 재사용한다(단일 소스).
 * 보고서/대시보드가 같은 성격이므로 시각 식별 아이콘도 동일하게 맞춘다.
 */
export const DASHBOARD_ICON_TYPES: DashboardIconType[] = ['agent', 'cti', 'ivr', 'channel', 'system'];

export const DASHBOARD_ICON_SVG: Record<DashboardIconType, ReactNode> = REPORT_ICON_SVG;
export const DASHBOARD_ICON_LABELS: Record<DashboardIconType, string> = REPORT_ICON_LABELS;

/** 카드/헤더에서 안전하게 쓰는 기본 아이콘. */
export const DEFAULT_DASHBOARD_ICON: DashboardIconType = 'system';
