import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Input, Tag } from 'antd';
import { Edit2, Plus, Trash2 } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { datasetKeys, useDeleteDataset, useGetDatasets } from '../../features/dataset/hooks/useDatasetQueries';
import type { DatasetListItem } from '../../features/dataset/types';
import { DOMAIN_DESCRIPTIONS, DOMAIN_LABELS } from '../../features/report/constants/reportIconConstants';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

// ─── 대분류 그룹 설정 ──────────────────────────────────────────────────────────
// productCodes: 컬럼 표시 순서 (명시된 것 우선, 미등록 코드는 뒤에 자동 추가)
const GROUP_DEFS: { key: string; label: string; productCodes: string[] }[] = [
  { key: 'IPRON', label: 'IPRON', productCodes: ['IE', 'IC', 'IR'] },
  // { key: 'ETC', label: '기타 통계', productCodes: [] },
  // { key: 'UNIFIED', label: '통합 통계', productCodes: [] },
];

// 대분류 → 소분류 소속 매핑 (productCode 기준)
// productCodes에 없는 코드는 자동으로 해당 그룹의 마지막 컬럼으로 추가됨
const PRODUCT_CODE_GROUP: Record<string, string> = {
  IE: 'IPRON',
  IC: 'IPRON',
  IR: 'IPRON',
};

// ─── 컬럼 색상 팔레트 (인덱스 순서 자동 할당) ────────────────────────────────
const PALETTE = [
  {
    bg: 'bg-blue-50/60',
    border: 'border-blue-100',
    header: 'bg-blue-100/70 border-b border-blue-200',
    text: 'text-blue-700',
    badge: 'bg-blue-500/80',
    count: 'bg-blue-100 text-blue-600',
  },
  {
    bg: 'bg-emerald-50/60',
    border: 'border-emerald-100',
    header: 'bg-emerald-100/70 border-b border-emerald-200',
    text: 'text-emerald-700',
    badge: 'bg-emerald-500/80',
    count: 'bg-emerald-100 text-emerald-600',
  },
  {
    bg: 'bg-orange-50/60',
    border: 'border-orange-100',
    header: 'bg-orange-100/70 border-b border-orange-200',
    text: 'text-orange-700',
    badge: 'bg-orange-400/80',
    count: 'bg-orange-100 text-orange-600',
  },
  {
    bg: 'bg-purple-50/60',
    border: 'border-purple-100',
    header: 'bg-purple-100/70 border-b border-purple-200',
    text: 'text-purple-700',
    badge: 'bg-purple-500/80',
    count: 'bg-purple-100 text-purple-600',
  },
  {
    bg: 'bg-rose-50/60',
    border: 'border-rose-100',
    header: 'bg-rose-100/70 border-b border-rose-200',
    text: 'text-rose-700',
    badge: 'bg-rose-500/80',
    count: 'bg-rose-100 text-rose-600',
  },
];

const UNIT_LABEL: Record<string, string> = { MI: '10분', HH: '시간', DD: '일', MM: '월', YY: '연' };

