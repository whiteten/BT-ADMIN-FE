import { Col, Collapse, Form, Input, Row, Select } from 'antd';
import TagInput from '../../../components/TagInput';
import { DOMAIN_LABELS } from '../../report/constants/reportIconConstants';
import type { DomainCode } from '../../report/types';
import { useGetDataSourceFields, useGetDataSources, useGetDatasetCandidates } from '../hooks/useDatasetQueries';

const DOMAINS: DomainCode[] = ['IE', 'IC', 'IR'];

interface WizardStepAProps {
  titleLabel?: string;
  title: string;
  onTitleChange(title: string): void;
  /** 설명 입력 — 핸들러가 주어진 경우에만 입력 UI 표시 */
  description?: string;
  onDescriptionChange?(description: string): void;
  /** 태그 입력 — 핸들러가 주어진 경우에만 입력 UI 표시 (카테고리 대체) */
  tags?: string[];
  onTagsChange?(tags: string[]): void;
  selectedDomain?: DomainCode | null;
  onDomainChange?(domain: DomainCode): void;
  selectedView: string;
  onViewChange(view: string): void;
  showErrors?: boolean;
  /** 후보 뷰 모드: true=미등록 Oracle 뷰 후보 목록, false(default)=기등록 데이터셋 목록 */
  useCandidates?: boolean;
  /** 카테고리(도메인) 선택 UI 숨김 */
  hideCategory?: boolean;
}

