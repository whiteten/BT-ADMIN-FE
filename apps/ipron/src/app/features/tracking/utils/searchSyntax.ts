/**
 * 명령어 팔레트 검색 문법 파서 (FE 정규식)
 * SD-CALL-TRACKING.md § 7.2 기반
 *
 * 입력: "ucid:abc123 ani:01012345678 기간:오늘 result:포기"
 * 출력: TrackingSearchCriteria
 *
 * 자연어 X — 정해진 prefix만 인식. prefix 없는 토큰은 ANI(숫자) 또는 UCID(영숫자)로 추론.
 */
import type { CallResult, DateRangePreset, TrackingMode, TrackingSearchCriteria } from '../types/tracking.types';

// ─── 프리셋 (한글 + 영문 alias) ────────────────────────────────────────────

const PRESET_ALIAS: Record<string, DateRangePreset> = {
  최근1시간: 'LAST_1H',
  '최근 1시간': 'LAST_1H',
  '1h': 'LAST_1H',
  오늘: 'TODAY',
  today: 'TODAY',
  어제: 'YESTERDAY',
  yesterday: 'YESTERDAY',
  최근24시간: 'LAST_24H',
  '최근 24시간': 'LAST_24H',
  '1d': 'LAST_24H',
  '24h': 'LAST_24H',
  '7d': 'THIS_WEEK',
  이번주: 'THIS_WEEK',
  지난주: 'LAST_WEEK',
};

const RESULT_ALIAS: Record<string, CallResult> = {
  완료: 'COMPLETED',
  정상: 'COMPLETED',
  completed: 'COMPLETED',
  포기: 'ABANDONED',
  abandoned: 'ABANDONED',
  단절: 'DISCONNECTED',
  호단절: 'DISCONNECTED',
  호장애: 'DISCONNECTED',
  disconnected: 'DISCONNECTED',
  IVR자가해결: 'IVR_SELF',
  ivr자가해결: 'IVR_SELF',
  ivr_self: 'IVR_SELF',
  전환: 'TRANSFERRED',
  호전환: 'TRANSFERRED',
  transferred: 'TRANSFERRED',
  미응답: 'NO_ANSWER',
  no_answer: 'NO_ANSWER',
};

const MODE_ALIAS: Record<string, TrackingMode> = {
  pbx: 'PBX',
  ivr: 'IVR',
  cti: 'CTI',
};

// ─── 시간 범위 계산 ────────────────────────────────────────────────────────

/** Java LocalDateTime 호환 로컬 시각 문자열 (timezone 변환 X). 예: "2026-05-08T00:00:00" */
function formatLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function presetToRange(preset: DateRangePreset): { startTime: string; endTime: string } {
  const now = new Date();
  const start = new Date(now);

  switch (preset) {
    case 'LAST_1H':
      start.setHours(start.getHours() - 1);
      break;
    case 'TODAY':
      start.setHours(0, 0, 0, 0);
      break;
    case 'YESTERDAY': {
      const yStart = new Date(now);
      yStart.setDate(yStart.getDate() - 1);
      yStart.setHours(0, 0, 0, 0);
      const yEnd = new Date(yStart);
      yEnd.setHours(23, 59, 59, 999);
      return { startTime: formatLocal(yStart), endTime: formatLocal(yEnd) };
    }
    case 'LAST_24H':
      start.setDate(start.getDate() - 1);
      break;
    case 'THIS_WEEK': {
      // 월요일 시작 가정
      const day = start.getDay() || 7;
      start.setDate(start.getDate() - (day - 1));
      start.setHours(0, 0, 0, 0);
      break;
    }
    case 'LAST_WEEK': {
      const day = start.getDay() || 7;
      const lwEnd = new Date(start);
      lwEnd.setDate(lwEnd.getDate() - day);
      lwEnd.setHours(23, 59, 59, 999);
      const lwStart = new Date(lwEnd);
      lwStart.setDate(lwStart.getDate() - 6);
      lwStart.setHours(0, 0, 0, 0);
      return { startTime: formatLocal(lwStart), endTime: formatLocal(lwEnd) };
    }
    case 'CUSTOM':
    default:
      start.setHours(start.getHours() - 1);
      break;
  }
  return { startTime: formatLocal(start), endTime: formatLocal(now) };
}

// ─── duration 토큰 (5m / 30s / 5m~10m) ─────────────────────────────────────

