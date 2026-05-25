import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Checkbox, Input, InputNumber, Select } from 'antd';
import { Plus, Trash2 } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import AdminMasterRegisterDrawer from '../../features/monitoring/components/lookup/AdminMasterRegisterDrawer';
import LookupCatalogDropdown from '../../features/monitoring/components/lookup/LookupCatalogDropdown';
import { LOOKUP_MISS_POLICY_OPTIONS } from '../../features/monitoring/constants/monitoringConstants';
import { useGetMonitoringDataset } from '../../features/monitoring/hooks/useDatasetQueries';
import { getMockDatasetLookups } from '../../features/monitoring/mocks/mockLookups';
import type { DatasetLookup, LookupCatalogItem } from '../../features/monitoring/types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

export default function DatasetLookups() {
  const { datasetId: param } = useParams<{ datasetId: string }>();
  const datasetId = Number(param);
  const navigate = useNavigate();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  const { data: detail, isLoading } = useGetMonitoringDataset({ params: { datasetId }, queryOptions: { enabled: !!datasetId, retry: false } });

  const [lookups, setLookups] = useState<DatasetLookup[]>([]);
  const [adminOpen, setAdminOpen] = useState(false);

  useEffect(() => {
    setLookups(getMockDatasetLookups(datasetId));
  }, [datasetId]);

  useEffect(() => {
    if (detail) {
      setBreadcrumb([
        { title: '인사이트' },
        { title: '모니터링' },
        { title: '데이터셋', path: '/insight/monitoring/datasets' },
        { title: detail.datasetName, path: `/insight/monitoring/datasets/${datasetId}/edit` },
        { title: '코드 룩업' },
      ]);
    }
    return () => clearBreadcrumb();
  }, [detail, datasetId, setBreadcrumb, clearBreadcrumb]);

  if (isLoading && !detail) return <FallbackSpinner />;
  if (!detail) return <div className="p-6 text-[12px] text-[var(--color-bt-fg-muted)]">데이터셋을 찾을 수 없습니다.</div>;

  const stringNumberFields = detail.fields.filter((f) => !f.isVirtual && (f.dataType === 'STRING' || f.dataType === 'NUMBER') && f.isVisible);

  const handleAddLookup = (sourceField: string) => {
    const newLookup: DatasetLookup = {
      datasetId,
      lookupCatalogId: 0,
      sourceField,
      keyColumn: '',
      joinType: 'LEFT',
      cacheTtlSec: 300,
      missPolicy: 'PASSTHROUGH',
      fields: [],
    };
    setLookups((ls) => [...ls, newLookup]);
  };

  const handleRemoveLookup = (idx: number) => {
    setLookups((ls) => ls.filter((_, i) => i !== idx));
  };

  const handleSelectCatalog = (idx: number, catalog: LookupCatalogItem) => {
    setLookups((ls) =>
      ls.map((l, i) =>
        i === idx
          ? {
              ...l,
              lookupCatalogId: catalog.lookupCatalogId,
              catalogDisplayName: catalog.displayName,
              catalogTableName: catalog.tableName,
              keyColumn: catalog.recommendedKey,
              fields: catalog.recommendedValues.map((col, j) => ({
                masterColumn: col,
                outputFieldName: col,
                dataType: 'STRING',
                orderNo: j,
              })),
            }
          : l,
      ),
    );
  };

  const handleSave = () => toast.success('코드 룩업 설정이 저장되었습니다. (※ BE 미구현)');

  return (
    <div className="flex flex-col w-full h-full bg-[var(--color-bt-bg-canvas)]">
      <div className="flex items-center justify-between bg-white border-b border-[var(--color-bt-border)] px-7 py-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-semibold">{detail.datasetName} — 코드 룩업 설정</span>
            <span className="rounded bg-[var(--color-bt-success-soft)] px-1.5 py-0.5 mono text-[10px] font-bold text-[var(--color-bt-success)]">룩업 {lookups.length}개</span>
          </div>
          <div className="mt-0.5 text-[10.5px] text-[var(--color-bt-fg-muted)]">
            Redis가 코드만 push해도, BT-ADMIN 어댑터가 push 직전에 마스터 조회로 명칭을 채워줍니다 (M6 · M18)
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => navigate(`/insight/monitoring/datasets/${datasetId}/edit`)}>← 데이터셋 편집</Button>
          <Button type="primary" onClick={handleSave}>
            저장
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden grid grid-cols-[1fr_auto] gap-0">
        {/* 좌측: 필드 목록 + 룩업 진입점 */}
        <div className="overflow-y-auto p-6 border-r border-[var(--color-bt-border)]">
          <div className="mb-3 text-[12.5px] font-semibold">데이터셋 필드</div>
          <div className="rounded border border-[var(--color-bt-border)] divide-y divide-[var(--color-bt-border)] bg-white text-[11.5px]">
            {detail.fields.map((f) => {
              const hasLookup = lookups.some((l) => l.sourceField === f.columnName);
              const virtualFields = detail.fields.filter((vf) => vf.isVirtual && vf.parentField === f.columnName);
              if (f.isVirtual) return null; // virtual은 부모 아래에서 들여쓰기로
              return (
                <div key={f.columnName}>
                  <div className={`flex items-center gap-2 px-3 py-1.5 ${hasLookup ? 'bg-[var(--color-bt-success-soft)]/30' : ''}`}>
                    <span className="rounded bg-[var(--color-bt-bg-muted)] px-1.5 py-0.5 mono text-[9.5px] text-[var(--color-bt-fg-muted)]">{f.dataType}</span>
                    <span className="mono font-semibold">{f.columnName}</span>
                    <span className="text-[10px] text-[var(--color-bt-fg-muted)]">{f.displayName}</span>
                    {hasLookup ? (
                      <span className="ml-auto rounded bg-[var(--color-bt-success)] px-1.5 py-0.5 mono text-[9.5px] font-bold text-white">ƒ 룩업 정의됨</span>
                    ) : (f.dataType === 'STRING' || f.dataType === 'NUMBER') && f.isVisible ? (
                      <button
                        type="button"
                        onClick={() => handleAddLookup(f.columnName)}
                        className="ml-auto rounded border border-[var(--color-bt-border)] px-1.5 py-0.5 text-[9.5px] text-[var(--color-bt-fg-muted)] hover:text-[var(--color-bt-primary)] hover:border-[var(--color-bt-primary)]"
                      >
                        + 룩업
                      </button>
                    ) : (
                      <span className="ml-auto text-[9.5px] text-[var(--color-bt-fg-muted)]">—</span>
                    )}
                  </div>
                  {virtualFields.map((vf) => (
                    <div key={vf.columnName} className="flex items-center gap-2 px-3 py-1 bg-[var(--color-bt-success-soft)]/15 pl-8 border-l-4 border-[var(--color-bt-success)]">
                      <span className="text-[var(--color-bt-success)] text-[10px]">├→</span>
                      <span className="rounded bg-[var(--color-bt-bg-muted)] px-1.5 py-0.5 mono text-[9.5px] text-[var(--color-bt-fg-muted)]">{vf.dataType}</span>
                      <span className="mono font-semibold text-[var(--color-bt-success)]">{vf.columnName}</span>
                      <span className="text-[10px] text-[var(--color-bt-success)]">{vf.displayName}</span>
                      <span className="ml-auto text-[9.5px] text-[var(--color-bt-fg-muted)]">virtual</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-[10px] text-[var(--color-bt-fg-muted)]">STRING/NUMBER 필드에 [+ 룩업] 클릭. 룩업 결과는 가상 필드로 노출 (위젯에서 일반 필드처럼 사용).</p>
        </div>

        {/* 우측: 룩업 정의 폼 */}
        <div className="w-[600px] overflow-y-auto p-6 bg-[var(--color-bt-bg-canvas)]">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[12.5px] font-semibold">룩업 정의 ({lookups.length})</span>
            {stringNumberFields.length > 0 && lookups.length === 0 && (
              <Button size="small" icon={<Plus className="w-3 h-3" />} onClick={() => handleAddLookup(stringNumberFields[0].columnName)}>
                + 룩업 추가
              </Button>
            )}
          </div>

          {lookups.length === 0 ? (
            <div className="rounded border-2 border-dashed border-[var(--color-bt-border)] bg-white/40 px-3 py-8 text-center text-[11px] text-[var(--color-bt-fg-muted)]">
              왼쪽 필드에서 [+ 룩업] 클릭하여 추가
            </div>
          ) : (
            <div className="space-y-3">
              {lookups.map((lookup, idx) => (
                <div key={idx} className="rounded border-2 border-[var(--color-bt-success)]/40 bg-white p-3 shadow-sm">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="inline-flex h-4 items-center rounded bg-[var(--color-bt-success)] px-1 mono text-[9px] font-bold text-white">ƒ</span>
                    <span className="text-[11.5px] font-semibold">룩업 #{idx + 1}</span>
                    <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-[var(--color-bt-success)]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-bt-success)]" />
                      {lookup.lookupCatalogId > 0 ? '활성' : '구성 중'}
                    </span>
                    <button type="button" onClick={() => handleRemoveLookup(idx)} className="text-[var(--color-bt-fg-muted)] hover:text-[var(--color-bt-danger)]">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    {/* 1행: 소스 필드 · 마스터 · 조인 타입 */}
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[9.5px] uppercase tracking-wider text-[var(--color-bt-fg-muted)] mb-0.5">소스 필드</label>
                        <Input size="small" value={lookup.sourceField} disabled className="font-mono" />
                      </div>
                      <div>
                        <label className="block text-[9.5px] uppercase tracking-wider text-[var(--color-bt-fg-muted)] mb-0.5">
                          마스터 테이블{' '}
                          <span className="rounded bg-[var(--color-bt-success-soft)] px-1 mono text-[9px] font-bold text-[var(--color-bt-success)] normal-case tracking-normal">
                            카탈로그
                          </span>
                        </label>
                        <LookupCatalogDropdown value={lookup.lookupCatalogId} onChange={(c) => handleSelectCatalog(idx, c)} onOpenAdminRegister={() => setAdminOpen(true)} />
                      </div>
                      <div>
                        <label className="block text-[9.5px] uppercase tracking-wider text-[var(--color-bt-fg-muted)] mb-0.5">조인 타입</label>
                        <Select
                          size="small"
                          value={lookup.joinType}
                          onChange={(v) => setLookups((ls) => ls.map((l, i) => (i === idx ? { ...l, joinType: v as 'LEFT' | 'INNER' } : l)))}
                          options={[
                            { value: 'LEFT', label: 'LEFT (미스도 포함)' },
                            { value: 'INNER', label: 'INNER (미스 drop)' },
                          ]}
                          style={{ width: '100%' }}
                        />
                      </div>
                    </div>

                    {/* 2행: 키 컬럼 · 캐시 TTL · 미스 처리 */}
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[9.5px] uppercase tracking-wider text-[var(--color-bt-fg-muted)] mb-0.5">키 컬럼 (마스터)</label>
                        <Input
                          size="small"
                          value={lookup.keyColumn}
                          onChange={(e) => setLookups((ls) => ls.map((l, i) => (i === idx ? { ...l, keyColumn: e.target.value } : l)))}
                          className="font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[9.5px] uppercase tracking-wider text-[var(--color-bt-fg-muted)] mb-0.5">캐시 TTL (초)</label>
                        <InputNumber
                          size="small"
                          value={lookup.cacheTtlSec}
                          onChange={(v) => setLookups((ls) => ls.map((l, i) => (i === idx ? { ...l, cacheTtlSec: Number(v) || 300 } : l)))}
                          style={{ width: '100%' }}
                          min={1}
                        />
                      </div>
                      <div>
                        <label className="block text-[9.5px] uppercase tracking-wider text-[var(--color-bt-fg-muted)] mb-0.5">
                          미스 처리 <span className="normal-case tracking-normal text-[9px] text-[var(--color-bt-fg-muted)]">(LEFT만)</span>
                        </label>
                        <Select
                          size="small"
                          value={lookup.missPolicy ?? 'PASSTHROUGH'}
                          disabled={lookup.joinType === 'INNER'}
                          onChange={(v) => setLookups((ls) => ls.map((l, i) => (i === idx ? { ...l, missPolicy: v as typeof lookup.missPolicy } : l)))}
                          options={LOOKUP_MISS_POLICY_OPTIONS}
                          style={{ width: '100%' }}
                        />
                      </div>
                    </div>

                    {/* 값 컬럼 → 출력 필드명 */}
                    {lookup.fields.length > 0 && (
                      <div className="rounded border border-[var(--color-bt-border)] bg-[var(--color-bt-bg-muted)]/30 p-2">
                        <div className="mb-1.5 flex items-center justify-between">
                          <label className="text-[9.5px] uppercase tracking-wider text-[var(--color-bt-fg-muted)]">값 컬럼 → 출력 필드명</label>
                          <span className="text-[9.5px] text-[var(--color-bt-fg-muted)]">{lookup.fields.length}개 선택</span>
                        </div>
                        <table className="w-full text-[10.5px]">
                          <thead>
                            <tr className="text-left text-[var(--color-bt-fg-muted)] border-b border-[var(--color-bt-border)]">
                              <th className="py-1 pr-2 font-normal w-6">
                                <Checkbox checked />
                              </th>
                              <th className="py-1 pr-2 font-normal">마스터 컬럼</th>
                              <th className="py-1 font-normal">→ 출력 필드명</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--color-bt-border)]">
                            {lookup.fields.map((field, fi) => (
                              <tr key={field.masterColumn} className="bg-[var(--color-bt-success-soft)]/20">
                                <td className="py-1 pr-2">
                                  <Checkbox checked />
                                </td>
                                <td className="py-1 pr-2 mono font-semibold">{field.masterColumn}</td>
                                <td className="py-1">
                                  <Input
                                    size="small"
                                    value={field.outputFieldName}
                                    onChange={(e) =>
                                      setLookups((ls) =>
                                        ls.map((l, i) => (i === idx ? { ...l, fields: l.fields.map((x, j) => (j === fi ? { ...x, outputFieldName: e.target.value } : x)) } : l)),
                                      )
                                    }
                                    className="font-mono !text-[10.5px]"
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AdminMasterRegisterDrawer
        open={adminOpen}
        onClose={() => setAdminOpen(false)}
        onRegistered={(item) => {
          toast.success(`"${item.displayName}" 등록 완료. 룩업 정의에서 선택하세요.`);
        }}
      />
    </div>
  );
}
