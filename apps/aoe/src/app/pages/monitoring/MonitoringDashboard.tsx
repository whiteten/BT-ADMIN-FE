import { useEffect, useState } from 'react';
import { DatePicker, Select } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useBreadcrumbStore } from '@/shared-store';
import { useGetAgents } from '../../features/agent-config/hooks/useAgentQueries';
import HourlyTrendChart from '../../features/monitoring/components/HourlyTrendChart';
import KpiCards from '../../features/monitoring/components/KpiCards';
import LlmUsagePanel from '../../features/monitoring/components/LlmUsagePanel';
import StatusDonut from '../../features/monitoring/components/StatusDonut';
import { useAoeMonitoringSocket } from '../../features/monitoring/hooks/useAoeMonitoringSocket';
import { useGetAoeDashboard } from '../../features/monitoring/hooks/useMonitoringQueries';
import type { AoeWidgetType } from '../../features/monitoring/types';

const DATE_FMT = 'YYYYMMDD';
const ALL_WIDGETS: AoeWidgetType[] = ['summary', 'llmModels', 'hourly'];
const TOP_N = 10;

const breadcrumb = [
  { title: '모니터링', path: '/aoe/monitoring/agent' },
  { title: 'Agent 모니터링', path: '/aoe/monitoring/agent' },
];

function SectionLabel({ children, desc }: { children: React.ReactNode; desc?: string }) {
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <span className="h-4 w-1 rounded-full bg-[var(--color-bt-primary)]" />
      <h2 className="text-[15px] font-semibold text-slate-800">{children}</h2>
      {desc && <span className="hidden text-xs text-slate-400 sm:inline">{desc}</span>}
    </div>
  );
}

export default function MonitoringDashboard() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  useEffect(() => {
    setBreadcrumb(breadcrumb);
  }, [setBreadcrumb]);

  const [date, setDate] = useState<Dayjs>(dayjs());
  const [agentId, setAgentId] = useState<string | undefined>(undefined);

  const baseDate = date.format(DATE_FMT);

  const { data: agents } = useGetAgents();
  const agentOptions = [{ label: '전체', value: '' }, ...(agents ?? []).map((a) => ({ label: a.agentName, value: a.agentId }))];

  // 초기 로드/폴백 (WS 첫 tick 전 화면 공백 방지)
  const { data: initial } = useGetAoeDashboard({
    params: { baseDate, agentId: agentId || undefined, topN: TOP_N },
  });

  // 실시간 WS
  const { connected, data: live } = useAoeMonitoringSocket({
    baseDate,
    agentId: agentId || undefined,
    topN: TOP_N,
    widgetTypes: ALL_WIDGETS,
  });

  const summary = live.summary ?? initial?.summary ?? undefined;
  const llmModels = live.llmModels ?? initial?.llmModels ?? undefined;
  const hourly = live.hourly ?? initial?.hourly ?? undefined;

  return (
    <div className="flex w-full flex-col gap-6 bg-gradient-to-b from-slate-50 to-slate-100/40 p-5">
      {/* 히어로 헤더 — 흰색 바 (회색 배경 위 직접 배치 금지 규칙 준수) */}
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-white bt-shadow px-5 py-4">
        <div className="min-w-0">
          <h1 className="text-[22px] font-bold leading-tight tracking-tight text-slate-900">
            <span className="text-[var(--color-bt-primary)]">Agent</span> 모니터링
          </h1>
          <p className="mt-1 text-[13px] text-slate-500">실시간 Agent 운영 현황, LLM 사용량, 시간대별 추이를 한 화면에서 확인</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <DatePicker value={date} onChange={(d) => d && setDate(d)} allowClear={false} format="YYYY-MM-DD" className="h-9" />
          <Select
            className="h-9 w-[220px]"
            options={agentOptions}
            value={agentId ?? ''}
            onChange={(v) => setAgentId(v || undefined)}
            placeholder="에이전트 선택"
            showSearch
            filterOption={(input, option) =>
              String(option?.label ?? '')
                .toLowerCase()
                .includes(input.toLowerCase())
            }
          />
          <span className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3.5 text-[13px] font-medium text-slate-600">
            <span className="relative flex size-2">
              {connected && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />}
              <span className={`relative inline-flex size-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-slate-300'}`} />
            </span>
            {connected ? '실시간 연결됨' : '연결 대기'}
          </span>
        </div>
      </header>

      {/* 요약 KPI */}
      <section>
        <SectionLabel desc="검색조건(날짜·Agent) 기준으로 집계됩니다">요약 KPI</SectionLabel>
        <KpiCards summary={summary} />
      </section>

      {/* 실시간 상태 + LLM 사용 구성 */}
      <section>
        <SectionLabel desc="진행 분포 및 모델별 호출 비율">실시간 현황</SectionLabel>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <StatusDonut summary={summary} />
          </div>
          <div className="lg:col-span-3">
            <LlmUsagePanel models={llmModels} />
          </div>
        </div>
      </section>

      {/* 모니터링 항목 */}
      <section>
        <SectionLabel desc="시간대별 인입 / 완료 / 실패 콜 분포">모니터링 항목</SectionLabel>
        <HourlyTrendChart hourly={hourly} />
      </section>
    </div>
  );
}
