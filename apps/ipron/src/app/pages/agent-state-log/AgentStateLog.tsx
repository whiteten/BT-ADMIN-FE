/**
 * 상담사 상태 로그(상담사 여정) 메인 페이지
 * menuKey: ipron-tracking-agent-journey
 *
 * 멀티테넌트 개편(상담사 관리 정합): 상단 테넌트 카드 슬라이더 제거.
 *   - 일반 콘솔: 테넌트 선택기 없음(토큰=활성 테넌트 스코프). 헤더에 요약(총/활성)만.
 *   - 운영자 모드: 헤더에 대행 테넌트 ScopeSelect(공통) + 그 옆에 요약.
 *
 * 입력 체인:
 *   (스코프 테넌트) → 상담그룹 Select(폼 select 컨트롤) → 상담사 Select → 날짜 + 시간 범위
 *   → 선택된 상담사의 agentId(숫자) 로 BE POST 호출
 *
 * 재사용 API (신규 엔드포인트 없음):
 *   - agentMasterApi.getTenants()    → 테넌트 스코프 옵션/요약 (AgentTenantStat[])
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
import { AlertCircle, FileText, LayoutList, Search } from 'lucide-react';
import { useAuthStore, useBreadcrumbStore, useOperatorScopeStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { useGetAgentGroupTree, useGetAgentTenants, useGetAgents } from '../../features/agent-master/hooks/useAgentMasterQueries';
import type { AgentGroupNode, AgentResponse } from '../../features/agent-master/types';
import AgentJourneyTimeline from '../../features/agent-state-log/components/AgentJourneyTimeline';
import { useAgentStateLog } from '../../features/agent-state-log/hooks/useAgentStateLogQueries';
import type { AgentStateLogRequest, AgentStateLogResponse } from '../../features/agent-state-log/types';
import NoData from '@/components/custom/NoData';
import ScopeSelect from '@/components/custom/ScopeSelect';

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

  // ctx 테넌트 (JWT — 사용자 본인 테넌트)
  const ctxTenantId = useAuthStore((s) => {
    const t = s.userInfo?.tenant;
    return t ? Number(t) : null;
  });

  // 운영자 모드(통합운영) — 시스템 관리자가 헤더 TenantChip 에서 진입.
  //  - 전체(actAsTenantId=null): tenantId 미전달 → 전체 테넌트 조회
  //  - 대행(actAsTenantId=X): tenantId=X 로 조회 스코프 + 대행 CUD
  const operatorMode = useOperatorScopeStore((s) => s.operatorMode);
  const actAsTenantId = useOperatorScopeStore((s) => s.actAsTenantId);
  const setActAsTenant = useOperatorScopeStore((s) => s.setActAsTenant);
  const opTenantId = actAsTenantId ? Number(actAsTenantId) : null;
  // 조회 스코프: 일반=활성테넌트 / 운영자=대행테넌트(null=전체).
  const selectedTenantId = operatorMode ? opTenantId : ctxTenantId;

  // ─── 선택 상태 ──────────────────────────────────────────────────────────────
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const [date, setDate] = useState<dayjs.Dayjs>(dayjs());
  const [startTime, setStartTime] = useState<dayjs.Dayjs | null>(null);
  const [endTime, setEndTime] = useState<dayjs.Dayjs | null>(null);

  const resultRef = useRef<HTMLDivElement>(null);

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

  // 헤더 요약 — 현재 스코프(전체=합계 / 특정 테넌트=해당)의 총/활성 상담사 수.
  const summary = useMemo(() => {
    const rows = selectedTenantId == null ? tenantStats : tenantStats.filter((t) => t.tenantId === selectedTenantId);
    return rows.reduce((a, t) => ({ total: a.total + (t.totalCnt ?? 0), active: a.active + (t.activeCnt ?? 0) }), { total: 0, active: 0 });
  }, [tenantStats, selectedTenantId]);

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
  // spans 또는 markers 중 하나라도 있으면 이벤트 테이블 렌더 가능
  const hasTimeline = resultState.status === 'ok' && ((resultState.data.timeline?.spans?.length ?? 0) > 0 || (resultState.data.timeline?.markers?.length ?? 0) > 0);
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
      {/* ── 헤더 (스코프 선택 + 요약) ─────────────────────────────────────── */}
      <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
        <div className="flex items-center px-4 h-[56px] gap-3">
          {/* 운영자 모드: 대행 테넌트 선택(공통 ScopeSelect). 일반 콘솔은 토큰=활성 테넌트 스코프. */}
          {operatorMode && (
            <ScopeSelect
              kind="tenant"
              options={tenantStats.map((t) => ({ id: t.tenantId, name: t.tenantName ?? `테넌트 ${t.tenantId}`, count: t.totalCnt }))}
              value={actAsTenantId}
              onChange={(id) => {
                setActAsTenant(id);
                setSelectedGroupId(null);
                setSelectedAgentId(null);
              }}
            />
          )}
          {/* 요약 — 총/활성 상담사 (운영자는 선택 뒤, 일반은 좌측). */}
          <div className={`flex items-center gap-4 text-[13px] ${operatorMode ? 'ml-3 pl-3 border-l border-gray-200' : ''}`}>
            <span className="text-gray-500">
              총 상담사 <b className="text-gray-800 font-semibold">{summary.total.toLocaleString()}</b>
            </span>
            <span className="text-gray-500">
              활성 <b className="text-green-600 font-semibold">{summary.active.toLocaleString()}</b>
            </span>
          </div>
        </div>
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
              <LayoutList size={12} />
              이벤트 목록
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
          <div className="flex-1 min-h-0 overflow-hidden">
            {/* 이벤트 목록 탭 */}
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
