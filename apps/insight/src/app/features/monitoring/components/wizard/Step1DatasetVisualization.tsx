import { useMemo, useState } from 'react';
import { Input, Segmented } from 'antd';
import { Star } from 'lucide-react';
import { DOMAIN_COLOR_CLASS, DOMAIN_LABELS, VIZ_ICON, VIZ_LABELS } from '../../constants/monitoringConstants';
import { useGetMonitoringDataset, useGetMonitoringDatasets } from '../../hooks/useDatasetQueries';
import type { DatasetDetail, DatasetListItem, DomainCode, VizType } from '../../types';

export interface Step1Value {
  datasetId?: number;
  visualizations: VizType[];
  defaultViz?: VizType;
}

interface Step1Props {
  domainCode: DomainCode;
  value: Step1Value;
  onChange: (next: Step1Value) => void;
}

const ALL_VIZ: VizType[] = ['GRID', 'BAR', 'LINE', 'CARD'];

const VIZ_DESCRIPTION: Record<VizType, string> = {
  GRID: '표 형태 — 모든 필드',
  BAR: '막대 — DIM × MSR (이중축 최대 2개)',
  LINE: '선 — 시간 X축 + MSR',
  CARD: '카드 — 단일 측정값 (현재값)',
};

/** 시각화 가용성 판단 — 데이터셋 필드 구성에 따라 */
function getVizAvailability(detail?: DatasetDetail): Record<VizType, { available: boolean; reason?: string }> {
  if (!detail) {
    return {
      GRID: { available: false, reason: '데이터셋 선택 필요' },
      BAR: { available: false, reason: '데이터셋 선택 필요' },
      LINE: { available: false, reason: '데이터셋 선택 필요' },
      CARD: { available: false, reason: '데이터셋 선택 필요' },
    };
  }
  const visibleFields = detail.fields.filter((f) => f.isVisible);
  const dims = visibleFields.filter((f) => f.classification === 'DIM');
  const msrs = visibleFields.filter((f) => f.classification === 'MSR');
  const msrIncludingCalc = msrs.length + detail.calcFields.filter((c) => c.classification === 'MSR').length;
  const hasDateField = detail.fields.some((f) => f.isVisible && (f.dataType === 'DATE' || f.dataType === 'DATETIME'));

  return {
    GRID: visibleFields.length > 0 ? { available: true } : { available: false, reason: '노출 필드가 없습니다' },
    BAR: dims.length > 0 && msrIncludingCalc > 0 ? { available: true } : { available: false, reason: 'DIM과 MSR 각 1개 이상 필요' },
    LINE: hasDateField && msrIncludingCalc > 0 ? { available: true } : { available: false, reason: '시간 컬럼(DATE/DATETIME) 필요' },
    CARD: msrIncludingCalc > 0 ? { available: true } : { available: false, reason: 'MSR 1개 이상 필요' },
  };
}

