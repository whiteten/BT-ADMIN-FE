/**
 * 상담사 상태 로그(상담사 여정) 메인 페이지
 * menuKey: ipron-tracking-agent-journey
 *
 * 입력 체인:
 *   테넌트 카드 → 상담그룹 Select(폼 select 컨트롤) → 상담사 Select → 날짜 + 시간 범위
 *   → 선택된 상담사의 agentId(숫자) 로 BE POST 호출
 *
 * 재사용 API (신규 엔드포인트 없음):
 *   - agentMasterApi.getTenants()    → 테넌트 카드 (AgentTenantStat[])
 *   - agentMasterApi.getGroupTree()  → 상담그룹 계층 (AgentGroupNode[], tenantId 필터)
 *   - agentMasterApi.getList()       → 상담사 목록 (AgentResponse[], groupId 필터)
 *
 * 결과 패널:
 *   - 타임라인 탭: BE timeline 기반 AgentJourneyTimeline
 *   - 원문 탭: lines[]/raw 덤프
 *   - 에러/빈상태 분리
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DatePicker, Select, TimePicker } from 'antd';
import dayjs from 'dayjs';
import { AlertCircle, Building2, ChevronLeft, ChevronRight, ChevronsDown, ChevronsUp, FileText, GitBranch, Search } from 'lucide-react';
import { useAuthStore, useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { useGetAgentGroupTree, useGetAgentTenants, useGetAgents } from '../../features/agent-master/hooks/useAgentMasterQueries';
import type { AgentGroupNode, AgentResponse, AgentTenantStat } from '../../features/agent-master/types';
import AgentJourneyTimeline from '../../features/agent-state-log/components/AgentJourneyTimeline';
import { useAgentStateLog } from '../../features/agent-state-log/hooks/useAgentStateLogQueries';
import type { AgentStateLogRequest, AgentStateLogResponse } from '../../features/agent-state-log/types';
import NoData from '@/components/custom/NoData';

const breadcrumb = [{ title: '트래킹' }, { title: '상담사 상태 로그', path: '/ipron/tracking/agent-state-log' }];

// ─── 상담그룹 트리 평면화 ──────────────────────────────────────────────────────

interface FlatGroupOption {
  groupId: number;
  label: string;
  depth: number;
}

function flattenGroupTree(nodes: AgentGroupNode[], depth = 0): FlatGroupOption[] {
  return nodes.flatMap((n) => [{ groupId: n.groupId, label: n.groupName, depth }, ...flattenGroupTree(n.children, depth + 1)]);
}

// ─── 테넌트 카드 ──────────────────────────────────────────────────────────────

interface TenantCardProps {
  tenantId: number | null;
  tenantName: string;
  agentCount: number;
  selected: boolean;
  onClick: () => void;
}

function TenantCard({ tenantId, tenantName, agentCount, selected, onClick }: TenantCardProps) {
  const isAll = tenantId === null;
  return (
    <div
      className={`bg-white border rounded-lg p-3 cursor-pointer transition-all w-[180px] h-[72px] flex-shrink-0 flex flex-col justify-between ${
        selected ? 'border-[#405189] shadow-[0_0_0_2px_rgba(64,81,137,0.15)]' : 'border-gray-200 hover:border-[#c5cbe0] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
      }`}
      onClick={onClick}
    >
      <div className="flex items-center gap-1.5">
        {isAll ? (
          <span className={`text-[12px] font-semibold ${selected ? 'text-[#405189]' : 'text-gray-600'}`}>전체</span>
        ) : (
          <>
            <Building2 className={`size-3 flex-shrink-0 ${selected ? 'text-[#405189]' : 'text-gray-500'}`} />
            <span className={`text-[12px] font-semibold truncate ${selected ? 'text-[#405189]' : 'text-gray-800'}`} title={tenantName}>
              {tenantName}
            </span>
          </>
        )}
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-400">상담사</span>
        <span className="font-semibold text-gray-700">{agentCount.toLocaleString()}명</span>
      </div>
    </div>
  );
}

// ─── 결과 상태 ────────────────────────────────────────────────────────────────

type ResultState = { status: 'idle' } | { status: 'loading' } | { status: 'error'; message: string } | { status: 'ok'; data: AgentStateLogResponse };

type ViewTab = 'timeline' | 'raw';

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────

export default function AgentStateLog() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  // 컨텍스트 테넌트 (ROLE_ADMIN 은 null → 전체 선택)
  const ctxTenantId = useAuthStore((s) => {
    const t = s.userInfo?.tenant;
    return t ? Number(t) : null;
  });

  // ─── 선택 상태 ──────────────────────────────────────────────────────────────
  const [cardExpanded, setCardExpanded] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(ctxTenantId);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const [date, setDate] = useState<dayjs.Dayjs>(dayjs());
  const [startTime, setStartTime] = useState<dayjs.Dayjs | null>(null);
  const [endTime, setEndTime] = useState<dayjs.Dayjs | null>(null);

  const cardScrollRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  // ctx 비동기 로드 후 초기 테넌트 동기화
  useEffect(() => {
    if (ctxTenantId != null && selectedTenantId === null) {
      setSelectedTenantId(ctxTenantId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctxTenantId]);

  // ─── 테넌트 변경 → 하위 초기화 ─────────────────────────────────────────────
  const handleTenantSelect = useCallback((tenantId: number | null) => {
    setSelectedTenantId(tenantId);
    setSelectedGroupId(null);
    setSelectedAgentId(null);
  }, []);

  // ─── 그룹 변경 → 상담사 초기화 ─────────────────────────────────────────────
  const handleGroupSelect = useCallback((groupId: number | null) => {
    setSelectedGroupId(groupId);
    setSelectedAgentId(null);
  }, []);

  // ─── API 쿼리 ───────────────────────────────────────────────────────────────

  const { data: tenantStats = [] } = useGetAgentTenants();

  const { data: groupTree = [] } = useGetAgentGroupTree({
    params: { tenantId: selectedTenantId ?? undefined },
  });

  const { data: agents = [] } = useGetAgents({
    params: {
      groupId: selectedGroupId ?? undefined,
      tenantId: selectedTenantId ?? undefined,
    },
    queryOptions: { enabled: selectedGroupId !== null },
  });

  // ─── 파생 데이터 ─────────────────────────────────────────────────────────────

  const tenantCards = useMemo(() => {
    const totalCount = tenantStats.reduce((s: number, t: AgentTenantStat) => s + t.totalCnt, 0);
    return [
      { tenantId: null as number | null, tenantName: '전체', agentCount: totalCount },
      ...tenantStats.map((t: AgentTenantStat) => ({
        tenantId: t.tenantId,
        tenantName: t.tenantName ?? `테넌트 ${t.tenantId}`,
        agentCount: t.totalCnt,
      })),
    ];
  }, [tenantStats]);

  const groupOptions = useMemo(
    () =>
      flattenGroupTree(groupTree).map((g) => ({
        value: g.groupId,
        label: ' '.repeat(g.depth * 3) + g.label,
      })),
    [groupTree],
  );

  const agentSelectOptions = useMemo(
    () =>
      agents.map((a: AgentResponse) => ({
        value: a.agentId,
        label: `${a.agentName} (${a.agentLoginId})`,
      })),
    [agents],
  );

  // ─── 조회 상태 ──────────────────────────────────────────────────────────────
  const [resultState, setResultState] = useState<ResultState>({ status: 'idle' });
  const [activeTab, setActiveTab] = useState<ViewTab>('timeline');

  const { mutate: fetchLog, isPending } = useAgentStateLog({
    onSuccess: (data) => {
      setResultState({ status: 'ok', data });
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : '조회에 실패했습니다';
      setResultState({ status: 'error', message: msg });
      toast.error(msg);
    },
  });

  const handleSearch = useCallback(() => {
    if (selectedAgentId == null) {
      toast.error('상담사를 선택해 주세요');
      return;
    }
    const req: AgentStateLogRequest = {
      agentId: String(selectedAgentId),
      date: date.format('YYYYMMDD'),
      startTime: startTime ? startTime.format('HHmmss') : undefined,
      endTime: endTime ? endTime.format('HHmmss') : undefined,
    };
    setResultState({ status: 'loading' });
    fetchLog(req);
  }, [selectedAgentId, date, startTime, endTime, fetchLog]);

  // ─── 탭 자동 전환 ─────────────────────────────────────────────────────────
  const hasTimeline = resultState.status === 'ok' && (resultState.data.timeline?.spans?.length ?? 0) > 0;
  const hasRaw = resultState.status === 'ok' && (resultState.data.lines?.length ?? 0) > 0;

  useEffect(() => {
    if (resultState.status === 'ok' && !hasTimeline && hasRaw && activeTab === 'timeline') {
      setActiveTab('raw');
    }
  }, [resultState.status, hasTimeline, hasRaw, activeTab]);

  // ─── 메타 ───────────────────────────────────────────────────────────────────
  const meta =
    resultState.status === 'ok'
      ? {
          agentId: resultState.data.agentId,
          date: resultState.data.date,
          ltsIps: resultState.data.ltsIps ?? (resultState.data.ltsIp ? [resultState.data.ltsIp] : []),
          spanCount: resultState.data.timeline?.spans?.length ?? 0,
          lineCount: resultState.data.lines?.length ?? 0,
        }
      : null;

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-3 p-4 h-full">
      {/* ── 테넌트 카드 슬라이더 ─────────────────────────────────────────── */}
      <div className="rounded-md border border-slate-200 bg-white shadow-sm flex-shrink-0">
        {/* 축소(pill) 모드 */}
        {!cardExpanded && (
          <div className="flex items-center gap-2 px-3 h-[40px]">
            <div className="flex items-center gap-1.5 overflow-x-auto flex-1 scrollbar-none">
              {tenantCards.map((tc) => {
                const isSelected = tc.tenantId === selectedTenantId;
                return (
                  <button
                    key={tc.tenantId ?? 'all'}
                    type="button"
                    onClick={() => handleTenantSelect(tc.tenantId)}
                    className={`flex-shrink-0 inline-flex items-center gap-1 px-3 py-1 rounded-full border text-[11px] font-medium cursor-pointer transition-all whitespace-nowrap ${
                      isSelected ? 'border-[#405189] bg-[#405189] text-white' : 'border-gray-200 bg-white text-gray-700 hover:border-[#c5cbe0]'
                    }`}
                  >
                    {tc.tenantName}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setCardExpanded(true)}
              className="w-7 h-7 flex-shrink-0 flex items-center justify-center text-gray-400 hover:text-[#405189] rounded"
              title="카드 펼치기"
            >
              <ChevronsDown size={14} />
            </button>
          </div>
        )}

        {/* 확장(카드) 모드 */}
        {cardExpanded && (
          <div className="flex items-center px-3 py-2 gap-2">
            <button
              type="button"
              onClick={() => cardScrollRef.current?.scrollBy({ left: -220, behavior: 'smooth' })}
              className="flex-shrink-0 w-7 h-7 flex items-center justify-center text-gray-400 hover:text-[#405189] rounded"
            >
              <ChevronLeft size={16} />
            </button>
            <div ref={cardScrollRef} className="flex gap-3 overflow-x-auto flex-1 py-1 scrollbar-none">
              {tenantCards.map((tc) => (
                <TenantCard
                  key={tc.tenantId ?? 'all'}
                  tenantId={tc.tenantId}
                  tenantName={tc.tenantName}
                  agentCount={tc.agentCount}
                  selected={tc.tenantId === selectedTenantId}
                  onClick={() => handleTenantSelect(tc.tenantId)}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => cardScrollRef.current?.scrollBy({ left: 220, behavior: 'smooth' })}
              className="flex-shrink-0 w-7 h-7 flex items-center justify-center text-gray-400 hover:text-[#405189] rounded"
            >
              <ChevronRight size={16} />
            </button>
            <button
              type="button"
              onClick={() => setCardExpanded(false)}
              className="flex-shrink-0 w-7 h-7 flex items-center justify-center text-gray-400 hover:text-[#405189] rounded"
              title="카드 접기"
            >
              <ChevronsUp size={14} />
            </button>
          </div>
        )}
      </div>

      {/* ── 검색 폼 ──────────────────────────────────────────────────────── */}
      <div className="rounded-md border border-slate-200 bg-white shadow-sm flex-shrink-0">
        <div className="flex flex-wrap items-center gap-2 px-4 py-3">
          {/* 상담그룹 */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 whitespace-nowrap">상담그룹</span>
            <Select
              style={{ width: 200 }}
              placeholder="그룹 선택"
              value={selectedGroupId}
              onChange={(v: number | null) => handleGroupSelect(v ?? null)}
              showSearch
              filterOption={(input, opt) =>
                String(opt?.label ?? '')
                  .replace(/\u00A0/g, '')
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              allowClear
              options={groupOptions}
            />
          </div>

          <span className="text-slate-300 text-sm select-none">›</span>

          {/* 상담사 */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 whitespace-nowrap">상담사</span>
            <Select
              style={{ width: 200 }}
              placeholder={selectedGroupId == null ? '그룹 선택 후 선택 가능' : '상담사 선택'}
              value={selectedAgentId}
              onChange={(v: number | null) => setSelectedAgentId(v ?? null)}
              disabled={selectedGroupId == null}
              showSearch
              filterOption={(input, opt) =>
                String(opt?.label ?? '')
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              allowClear
              options={agentSelectOptions}
            />
          </div>

          <div className="w-px h-5 bg-slate-200 flex-shrink-0" />

          {/* 날짜 */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 whitespace-nowrap">조회 날짜</span>
            <DatePicker value={date} onChange={(d) => setDate(d ?? dayjs())} format="YYYY-MM-DD" allowClear={false} style={{ width: 130 }} />
          </div>

          {/* 시작 시간 */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 whitespace-nowrap">시작 시간</span>
            <TimePicker value={startTime} onChange={(t) => setStartTime(t)} format="HH:mm:ss" placeholder="시작" style={{ width: 100 }} needConfirm={false} allowClear />
          </div>

          <span className="text-slate-300 text-sm select-none">~</span>

          {/* 종료 시간 */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 whitespace-nowrap">종료 시간</span>
            <TimePicker value={endTime} onChange={(t) => setEndTime(t)} format="HH:mm:ss" placeholder="종료" style={{ width: 100 }} needConfirm={false} allowClear />
          </div>

          <div className="w-px h-5 bg-slate-200 flex-shrink-0" />

          {/* 조회 버튼 */}
          <button
            type="button"
            onClick={handleSearch}
            disabled={isPending || selectedAgentId == null}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#405189] text-white text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#3a4a7a] transition-colors"
          >
            <Search size={13} />
            조회
          </button>
        </div>
      </div>

      {/* ── 조회 전 안내 ─────────────────────────────────────────────────── */}
      {resultState.status === 'idle' && (
        <div className="flex items-center justify-center rounded-md border border-slate-200 bg-slate-50 py-16 text-sm text-slate-400 flex-shrink-0">
          상담그룹과 상담사를 선택하고 조회하세요
        </div>
      )}

      {/* ── 로딩 ─────────────────────────────────────────────────────────── */}
      {resultState.status === 'loading' && (
        <div className="flex items-center justify-center rounded-md border border-slate-200 bg-slate-50 py-16 text-sm text-slate-400 flex-shrink-0">
          IC LTS 서버에서 로그를 수신하는 중입니다...
        </div>
      )}

      {/* ── 에러 안내 ──────────────────────────────────────────────────────── */}
      {resultState.status === 'error' && (
        <div className="flex items-center gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700 flex-shrink-0">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span>
            조회 중 오류가 발생했습니다. <span className="font-medium">{resultState.message}</span>
          </span>
        </div>
      )}

      {/* ── 결과 패널 ─────────────────────────────────────────────────────── */}
      {resultState.status === 'ok' && (
        <div ref={resultRef} className="rounded-md border border-slate-200 bg-white shadow-sm flex flex-col min-h-0 flex-1">
          {/* 메타 헤더 */}
          <div className="flex items-center gap-4 border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-500 flex-shrink-0">
            <span>
              상담사: <strong className="text-slate-700">{meta?.agentId}</strong>
            </span>
            <span>
              날짜: <strong className="text-slate-700">{meta?.date}</strong>
            </span>
            {(meta?.ltsIps ?? []).length > 0 && (
              <span>
                IC LTS: <strong className="text-slate-700">{(meta?.ltsIps ?? []).join(', ')}</strong>
              </span>
            )}
            <span>
              스팬: <strong className="text-slate-700">{meta?.spanCount}건</strong>
            </span>
            <span>
              수신 라인: <strong className="text-slate-700">{meta?.lineCount}줄</strong>
            </span>
          </div>

          {/* 탭 바 */}
          <div className="flex items-center border-b border-slate-200 bg-white px-4 flex-shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('timeline')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                activeTab === 'timeline' ? 'border-[#405189] text-[#405189]' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <GitBranch size={12} />
              타임라인
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('raw')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                activeTab === 'raw' ? 'border-[#405189] text-[#405189]' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <FileText size={12} />
              원문
            </button>
          </div>

          {/* 탭 콘텐츠 */}
          <div className="flex-1 min-h-0 overflow-auto">
            {/* 타임라인 탭 */}
            {activeTab === 'timeline' && (
              <>
                {!hasTimeline ? (
                  <div className="flex items-center justify-center py-12">
                    <NoData message="조회된 내역이 없습니다" fontSize="text-sm" />
                  </div>
                ) : (
                  <AgentJourneyTimeline timeline={resultState.data.timeline} />
                )}
              </>
            )}

            {/* 원문 탭 */}
            {activeTab === 'raw' && (
              <>
                {!hasRaw ? (
                  <div className="flex items-center justify-center py-12">
                    <NoData message="수신된 로그가 없습니다" fontSize="text-sm" />
                  </div>
                ) : (
                  <pre className="p-4 font-mono text-xs leading-relaxed text-slate-700 whitespace-pre-wrap break-all">{resultState.data.lines.join('\n')}</pre>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
