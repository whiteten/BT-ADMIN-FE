import { useState } from 'react';
import { Divider, Form, Input } from 'antd';
import { DOMAIN_DESCRIPTIONS, DOMAIN_LABELS, REPORT_ICON_LABELS, REPORT_ICON_SVG } from '../../report/constants/reportIconConstants';
import type { DomainCode, ReportIconType } from '../../report/types';
import { useGetDataSources } from '../hooks/useDatasetQueries';

const ICON_TYPES: ReportIconType[] = ['agent', 'cti', 'ivr', 'channel', 'system'];
const DOMAINS: DomainCode[] = ['IE', 'IC', 'IR'];

interface WizardStepAProps {
  title: string;
  onTitleChange(title: string): void;
  selectedDomain: DomainCode | null;
  onDomainChange(domain: DomainCode): void;
  selectedIcon: ReportIconType | null;
  onIconChange(icon: ReportIconType): void;
  selectedView: string;
  onViewChange(view: string): void;
  showErrors?: boolean;
}

export default function WizardStepA({
  title,
  onTitleChange,
  selectedDomain,
  onDomainChange,
  selectedIcon,
  onIconChange,
  selectedView,
  onViewChange,
  showErrors = false,
}: WizardStepAProps) {
  const [viewSearch, setViewSearch] = useState('');

  const { data: dataSources = [], isLoading } = useGetDataSources({
    params: { domain: selectedDomain ?? undefined },
    queryOptions: { enabled: !!selectedDomain },
  });

  const filteredSources = dataSources.filter(
    (ds) => !viewSearch || ds.datasourceKey.toLowerCase().includes(viewSearch.toLowerCase()) || (ds.displayName ?? '').includes(viewSearch),
  );

  const selectedDs = dataSources.find((ds) => ds.datasourceKey === selectedView);

  return (
    <div className="p-7 pb-4">
      <Form layout="vertical">
        {/* 보고서 이름 */}
        <Form.Item
          label="보고서 이름"
          required
          validateStatus={showErrors && !title.trim() ? 'error' : ''}
          help={showErrors && !title.trim() ? '보고서 이름을 입력하세요.' : undefined}
        >
          <Input value={title} onChange={(e) => onTitleChange(e.target.value)} placeholder="내선 사용 현황 일일 보고" size="large" />
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

        {/* 아이콘 */}
        <Form.Item label="아이콘" required extra="목록 카드에 표시되는 시각 식별 아이콘">
          <div className="grid grid-cols-5 gap-2">
            {ICON_TYPES.map((icon) => {
              const isSelected = selectedIcon === icon;
              return (
                <button
                  key={icon}
                  type="button"
                  onClick={() => onIconChange(icon)}
                  className={`flex flex-col items-center gap-1.5 rounded p-3 transition border-2 ${
                    isSelected ? 'bg-blue-50/40' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-400'
                  }`}
                  style={isSelected ? { borderColor: '#085fb5', color: '#085fb5' } : undefined}
                >
                  <span className="flex h-6 w-6 items-center justify-center">{REPORT_ICON_SVG[icon]}</span>
                  <span className={`text-xs ${isSelected ? 'font-semibold' : 'font-medium'}`}>{REPORT_ICON_LABELS[icon]}</span>
                </button>
              );
            })}
          </div>
        </Form.Item>

        <Divider />

        {/* 데이터 뷰 — 라벨 + 검색 한 줄 */}
        <div className="mb-2 flex flex-nowrap items-center gap-2">
          <span style={{ color: '#ff4d4f' }}>*</span>
          <span className="text-sm font-medium whitespace-nowrap">데이터 뷰</span>
          {selectedDomain && (
            <span className="text-xs text-gray-400 whitespace-nowrap">
              {DOMAIN_LABELS[selectedDomain]} 카테고리 {dataSources.length}개
            </span>
          )}
          <div className="ml-auto w-[400px]">
            <Input value={viewSearch} onChange={(e) => setViewSearch(e.target.value)} placeholder="뷰 이름 검색…" disabled={!selectedDomain} />
          </div>
        </div>
        {showErrors && !selectedView && <p className="mb-1 text-xs text-red-500">데이터 뷰를 선택하세요.</p>}
        <div className={`mb-6 rounded border bg-bt-bg-muted/30 ${showErrors && !selectedView ? 'border-red-500' : 'border-bt-border'}`}>
          {!selectedDomain ? (
            <div className="px-4 py-5 text-center text-sm text-bt-fg-muted">카테고리를 먼저 선택하세요.</div>
          ) : isLoading ? (
            <div className="px-4 py-5 text-center text-sm text-bt-fg-muted">불러오는 중…</div>
          ) : filteredSources.length === 0 ? (
            <div className="px-4 py-5 text-center text-sm text-bt-fg-muted">{dataSources.length === 0 ? '등록된 뷰가 없습니다.' : '검색 결과 없음'}</div>
          ) : (
            filteredSources.map((ds, i) => (
              <label
                key={ds.datasourceKey}
                className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition hover:bg-white/60 ${
                  i < filteredSources.length - 1 ? 'border-b border-bt-border' : ''
                } ${selectedView === ds.datasourceKey ? 'bg-white' : ''}`}
              >
                <input
                  type="radio"
                  name="datasourceKey"
                  value={ds.datasourceKey}
                  checked={selectedView === ds.datasourceKey}
                  onChange={() => onViewChange(ds.datasourceKey)}
                  className="accent-bt-primary"
                />
                <span className="inline-flex h-5 items-center justify-center rounded px-1.5 text-[10px] font-bold text-white" style={{ backgroundColor: '#085fb5' }}>
                  {selectedDomain}
                </span>
                <span className="font-mono text-sm font-semibold">{ds.datasourceKey}</span>
                <span className={`text-sm ${selectedView === ds.datasourceKey ? 'text-bt-fg' : 'text-bt-fg-muted'}`}>{ds.displayName}</span>
              </label>
            ))
          )}
        </div>

        {/* 선택된 뷰 필드 미리보기 */}
        {selectedDs && (
          <div className="rounded border border-bt-border bg-bt-bg-muted/40 p-3">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs font-semibold text-bt-fg-muted">필드 미리보기</span>
              <span className="font-mono text-xs text-bt-fg-muted">{selectedDs.datasourceKey}</span>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-bt-border text-left text-bt-fg-muted">
                  <th className="px-2 py-1.5 font-medium w-[140px]">필드</th>
                  <th className="px-2 py-1.5 font-medium">표시명</th>
                  <th className="px-2 py-1.5 font-medium w-[80px]">타입</th>
                  <th className="px-2 py-1.5 font-medium w-[60px]">구분</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bt-border">
                {(
                  selectedDs as {
                    datasourceKey: string;
                    displayName: string;
                    fields?: { fieldName: string; displayName: string; columnFormat: string; fieldType?: string }[];
                  }
                ).fields
                  ?.slice(0, 8)
                  .map((f) => (
                    <tr key={f.fieldName}>
                      <td className={`px-2 py-1.5 font-mono ${f.fieldType === 'MSR' ? 'font-semibold' : ''}`}>{f.fieldName}</td>
                      <td className="px-2 py-1.5">{f.displayName}</td>
                      <td className="px-2 py-1.5 font-mono text-bt-fg-muted">{f.columnFormat}</td>
                      <td className="px-2 py-1.5">
                        {f.fieldType === 'MSR' ? (
                          <span className="rounded px-1 text-[10px] font-mono font-semibold text-white" style={{ backgroundColor: '#085fb5' }}>
                            MSR
                          </span>
                        ) : (
                          <span className="rounded bg-bt-bg-muted px-1 text-[10px] font-mono text-bt-fg-muted">DIM</span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </Form>
    </div>
  );
}