export default function Step1DatasetVisualization({ domainCode, value, onChange }: Step1Props) {
  const [searchValue, setSearchValue] = useState('');
  const [filterDomain, setFilterDomain] = useState<DomainCode | 'ALL'>(domainCode);

  // 데이터셋 목록
  const { data: datasets = [] } = useGetMonitoringDatasets({
    params: { domain: filterDomain !== 'ALL' ? filterDomain : undefined },
  });

  // 선택된 데이터셋 detail
  const { data: selectedDetail } = useGetMonitoringDataset({
    params: { datasetId: value.datasetId ?? 0 },
    queryOptions: { enabled: !!value.datasetId, retry: false },
  });

  // 필터링
  const filteredDatasets = useMemo(() => {
    let result: DatasetListItem[] = datasets;
    if (filterDomain !== 'ALL') {
      result = result.filter((d) => d.domainCode === filterDomain);
    }
    if (searchValue.trim()) {
      const kw = searchValue.toLowerCase();
      result = result.filter((d) => d.datasetName.toLowerCase().includes(kw) || d.datasetCode.toLowerCase().includes(kw));
    }
    return result;
  }, [datasets, filterDomain, searchValue]);

  const availability = useMemo(() => getVizAvailability(selectedDetail), [selectedDetail]);

  // 데이터셋 변경 시 시각화 초기화
  const handleSelectDataset = (datasetId: number) => {
    if (datasetId === value.datasetId) return;
    // detail이 fetch된 후 availability가 갱신되면 사용자가 시각화를 선택한다
    onChange({ datasetId, visualizations: [], defaultViz: undefined });
  };

  const toggleViz = (viz: VizType) => {
    if (!availability[viz].available) return;
    const isChecked = value.visualizations.includes(viz);
    if (isChecked) {
      // 해제
      const next = value.visualizations.filter((v) => v !== viz);
      const nextDefault = value.defaultViz === viz ? next[0] : value.defaultViz;
      onChange({ ...value, visualizations: next, defaultViz: nextDefault });
    } else {
      // 추가
      const next = [...value.visualizations, viz];
      const nextDefault = value.defaultViz ?? viz;
      onChange({ ...value, visualizations: next, defaultViz: nextDefault });
    }
  };

  const setDefault = (viz: VizType) => {
    if (!value.visualizations.includes(viz)) return;
    onChange({ ...value, defaultViz: viz });
  };

  return (
    <div className="flex flex-1 gap-0 overflow-hidden">
      {/* 좌측: 데이터셋 카탈로그 카드 그리드 */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        {/* 필터 바 */}
        <div className="flex items-center gap-3 px-6 py-3">
          <Segmented
            value={filterDomain}
            onChange={(v) => setFilterDomain(v as DomainCode | 'ALL')}
            options={[
              { value: 'ALL', label: '전체' },
              { value: 'IE', label: `IE · ${DOMAIN_LABELS.IE}` },
              { value: 'IC', label: `IC · ${DOMAIN_LABELS.IC}` },
              { value: 'IR', label: `IR · ${DOMAIN_LABELS.IR}` },
            ]}
            size="small"
          />
          <Input
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="데이터셋 이름·코드 검색…"
            className="w-full max-w-[280px]"
            size="small"
            allowClear
          />
          <span className="ml-auto text-[10.5px] text-[var(--color-bt-fg-muted)]">{filteredDatasets.length}개</span>
        </div>

        {/* 카드 그리드 */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {filteredDatasets.length === 0 ? (
            <p className="text-center text-[12px] text-[var(--color-bt-fg-muted)] py-8">검색 결과 없음</p>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
              {filteredDatasets.map((d) => {
                const active = value.datasetId === d.datasetId;
                return (
                  <button
                    key={d.datasetId}
                    type="button"
                    onClick={() => handleSelectDataset(d.datasetId)}
                    className={`rounded border-2 p-3 text-left transition-colors ${
                      active
                        ? 'border-[var(--color-bt-primary)] bg-[var(--color-bt-primary-soft)]/30 shadow-sm'
                        : 'border-[var(--color-bt-border)] bg-white hover:border-[var(--color-bt-primary)]'
                    }`}
                  >
                    <div className="mb-1.5 flex items-center gap-2">
                      <span className={`shrink-0 rounded px-1.5 py-0.5 mono text-[9.5px] font-bold ${DOMAIN_COLOR_CLASS[d.domainCode]}`}>{d.domainCode}</span>
                      <span className="text-[12.5px] font-semibold truncate">{d.datasetName}</span>
                    </div>
                    <div className="mb-1 mono text-[10px] text-[var(--color-bt-fg-muted)] truncate">{d.datasetCode}</div>
                    <div className="flex items-center gap-2 text-[10px] text-[var(--color-bt-fg-muted)]">
                      <span>필드 {d.fieldCount}</span>
                      {d.lookupCount > 0 && (
                        <span className="rounded bg-[var(--color-bt-success-soft)] px-1 py-0.5 mono font-bold text-[var(--color-bt-success)]">
                          ƒ {d.lookupCount} · +{d.virtualFieldCount}
                        </span>
                      )}
                      <span className="ml-auto">위젯 {d.usageWidgetCount}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 우측: 데이터셋 요약 + 시각화 체크박스 */}
      <aside className="w-[340px] shrink-0 border-l border-[var(--color-bt-border)] bg-[var(--color-bt-bg-canvas)] overflow-y-auto">
        <div className="px-5 py-4 space-y-5">
          {/* 선택된 데이터셋 요약 */}
          <div>
            <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--color-bt-fg-muted)]">선택된 데이터셋</div>
            {selectedDetail ? (
              <div className="rounded border border-[var(--color-bt-border)] bg-white p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`shrink-0 rounded px-1.5 py-0.5 mono text-[9.5px] font-bold ${DOMAIN_COLOR_CLASS[selectedDetail.domainCode]}`}>{selectedDetail.domainCode}</span>
                  <span className="text-[12.5px] font-semibold truncate">{selectedDetail.datasetName}</span>
                </div>
                <div className="mono text-[10px] text-[var(--color-bt-fg-muted)] truncate">{selectedDetail.datasetCode}</div>
                <div className="flex flex-wrap gap-1 pt-1">
                  <span className="rounded bg-[var(--color-bt-bg-muted)] px-1.5 py-0.5 text-[10px] text-[var(--color-bt-fg-muted)]">
                    DIM {selectedDetail.fields.filter((f) => f.classification === 'DIM' && f.isVisible).length}
                  </span>
                  <span className="rounded bg-[var(--color-bt-primary-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-bt-primary)]">
                    MSR {selectedDetail.fields.filter((f) => f.classification === 'MSR' && f.isVisible).length}
                  </span>
                  {selectedDetail.calcFields.length > 0 && (
                    <span className="rounded bg-[var(--color-bt-success-soft)] px-1.5 py-0.5 mono text-[10px] font-bold text-[var(--color-bt-success)]">
                      ƒ {selectedDetail.calcFields.length}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded border border-dashed border-[var(--color-bt-border)] bg-white/40 p-4 text-center">
                <p className="text-[11px] text-[var(--color-bt-fg-muted)]">좌측에서 데이터셋을 선택하세요</p>
              </div>
            )}
          </div>

          {/* 시각화 선택 */}
          <div>
            <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--color-bt-fg-muted)]">
              시각화 <span className="text-[var(--color-bt-danger)] normal-case tracking-normal">*</span>
              <span className="ml-1 normal-case tracking-normal text-[10px] text-[var(--color-bt-fg-muted)]">(복수 선택 · ★ = 기본)</span>
            </div>
            <div className="space-y-1.5">
              {ALL_VIZ.map((viz) => {
                const checked = value.visualizations.includes(viz);
                const isDefault = value.defaultViz === viz;
                const avail = availability[viz];
                return (
                  <div
                    key={viz}
                    className={`flex items-center gap-2 rounded border p-2 transition-colors ${
                      !avail.available
                        ? 'border-[var(--color-bt-border)] bg-[var(--color-bt-bg-muted)]/30 opacity-50'
                        : checked
                          ? 'border-[var(--color-bt-primary)] bg-[var(--color-bt-primary-soft)]/30'
                          : 'border-[var(--color-bt-border)] bg-white hover:border-[var(--color-bt-primary)]'
                    }`}
                  >
                    {/* 체크박스 */}
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!avail.available}
                      onChange={() => toggleViz(viz)}
                      className="accent-[var(--color-bt-primary)] cursor-pointer disabled:cursor-not-allowed"
                    />

                    {/* 아이콘 + 라벨 */}
                    <span className="mono text-[14px]">{VIZ_ICON[viz]}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="mono text-[11px] font-bold">{viz}</span>
                        <span className="text-[10.5px] text-[var(--color-bt-fg-muted)]">· {VIZ_LABELS[viz]}</span>
                      </div>
                      <div className={`text-[10px] ${avail.available ? 'text-[var(--color-bt-fg-muted)]' : 'text-[var(--color-bt-warn)]'} leading-snug truncate`}>
                        {avail.available ? VIZ_DESCRIPTION[viz] : avail.reason}
                      </div>
                    </div>

                    {/* 기본 ★ 토글 */}
                    {checked && (
                      <button
                        type="button"
                        onClick={() => setDefault(viz)}
                        title={isDefault ? '기본 시각화' : '기본으로 지정'}
                        className={`shrink-0 inline-flex h-6 w-6 items-center justify-center rounded transition-colors ${
                          isDefault
                            ? 'bg-[var(--color-bt-warn-soft)] text-[var(--color-bt-warn)]'
                            : 'text-[var(--color-bt-fg-muted)] hover:bg-[var(--color-bt-bg-muted)] hover:text-[var(--color-bt-warn)]'
                        }`}
                      >
                        <Star className="w-3.5 h-3.5" fill={isDefault ? 'currentColor' : 'none'} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {value.visualizations.length === 0 && selectedDetail && <p className="mt-2 text-[10px] text-[var(--color-bt-danger)]">최소 1개의 시각화를 선택하세요</p>}
          </div>

          {/* 안내 */}
          <div className="rounded border-l-2 border-l-[var(--color-bt-primary)] bg-[var(--color-bt-primary-soft)]/30 px-3 py-2">
            <p className="text-[10.5px] text-[var(--color-bt-fg)] leading-relaxed">
              <strong>★ 기본 시각화</strong>는 위젯이 처음 표시될 때 보이는 형태입니다. 사용자는 위젯 헤더 아이콘으로 다른 시각화로 즉시 전환할 수 있습니다.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