function parseDurationToken(raw: string): { min?: number; max?: number } {
  // "5m" / "30s" / "5m~10m" / ">=5m" / "<=10m"
  const tokens = raw.trim();
  const toSec = (t: string): number | null => {
    const m = /^(\d+)([smh])?$/i.exec(t.trim());
    if (!m) return null;
    const n = Number(m[1]);
    const unit = (m[2] ?? 's').toLowerCase();
    const mult = unit === 'h' ? 3600 : unit === 'm' ? 60 : 1;
    return n * mult;
  };

  const ge = /^>=\s*(.+)$/.exec(tokens);
  if (ge) {
    const v = toSec(ge[1]);
    return v != null ? { min: v } : {};
  }
  const le = /^<=\s*(.+)$/.exec(tokens);
  if (le) {
    const v = toSec(le[1]);
    return v != null ? { max: v } : {};
  }
  if (tokens.includes('~')) {
    const [a, b] = tokens.split('~').map((s) => s.trim());
    const aSec = toSec(a);
    const bSec = toSec(b);
    return { min: aSec ?? undefined, max: bSec ?? undefined };
  }
  const v = toSec(tokens);
  return v != null ? { min: v } : {};
}

// ─── 메인 파서 ──────────────────────────────────────────────────────────────

/**
 * cmdk raw query → TrackingSearchCriteria.
 *
 * 누락된 필드는 호출부(검색 페이지)에서 default로 채움 (mode=PBX, period=LAST_1H).
 */
export function parseSearchSyntax(raw: string): Partial<TrackingSearchCriteria> & { _preset?: DateRangePreset; _customRange?: { start: string; end: string } } {
  const out: Partial<TrackingSearchCriteria> & { _preset?: DateRangePreset; _customRange?: { start: string; end: string } } = {};
  if (!raw?.trim()) return out;

  const tokens = raw.trim().split(/\s+/);

  for (const tok of tokens) {
    const colonIdx = tok.indexOf(':');
    if (colonIdx <= 0) {
      // prefix 없음 — 추론
      if (/^\d{4,11}$/.test(tok)) out.ani = tok;
      else if (tok.length >= 4) out.ucid = tok;
      continue;
    }
    const key = tok.slice(0, colonIdx).toLowerCase();
    const val = tok.slice(colonIdx + 1);
    if (!val) continue;

    switch (key) {
      case 'ucid':
        out.ucid = val;
        break;
      case 'ani':
        out.ani = val;
        break;
      case 'dnis':
        out.dnis = val;
        break;
      case 'tenant':
        out.tenantId = Number(val) || null;
        break;
      case 'node':
        out.nodeId = Number(val) || null;
        break;
      case 'queue':
        out.queueId = Number(val) || null;
        break;
      case 'agent':
        out.agentId = val;
        break;
      case 'scenario':
        out.scenarioId = Number(val) || null;
        break;
      case 'result': {
        // "포기,단절" 다중 가능
        const list = val
          .split(',')
          .map((v) => RESULT_ALIAS[v.trim()] ?? RESULT_ALIAS[v.trim().toLowerCase()])
          .filter((x): x is CallResult => Boolean(x));
        if (list.length > 0) out.results = list;
        break;
      }
      case '시간':
      case 'duration': {
        const r = parseDurationToken(val);
        if (r.min != null) out.durationMinSec = r.min;
        if (r.max != null) out.durationMaxSec = r.max;
        break;
      }
      case '큐대기':
      case 'queuewait':
      case 'queue_wait': {
        const r = parseDurationToken(val);
        if (r.min != null) out.queueWaitMinSec = r.min;
        if (r.max != null) out.queueWaitMaxSec = r.max;
        break;
      }
      case '상담시간':
      case 'agenttalk':
      case 'agent_talk': {
        // AGT_1830(인바운드) + AGT_1810(아웃바운드) 합. 최소값만 사용
        const r = parseDurationToken(val);
        if (r.min != null) out.agentTalkMinSec = r.min;
        break;
      }
      case '기간':
      case 'period': {
        const preset = PRESET_ALIAS[val] ?? PRESET_ALIAS[val.toLowerCase()];
        if (preset) {
          out._preset = preset;
          const range = presetToRange(preset);
          out.startTime = range.startTime;
          out.endTime = range.endTime;
        } else if (/^\d{4}-\d{2}-\d{2}~\d{4}-\d{2}-\d{2}$/.test(val)) {
          const [s, e] = val.split('~');
          out._preset = 'CUSTOM';
          out._customRange = { start: s, end: e };
          out.startTime = new Date(`${s}T00:00:00`).toISOString();
          out.endTime = new Date(`${e}T23:59:59`).toISOString();
        }
        break;
      }
      case 'tracking':
      case 'mode': {
        const m = MODE_ALIAS[val.toLowerCase()];
        if (m) out.mode = m;
        break;
      }
      case '통화구분':
      case 'callkind':
      case 'call_kind': {
        // 콜 종류 (CALL_KIND). 0=내선통화, 1=국선수신(인바운드), 2=국선발신(아웃바운드). 다중 가능.
        const KIND_ALIAS: Record<string, number> = {
          내선: 0,
          내선통화: 0,
          internal: 0,
          '0': 0,
          인바운드: 1,
          국선수신: 1,
          inbound: 1,
          in: 1,
          '1': 1,
          아웃바운드: 2,
          국선발신: 2,
          outbound: 2,
          out: 2,
          '2': 2,
        };
        const list = val
          .split(',')
          .map((v) => KIND_ALIAS[v.trim()] ?? KIND_ALIAS[v.trim().toLowerCase()])
          .filter((x): x is number => typeof x === 'number');
        if (list.length > 0) out.callKinds = list;
        break;
      }
      default:
        // unknown prefix — 무시
        break;
    }
  }

  return out;
}

