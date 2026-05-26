import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { type BreadcrumbProps, Button, Input, Popconfirm, Select, Tag } from 'antd';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { useDeleteDataset, useGetDatasets } from '../../features/dataset/hooks/useDatasetQueries';
import type { DatasetListItem } from '../../features/dataset/types';
import { DOMAIN_LABELS } from '../../features/report/constants/reportIconConstants';
import type { DomainCode } from '../../features/report/types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import NoData from '@/components/custom/NoData';

const breadcrumb: BreadcrumbProps['items'] = [{ title: '데이터셋', path: '/insight/statistics/datasets' }];

export default function StatDatasetList() {
  const navigate = useNavigate();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  const [domain, setDomain] = useState<DomainCode | ''>('');
  const [searchValue, setSearchValue] = useState('');

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const { data: datasets = [], isFetching } = useGetDatasets({
    params: { domain: domain || undefined },
  });

  const { mutate: deleteDataset } = useDeleteDataset({
    mutationOptions: {
      onSuccess: () => toast.success('데이터셋이 삭제되었습니다.'),
      onError: () => toast.error('삭제 중 오류가 발생했습니다.'),
    },
  });

  const filtered = useMemo(() => {
    if (!searchValue.trim()) return datasets;
    const kw = searchValue.toLowerCase();
    return datasets.filter((d) => d.datasourceKey.toLowerCase().includes(kw) || d.datasourceName.toLowerCase().includes(kw) || (d.dbViewPrefix ?? '').toLowerCase().includes(kw));
  }, [datasets, searchValue]);

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* 필터 바 */}
      <div className="flex items-center justify-between gap-4 w-full bg-white bt-shadow px-7 py-5">
        <div className="flex items-center gap-3">
          <Select
            value={domain}
            onChange={(v) => setDomain(v as DomainCode | '')}
            options={[
              { value: '', label: '전체 도메인' },
              { value: 'IE', label: `IE · ${DOMAIN_LABELS.IE}` },
              { value: 'IC', label: `IC · ${DOMAIN_LABELS.IC}` },
              { value: 'IR', label: `IR · ${DOMAIN_LABELS.IR}` },
            ]}
            className="!min-w-[140px]"
            popupMatchSelectWidth={false}
          />
          <Input value={searchValue} onChange={(e) => setSearchValue(e.target.value)} placeholder="데이터셋 이름 검색…" className="w-full max-w-[300px]" allowClear />
        </div>
        <Button type="primary" onClick={() => navigate('/insight/statistics/datasets/new')}>
          + 새 데이터셋
        </Button>
      </div>

      {/* 목록 */}
      {isFetching ? (
        <div className="flex items-center justify-center w-full h-full bg-white bt-shadow">
          <FallbackSpinner />
        </div>
      ) : filtered.length > 0 ? (
        <div className="w-full bg-white bt-shadow overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-bt-bg-muted/60 border-b border-bt-border">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-bt-fg-muted w-[180px]">도메인</th>
                <th className="px-6 py-3 text-left font-semibold text-bt-fg-muted">데이터셋 이름</th>
                <th className="px-6 py-3 text-left font-semibold text-bt-fg-muted w-[220px]">뷰 Prefix</th>
                <th className="px-6 py-3 text-left font-semibold text-bt-fg-muted w-[160px]">가용 단위</th>
                <th className="px-6 py-3 text-left font-semibold text-bt-fg-muted w-[100px]">상태</th>
                <th className="px-6 py-3 text-right font-semibold text-bt-fg-muted w-[120px]">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bt-border">
              {filtered.map((dataset) => (
                <DatasetRow
                  key={dataset.datasourceKey}
                  dataset={dataset}
                  onDelete={() => deleteDataset(dataset.datasourceKey)}
                  onDoubleClick={() => navigate(`/insight/statistics/datasets/${dataset.datasourceKey}/edit`)}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center w-full h-full bg-white bt-shadow gap-4">
          <NoData message={searchValue ? `"${searchValue}" 검색 결과 없음` : '등록된 데이터셋이 없습니다.'} iconSize={50} fontSize="text-lg" gap={2} />
          {!searchValue && (
            <Button type="primary" onClick={() => navigate('/insight/statistics/datasets/new')}>
              + 새 데이터셋 만들기
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function DatasetRow({ dataset, onDelete, onDoubleClick }: { dataset: DatasetListItem; onDelete(): void; onDoubleClick(): void }) {
  const units: string[] = Array.isArray(dataset.availableUnits) ? dataset.availableUnits : [];

  return (
    <tr className="hover:bg-bt-bg-muted/20 transition-colors cursor-pointer" onDoubleClick={onDoubleClick}>
      <td className="px-6 py-4">
        <span className="inline-flex h-6 items-center justify-center rounded px-2 text-xs font-bold text-white" style={{ backgroundColor: '#085fb5' }}>
          {dataset.productCode}
        </span>
      </td>
      <td className="px-6 py-4">
        <div className="font-medium">{dataset.datasourceName}</div>
        <div className="mt-0.5 font-mono text-xs text-bt-fg-muted">{dataset.datasourceKey}</div>
      </td>
      <td className="px-6 py-4 font-mono text-xs text-bt-fg-muted">{dataset.dbViewPrefix}</td>
      <td className="px-6 py-4">
        <div className="flex flex-wrap gap-1">
          {units.map((u) => (
            <Tag key={u} className="!text-[10px] !font-mono">
              {u}
            </Tag>
          ))}
        </div>
      </td>
      <td className="px-6 py-4">{dataset.isSystem ? <Tag color="blue">시스템</Tag> : dataset.isActive ? <Tag color="green">활성</Tag> : <Tag color="default">비활성</Tag>}</td>
      <td className="px-6 py-4 text-right">
        {!dataset.isSystem && (
          <Popconfirm
            title="데이터셋 삭제"
            description="이 데이터셋을 삭제하면 연결된 보고서에 영향을 줄 수 있습니다. 계속하시겠습니까?"
            onConfirm={onDelete}
            okText="삭제"
            okButtonProps={{ danger: true }}
            cancelText="취소"
          >
            <Button size="small" danger>
              삭제
            </Button>
          </Popconfirm>
        )}
      </td>
    </tr>
  );
}
