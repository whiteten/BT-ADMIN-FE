import { useMemo } from 'react';
import { useGetDataSourceFields } from '../../../dataset/hooks/useDatasetQueries';
import { useReportEditorStore } from '../../../report/hooks/useReportEditorStore';
import { useReportViewStore } from '../../../report/hooks/useReportViewStore';
import type { PanelDetail, PanelFieldMap } from '../../../report/types';
import { usePanelData } from '../../hooks/usePanelQueries';

const MAX_KPI = 5;

/**
 * 보고서 상단 KPI 요약 스트립 — 모니터링 대시보드 써머리와 동일한 위상.
 * 패널들의 KPI 슬롯 필드를 모아 한 줄(최대 5칸)에 고정 표시한다.
 * 데이터는 패널 단위 kpiMode 조회 1회로 그 패널의 KPI 값 전부를 받아온다 (기간 전체 집계 1행).
 */
export default function KpiStrip({ reportId }: { reportId: number }) {
  const { panels } = useReportEditorStore();

  // 패널 순서 → slotOrder 순으로 KPI 필드 수집, 보고서 전체 5개 캡
  const kpiByPanel = useMemo(() => {
    const out: { panel: PanelDetail; fields: PanelFieldMap[] }[] = [];
    let remaining = MAX_KPI;
    for (const p of panels) {
      if (remaining <= 0) break;
      const fields = p.fieldMap.filter((f) => f.slotType === 'KPI').sort((a, b) => a.slotOrder - b.slotOrder);
      if (fields.length === 0) continue;
      const take = fields.slice(0, remaining);
      remaining -= take.length;
      out.push({ panel: p, fields: take });
    }
    return out;
  }, [panels]);

  if (kpiByPanel.length === 0) return null;

  return (
    <div className="grid grid-cols-5 gap-3 px-1 pb-1">
      {kpiByPanel.map(({ panel, fields }) => (
        <PanelKpiCards key={panel.panelId} panel={panel} reportId={reportId} fields={fields} />
      ))}
    </div>
  );
}

/** 한 패널의 KPI 카드 묶음 — kpiMode 조회 1회로 패널 내 모든 KPI 값을 받는다. */
function PanelKpiCards({ panel, reportId, fields }: { panel: PanelDetail; reportId: number; fields: PanelFieldMap[] }) {
  const { committedFilter, queryTrigger } = useReportViewStore();
  const isDraft = reportId === 0 || panel.panelId < 0;

  // 필드 표시명 (데이터셋 메타 — react-query 캐시 공유)
  const { data: fieldMeta = [] } = useGetDataSourceFields({
    params: { datasetId: panel.datasetId },
    queryOptions: { enabled: !!panel.datasetId },
  });
  const nameMap = useMemo(() => new Map(fieldMeta.map((f) => [f.fieldName, f.displayName])), [fieldMeta]);

  const { data: queryResult, isFetching } = usePanelData({
    params: {
      reportId,
      panelId: panel.panelId,
      period: { from: committedFilter.period.from, to: committedFilter.period.to, unit: committedFilter.timeUnit },
      searchValues: committedFilter.searchValues,
      comparison: committedFilter.comparison,
      conditions: committedFilter.conditions,
      tenantId: committedFilter.tenantId ?? null,
      kpiMode: true,
    },
    queryTrigger,
    queryOptions: { enabled: !isDraft && queryTrigger > 0 },
  });

  const row = queryResult?.current?.[0];
  const cmpRow = queryResult?.compare?.[0];

  return (
    <>
      {fields.map((f) => (
        <KpiCard
          key={f.fieldName}
          label={nameMap.get(f.fieldName) ?? f.fieldName}
          aggFunc={f.aggFunc}
          value={row?.[f.fieldName]}
          compareValue={cmpRow?.[f.fieldName]}
          loading={isFetching}
          pending={isDraft || queryTrigger === 0}
        />
      ))}
    </>
  );
}

function KpiCard({
  label,
  aggFunc,
  value,
  compareValue,
  loading,
  pending,
}: {
  label: string;
  aggFunc?: string;
  value: unknown;
  compareValue: unknown;
  loading: boolean;
  pending: boolean;
}) {
  const num = value !== undefined && value !== null ? Number(value) : null;
  const display = !pending && !loading && num !== null && !isNaN(num) ? num.toLocaleString('ko-KR') : '—';

  // 비교기간 증감률 (비교값 0이면 표시 생략)
  const cmpNum = compareValue !== undefined && compareValue !== null ? Number(compareValue) : null;
  let delta: { pct: number; up: boolean } | null = null;
  if (!pending && !loading && num !== null && cmpNum !== null && !isNaN(cmpNum) && cmpNum !== 0) {
    const pct = ((num - cmpNum) / Math.abs(cmpNum)) * 100;
    delta = { pct: Math.abs(pct), up: pct >= 0 };
  }

  return (
    <div className="flex min-h-[88px] flex-col justify-center gap-1 rounded-lg bg-white bt-shadow px-4 py-3">
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="truncate text-xs text-[var(--color-bt-fg-muted)]" title={label}>
          {label}
        </span>
        {aggFunc && <span className="shrink-0 rounded bg-[var(--color-bt-bg-muted)] px-1 py-0.5 font-mono text-[9px] text-[var(--color-bt-fg-muted)]">{aggFunc}</span>}
      </div>
      <p className="font-mono text-[26px] font-bold leading-none text-[var(--color-bt-fg)]">{display}</p>
      {delta && (
        <p className={`text-[11px] font-semibold ${delta.up ? 'text-red-500' : 'text-blue-500'}`}>
          {delta.up ? '▲' : '▼'} {delta.pct.toFixed(1)}% <span className="font-normal text-[var(--color-bt-fg-muted)]">vs 비교기간</span>
        </p>
      )}
    </div>
  );
}