/**
 * 기간 필수 + 최대 30일 검증.
 * @return error message (null이면 통과)
 */
export function validateCriteria(c: Partial<TrackingSearchCriteria>): string | null {
  if (!c.startTime || !c.endTime) return '기간은 필수입니다 (예: 기간:오늘)';
  const start = new Date(c.startTime).getTime();
  const end = new Date(c.endTime).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return '기간 형식이 올바르지 않습니다';
  if (end < start) return '종료 시각이 시작 시각보다 빠릅니다';
  const diffDays = (end - start) / 86400000;
  if (diffDays > 30) return '기간은 최대 30일까지 지정 가능합니다';

  // ANI/DNIS exact 매칭 검증 (LIKE % 차단)
  if (c.ani && /[%*]/.test(c.ani)) return 'ANI는 와일드카드 검색 불가 (정확히 입력하세요)';
  if (c.dnis && /[%*]/.test(c.dnis)) return 'DNIS는 와일드카드 검색 불가 (정확히 입력하세요)';
  if (c.ani && !/^\d{4,11}$/.test(c.ani)) return 'ANI는 4~11자리 숫자만 가능합니다';
  if (c.dnis && !/^\d{4,11}$/.test(c.dnis)) return 'DNIS는 4~11자리 숫자만 가능합니다';

  return null;
}

/** 검색 조건을 cmdk 문자열로 역직렬화 (최근검색 표시용) */
export function criteriaToString(c: Partial<TrackingSearchCriteria>, preset?: DateRangePreset | null): string {
  const parts: string[] = [];
  if (c.ucid) parts.push(`ucid:${c.ucid}`);
  if (c.ani) parts.push(`ani:${c.ani}`);
  if (c.dnis) parts.push(`dnis:${c.dnis}`);
  if (c.tenantId) parts.push(`tenant:${c.tenantId}`);
  if (c.nodeId) parts.push(`node:${c.nodeId}`);
  if (c.queueId) parts.push(`queue:${c.queueId}`);
  if (c.agentId) parts.push(`agent:${c.agentId}`);
  if (c.scenarioId) parts.push(`scenario:${c.scenarioId}`);
  if (c.results && c.results.length > 0) parts.push(`result:${c.results.join(',')}`);
  if (c.durationMinSec != null) parts.push(`시간:>=${Math.round(c.durationMinSec / 60)}m`);
  if (c.queueWaitMinSec != null) parts.push(`큐대기:>=${Math.round(c.queueWaitMinSec / 60)}m`);
  if (preset) {
    const koMap: Record<DateRangePreset, string> = {
      LAST_1H: '최근1시간',
      TODAY: '오늘',
      YESTERDAY: '어제',
      LAST_24H: '최근24시간',
      THIS_WEEK: '이번주',
      LAST_WEEK: '지난주',
      CUSTOM: '사용자지정',
    };
    parts.push(`기간:${koMap[preset]}`);
  }
  if (c.mode && c.mode !== 'PBX') parts.push(`tracking:${c.mode.toLowerCase()}`);
  return parts.join(' ');
}
