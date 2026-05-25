import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Divider, Form, Input, Steps } from 'antd';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { useGetDatasets } from '../../features/dataset/hooks/useDatasetQueries';
import type { DatasetListItem } from '../../features/dataset/types';
import { reportApi } from '../../features/report/api/reportApi';
import { DOMAIN_DESCRIPTIONS, DOMAIN_LABELS, REPORT_ICON_LABELS, REPORT_ICON_SVG } from '../../features/report/constants/reportIconConstants';
import type { DomainCode, ReportIconType } from '../../features/report/types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import NoData from '@/components/custom/NoData';

type WizardStep = 'DATASET' | 'META';

const ICON_TYPES: ReportIconType[] = ['agent', 'cti', 'ivr', 'channel', 'system'];
const DOMAINS: DomainCode[] = ['IE', 'IC', 'IR'];

const STEP_ITEMS = [{ title: '데이터셋 선택' }, { title: '보고서 정보' }];

export default function ReportWizard() {
  const navigate = useNavigate();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  const [step, setStep] = useState<WizardStep>('DATASET');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const [selectedDatasetKey, setSelectedDatasetKey] = useState('');
  const [datasetSearch, setDatasetSearch] = useState('');
  const [domainFilter, setDomainFilter] = useState<DomainCode | ''>('');

  const [title, setTitle] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<DomainCode | null>(null);
  const [selectedIcon, setSelectedIcon] = useState<ReportIconType | null>(null);

  const { data: datasets = [], isFetching } = useGetDatasets({
    params: { domain: domainFilter || undefined },
  });

  useEffect(() => {
    setBreadcrumb([{ title: '인사이트' }, { title: '보고서', path: '/insight/statistics/reports' }, { title: '새 보고서 생성', path: '/insight/statistics/reports/new' }]);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const filteredDatasets = datasets.filter((d) => {
    if (!datasetSearch.trim()) return true;
    const kw = datasetSearch.toLowerCase();
    return d.datasourceKey.toLowerCase().includes(kw) || d.datasourceName.toLowerCase().includes(kw);
  });

  const selectedDataset = datasets.find((d) => d.datasourceKey === selectedDatasetKey);

  const handleNext = async () => {
    if (step === 'DATASET') {
      if (!selectedDatasetKey) {
        setShowErrors(true);
        toast.error('데이터셋을 선택하세요.');
        return;
      }
      setShowErrors(false);
      if (selectedDataset && !selectedDomain) {
        const code = selectedDataset.productCode as DomainCode;
        if (DOMAINS.includes(code)) setSelectedDomain(code);
      }
      setStep('META');
      return;
    }

    if (step === 'META') {
      if (!title.trim() || !selectedDomain || !selectedIcon) {
        setShowErrors(true);
        if (!title.trim()) toast.error('보고서 이름을 입력하세요.');
        else if (!selectedDomain) toast.error('카테고리를 선택하세요.');
        else toast.error('아이콘을 선택하세요.');
        return;
      }

      setIsSubmitting(true);
      try {
        await reportApi.createReport({
          title: title.trim(),
          domain: selectedDomain,
          datasourceKey: selectedDatasetKey,
          iconType: selectedIcon ?? undefined,
        });
        toast.success('보고서가 생성되었습니다.');
        navigate('/insight/statistics/reports');
      } catch {
        toast.error('보고서 생성 중 오류가 발생했습니다.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handlePrev = () => {
    if (step === 'META') setStep('DATASET');
  };

  const handleCancel = () => navigate('/insight/statistics/reports');

  const stepsCurrent = step === 'DATASET' ? (selectedDatasetKey ? 1 : 0) : 1;

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex items-center justify-center w-full min-h-[58px] bg-white bt-shadow px-7 py-2">
        <Steps current={stepsCurrent} size="small" responsive={false} items={STEP_ITEMS} className="max-w-xl w-full" />
      </div>

      <div className="flex w-full flex-1 min-h-0">
        <div className="w-full h-full min-h-0 bg-white bt-shadow flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto">
            {isSubmitting ? (
              <FallbackSpinner />
            ) : step === 'DATASET' ? (
              <StepDatasetPicker
                datasets={filteredDatasets}
                isFetching={isFetching}
                selectedKey={selectedDatasetKey}
                onSelect={setSelectedDatasetKey}
                search={datasetSearch}
                onSearchChange={setDatasetSearch}
                domainFilter={domainFilter}
                onDomainFilterChange={setDomainFilter}
                showErrors={showErrors}
              />
            ) : (
              <StepMeta
                title={title}
                onTitleChange={setTitle}
                selectedDomain={selectedDomain}
                onDomainChange={setSelectedDomain}
                selectedIcon={selectedIcon}
                onIconChange={setSelectedIcon}
                selectedDataset={selectedDataset}
                showErrors={showErrors}
              />
            )}
          </div>

          <div className="border-t border-bt-border bg-bt-bg-muted px-7 py-4">
            <div className="flex items-center justify-between">
              <Button onClick={handleCancel}>취소</Button>
              <div className="flex items-center gap-2">
                {step !== 'DATASET' && <Button onClick={handlePrev}>이전</Button>}
                <Button type="primary" onClick={handleNext} loading={isSubmitting}>
                  {step === 'DATASET' ? '다음 → 보고서 정보' : '완료 → 보고서 목록'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Step 1: Dataset picker ──────────────────────────────────────────────────

interface StepDatasetPickerProps {
  datasets: DatasetListItem[];
  isFetching: boolean;
  selectedKey: string;
  onSelect(key: string): void;
  search: string;
  onSearchChange(v: string): void;
  domainFilter: DomainCode | '';
  onDomainFilterChange(v: DomainCode | ''): void;
  showErrors: boolean;
}

function StepDatasetPicker({ datasets, isFetching, selectedKey, onSelect, search, onSearchChange, domainFilter, onDomainFilterChange, showErrors }: StepDatasetPickerProps) {
  return (
    <div className="p-7">
      <div className="mb-4 flex items-center gap-3">
        <span className="text-sm font-semibold">데이터셋 선택</span>
        <span className="text-xs text-bt-fg-muted">보고서의 기반이 되는 데이터셋을 선택하세요.</span>
        <div className="ml-auto flex items-center gap-2">
          <select
            value={domainFilter}
            onChange={(e) => onDomainFilterChange(e.target.value as DomainCode | '')}
            className="rounded border border-bt-border bg-white px-2 py-1 text-sm text-bt-fg"
          >
            <option value="">전체 도메인</option>
            {DOMAINS.map((d) => (
              <option key={d} value={d}>
                {d} · {DOMAIN_LABELS[d]}
              </option>
            ))}
          </select>
          <Input value={search} onChange={(e) => onSearchChange(e.target.value)} placeholder="데이터셋 검색…" className="w-[260px]" allowClear />
        </div>
      </div>

      {showErrors && !selectedKey && <p className="mb-3 text-xs text-red-500">데이터셋을 선택하세요.</p>}

      {isFetching ? (
        <FallbackSpinner />
      ) : datasets.length === 0 ? (
        <NoData message={search ? `"${search}" 검색 결과 없음` : '등록된 데이터셋이 없습니다.'} />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3">
          {datasets.map((dataset) => {
            const isSelected = selectedKey === dataset.datasourceKey;
            const units: string[] = Array.isArray(dataset.availableUnits) ? dataset.availableUnits : [];
            return (
              <button
                key={dataset.datasourceKey}
                type="button"
                onClick={() => onSelect(dataset.datasourceKey)}
                className={`rounded-lg border-2 p-4 text-left transition-all ${
                  isSelected ? 'bg-blue-50/40 shadow-md' : 'border-bt-border bg-white hover:border-gray-400 hover:shadow-sm'
                }`}
                style={isSelected ? { borderColor: '#085fb5' } : undefined}
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="inline-flex h-6 items-center justify-center rounded px-2 text-xs font-bold text-white" style={{ backgroundColor: '#085fb5' }}>
                    {dataset.productCode}
                  </span>
                  {isSelected && (
                    <span className="ml-auto rounded px-1.5 py-0.5 text-xs font-semibold text-white" style={{ backgroundColor: '#085fb5' }}>
                      선택됨
                    </span>
                  )}
                </div>
                <div className="font-semibold text-sm" style={isSelected ? { color: '#085fb5' } : undefined}>
                  {dataset.datasourceName}
                </div>
                <div className="mt-0.5 font-mono text-xs text-bt-fg-muted">{dataset.datasourceKey}</div>
                {units.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {units.map((u) => (
                      <span key={u} className="rounded bg-bt-bg-muted px-1.5 py-0.5 font-mono text-[10px] text-bt-fg-muted">
                        {u}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Step 2: Report metadata ─────────────────────────────────────────────────

interface StepMetaProps {
  title: string;
  onTitleChange(v: string): void;
  selectedDomain: DomainCode | null;
  onDomainChange(d: DomainCode): void;
  selectedIcon: ReportIconType | null;
  onIconChange(icon: ReportIconType): void;
  selectedDataset?: DatasetListItem;
  showErrors: boolean;
}

const DOMAINS_LIST: DomainCode[] = ['IE', 'IC', 'IR'];

function StepMeta({ title, onTitleChange, selectedDomain, onDomainChange, selectedIcon, onIconChange, selectedDataset, showErrors }: StepMetaProps) {
  return (
    <div className="p-7 pb-4">
      {selectedDataset && (
        <div className="mb-5 rounded border border-bt-border bg-bt-bg-muted/40 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-bt-fg-muted">선택된 데이터셋</span>
            <span className="inline-flex h-5 items-center justify-center rounded px-1.5 text-[10px] font-bold text-white" style={{ backgroundColor: '#085fb5' }}>
              {selectedDataset.productCode}
            </span>
            <span className="font-medium text-sm">{selectedDataset.datasourceName}</span>
            <span className="font-mono text-xs text-bt-fg-muted">{selectedDataset.datasourceKey}</span>
          </div>
        </div>
      )}

      <Form layout="vertical">
        <Form.Item
          label="보고서 이름"
          required
          validateStatus={showErrors && !title.trim() ? 'error' : ''}
          help={showErrors && !title.trim() ? '보고서 이름을 입력하세요.' : undefined}
        >
          <Input value={title} onChange={(e) => onTitleChange(e.target.value)} placeholder="내선 사용 현황 일일 보고" size="large" />
        </Form.Item>

        <Divider />

        <Form.Item label="카테고리" required>
          <div className="grid grid-cols-3 gap-4">
            {DOMAINS_LIST.map((domain) => {
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
      </Form>
    </div>
  );
}
