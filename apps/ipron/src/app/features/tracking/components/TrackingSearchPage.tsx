/**
 * 통합 콜트래킹 — 검색 페이지 (IPR30S1060 메인 진입)
 *
 * 구조:
 *  - 헤더 박스: 모드 토글 + 검색 입력 + 즐겨찾기/저장
 *  - 빠른 프리셋(기간) 칩 + DateRangePicker (사용자 지정 시 펼쳐짐)
 *  - 결과 그리드 박스: 검색 후 ag-Grid
 *
 * 글로벌 단축키: Ctrl+M / Ctrl+M → CommandPalette 오픈
 * 더블클릭 → /tracking/call/:ucid 이동
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, DatePicker, Input, InputNumber, TimePicker } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { ChevronDown, ChevronUp, Download, Search, Star } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import CommandPalette from './CommandPalette';
import PbxCallDetailDrawer from './PbxCallDetailDrawer';
import SearchResultGrid from './SearchResultGrid';
import { useSearchTracking } from '../hooks/useTrackingQueries';
import type { CallSearchResult, DateRangePreset, RecentSearch, TrackingMode, TrackingSearchCriteria } from '../types/tracking.types';
import { criteriaToString, parseSearchSyntax, presetToRange, validateCriteria } from '../utils/searchSyntax';

const MINUTE_STEP = 10;

const breadcrumb = [
  { title: 'IPRON', path: '/ipron' },
  { title: '콜 분석', path: '/ipron/tracking' },
  { title: '통합 콜트래킹', path: '/ipron/tracking' },
];

const RECENT_SEARCHES_KEY = 'ipron.tracking.recentSearches.v1';
const MODE_KEY = 'ipron.tracking.mode.v1';
const MAX_RECENT = 20;

const PRESET_CHIPS: Array<{ label: string; preset: DateRangePreset; icon: string }> = [
  { label: '최근 1시간', preset: 'LAST_1H', icon: '🕐' },
  { label: '오늘', preset: 'TODAY', icon: '📅' },
  { label: '어제', preset: 'YESTERDAY', icon: '📅' },
  { label: '최근 24시간', preset: 'LAST_24H', icon: '🕘' },
  { label: '이번주', preset: 'THIS_WEEK', icon: '📅' },
  { label: '지난주', preset: 'LAST_WEEK', icon: '📅' },
];

export default function TrackingSearchPage() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const navigate = useNavigate();

  // ─── State ────────────────────────────────────────────────────────────────
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [rawQuery, setRawQuery] = useState('');
  const [activePreset, setActivePreset] = useState<DateRangePreset>('LAST_1H');
  const [customRange, setCustomRange] = useState<[Dayjs, Dayjs] | null>(null);

  // Custom range 분리 입력 헬퍼 (fca 대화이력 검색 UX 와 통일 — DatePicker + TimePicker 4개)
  const updateCustomStart = useCallback(
    (date?: Dayjs, time?: Dayjs) => {
      const base = customRange?.[0] ?? dayjs().startOf('day');
      const end = customRange?.[1] ?? dayjs().endOf('day');
      const useDate = date ?? base;
      const useTime = time ?? base;
      const combined = useDate.hour(useTime.hour()).minute(useTime.minute()).second(0);
      if (combined.isAfter(end)) {
        toast.warning('시작 일시는 종료 일시보다 이전이어야 합니다.');
        return;
      }
      setCustomRange([combined, end]);
      setActivePreset('CUSTOM');
    },
    [customRange],
  );
  const updateCustomEnd = useCallback(
    (date?: Dayjs, time?: Dayjs) => {
      const start = customRange?.[0] ?? dayjs().startOf('day');
      const base = customRange?.[1] ?? dayjs().endOf('day');
      const useDate = date ?? base;
      const useTime = time ?? base;
      const combined = useDate.hour(useTime.hour()).minute(useTime.minute()).second(0);
      if (combined.isBefore(start)) {
        toast.warning('종료 일시는 시작 일시보다 이후여야 합니다.');
        return;
      }
      setCustomRange([start, combined]);
      setActivePreset('CUSTOM');
    },
    [customRange],
  );

  // DatePicker disabledDate: 종료 < 시작 인 날짜는 선택 자체 차단
  const disabledStartDate = useCallback((current: Dayjs) => !!customRange?.[1] && current.isAfter(customRange[1], 'day'), [customRange]);
  const disabledEndDate = useCallback((current: Dayjs) => !!customRange?.[0] && current.isBefore(customRange[0], 'day'), [customRange]);

  // rawQuery 에 「기간:XXX」 토큰이 있으면 DatePicker 에 자동 반영 + 토큰 제거 (사용자가 이후 DatePicker 직접 수정 가능)
  useEffect(() => {
    if (!rawQuery) return;
    const parsed = parseSearchSyntax(rawQuery);
    if (parsed._preset) {
      const r = presetToRange(parsed._preset);
      setCustomRange([dayjs(r.startTime), dayjs(r.endTime)]);
      setActivePreset('CUSTOM');
      const cleaned = rawQuery
        .replace(/기간:\S+/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (cleaned !== rawQuery) setRawQuery(cleaned);
    }
  }, [rawQuery]);
  const [mode, setMode] = useState<TrackingMode>('PBX');
  const [pbxCdrRow, setPbxCdrRow] = useState<CallSearchResult | null>(null);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [quickOpen, setQuickOpen] = useState(true); // 빠른조회 펼침/접힘
  // 빠른 조회 - 3그룹 복합 필터
  const [quickResult, setQuickResult] = useState<'' | 'ABANDONED' | 'IVR_SELF'>('');
  const [quickCallKinds, setQuickCallKinds] = useState<Set<'인바운드' | '아웃바운드' | '내선'>>(new Set());
  const [quickQueueWait, setQuickQueueWait] = useState(false);
  const [quickQueueWaitMin, setQuickQueueWaitMin] = useState<number>(1);
  const [quickAgentTalk, setQuickAgentTalk] = useState(false);
  const [quickAgentTalkMin, setQuickAgentTalkMin] = useState<number>(10);
  // IVR 모드 전용 — 포기 여부 / 상담연결 여부 토글
  const [quickAbandoned, setQuickAbandoned] = useState(false);
  const [quickReqAgent, setQuickReqAgent] = useState(false);
  const [quickIvrSelf, setQuickIvrSelf] = useState(false);

  // ─── Mode 개인 기본값 (LocalStorage) ───────────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(MODE_KEY) as TrackingMode | null;
      if (saved && ['PBX', 'IVR', 'CTI'].includes(saved)) {
        setMode(saved);
      }
      const rs = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (rs) {
        setRecentSearches(JSON.parse(rs) as RecentSearch[]);
      }
    } catch {
      // ignore — 손상된 LocalStorage
    }
  }, []);

  const updateMode = useCallback((m: TrackingMode) => {
    setMode(m);
    try {
      localStorage.setItem(MODE_KEY, m);
    } catch {
      // ignore
    }
  }, []);

  // ─── 글로벌 Ctrl+M 단축키 ─────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+M (Windows) 또는 Cmd+M (Mac) — 상단 통합검색의 Ctrl+M 와 충돌 회피 (브라우저 충돌 적음)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ─── Search ────────────────────────────────────────────────────────────────
  const search = useSearchTracking();
  const rows: CallSearchResult[] = search.data ?? [];

  const buildCriteria = useCallback(
    (rawInput: string, presetOverride?: DateRangePreset, customOverride?: [Dayjs, Dayjs] | null): TrackingSearchCriteria | { error: string } => {
      const parsed = parseSearchSyntax(rawInput);
      const usePreset = parsed._preset ?? presetOverride ?? activePreset;
      const useCustom = customOverride ?? customRange;

      // 기간 결정 우선순위: rawQuery에 명시된 기간 > preset/custom 입력
      let startTime = parsed.startTime ?? '';
      let endTime = parsed.endTime ?? '';
      if (!startTime || !endTime) {
        if (usePreset === 'CUSTOM' && useCustom) {
          // dayjs.format — 로컬 시각 그대로 (toISOString 은 UTC 변환되어 KST 9시간 빠짐)
          startTime = useCustom[0].format('YYYY-MM-DDTHH:mm:ss');
          endTime = useCustom[1].format('YYYY-MM-DDTHH:mm:ss');
        } else if (usePreset && usePreset !== 'CUSTOM') {
          const r = presetToRange(usePreset);
          startTime = r.startTime;
          endTime = r.endTime;
        }
      }

      const criteria: TrackingSearchCriteria = {
        mode: parsed.mode ?? mode,
        startTime,
        endTime,
        ucid: parsed.ucid ?? null,
        ani: parsed.ani ?? null,
        dnis: parsed.dnis ?? null,
        tenantId: parsed.tenantId ?? null,
        nodeId: parsed.nodeId ?? null,
        queueId: parsed.queueId ?? null,
        agentId: parsed.agentId ?? null,
        scenarioId: parsed.scenarioId ?? null,
        results: parsed.results ?? null,
        durationMinSec: parsed.durationMinSec ?? null,
        durationMaxSec: parsed.durationMaxSec ?? null,
        queueWaitMinSec: parsed.queueWaitMinSec ?? null,
        queueWaitMaxSec: parsed.queueWaitMaxSec ?? null,
        agentTalkMinSec: parsed.agentTalkMinSec ?? null,
        callKinds: parsed.callKinds ?? null,
        abandoned: quickAbandoned || null,
        reqAgent: quickReqAgent || null,
        ivrSelfServiced: quickIvrSelf || null,
        page: 0,
        size: 100,
      };

      const err = validateCriteria(criteria);
      if (err) return { error: err };
      return criteria;
    },
    [activePreset, customRange, mode],
  );

  const persistRecent = useCallback((rawInput: string, criteria: TrackingSearchCriteria, count: number) => {
    setRecentSearches((prev) => {
      const next: RecentSearch[] = [
        { rawQuery: rawInput, criteria, executedAt: new Date().toISOString(), resultCount: count },
        ...prev.filter((r) => r.rawQuery !== rawInput),
      ].slice(0, MAX_RECENT);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const executeSearch = useCallback(
    (rawInput: string, presetOverride?: DateRangePreset) => {
      const built = buildCriteria(rawInput, presetOverride);
      if ('error' in built) {
        toast.error(built.error);
        return;
      }
      setRawQuery(rawInput);
      search.mutate(built, {
        onSuccess: (data) => {
          setHasSearched(true);
          setQuickOpen(false); // 검색 직후 빠른조회 접어서 결과 그리드 영역 확장
          persistRecent(rawInput || criteriaToString(built, presetOverride ?? activePreset), built, data.length);
        },
        onError: (err: unknown) => {
          const m = err instanceof Error ? err.message : '검색 중 오류가 발생했습니다';
          toast.error(m);
        },
      });
    },
    [activePreset, buildCriteria, persistRecent, search],
  );

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handlePresetClick = useCallback((preset: DateRangePreset) => {
    setActivePreset(preset);
    if (preset === 'CUSTOM') return;
    // 칩 선택 시 DatePicker 에도 해당 preset 범위 자동 채움 (팔레트 동작과 통일)
    const r = presetToRange(preset);
    setCustomRange([dayjs(r.startTime), dayjs(r.endTime)]);
    // 자동 검색 X — 사용자가 검색 버튼 눌러야 실행
  }, []);

  const handleSearchClick = useCallback(() => {
    executeSearch(rawQuery);
  }, [executeSearch, rawQuery]);

  const handlePaletteSubmit = useCallback(
    (raw: string) => {
      executeSearch(raw);
    },
    [executeSearch],
  );

  const handleClearRecent = useCallback(() => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch {
      // ignore
    }
  }, []);

  const handleRowDoubleClick = useCallback(
    (row: CallSearchResult) => {
      navigate(`/tracking/call/${encodeURIComponent(row.ucid)}`);
    },
    [navigate],
  );

  // 「포기/IVR자가해결」 선택 시 상담통화시간 필터 자동 해제 (모순 방지)
  useEffect(() => {
    if (quickResult && quickAgentTalk) setQuickAgentTalk(false);
  }, [quickResult, quickAgentTalk]);

  // 모드 변경 시 모드 전용 토글 자동 해제 + 공통 조건만 유지 후 자동 재검색
  // (PBX/IVR SQL 의 컬럼 셋이 달라 이전 모드 전용 필터는 의미 잃음)

  useEffect(() => {
    // PBX 전용 토글
    setQuickResult('');
    setQuickQueueWait(false);
    setQuickAgentTalk(false);
    // IVR 전용 토글
    setQuickAbandoned(false);
    setQuickReqAgent(false);
    setQuickIvrSelf(false);
    // 빠른조회 → rawQuery 동기화 useEffect 가 자동으로 모드 전용 토큰 제거함
    // 다음 tick 에서 cleaned rawQuery 로 자동 재검색 (이전 검색이 있을 때만)
    if (hasSearched) {
      setTimeout(() => {
        // 최신 rawQuery 를 setState 의 함수 형태로 가져와 검색
        setRawQuery((latest) => {
          executeSearch(latest);
          return latest;
        });
      }, 0);
    }
  }, [mode]);

  // 빠른조회 state 변경 → rawQuery 의 해당 토큰 add/remove (검색 input 과 통합)
  useEffect(() => {
    setRawQuery((q) => {
      // 기존 빠른조회 토큰 제거
      const cleaned = q
        .replace(/result:\S+/g, '')
        .replace(/통화구분:\S+/g, '')
        .replace(/큐대기:\S+/g, '')
        .replace(/상담시간:\S+/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      const parts: string[] = cleaned ? [cleaned] : [];
      if (quickResult === 'ABANDONED') parts.push('result:포기');
      else if (quickResult === 'IVR_SELF') parts.push('result:IVR_SELF');
      if (quickCallKinds.size > 0) parts.push(`통화구분:${Array.from(quickCallKinds).join(',')}`);
      if (quickQueueWait && quickQueueWaitMin > 0) parts.push(`큐대기:>=${quickQueueWaitMin}m`);
      if (quickAgentTalk && quickAgentTalkMin > 0 && !quickResult) {
        parts.push(`상담시간:>=${quickAgentTalkMin}m`);
      }
      return parts.join(' ').trim();
    });
  }, [quickResult, quickCallKinds, quickQueueWait, quickQueueWaitMin, quickAgentTalk, quickAgentTalkMin]);

  // IVR 모드로 drill-down: 해당 UCID 콜의 IVR 진입 정보 조회 (mode=IVR + ucid 검색)
  const handleIvrDrilldown = useCallback(
    (row: CallSearchResult) => {
      setMode('IVR');
      const query = `ucid:${row.ucid}`;
      setRawQuery(query);
      executeSearch(query);
    },
    [executeSearch],
  );

  // CTI 모드로 drill-down: 해당 UCID 콜의 CTI 상담 분배 정보 조회 (mode=CTI + ucid)
  const handleCtiDrilldown = useCallback(
    (row: CallSearchResult) => {
      setMode('CTI');
      const query = `ucid:${row.ucid}`;
      setRawQuery(query);
      executeSearch(query);
    },
    [executeSearch],
  );

  // ─── Render ────────────────────────────────────────────────────────────────
  const modeLabel = useMemo(() => {
    switch (mode) {
      case 'PBX':
        return '📞 PBX';
      case 'IVR':
        return '🤖 IVR';
      case 'CTI':
        return '🔀 CTI';
    }
  }, [mode]);

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        {/* ── 검색 입력 박스 ── */}
        <div className="bg-white bt-shadow rounded-md border border-gray-200 flex-shrink-0">
          <div className="px-5 py-4">
            {/* 헤더 라인 */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-[14px] font-semibold text-gray-800">콜 검색</h2>
                <span className="text-[11px] text-gray-400">Ctrl+M로 명령어 팔레트 열기</span>
              </div>
              <div className="flex items-center gap-2">
                <ModeToggle current={mode} onChange={updateMode} />
                <Button size="small" icon={<Star className="size-3" />} disabled title="Phase 2에서 활성화">
                  즐겨찾기
                </Button>
              </div>
            </div>

            {/* 기간 (위) */}
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <span className="text-[11px] text-gray-500 font-medium">📅 기간 *</span>
              {PRESET_CHIPS.map((p) => (
                <button
                  key={p.preset}
                  type="button"
                  onClick={() => handlePresetClick(p.preset)}
                  className={`px-2.5 py-1 text-[11px] border rounded-full transition-colors ${
                    activePreset === p.preset ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400 hover:text-blue-700'
                  }`}
                >
                  <span className="mr-1">{p.icon}</span>
                  {p.label}
                </button>
              ))}
              <span className="text-[10px] text-gray-400 mx-1">또는</span>
              <DatePicker
                size="small"
                value={customRange?.[0]}
                onChange={(d) => d && updateCustomStart(d, undefined)}
                format="YYYY-MM-DD"
                disabledDate={disabledStartDate}
                inputReadOnly
                allowClear={false}
                placeholder="시작일"
              />
              <TimePicker
                size="small"
                value={customRange?.[0]}
                onChange={(t) => t && updateCustomStart(undefined, t)}
                format="HH:mm"
                minuteStep={MINUTE_STEP}
                inputReadOnly
                allowClear={false}
                style={{ width: 90 }}
              />
              <span className="text-[10px] text-gray-400">~</span>
              <DatePicker
                size="small"
                value={customRange?.[1]}
                onChange={(d) => d && updateCustomEnd(d, undefined)}
                format="YYYY-MM-DD"
                disabledDate={disabledEndDate}
                inputReadOnly
                allowClear={false}
                placeholder="종료일"
              />
              <TimePicker
                size="small"
                value={customRange?.[1]}
                onChange={(t) => t && updateCustomEnd(undefined, t)}
                format="HH:mm"
                minuteStep={MINUTE_STEP}
                inputReadOnly
                allowClear={false}
                style={{ width: 90 }}
              />
              <span className="text-[10px] text-gray-400 ml-auto">최대 30일</span>
            </div>

            {/* 검색 입력 (아래) — 직접 타이핑 가능. 팔레트는 Ctrl+M 또는 우측 버튼으로 보조 호출 */}
            <div className="flex items-center gap-2">
              <Input
                value={rawQuery
                  .split(/\s+/)
                  .filter(Boolean)
                  .map((t) => t.replace(/:/g, '='))
                  .join(' & ')}
                onChange={(e) => setRawQuery(e.target.value.replace(/\s*&\s*/g, ' ').replace(/=/g, ':'))}
                onPressEnter={handleSearchClick}
                placeholder="UCID, ANI, agent= 등 입력 (Enter 검색, Ctrl+M로 팔레트)"
                prefix={<Search className="size-4 text-gray-400" />}
                allowClear
                suffix={
                  <button
                    type="button"
                    onClick={() => setPaletteOpen(true)}
                    className="text-[10px] font-mono px-1.5 py-0.5 bg-white border border-gray-200 rounded text-gray-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 cursor-pointer transition-colors flex-shrink-0"
                    title="명령어 팔레트 열기 (Ctrl+M) — 자동완성/저장된 쿼리"
                    aria-label="명령어 팔레트 열기"
                  >
                    Ctrl+M
                  </button>
                }
                className="flex-1"
                style={{ height: 40, fontFamily: rawQuery ? 'monospace' : undefined, fontSize: 12 }}
              />
              <Button type="primary" icon={<Search className="size-3.5" />} onClick={handleSearchClick} loading={search.isPending}>
                검색
              </Button>
            </div>
          </div>

          {/* ── 빠른 조회 (검색 박스 안에 통합) ── */}
          <button type="button" onClick={() => setQuickOpen((o) => !o)} className="w-full px-5 py-2.5 flex items-center gap-2 hover:bg-gray-50 transition border-t border-gray-100">
            <h2 className="text-[13px] font-semibold text-gray-700">⚡ 빠른 조회</h2>
            <span className="text-[11px] text-gray-400">조건을 조합해 한 번에 검색 (기간: 오늘)</span>
            <span className="ml-auto text-gray-400 flex items-center gap-1 text-[11px]">
              {quickOpen ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
              {quickOpen ? '접기' : '펴기'}
            </span>
          </button>
          {quickOpen && (
            <div className="px-5 pb-4 border-t border-gray-100 pt-4 space-y-3">
              {/* 통화 결과 (PBX 모드 전용 — 택 1) */}
              {mode === 'PBX' && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] text-gray-500 font-medium w-[80px] shrink-0">통화결과</span>
                  {[
                    { v: '' as const, label: '전체' },
                    { v: 'ABANDONED' as const, label: '포기' },
                  ].map((opt) => (
                    <button
                      key={opt.v || 'all'}
                      type="button"
                      onClick={() => setQuickResult(opt.v)}
                      className={`px-2.5 py-1 text-[11px] border rounded-full transition-colors ${
                        quickResult === opt.v ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
              {/* IVR 모드 — 포기 / 상담연결 / IVR 자가해결 토글 (모순 자동 해제) */}
              {mode === 'IVR' && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] text-gray-500 font-medium w-[80px] shrink-0">IVR 필터</span>
                  <button
                    type="button"
                    onClick={() => {
                      setQuickAbandoned((v) => !v);
                      setQuickIvrSelf(false);
                    }}
                    disabled={quickIvrSelf}
                    className={`px-2.5 py-1 text-[11px] border rounded-full transition-colors ${
                      quickAbandoned ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400'
                    } ${quickIvrSelf ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    포기 여부
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setQuickReqAgent((v) => !v);
                      setQuickIvrSelf(false);
                    }}
                    disabled={quickIvrSelf}
                    className={`px-2.5 py-1 text-[11px] border rounded-full transition-colors ${
                      quickReqAgent ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400'
                    } ${quickIvrSelf ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    상담연결 요청
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setQuickIvrSelf((v) => !v);
                      setQuickAbandoned(false);
                      setQuickReqAgent(false);
                    }}
                    className={`px-2.5 py-1 text-[11px] border rounded-full transition-colors ${
                      quickIvrSelf ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400'
                    }`}
                  >
                    IVR 셀프서비스
                  </button>
                </div>
              )}
              {/* 통화 구분 (다중) — IVR 모드는 내선 제외 */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] text-gray-500 font-medium w-[80px] shrink-0">통화구분</span>
                {(mode === 'IVR' ? (['인바운드', '아웃바운드'] as const) : (['인바운드', '아웃바운드', '내선'] as const)).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      setQuickCallKinds((prev) => {
                        const next = new Set(prev);
                        if (next.has(k)) next.delete(k);
                        else next.add(k);
                        return next;
                      });
                    }}
                    className={`px-2.5 py-1 text-[11px] border rounded-full transition-colors ${
                      quickCallKinds.has(k) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400'
                    }`}
                  >
                    {k}
                  </button>
                ))}
              </div>
              {/* 시간 조건 (다중) — IVR 모드에서는 숨김 */}
              {mode !== 'IVR' && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] text-gray-500 font-medium w-[80px] shrink-0">시간조건</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setQuickQueueWait((v) => !v)}
                      className={`px-2.5 py-1 text-[11px] border rounded-full transition-colors ${
                        quickQueueWait ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400'
                      }`}
                    >
                      큐 대기
                    </button>
                    <InputNumber
                      size="small"
                      min={1}
                      max={120}
                      value={quickQueueWaitMin}
                      onChange={(v) => setQuickQueueWaitMin(v ?? 1)}
                      disabled={!quickQueueWait}
                      style={{ width: 58 }}
                    />
                    <span className="text-[11px] text-gray-500">분 이상</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setQuickAgentTalk((v) => !v)}
                      disabled={!!quickResult}
                      className={`px-2.5 py-1 text-[11px] border rounded-full transition-colors ${
                        quickAgentTalk ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400'
                      } ${quickResult ? 'opacity-40 cursor-not-allowed hover:border-gray-200' : ''}`}
                      title={quickResult ? '포기/IVR자가해결 선택 시 사용 불가' : ''}
                    >
                      상담통화
                    </button>
                    <InputNumber
                      size="small"
                      min={1}
                      max={120}
                      value={quickAgentTalkMin}
                      onChange={(v) => setQuickAgentTalkMin(v ?? 10)}
                      disabled={!quickAgentTalk || !!quickResult}
                      style={{ width: 58 }}
                    />
                    <span className="text-[11px] text-gray-500">분 이상</span>
                  </div>
                </div>
              )}
              {/* 초기화 (검색 버튼은 위 검색 박스 옆 「검색」 버튼 사용 — 토글 변경 시 검색 input 에 토큰 자동 추가됨) */}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[10px] text-gray-400">↑ 위 검색창에 자동 반영. 「검색」 버튼으로 실행</span>
                <button
                  type="button"
                  onClick={() => {
                    setQuickResult('');
                    setQuickCallKinds(new Set());
                    setQuickQueueWait(false);
                    setQuickAgentTalk(false);
                    setQuickAbandoned(false);
                    setQuickReqAgent(false);
                    setQuickIvrSelf(false);
                  }}
                  className="ml-auto px-2.5 py-1 text-[11px] text-gray-500 hover:text-gray-700"
                >
                  초기화
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── 검색 결과 그리드 — 검색 후에만 ── */}
        {hasSearched && (
          <div className="bg-white bt-shadow rounded-md border border-gray-200 flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="h-[44px] px-5 flex items-center justify-between border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-3">
                <h2 className="text-[13px] font-semibold text-gray-700">{mode === 'PBX' ? '교환기 CDR 정보' : '검색 결과'}</h2>
                <span className="text-[11px] text-gray-500">
                  {rows.length}건 · 모드 {modeLabel}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button size="small" icon={<Download className="size-3" />} disabled title="Phase 2에서 활성화">
                  엑셀
                </Button>
              </div>
            </div>
            <SearchResultGrid
              rows={rows}
              loading={search.isPending}
              mode={mode}
              onRowDoubleClick={handleRowDoubleClick}
              onIvrDrilldown={handleIvrDrilldown}
              onCtiDrilldown={handleCtiDrilldown}
              onPbxCdrInspect={(r) => setPbxCdrRow(r)}
            />
          </div>
        )}
      </div>

      <PbxCallDetailDrawer open={!!pbxCdrRow} row={pbxCdrRow} onClose={() => setPbxCdrRow(null)} />

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        initialValue={rawQuery}
        onSubmit={handlePaletteSubmit}
        recentSearches={recentSearches}
        onRecentSelect={(r) => {
          setRawQuery(r.rawQuery);
        }}
        onRecentClear={handleClearRecent}
      />
    </div>
  );
}

// ─── Mode Toggle (PBX / IVR / CTI) ─────────────────────────────────────────

interface ModeToggleProps {
  current: TrackingMode;
  onChange: (m: TrackingMode) => void;
}
function ModeToggle({ current, onChange }: ModeToggleProps) {
  const [open, setOpen] = useState(false);
  const labels: Record<TrackingMode, { icon: string; label: string; description: string }> = {
    PBX: { icon: '📞', label: 'PBX 인입 기준', description: '교환기로 들어온 일반 음성 호' },
    IVR: { icon: '🤖', label: 'IVR 인입 기준', description: 'IVR 직접 인입 호' },
    CTI: { icon: '🔀', label: 'CTI 인입 기준', description: 'CTI 직접 인입 호' },
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-[11px] px-2.5 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 text-gray-700 flex items-center gap-1.5"
      >
        <span className="text-[10px] text-gray-400">기준</span>
        <span className="font-medium">
          {labels[current].icon} {current}
        </span>
        <span className="text-[10px] text-gray-400">▾</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded shadow-lg z-20 w-[300px] overflow-hidden">
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 text-[10px] text-gray-500">검색할 인입 기준을 선택하세요. 다음 검색에도 유지됩니다.</div>
            {(Object.keys(labels) as TrackingMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  onChange(m);
                  setOpen(false);
                }}
                className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-start gap-2 border-b border-gray-100 last:border-b-0"
              >
                <span className="text-[14px] mt-0.5">{labels[m].icon}</span>
                <div className="flex-1">
                  <div className="text-[12px] font-medium text-gray-900">{labels[m].label}</div>
                  <div className="text-[10px] text-gray-500">{labels[m].description}</div>
                </div>
                {current === m && <span className="text-emerald-600 text-[12px]">✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
