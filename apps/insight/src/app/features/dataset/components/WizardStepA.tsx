import { useState } from 'react';
import { Divider, Form, Input } from 'antd';
import { DOMAIN_DESCRIPTIONS, DOMAIN_LABELS } from '../../report/constants/reportIconConstants';
import type { DomainCode } from '../../report/types';
import { useGetDataSourceFields, useGetDataSources, useGetDatasetCandidates } from '../hooks/useDatasetQueries';

const DOMAINS: DomainCode[] = ['IE', 'IC', 'IR'];

interface WizardStepAProps {
  titleLabel?: string;
  title: string;
  onTitleChange(title: string): void;
  selectedDomain: DomainCode | null;
  onDomainChange(domain: DomainCode): void;
  selectedView: string;
  onViewChange(view: string): void;
  showErrors?: boolean;
  /** 후보 뷰 모드: true=미등록 Oracle 뷰 후보 목록, false(default)=기등록 데이터셋 목록 */
  useCandidates?: boolean;
}

export default function WizardStepA({
  titleLabel = '이름',
  title,
  onTitleChange,
  selectedDomain,
  onDomainChange,
  selectedView,
  onViewChange,
  showErrors = false,
  useCandidates = false,
}: WizardStepAProps) {
  const [viewSearch, setViewSearch] = useState('');

  const { data: dataSources = [], isLoading: isLoadingDs } = useGetDataSources({
    params: { domain: selectedDomain ?? undefined },
    queryOptions: { enabled: !useCandidates && !!selectedDomain },
  });

  const { data: candidates = [], isLoading: isLoadingCandidates } = useGetDatasetCandidates({
    queryOptions: { enabled: useCandidates },
  });

  const { data: fieldMetas = [], isLoading: isLoadingFields } = useGetDataSourceFields({
    params: { datasetId: Number(selectedView) },
    queryOptions: { enabled: !useCandidates && !!selectedView && !isNaN(Number(selectedView)) },
  });

  const isLoading = useCandidates ? isLoadingCandidates : isLoadingDs;

  const filteredSources = useCandidates
    ? candidates.filter((c) => (!selectedDomain || c.suggestedProductCode === selectedDomain) && (!viewSearch || c.dbViewPrefix.toLowerCase().includes(viewSearch.toLowerCase())))
    : dataSources.filter((ds) => !viewSearch || String(ds.datasetId).includes(viewSearch.toLowerCase()) || (ds.displayName ?? '').includes(viewSearch));

  return (
    <div className="p-7 pb-4">
      <Form layout="vertical">
        {/* 이름 */}
        <Form.Item
          label={titleLabel}
          required
          validateStatus={showErrors && !title.trim() ? 'error' : ''}
          help={showErrors && !title.trim() ? `${titleLabel}을(를) 입력하세요.` : undefined}
        >
          <Input value={title} onChange={(e) => onTitleChange(e.target.value)} placeholder="내선 사용 현황" size="large" />
        </Form.Item>

        <Divider />

        {/* 카테고리 */}
        <Form.Item label="카테고리" required>
          <div className="grid grid-cols-3 gap-4">
            {DOMAINS.map((domain) => {
              const isSelected = selectedDomain === domain;
              return (
                <button
                  key={domain}
                  type="button"
                  onClick={() => onDomainChange(domain)}
                  className={`rounded-md p-4 text-left transition-all border-2 ${
                    isSelected ? 'bg-blue-50/40 shadow-md' : 'border-gray-200 bg-white hover:border-gray-400 hover:shadow-sm'
                  }`}
                  style={isSelected ? { borderColor: '#085fb5' } : undefined}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded text-xs font-bold text-white" style={{ backgroundColor: '#085fb5' }}>
                      {domain}
                    </span>
                    {isSelected && (
                      <span className="rounded px-2 py-1 text-xs font-semibold text-white" style={{ backgroundColor: '#085fb5' }}>
                        선택됨
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-bold" style={isSelected ? { color: '#085fb5' } : { color: '#1f2937' }}>
                    {DOMAIN_LABELS[domain]}
                  </div>
                  <div className="mt-1 text-xs text-gray-400">{DOMAIN_DESCRIPTIONS[domain]}</div>
                </button>
              );
            })}
          </div>
        </Form.Item>

        <Divider />

        {/* 데이터 뷰 — 라벨 + 검색 한 줄 */}
        <div className="mb-2 flex flex-nowrap items-center gap-2">
          <span style={{ color: '#ff4d4f' }}>*</span>
          <span className="text-sm font-medium whitespace-nowrap">{useCandidates ? '데이터 뷰 후보' : '데이터 뷰'}</span>
          {!useCandidates && selectedDomain && (
            <span className="text-xs text-gray-400 whitespace-nowrap">
              {DOMAIN_LABELS[selectedDomain]} 카테고리 {dataSources.length}개
            </span>
          )}
          {useCandidates && <span className="text-xs text-gray-400 whitespace-nowrap">미등록 Oracle 뷰 {candidates.length}개</span>}
          <div className="ml-auto w-[400px]">
            <Input value={viewSearch} onChange={(e) => setViewSearch(e.target.value)} placeholder="뷰 이름 검색…" disabled={!useCandidates && !selectedDomain} />
          </div>
        </div>
        {showErrors && !selectedView && <p className="mb-1 text-xs text-red-500">데이터 뷰를 선택하세요.</p>}
        <div className={`mb-6 rounded border bg-[var(--color-bt-bg-muted)]/30 ${showErrors && !selectedView ? 'border-red-500' : 'border-[var(--color-bt-border)]'}`}>
          {!useCandidates && !selectedDomain ? (
            <div className="px-4 py-5 text-center text-sm text-[var(--color-bt-fg-muted)]">카테고리를 먼저 선택하세요.</div>
          ) : isLoading ? (
            <div className="px-4 py-5 text-center text-sm text-[var(--color-bt-fg-muted)]">불러오는 중…</div>
          ) : filteredSources.length === 0 ? (
            <div className="px-4 py-5 text-center text-sm text-[var(--color-bt-fg-muted)]">
              {useCandidates ? '등록 가능한 뷰가 없습니다.' : dataSources.length === 0 ? '등록된 뷰가 없습니다.' : '검색 결과 없음'}
            </div>
          ) : useCandidates ? (
            (filteredSources as typeof candidates).map((c, i) => (
              <label
                key={c.dbViewPrefix}
                className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition hover:bg-white/60 ${
                  i < filteredSources.length - 1 ? 'border-b border-[var(--color-bt-border)]' : ''
                } ${selectedView === c.dbViewPrefix ? 'bg-white' : ''}`}
              >
                <input
                  type="radio"
                  name="datasetId"
                  value={c.dbViewPrefix}
                  checked={selectedView === c.dbViewPrefix}
                  onChange={() => onViewChange(c.dbViewPrefix)}
                  className="accent-[var(--color-bt-primary)]"
                />
                <span className="font-mono text-sm font-semibold">{c.dbViewPrefix}</span>
                <span className="text-xs text-[var(--color-bt-fg-muted)]">{c.availableUnits?.join(' · ')}</span>
              </label>
            ))
          ) : (
            (filteredSources as typeof dataSources).map((ds, i) => {
              const idStr = String(ds.datasetId);
              return (
                <label
                  key={ds.datasetId}
                  className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition hover:bg-white/60 ${
                    i < filteredSources.length - 1 ? 'border-b border-[var(--color-bt-border)]' : ''
                  } ${selectedView === idStr ? 'bg-white' : ''}`}
                >
                  <input
                    type="radio"
                    name="datasetId"
                    value={idStr}
                    checked={selectedView === idStr}
                    onChange={() => onViewChange(idStr)}
                    className="accent-[var(--color-bt-primary)]"
                  />
                  <span className="inline-flex h-5 items-center justify-center rounded px-1.5 text-xs font-bold text-white" style={{ backgroundColor: '#085fb5' }}>
                    {selectedDomain}
                  </span>
                  <span className="font-mono text-sm font-semibold">{ds.datasetId}</span>
                  <span className={`text-sm ${selectedView === idStr ? 'text-[var(--color-bt-fg)]' : 'text-[var(--color-bt-fg-muted)]'}`}>{ds.displayName}</span>
                </label>
              );
            })
          )}
        </div>

        {/* 선택된 뷰 필드 미리보기 — 기등록 모드에서만 */}
        {!useCandidates && selectedView && (
          <div className="rounded border border-[var(--color-bt-border)] bg-[var(--color-bt-bg-muted)]/40 p-3">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs font-semibold text-[var(--color-bt-fg-muted)]">필드 미리보기</span>
              <span className="font-mono text-xs text-[var(--color-bt-fg-muted)]">{selectedView}</span>
              {!isLoadingFields && <span className="text-xs text-[var(--color-bt-fg-muted)]">({fieldMetas.length}개 컬럼)</span>}
            </div>
            {isLoadingFields ? (
              <div className="py-3 text-center text-xs text-[var(--color-bt-fg-muted)]">필드 불러오는 중…</div>
            ) : fieldMetas.length === 0 ? (
              <div className="py-3 text-center text-xs text-[var(--color-bt-fg-muted)]">필드 정보 없음</div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--color-bt-border)] text-left text-[var(--color-bt-fg-muted)]">
                    <th className="px-2 py-1.5 font-medium w-[140px]">필드</th>
                    <th className="px-2 py-1.5 font-medium">표시명</th>
                    <th className="px-2 py-1.5 font-medium w-[80px]">타입</th>
                    <th className="px-2 py-1.5 font-medium w-[60px]">구분</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-bt-border)]">
                  {fieldMetas.slice(0, 8).map((f) => {
                    const isMsr = f.fieldRole === 'MEASURE';
                    const formatLabel = f.fieldRole === 'TIMESTAMP' ? 'Date' : f.fieldType === 'NUMBER' ? 'Number' : 'String';
                    return (
                      <tr key={f.fieldName}>
                        <td className={`px-2 py-1.5 font-mono ${isMsr ? 'font-semibold' : ''}`}>{f.fieldName}</td>
                        <td className="px-2 py-1.5">{f.displayName}</td>
                        <td className="px-2 py-1.5 font-mono text-[var(--color-bt-fg-muted)]">{formatLabel}</td>
                        <td className="px-2 py-1.5">
                          {isMsr ? (
                            <span className="rounded px-1 text-xs font-mono font-semibold text-white" style={{ backgroundColor: '#085fb5' }}>
                              MSR
                            </span>
                          ) : (
                            <span className="rounded bg-[var(--color-bt-bg-muted)] px-1 text-xs font-mono text-[var(--color-bt-fg-muted)]">DIM</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* 후보 선택 시 스키마 자동 탐지 안내 */}
        {useCandidates && selectedView && (
          <div className="rounded border border-[var(--color-bt-border)] bg-[var(--color-bt-bg-muted)]/40 p-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[var(--color-bt-fg-muted)]">선택된 뷰 Prefix</span>
              <span className="font-mono text-xs font-semibold text-[var(--color-bt-primary)]">{selectedView}</span>
            </div>
            <p className="mt-1 text-xs text-[var(--color-bt-fg-muted)]">데이터셋 생성 후 Oracle 뷰에서 컬럼 스키마가 자동 탐지됩니다.</p>
          </div>
        )}
      </Form>
    </div>
  );
}
