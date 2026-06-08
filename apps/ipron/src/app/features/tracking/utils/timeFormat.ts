/**
 * 트래킹 화면용 시간 포맷 헬퍼 (통합).
 *
 * 기존에 CallFlowDiagram / CallDetail 에 흩어져 있던 5개 함수
 * (formatDur · formatDurShort · formatAxisLabel · fmt · fmtTalk) 를 한 곳으로.
 */
import dayjs from 'dayjs';

/** ISO 문자열 → HH:mm:ss (없으면 '-') */
export function fmtTime(iso: string | null | undefined): string {
  return iso ? dayjs(iso).format('HH:mm:ss') : '-';
}

/** 초 → 짧은 형식 (0.3s / 7.4s / 1:05 / 12m). 60s 미만은 소수점 1자리 보존 (sub-second 가시화). */
export function fmtDurShort(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '-';
  if (sec < 60) {
    const rounded = Math.round(sec * 10) / 10;
    return Number.isInteger(rounded) ? `${rounded}s` : `${rounded.toFixed(1)}s`;
  }
  const total = Math.round(sec);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return s === 0 ? `${m}m` : `${m}:${String(s).padStart(2, '0')}`;
}

/** 초 → 통화시간 형식 (m:ss 또는 h:mm:ss). 핵심 메트릭 박스용. */
export function fmtTalkTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0s';
  if (sec < 60) return `${sec.toFixed(sec < 10 ? 1 : 0)}s`;
  const total = Math.round(sec);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}

/** 시간축 라벨 (+5s / +1m / +1:30). 0초는 '0'. */
export function fmtAxisLabel(sec: number): string {
  if (sec === 0) return '0';
  if (sec < 60) return `+${sec}s`;
  const m = Math.floor(sec / 60);
  const ss = sec % 60;
  return ss === 0 ? `+${m}m` : `+${m}:${String(ss).padStart(2, '0')}`;
}

/** 초 → 풀 표기 (1m 5s). 디버그/툴팁용. */
export function fmtDurFull(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '-';
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}