export default function WizardStepA({
  titleLabel = '이름',
  title,
  onTitleChange,
  description = '',
  onDescriptionChange,
  tags,
  onTagsChange,
  selectedDomain = null,
  onDomainChange,
  selectedView,
  onViewChange,
  showErrors = false,
  useCandidates = false,
  hideCategory = false,
}: WizardStepAProps) {
  const showCategory = !hideCategory && !!onDomainChange;

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

  const viewError = showErrors && !selectedView;

  return (
    <div className="w-full p-7">
      <Form layout="vertical" requiredMark>
        {/* ── 이름 ── */}
        <Row gutter={20}>
          <Col span={12}>
            <Form.Item
              label={titleLabel}
              required
              validateStatus={showErrors && !title.trim() ? 'error' : ''}
              help={showErrors && !title.trim() ? `${titleLabel}을(를) 입력하세요.` : undefined}
            >
              <Input value={title} onChange={(e) => onTitleChange(e.target.value)} placeholder="예) 내선 사용 현황" />
            </Form.Item>
          </Col>
        </Row>

        {/* ── 설명 ── */}
        {onDescriptionChange && (
          <Row gutter={20}>
            <Col span={24}>
              <Form.Item label="설명">
                <Input.TextArea
                  value={description}
                  onChange={(e) => onDescriptionChange(e.target.value)}
                  placeholder="데이터셋에 대한 간단한 설명 (목록·상세에 표시됩니다)"
                  autoSize={{ minRows: 2, maxRows: 4 }}
                  maxLength={500}
                  showCount
                />
              </Form.Item>
            </Col>
          </Row>
        )}

        {/* ── 태그 ── */}
        {onTagsChange && (
          <Row gutter={20}>
            <Col span={12}>
              <Form.Item label="태그" tooltip="분류·검색에 사용됩니다. 카테고리를 대체합니다." extra="Enter 또는 쉼표로 여러 개 추가 — 최대 5개 (예: CTI, IVR, PBX, 통합, 상담사)">
                <TagInput value={tags ?? []} onChange={onTagsChange} maxTags={5} />
              </Form.Item>
            </Col>
          </Row>
        )}

        {/* ── 카테고리 ── */}
        {showCategory && (
          <Row gutter={20}>
            <Col span={6}>
              <Form.Item label="카테고리" tooltip="데이터셋이 속한 제품군을 선택합니다.">
                <Select
                  value={selectedDomain ?? undefined}
                  onChange={(v) => onDomainChange?.(v as DomainCode)}
                  placeholder="제품군 선택"
                  style={{ width: '100%' }}
                  options={DOMAINS.map((d) => ({ value: d, label: `${d} · ${DOMAIN_LABELS[d]}` }))}
                />
              </Form.Item>
            </Col>
          </Row>
        )}

        {/* ── 데이터 뷰 ── */}
        <Row gutter={20}>
          <Col span={12}>
            <Form.Item
              label={useCandidates ? '데이터 뷰 후보' : '데이터 뷰'}
              required
              validateStatus={viewError ? 'error' : ''}
              help={viewError ? '데이터 뷰를 선택하세요.' : useCandidates ? '연결할 데이터 뷰를 검색해 선택합니다.' : undefined}
            >
              {useCandidates ? (
                <Select
                  showSearch
                  style={{ width: '100%' }}
                  value={selectedView || undefined}
                  placeholder="데이터 뷰 후보 검색·선택…"
                  loading={isLoadingCandidates}
                  onChange={(v) => onViewChange(v as string)}
                  filterOption={(input, option) =>
                    String(option?.value ?? '')
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                  notFoundContent={isLoadingCandidates ? '불러오는 중…' : '등록 가능한 뷰가 없습니다.'}
                  options={candidates.map((c) => ({
                    value: c.dbViewPrefix,
                    label: (
                      <span className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold">{c.dbViewPrefix}</span>
                        {c.availableUnits?.length ? <span className="text-xs text-[var(--color-bt-fg-muted)]">{c.availableUnits.join(' · ')}</span> : null}
                      </span>
                    ),
                  }))}
                />
              ) : (
                <Select
                  showSearch
                  style={{ width: '100%' }}
                  value={selectedView || undefined}
                  disabled={!selectedDomain}
                  placeholder={selectedDomain ? '뷰 검색·선택…' : '카테고리를 먼저 선택하세요'}
                  loading={isLoadingDs}
                  onChange={(v) => onViewChange(v as string)}
                  filterOption={(input, option) => {
                    const ds = dataSources.find((d) => String(d.datasetId) === option?.value);
                    const q = input.toLowerCase();
                    return !!ds && (String(ds.datasetId).includes(q) || (ds.displayName ?? '').toLowerCase().includes(q));
                  }}
                  notFoundContent={!selectedDomain ? '카테고리를 먼저 선택하세요.' : isLoadingDs ? '불러오는 중…' : '등록된 뷰가 없습니다.'}
                  options={dataSources.map((ds) => ({
                    value: String(ds.datasetId),
                    label: (
                      <span className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold">{ds.datasetId}</span>
                        <span className="text-sm text-[var(--color-bt-fg-muted)]">{ds.displayName}</span>
                      </span>
                    ),
                  }))}
                />
              )}
            </Form.Item>
          </Col>
        </Row>

        {/* ── 후보 뷰: 스키마 자동 탐지 안내 ── */}
        {useCandidates && selectedView && (
          <p className="-mt-2 mb-4 text-xs text-[var(--color-bt-fg-muted)]">
            선택된 뷰 <span className="font-mono font-semibold text-[var(--color-bt-primary)]">{selectedView}</span> — 데이터셋 생성 후 Oracle 뷰에서 컬럼 스키마가 자동 탐지됩니다.
          </p>
        )}

        {/* ── 기등록 뷰: 필드 미리보기 (접이식) ── */}
        {!useCandidates && selectedView && (
          <Collapse
            size="small"
            className="mb-2"
            items={[
              {
                key: 'fields',
                label: (
                  <span className="text-xs text-[var(--color-bt-fg-muted)]">
                    필드 미리보기 <span className="font-mono">{selectedView}</span>
                    {!isLoadingFields && <span> · {fieldMetas.length}개 컬럼</span>}
                  </span>
                ),
                children: isLoadingFields ? (
                  <div className="py-2 text-center text-xs text-[var(--color-bt-fg-muted)]">필드 불러오는 중…</div>
                ) : fieldMetas.length === 0 ? (
                  <div className="py-2 text-center text-xs text-[var(--color-bt-fg-muted)]">필드 정보 없음</div>
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
                      {fieldMetas.map((f) => {
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
                ),
              },
            ]}
          />
        )}
      </Form>
    </div>
  );
}