export default function StatDatasetList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const modal = useModal();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  const [search, setSearch] = useState('');
  const [activeGroup, setActiveGroup] = useState(GROUP_DEFS[0].key);

  useEffect(() => {
    setBreadcrumb([{ title: '데이터셋', path: '/insight/statistics/datasets' }]);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const { data: datasets = [], isLoading } = useGetDatasets();

  const { mutate: deleteDataset } = useDeleteDataset({
    mutationOptions: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: datasetKeys.list._def });
        toast.success('데이터셋이 삭제되었습니다.');
      },
      onError: () => toast.error('삭제 중 오류가 발생했습니다.'),
    },
  });

  const handleDelete = (data: DatasetListItem) => {
    modal.confirm.delete({ onOk: () => deleteDataset(data.datasetId) });
  };

  // 검색 필터
  const filtered = useMemo(() => {
    if (!search.trim()) return datasets;
    const kw = search.toLowerCase();
    return datasets.filter((d) => d.datasourceName.toLowerCase().includes(kw) || (d.dbViewPrefix ?? '').toLowerCase().includes(kw) || String(d.datasetId).includes(kw));
  }, [datasets, search]);

  // 현재 그룹의 데이터셋
  const groupDatasets = useMemo(() => filtered.filter((d) => (PRODUCT_CODE_GROUP[d.productCode ?? ''] ?? 'ETC') === activeGroup), [filtered, activeGroup]);

  // 현재 그룹의 컬럼 목록 (설정 순서 우선 + 미등록 코드 자동 추가)
  const columns = useMemo(() => {
    const groupDef = GROUP_DEFS.find((g) => g.key === activeGroup);
    const ordered = groupDef?.productCodes ?? [];
    const extra = [...new Set(groupDatasets.map((d) => d.productCode ?? '').filter((c) => c && !ordered.includes(c)))];
    return [...ordered, ...extra];
  }, [groupDatasets, activeGroup]);

  // 그룹별 카운트 (탭 배지용)
  const groupCounts = useMemo(
    () =>
      GROUP_DEFS.reduce<Record<string, number>>((acc, g) => {
        acc[g.key] = filtered.filter((d) => (PRODUCT_CODE_GROUP[d.productCode ?? ''] ?? 'ETC') === g.key).length;
        return acc;
      }, {}),
    [filtered],
  );

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* 툴바 */}
      <div className="flex items-center justify-between gap-4 bg-white bt-shadow px-7 py-4">
        <div className="flex items-center gap-3">
          {/* 대분류 탭 */}
          <div className="flex items-center gap-1 rounded-lg border border-[var(--color-bt-border)] bg-[var(--color-bt-bg-muted)] p-1">
            {GROUP_DEFS.map((g) => (
              <button
                key={g.key}
                type="button"
                onClick={() => setActiveGroup(g.key)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                  activeGroup === g.key ? 'bg-white shadow-sm text-[var(--color-bt-fg)]' : 'text-[var(--color-bt-fg-muted)] hover:text-[var(--color-bt-fg)]'
                }`}
              >
                {g.label}
                {!isLoading && (
                  <span className={`ml-1.5 text-xs ${activeGroup === g.key ? 'text-[var(--color-bt-primary)]' : 'text-[var(--color-bt-fg-muted)]'}`}>
                    {groupCounts[g.key] ?? 0}
                  </span>
                )}
              </button>
            ))}
          </div>

          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="데이터셋 이름·뷰 검색…" className="w-full max-w-[280px]" allowClear />
        </div>
        <Button type="primary" icon={<Plus className="size-4" />} onClick={() => navigate('/insight/statistics/datasets/new')}>
          새 데이터셋
        </Button>
      </div>

      {/* 칸반 — 컬럼 수 동적 */}
      <div className="flex-1 grid gap-4 px-5 pb-5 min-h-0" style={{ gridTemplateColumns: `repeat(${Math.max(columns.length, 1)}, minmax(0, 1fr))` }}>
        {columns.map((code, idx) => {
          const accent = PALETTE[idx % PALETTE.length];
          const items = groupDatasets.filter((d) => d.productCode === code);
          const label = DOMAIN_LABELS[code] ?? code;
          const desc = DOMAIN_DESCRIPTIONS[code];

          return (
            <div key={code} className={`flex flex-col rounded-xl border ${accent.border} overflow-hidden`}>
              {/* 컬럼 헤더 */}
              <div className={`${accent.header} px-4 py-3 flex items-center justify-between`}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`text-sm font-bold ${accent.text}`}>{code}</span>
                  <span className={`text-sm font-medium ${accent.text}`}>{label}</span>
                  {desc && <span className="text-xs text-[var(--color-bt-fg-muted)] truncate hidden xl:block">{desc}</span>}
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold shrink-0 ${accent.count}`}>{isLoading ? '…' : items.length}</span>
              </div>

              {/* 카드 목록 */}
              <div className={`flex-1 overflow-y-auto ${accent.bg} p-3 flex flex-col gap-2`}>
                {isLoading ? (
                  <div className="flex items-center justify-center py-10 text-sm text-[var(--color-bt-fg-muted)]">불러오는 중…</div>
                ) : items.length === 0 ? (
                  <div className="flex items-center justify-center py-10 text-sm text-[var(--color-bt-fg-muted)]">{search ? '검색 결과 없음' : '등록된 데이터셋이 없습니다.'}</div>
                ) : (
                  items.map((ds) => (
                    <DatasetCard
                      key={ds.datasetId}
                      ds={ds}
                      accent={accent}
                      onEdit={() => navigate(`/insight/statistics/datasets/${ds.datasetId}/edit`)}
                      onDelete={() => handleDelete(ds)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── 카드 컴포넌트 ─────────────────────────────────────────────────────────────

type Accent = (typeof PALETTE)[number];

function DatasetCard({ ds, accent, onEdit, onDelete }: { ds: DatasetListItem; accent: Accent; onEdit: () => void; onDelete: () => void }) {
  const units: string[] = Array.isArray(ds.availableUnits) ? ds.availableUnits : [];

  return (
    <div className="group rounded-lg border border-[var(--color-bt-border)] bg-white px-4 py-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onDoubleClick={onEdit}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-sm text-[var(--color-bt-fg)] truncate">{ds.datasourceName}</span>
            {ds.isSystem && (
              <Tag color="blue" className="!mb-0 !text-[10px] !px-1 !py-0 !leading-4">
                시스템
              </Tag>
            )}
            {!ds.isActive && (
              <Tag color="default" className="!mb-0 !text-[10px] !px-1 !py-0 !leading-4">
                비활성
              </Tag>
            )}
          </div>
          {ds.description && <p className="mt-0.5 text-xs text-[var(--color-bt-fg-muted)] truncate">{ds.description}</p>}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            type="button"
            onClick={onEdit}
            className="rounded p-1 text-[var(--color-bt-fg-muted)] hover:bg-[var(--color-bt-bg-muted)] hover:text-[var(--color-bt-primary)] transition-colors"
            title="편집"
          >
            <Edit2 className="size-3.5" />
          </button>
          {!ds.isSystem && (
            <button type="button" onClick={onDelete} className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors" title="삭제">
              <Trash2 className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="mt-2 flex items-center gap-1.5">
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold text-white ${accent.badge}`}>VIEW</span>
        <span className="font-mono text-xs text-[var(--color-bt-fg-muted)] truncate">{ds.dbViewPrefix || '-'}</span>
      </div>

      {units.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {units.map((u) => (
            <span
              key={u}
              className="rounded border border-[var(--color-bt-border)] bg-[var(--color-bt-bg-muted)] px-1.5 py-0.5 text-[10px] font-mono text-[var(--color-bt-fg-muted)]"
            >
              {UNIT_LABEL[u] ?? u}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
